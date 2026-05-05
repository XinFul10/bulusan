<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReportController extends Controller
{
    // List all reports (admin sees all, staff sees only their own)
    public function index(Request $request)
    {
        $user = $request->user();
        
        $query = Report::query()->with('creator');
        
        // If not admin, only show own reports
        if ($user->role !== 'admin') {
            $query->where('created_by', $user->id);
        }
        
        $reports = $query->orderBy('created_at', 'desc')->get();
        
        return response()->json([
            'data' => $reports->map(fn (Report $r) => [
                'id' => $r->id,
                'type' => $r->type,
                'type_label' => $r->type_label,
                'date_from' => $r->date_from?->toDateString(),
                'date_to' => $r->date_to?->toDateString(),
                'category' => $r->category,
                'data' => $r->data,
                'generated_at' => $r->created_at->toIso8601String(),
                'created_by' => [
                    'id' => $r->creator->id,
                    'full_name' => $r->creator->full_name,
                ],
            ]),
        ]);
    }

    // Create new report
    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'string'],
            'type_label' => ['required', 'string'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'category' => ['nullable', 'string'],
            'data' => ['required', 'array'],
        ]);

        $report = Report::create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => [
                'id' => $report->id,
                'type' => $report->type,
                'type_label' => $report->type_label,
                'date_from' => $report->date_from?->toDateString(),
                'date_to' => $report->date_to?->toDateString(),
                'category' => $report->category,
                'data' => $report->data,
                'generated_at' => $report->created_at->toIso8601String(),
                'created_by' => [
                    'id' => $request->user()->id,
                    'full_name' => $request->user()->full_name,
                ],
            ],
        ], 201);
    }

    // Delete report (admin can delete any, staff only their own)
    public function destroy(Request $request, Report $report)
    {
        $user = $request->user();
        
        // Check permission
        if ($user->role !== 'admin' && $report->created_by !== $user->id) {
            abort(403, 'You can only delete your own reports.');
        }
        
        $report->delete();
        
        return response()->json(['success' => true]);
    }
}
