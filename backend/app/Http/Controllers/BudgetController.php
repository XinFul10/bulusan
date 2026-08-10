<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BudgetController extends Controller
{
    public function setBudget(Request $request)
    {
        $user = Auth::user();
        if ($user->role !== 'head of tourism') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'total_budget' => 'required|numeric|min:0',
        ]);

        $budget = Budget::create([
            'total_budget' => $request->total_budget,
            'set_by' => $user->id,
        ]);

        return response()->json(['message' => 'Budget set successfully', 'budget' => $budget]);
    }

    public function getCurrentBudget()
    {
        $budget = Budget::latest()->first();

        return response()->json(['budget' => $budget]);
    }
}
