<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\Category;
use App\Models\Transaction;

class DashboardController extends Controller
{
    public function stats()
    {
        $categories = Category::query()
            ->withSum('transactions as obligated', 'obligated_amount')
            ->withSum('transactions as allocated', 'allocated_amount')
            ->orderBy('id')
            ->get();

        // Only include categories with actual transactions
        $categoryStats = $categories->filter(function (Category $c) {
            $allocated = (int) ($c->allocated ?? 0);
            return $allocated > 0;
        })->map(function (Category $c) {
            $allocation = (int) ($c->allocated ?? 0);
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

        $totalAllocated = (int) Transaction::query()->sum('allocated_amount');
        $totalObligated = (int) Transaction::query()->sum('obligated_amount');
        
        $latestBudget = Budget::latest()->first();
        $totalBudget = $latestBudget ? (float) $latestBudget->total_budget : $totalAllocated;
        
        $remainingBalance = max(0, $totalBudget - $totalObligated);
        $overallUtilization = $totalBudget > 0 ? round(($totalObligated / $totalBudget) * 100, 2) : 0;

        return response()->json([
            'data' => [
                'categories' => $categoryStats,
                'total_budget' => $totalBudget,
                'total_obligated' => $totalObligated,
                'remaining_balance' => $remainingBalance,
                'overall_utilization' => $overallUtilization,
            ],
        ]);
    }
}

