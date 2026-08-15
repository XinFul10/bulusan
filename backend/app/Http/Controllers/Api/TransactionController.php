<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\BudgetRequest;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\SystemLog;
use App\Services\BudgetRequestWorkflow;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Exceptions\HttpResponseException;

class TransactionController extends Controller
{
    public function __construct(
        private BudgetRequestWorkflow $workflow,
        private NotificationService $notifications
    ) {
    }

    private function formatTransaction(Transaction $t): array
    {
        return [
            'id' => $t->id,
            'transaction_date' => Carbon::parse($t->transaction_date)->toDateString(),
            'description' => $t->description,
            'category_id' => $t->category_id,
            'category_name' => $t->category?->name,
            'creator_name' => $t->creator?->full_name,
            'allocated_amount' => (int) $t->allocated_amount,
            'obligated_amount' => (int) $t->obligated_amount,
            'balance' => (int) max(0, ((int) $t->allocated_amount) - ((int) $t->obligated_amount)),
            'created_by' => $t->created_by,
            'budget_request_id' => $t->budget_request_id,
            'request_id' => $t->budgetRequest?->request_number,
            'created_at' => $t->created_at?->toIso8601String(),
            'obligation_entries' => $t->relationLoaded('obligationEntries')
                ? $t->obligationEntries->map(fn ($e) => [
                    'id' => $e->id,
                    'amount' => (int) $e->amount,
                    'date' => Carbon::parse($e->date)->toDateString(),
                    'note' => $e->note,
                    'created_by' => $e->creator?->full_name ?? 'Unknown',
                    'created_at' => $e->created_at?->toIso8601String(),
                ])->values()->all()
                : [],
        ];
    }

    public function index()
    {
        $transactions = Transaction::query()
            ->where('is_visible_in_transactions', true)
            ->with([
                'category:id,name',
                'creator:id,full_name',
                'budgetRequest:id,request_number',
                'obligationEntries.creator:id,full_name',
            ])
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->get();

        $data = $transactions->map(fn (Transaction $t) => $this->formatTransaction($t));

        return response()->json([
            'data' => $data,
            'total' => $data->count(),
        ]);
    }

    protected function ensureWithinBudget(array $data, ?Transaction $transaction = null): void
    {
        $latestBudget = Budget::latest()->first();
        if (! $latestBudget) {
            return;
        }

        $currentObligated = Transaction::query()->sum('obligated_amount');
        $currentAllocated = Transaction::query()->sum('allocated_amount');

        if ($transaction) {
            $currentObligated -= $transaction->obligated_amount;
            $currentAllocated -= $transaction->allocated_amount;
        }

        $remainingBudget = max(0, $latestBudget->total_budget - $currentObligated);

        if (isset($data['allocated_amount']) && $data['allocated_amount'] > $latestBudget->total_budget) {
            throw new HttpResponseException(response()->json([
                'message' => 'Allocated amount cannot exceed the total budget of ₱' . number_format($latestBudget->total_budget, 2),
            ], 422));
        }

        if (isset($data['obligated_amount']) && $data['obligated_amount'] > $remainingBudget) {
            throw new HttpResponseException(response()->json([
                'message' => 'Obligated amount cannot exceed the remaining budget of ₱' . number_format($remainingBudget, 2),
            ], 422));
        }
    }

    protected function authorizeTransactionUpdate(Request $request, Transaction $transaction): void
    {
        $user = $request->user();

        if ($user->role === 'admin') {
            return;
        }

        if ($transaction->created_by !== $user->id) {
            abort(403, 'You may only edit transactions you created.');
        }
    }

