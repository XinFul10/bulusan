<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\Request;

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

        $transaction = Transaction::create([
            ...$data,
            'obligated_amount' => $data['obligated_amount'] ?? 0,
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

    public function destroy(Transaction $transaction)
    {
        $transaction->delete();

        return response()->json(['success' => true]);
    }
}

