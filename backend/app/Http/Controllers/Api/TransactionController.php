<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Http\Exceptions\HttpResponseException;

class TransactionController extends Controller
{
    public function index()
    {
        $transactions = Transaction::query()
            ->with('category:id,name')
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->get();

        $data = $transactions->map(fn (Transaction $t) => [
            'id' => $t->id,
            'transaction_date' => $t->transaction_date->toDateString(),
            'description' => $t->description,
            'category_id' => $t->category_id,
            'category_name' => $t->category?->name,
            'a_b_test' => $t->a_b_test,
            'allocated_amount' => (int) $t->allocated_amount,
            'obligated_amount' => (int) $t->obligated_amount,
            'balance' => (int) max(0, ((int) $t->allocated_amount) - ((int) $t->obligated_amount)),
            'created_by' => $t->created_by,
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
        if ($request->user()->role !== 'admin') {
            abort(403, 'Only admins may delete transactions.');
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'transaction_date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'a_b_test' => ['nullable', 'string', 'max:50'],
            'allocated_amount' => ['required', 'integer', 'min:0'],
            'obligated_amount' => ['nullable', 'integer', 'min:0'],
        ]);

        $data['obligated_amount'] = $data['obligated_amount'] ?? 0;
        $this->ensureWithinBudget($data);

        $transaction = Transaction::create([
            ...$data,
            'created_by' => $request->user()->id,
        ])->load('category:id,name');

        return response()->json([
            'data' => [
                'id' => $transaction->id,
                'transaction_date' => $transaction->transaction_date->toDateString(),
                'description' => $transaction->description,
                'category_id' => $transaction->category_id,
                'category_name' => $transaction->category?->name,
                'a_b_test' => $transaction->a_b_test,
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
            'category_id' => ['sometimes', 'integer', 'exists:categories,id'],
            'a_b_test' => ['nullable', 'string', 'max:50'],
            'allocated_amount' => ['sometimes', 'integer', 'min:0'],
            'obligated_amount' => ['sometimes', 'integer', 'min:0'],
        ]);

        if (array_key_exists('obligated_amount', $data) && $data['obligated_amount'] === null) {
            $data['obligated_amount'] = 0;
        }

        $this->authorizeTransactionUpdate($request, $transaction);
        $this->ensureWithinBudget(array_merge([
            'allocated_amount' => $transaction->allocated_amount,
            'obligated_amount' => $transaction->obligated_amount,
        ], $data), $transaction);

        $transaction->fill($data)->save();
        $transaction->load('category:id,name');

        return response()->json([
            'data' => [
                'id' => $transaction->id,
                'transaction_date' => $transaction->transaction_date->toDateString(),
                'description' => $transaction->description,
                'category_id' => $transaction->category_id,
                'category_name' => $transaction->category?->name,
                'a_b_test' => $transaction->a_b_test,
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