    protected function authorizeTransactionDelete(Request $request, Transaction $transaction): void
    {
        $user = $request->user();

        if ($user->role === 'admin') {
            return;
        }

        if ($transaction->created_by !== $user->id) {
            abort(403, 'You may only delete transactions you created.');
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'transaction_date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id', 'required_without:custom_category'],
            'custom_category' => ['nullable', 'string', 'max:255', 'required_without:category_id'],
            'allocated_amount' => ['required', 'integer', 'min:0'],
            'obligated_amount' => ['nullable', 'integer', 'min:0'],
        ]);

        if (! empty($data['category_id']) && ! empty($data['custom_category'])) {
            throw new HttpResponseException(response()->json([
                'message' => 'Please choose either a preset category or a custom category, not both.',
            ], 422));
        }

        $data['obligated_amount'] = $data['obligated_amount'] ?? 0;

        if (! empty($data['custom_category']) && empty($data['category_id'])) {
            $category = Category::firstOrCreate(
                ['name' => trim($data['custom_category'])],
                ['allocation' => 0]
            );
            $data['category_id'] = $category->id;
        }

        $data['category_id'] = $data['category_id'] ?? null;
        unset($data['custom_category']);

        $this->ensureWithinBudget($data);

        $user = $request->user();
        $isAutoApproved = in_array($user->role, ['admin', 'head of tourism'], true);

        $budgetRequest = BudgetRequest::query()->create([
            'request_number' => BudgetRequest::generateUniqueRequestNumber($user->id),
            'title' => $data['description'],
            'status' => $isAutoApproved ? 'completed' : 'pending',
            'created_by' => $user->id,
            'submitted_at' => now(),
        ]);

        $this->workflow->createStepsForRequest($budgetRequest);

        if ($isAutoApproved) {
            $budgetRequest->steps()->update([
                'approved' => true,
                'approved_at' => now(),
            ]);
            // Reload steps and re-derive status so refreshRequestMeta sees all steps approved
            $this->workflow->refreshRequestMeta($budgetRequest->fresh('steps'));
        }

        $this->notifications->notifyNewSubmission($budgetRequest->fresh('creator'));

        $transaction = Transaction::create([
            ...$data,
            'created_by' => $user->id,
            'budget_request_id' => $budgetRequest->id,
            // For auto-approved users the workflow already set visibility; set it explicitly here too
            'is_visible_in_transactions' => $isAutoApproved,
        ]);

        // If an initial obligated amount was provided, record it as an obligation entry
        if ($transaction->obligated_amount > 0) {
            $transaction->obligationEntries()->create([
                'amount' => $transaction->obligated_amount,
                'date' => $transaction->transaction_date ?? now()->toDateString(),
                'note' => 'Initial obligation',
                'created_by' => $request->user()->id,
            ]);
        }

        $transaction->load([
            'category:id,name',
            'creator:id,full_name',
            'obligationEntries.creator:id,full_name',
        ]);

        // Log transaction creation
        SystemLog::log(
            $request->user()->id,
            'CREATE',
            'Transaction',
            "Added new transaction: {$transaction->description}",
            $transaction->id,
            [
                'transaction_date' => $transaction->transaction_date,
                'description' => $transaction->description,
                'category' => $transaction->category?->name,
                'allocated_amount' => $transaction->allocated_amount,
                'obligated_amount' => $transaction->obligated_amount,
            ],
            $request
        );

        return response()->json([
            'data' => $this->formatTransaction($transaction),
        ], 201);
    }

    /**
     * Add an incremental obligation entry to a transaction
     */
    public function addObligation(Request $request, Transaction $transaction)
    {
        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1'],
            'date'   => ['nullable', 'date'],
            'note'   => ['nullable', 'string', 'max:255'],
        ]);

        $this->authorizeTransactionUpdate($request, $transaction);

        $newTotalObligated = (int) $transaction->obligated_amount + (int) $data['amount'];

        if ($newTotalObligated > (int) $transaction->allocated_amount) {
            $excess = $newTotalObligated - (int) $transaction->allocated_amount;
            throw new HttpResponseException(response()->json([
                'message' => "This obligation entry would exceed the allocated ₱" . number_format($transaction->allocated_amount, 2) . " by ₱" . number_format($excess, 2) . ".",
            ], 422));
        }

        $this->ensureWithinBudget([
            'allocated_amount' => $transaction->allocated_amount,
            'obligated_amount' => $newTotalObligated,
        ], $transaction);

        $entry = $transaction->obligationEntries()->create([
            'amount'     => $data['amount'],
            'date'       => $data['date'] ?? now()->toDateString(),
            'note'       => $data['note'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        $oldObligated = $transaction->obligated_amount;
        $transaction->update([
            'obligated_amount' => $newTotalObligated,
        ]);

        // Log audit trail
        SystemLog::log(
            $request->user()->id,
            'UPDATE',
            'Transaction',
            "Added obligation of ₱" . number_format($data['amount'], 2) . " to transaction #{$transaction->id} ({$transaction->description}). Total obligated: ₱" . number_format($newTotalObligated, 2),
            $transaction->id,
            [
                'obligation_entry_id' => $entry->id,
                'amount_added'        => $data['amount'],
                'old_obligated_amount'=> $oldObligated,
                'new_total_obligated' => $newTotalObligated,
                'note'                => $data['note'] ?? null,
            ],
            $request
        );

        $transaction->load([
            'category:id,name',
            'creator:id,full_name',
            'budgetRequest:id,request_number',
            'obligationEntries.creator:id,full_name',
        ]);

        return response()->json([
            'data' => $this->formatTransaction($transaction),
            'message' => 'Obligation added successfully',
        ]);
    }

    public function update(Request $request, Transaction $transaction)
    {
        // If 'amount' is passed, treat as addObligation
        if ($request->has('amount')) {
            return $this->addObligation($request, $transaction);
        }

        $data = $request->validate([
            'obligated_amount' => ['required', 'integer', 'min:0'],
            'date' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $this->authorizeTransactionUpdate($request, $transaction);
        $this->ensureWithinBudget([
            'allocated_amount' => $transaction->allocated_amount,
            'obligated_amount' => $data['obligated_amount'],
        ], $transaction);

        $oldObligated = (int) $transaction->obligated_amount;
        $newObligated = (int) $data['obligated_amount'];
        $diff = $newObligated - $oldObligated;

        if ($diff > 0) {
            $transaction->obligationEntries()->create([
                'amount' => $diff,
                'date' => $data['date'] ?? now()->toDateString(),
                'note' => $data['note'] ?? 'Obligation update',
                'created_by' => $request->user()->id,
            ]);
        }

        $transaction->update([
            'obligated_amount' => $newObligated,
        ]);

        SystemLog::log(
            $request->user()->id,
            'UPDATE',
            'Transaction',
            "Updated obligated amount for transaction #{$transaction->id} ({$transaction->description}): ₱" . number_format($oldObligated, 2) . " → ₱" . number_format($newObligated, 2),
            $transaction->id,
            [
                'old_obligated_amount' => $oldObligated,
                'new_obligated_amount' => $newObligated,
                'allocated_amount' => $transaction->allocated_amount,
            ],
            $request
        );

        $transaction->load([
            'category:id,name',
            'creator:id,full_name',
            'budgetRequest:id,request_number',
            'obligationEntries.creator:id,full_name',
        ]);

        return response()->json([
            'data' => $this->formatTransaction($transaction),
        ]);
    }

    public function destroy(Request $request, Transaction $transaction)
    {
        $this->authorizeTransactionDelete($request, $transaction);

        SystemLog::log(
            $request->user()->id,
            'DELETE',
            'Transaction',
            "Deleted transaction: {$transaction->description}",
            $transaction->id,
            null,
            $request
        );

        $categoryId = $transaction->category_id;
        $transaction->delete();

        // If category is a custom category (allocation = 0) and has no remaining transactions, delete it
        if ($categoryId) {
            $category = Category::find($categoryId);
            if ($category && (int) $category->allocation === 0 && Transaction::where('category_id', $categoryId)->count() === 0) {
                $category->delete();
            }
        }

        return response()->json(['success' => true]);
    }
}
