<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\Category;
use App\Models\Transaction;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function stats()
    {
        $categories = Category::query()
            ->withSum('transactions as obligated', 'obligated_amount')
            ->withSum('transactions as allocated', 'allocated_amount')
            ->orderBy('id')
            ->get();

        $categoryStats = $categories->filter(function (Category $c) {
            return (int) $c->allocation > 0;
        })->map(function (Category $c) {
            $allocation = (int) $c->allocation;
            $obligated = (int) ($c->obligated ?? 0);
            $balance = max(0, $allocation - $obligated);
            $percentage = $allocation > 0 ? round(($obligated / $allocation) * 100) : 0;

            return [
                'id' => $c->id,
                'name' => $c->name,
                'allocation' => $allocation,
                'obligated' => $obligated,
                'balance' => $balance,
                'percentage' => $percentage,
            ];
        })->values();

        $totalObligated = (int) Transaction::query()->sum('obligated_amount');

        $latestBudget = Budget::latest()->first();
        $categoryTotal = (int) Category::query()->sum('allocation');
        $totalBudget = $latestBudget
            ? (float) $latestBudget->total_budget
            : ($categoryTotal > 0 ? $categoryTotal : 0);
        
        $remainingBalance = max(0, $totalBudget - $totalObligated);
        $overallUtilization = $totalBudget > 0 ? round(($totalObligated / $totalBudget) * 100, 2) : 0;

        $recentTransactions = Transaction::query()
            ->with(['creator:id,full_name', 'category:id,name'])
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(function (Transaction $t) {
                return [
                    'id' => $t->id,
                    'transaction_date' => Carbon::parse($t->transaction_date)->toDateString(),
                    'description' => $t->description,
                    'category_name' => $t->category?->name,
                    'creator_name' => $t->creator?->full_name,
                    'allocated_amount' => (int) $t->allocated_amount,
                    'obligated_amount' => (int) $t->obligated_amount,
                    'balance' => (int) max(0, ((int) $t->allocated_amount) - ((int) $t->obligated_amount)),
                ];
            });

        return response()->json([
            'data' => [
                'categories' => $categoryStats,
                'total_budget' => $totalBudget,
                'total_obligated' => $totalObligated,
                'remaining_balance' => $remainingBalance,
                'overall_utilization' => $overallUtilization,
                'recent_transactions' => $recentTransactions,
            ],
        ]);
    }
}

