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

    public function index()
    {
        $transactions = Transaction::query()
            ->where('is_visible_in_transactions', true)
            ->with(['category:id,name', 'creator:id,full_name', 'budgetRequest:id,request_number'])
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->get();

        $data = $transactions->map(fn (Transaction $t) => [
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
        ]);

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

        if ($data['allocated_amount'] > $latestBudget->total_budget) {
            throw new HttpResponseException(response()->json([
                'message' => 'Allocated amount cannot exceed the total budget of ₱' . number_format($latestBudget->total_budget, 2),
            ], 422));
        }

        if ($data['obligated_amount'] > $remainingBudget) {
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

        $nextNumber = BudgetRequest::query()
            ->whereYear('submitted_at', now()->year)
            ->count() + 1;

        $budgetRequest = BudgetRequest::query()->create([
            'request_number' => sprintf('BR-%s-%03d-%d', now()->format('Y'), $nextNumber, $request->user()->id),
            'title' => $data['description'],
            'status' => 'pending',
            'created_by' => $request->user()->id,
            'submitted_at' => now(),
        ]);

        $this->workflow->createStepsForRequest($budgetRequest);

        $this->notifications->notifyNewSubmission($budgetRequest->fresh('creator'));

        $transaction = Transaction::create([
            ...$data,
            'created_by' => $request->user()->id,
            'budget_request_id' => $budgetRequest->id,
            'is_visible_in_transactions' => false,
        ])->load(['category:id,name', 'creator:id,full_name']);

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
            'data' => [
                'id' => $transaction->id,
                'transaction_date' => Carbon::parse($transaction->transaction_date)->toDateString(),
                'description' => $transaction->description,
                'category_id' => $transaction->category_id,
                'category_name' => $transaction->category?->name,
                'creator_name' => $transaction->creator?->full_name,
                'allocated_amount' => (int) $transaction->allocated_amount,
                'obligated_amount' => (int) $transaction->obligated_amount,
                'balance' => (int) max(0, ((int) $transaction->allocated_amount) - ((int) $transaction->obligated_amount)),
                'created_by' => $transaction->created_by,
                'created_at' => $transaction->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function update(Request $request, Transaction $transaction)
    {
        $data = $request->validate([
            'transaction_date' => ['sometimes', 'date'],
            'description' => ['sometimes', 'string', 'max:255'],
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:categories,id', 'required_without:custom_category'],
            'custom_category' => ['sometimes', 'nullable', 'string', 'max:255', 'required_without:category_id'],
            'allocated_amount' => ['sometimes', 'integer', 'min:0'],
            'obligated_amount' => ['sometimes', 'integer', 'min:0'],
        ]);

        if (! empty($data['category_id']) && ! empty($data['custom_category'])) {
            throw new HttpResponseException(response()->json([
                'message' => 'Please choose either a preset category or a custom category, not both.',
            ], 422));
        }

        if (array_key_exists('obligated_amount', $data) && $data['obligated_amount'] === null) {
            $data['obligated_amount'] = 0;
        }

        if (! empty($data['custom_category']) && empty($data['category_id'])) {
            $category = Category::firstOrCreate(
                ['name' => trim($data['custom_category'])],
                ['allocation' => 0]
            );
            $data['category_id'] = $category->id;
        }

        if (array_key_exists('custom_category', $data)) {
            unset($data['custom_category']);
        }

        $this->authorizeTransactionUpdate($request, $transaction);
        $this->ensureWithinBudget(array_merge([
            'allocated_amount' => $transaction->allocated_amount,
            'obligated_amount' => $transaction->obligated_amount,
        ], $data), $transaction);

        $transaction->fill($data)->save();
        $transaction->load(['category:id,name', 'creator:id,full_name']);

        return response()->json([
            'data' => [
                'id' => $transaction->id,
                'transaction_date' => Carbon::parse($transaction->transaction_date)->toDateString(),
                'description' => $transaction->description,
                'category_id' => $transaction->category_id,
                'category_name' => $transaction->category?->name,
                'creator_name' => $transaction->creator?->full_name,
                'allocated_amount' => (int) $transaction->allocated_amount,
                'obligated_amount' => (int) $transaction->obligated_amount,
                'balance' => (int) max(0, ((int) $transaction->allocated_amount) - ((int) $transaction->obligated_amount)),
                'created_by' => $transaction->created_by,
                'created_at' => $transaction->created_at?->toIso8601String(),
            ],
        ]);
    }

    public function destroy(Request $request, Transaction $transaction)
    {
        $this->authorizeTransactionDelete($request, $transaction);

        $transaction->delete();

        return response()->json(['success' => true]);
    }
}

