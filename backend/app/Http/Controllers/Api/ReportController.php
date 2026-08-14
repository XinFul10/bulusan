<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Report;
use App\Models\ReportVerification;
use App\Models\Transaction;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    // List all non-deleted reports (all authenticated users can see all reports)
    public function index(Request $request)
    {
        // SoftDeletes scope is applied automatically; only non-deleted rows are returned
        $reports = Report::query()->with('creator')->orderBy('created_at', 'desc')->get();

        return response()->json([
            'data' => $reports->map(fn (Report $r) => $this->formatReport($r)),
        ]);
    }

    // Create new report
    public function store(Request $request)
    {
        $data = $request->validate([
            'type'              => ['required', 'string'],
            'type_label'        => ['required', 'string'],
            'date_from'         => ['nullable', 'date'],
            'date_to'           => ['nullable', 'date'],
            'category'          => ['nullable', 'string'],
            'verification_code' => ['nullable', 'string'],
            'description'       => ['nullable', 'string', 'max:2000'],
        ]);

        // Resolve category display name and compute data
        $categoryParam = $data['category'] ?? 'All';
        $categoryDisplay = 'All';
        if ($categoryParam && $categoryParam !== 'All') {
            $catModel = is_numeric($categoryParam)
                ? Category::find($categoryParam)
                : Category::where('name', $categoryParam)->first();
            $categoryDisplay = $catModel ? $catModel->name : $categoryParam;
        }

        // Calculate real report data from transactions
        $reportData = $this->calculateReportData(
            $data['date_from'] ?? null,
            $data['date_to']   ?? null,
            $data['category']  ?? null
        );

        $report = Report::create([
            ...$data,
            'category'   => $categoryDisplay,
            'data'       => $reportData,
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

    /**
     * Verify a report by its verification code.
     *
     * Intentionally searches ALL rows — including soft-deleted ones — so that
     * a code printed on a shared/exported report remains verifiable even after
     * the owner removes the report from their Saved Reports list.
     */
    public function verify(Request $request)
    {
        $request->validate([
            'code' => ['required', 'string'],
        ]);

        $code = $request->input('code');

        // withTrashed() bypasses the soft-delete global scope so deleted
        // reports are still found by their immutable verification code.
        $report = Report::withTrashed()
            ->with('creator')
            ->where('verification_code', $code)
            ->first();

        if (! $report) {
            return response()->json([
                'valid'   => false,
                'message' => 'No report with this verification code exists in this system.',
            ]);
        }

        return response()->json([
            'valid'   => true,
            'message' => 'Valid! Report: ' . $report->type_label
                . ' (' . $report->created_at->format('M d, Y') . ')',
            'report'  => $this->formatReport($report, null, true),
        ]);
    }

    /**
     * Update only the description of a report.
     *
     * Works for soft-deleted reports too (withTrashed) so the description
     * can be edited from the verification flow even after the report is
     * removed from the Saved Reports list.
     */
    public function updateDescription(Request $request, int $id)
    {
        $data = $request->validate([
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        // Find with trashed so soft-deleted reports can still be annotated
        $report = Report::withTrashed()->findOrFail($id);

        $user = $request->user();
        if ($user->role !== 'admin' && $report->created_by !== $user->id) {
            abort(403, 'You can only edit descriptions on your own reports.');
        }

        $report->description = $data['description'] ?? null;
        $report->save();

        return response()->json(['success' => true, 'description' => $report->description]);
    }

    // Soft-delete report from the "Saved Reports" list.
    // The row is retained in the DB so its verification code stays verifiable.
    public function destroy(Request $request, Report $report)
    {
        $user = $request->user();

        if ($user->role !== 'admin' && $report->created_by !== $user->id) {
            abort(403, 'You can only delete your own reports.');
        }

        // SoftDeletes::delete() sets deleted_at; the row is NOT removed from DB
        $report->delete();

        return response()->json(['success' => true]);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Shared report shape used by index, store, and verify responses.
     *
     * @param  Report        $r
     * @param  mixed|null    $actingUser  Passed on store so we avoid an extra relationship load
     * @param  bool          $includeIsDeleted  Only verify response needs this flag
     */
    private function formatReport(Report $r, $actingUser = null, bool $includeIsDeleted = false): array
    {
        $creator = $r->relationLoaded('creator') ? $r->creator : null;

        $payload = [
            'id'                => $r->id,
            'type'              => $r->type,
            'type_label'        => $r->type_label,
            'date_from'         => $r->date_from?->toDateString(),
            'date_to'           => $r->date_to?->toDateString(),
            'category'          => $r->category,
            'data'              => $r->data,
            'generated_at'      => $r->created_at->toIso8601String(),
            'created_by'        => $actingUser
                ? ['id' => $actingUser->id, 'full_name' => $actingUser->full_name]
                : ($creator ? ['id' => $creator->id, 'full_name' => $creator->full_name] : null),
            'verification_code' => $r->verification_code,
            'description'       => $r->description,
        ];

        if ($includeIsDeleted) {
            $payload['is_deleted'] = ! is_null($r->deleted_at);
        }

        return $payload;
    }

    // Calculate real report data from transactions, embedding a per-category
    // transaction snapshot so the breakdown is available in the preview panel
    // and in PDF/Excel exports — even for soft-deleted / verified reports.
    private function calculateReportData($dateFrom, $dateTo, $category): array
    {
        $categories = Category::query();
        if ($category && $category !== 'All') {
            if (is_numeric($category)) {
                $categories->where('id', $category);
            } else {
                $categories->where('name', $category);
            }
        }
        $categories = $categories->get();

        $reportData = [];
        foreach ($categories as $cat) {
            $query = Transaction::query()
                ->with(['creator:id,full_name', 'obligationEntries.creator:id,full_name'])
                ->where('is_visible_in_transactions', true)
                ->where('category_id', $cat->id);

            if ($dateFrom) {
                $query->whereDate('transaction_date', '>=', $dateFrom);
            }
            if ($dateTo) {
                $query->whereDate('transaction_date', '<=', $dateTo);
            }

            $transactions = $query->orderBy('transaction_date')->get();

            $totalAllocated = (int) $transactions->sum('allocated_amount');
            $totalObligated = (int) $transactions->sum('obligated_amount');

            if ($totalAllocated > 0 || $totalObligated > 0 || $transactions->isNotEmpty()) {
                $reportData[] = [
                    'id'           => $cat->id,
                    'name'         => $cat->name,
                    'allocation'   => $totalAllocated,
                    'allocated'    => $totalAllocated,
                    'obligated'    => $totalObligated,
                    'balance'      => max(0, $totalAllocated - $totalObligated),
                    // Snapshot of individual transactions for the breakdown table
                    'transactions' => $transactions->map(fn (Transaction $t) => [
                        'id'                 => $t->id,
                        'date'               => $t->transaction_date->toDateString(),
                        'description'        => $t->description,
                        'created_by'         => $t->creator?->full_name ?? 'Unknown',
                        'allocated'          => (int) $t->allocated_amount,
                        'obligated'          => (int) $t->obligated_amount,
                        'balance'            => max(0, (int) $t->allocated_amount - (int) $t->obligated_amount),
                        'obligation_entries' => $t->obligationEntries->map(fn ($e) => [
                            'id'         => $e->id,
                            'amount'     => (int) $e->amount,
                            'date'       => Carbon::parse($e->date)->toDateString(),
                            'note'       => $e->note,
                            'created_by' => $e->creator?->full_name ?? 'Unknown',
                        ])->values()->all(),
                    ])->values()->all(),
                ];
            }
        }

        return $reportData;
    }
}
