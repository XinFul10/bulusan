<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::query()
            ->orderBy('name')
            ->get(['id', 'name', 'allocation']);

        return response()->json([
            'data' => $categories,
        ]);
    }

    public function updateAllocations(Request $request)
    {
        if ($request->user()?->role !== 'head of tourism') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'categories' => ['required', 'array', 'min:1'],
            'categories.*.id' => ['required', 'integer', 'exists:categories,id'],
            'categories.*.allocation' => ['required', 'numeric', 'min:0'],
        ]);

        foreach ($data['categories'] as $item) {
            Category::query()
                ->where('id', $item['id'])
                ->update(['allocation' => (int) round($item['allocation'])]);
        }

        $totalBudget = (int) Category::query()->sum('allocation');

        Budget::query()->create([
            'total_budget' => $totalBudget,
            'set_by' => $request->user()->id,
        ]);

        $categories = Category::query()
            ->orderBy('name')
            ->get(['id', 'name', 'allocation']);

        return response()->json([
            'message' => 'Category budgets updated successfully',
            'total_budget' => $totalBudget,
            'data' => $categories,
        ]);
    }
}
