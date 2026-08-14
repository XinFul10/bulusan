<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Report;
use App\Models\ReportVerification;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReportController extends Controller
{
    // List all reports (all authenticated users can see all reports)
    public function index(Request $request)
    {
        $user = $request->user();
        
        $query = Report::query()->with('creator');
        
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
                'verification_code' => $r->verification_code,
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
            'verification_code' => ['nullable', 'string'],
        ]);

        // Calculate real report data from transactions
        $reportData = $this->calculateReportData(
            $data['date_from'],
            $data['date_to'],
            $data['category']
        );

        $report = Report::create([
            ...$data,
            'data' => $reportData,
            'created_by' => $request->user()->id,
        ]);

        // Create verification record that persists even if report is deleted
        ReportVerification::create([
            'verification_code' => $report->verification_code,
            'type' => $report->type,
            'type_label' => $report->type_label,
            'date_from' => $report->date_from,
            'date_to' => $report->date_to,
            'category' => $report->category,
            'data' => $report->data,
            'generated_at' => $report->created_at,
            'created_by' => $request->user()->id,
            'is_deleted' => false,
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
                'verification_code' => $report->verification_code,
            ],
        ], 201);
    }

    // Calculate real report data from transactions
    private function calculateReportData($dateFrom, $dateTo, $category)
    {
        // Get all categories or specific one
        $categories = Category::query();
        if ($category && $category !== 'All') {
            $categories->where('id', $category);
        }
        $categories = $categories->get();

        // Calculate totals per category
        $reportData = [];
        foreach ($categories as $cat) {
            $query = Transaction::query();
            
            // Apply date filters
            if ($dateFrom) {
                $query->whereDate('transaction_date', '>=', $dateFrom);
            }
            if ($dateTo) {
                $query->whereDate('transaction_date', '<=', $dateTo);
            }
            
            // Filter by category
            $transactions = $query->where('category_id', $cat->id)->get();
            
            $totalAllocated = (int) $transactions->sum('allocated_amount');
            $totalObligated = (int) $transactions->sum('obligated_amount');
            
            // Only include categories with data
            if ($totalAllocated > 0) {
                $reportData[] = [
                    'id' => $cat->id,
                    'name' => $cat->name,
                    'allocation' => $totalAllocated,
                    'allocated' => $totalAllocated,
                    'obligated' => $totalObligated,
                    'balance' => max(0, $totalAllocated - $totalObligated),
                ];
            }
        }

        return $reportData;
    }

    // Delete report (admin can delete any, staff only their own)
    public function destroy(Request $request, Report $report)
    {
        $user = $request->user();
        
        // Check permission
        if ($user->role !== 'admin' && $report->created_by !== $user->id) {
            abort(403, 'You can only delete your own reports.');
        }
        
        // Mark verification record as deleted instead of removing it
        $verification = ReportVerification::where('verification_code', $report->verification_code)->first();
        if ($verification) {
            $verification->is_deleted = true;
            $verification->save();
        }
        
        $report->delete();
        
        return response()->json(['success' => true]);
    }

    // Verify report code (works even if report is deleted)
    public function verify(Request $request)
    {
        $request->validate([
            'verification_code' => ['required', 'string'],
        ]);

        $verification = ReportVerification::where('verification_code', $request->verification_code)->first();

        if (!$verification) {
            return response()->json([
                'valid' => false,
                'message' => 'Invalid verification code',
            ], 404);
        }

        return response()->json([
            'valid' => true,
            'message' => $verification->is_deleted 
                ? 'Valid verification code (original report has been deleted)' 
                : 'Valid verification code',
            'data' => [
                'type' => $verification->type,
                'type_label' => $verification->type_label,
                'date_from' => $verification->date_from?->toDateString(),
                'date_to' => $verification->date_to?->toDateString(),
                'category' => $verification->category,
                'data' => $verification->data,
                'generated_at' => $verification->generated_at->toIso8601String(),
                'created_by' => [
                    'id' => $verification->creator?->id,
                    'full_name' => $verification->creator?->full_name,
                ],
                'verification_code' => $verification->verification_code,
                'is_deleted' => $verification->is_deleted,
            ],
        ]);
    }
}
