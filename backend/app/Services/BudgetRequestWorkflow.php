<?php

namespace App\Services;

use App\Models\BudgetRequest;
use App\Models\BudgetRequestStep;
use App\Models\Transaction;
use Carbon\Carbon;

class BudgetRequestWorkflow
{
    public const DEFAULT_STEPS = [
        'Budget Requested',
        'Department Head',
        'Budget Office',
        'Finance Office',
        "Mayor's Office",
        'Completed',
    ];

    private const DEPARTMENT_STEPS = [
        'Department Head',
        'Budget Office',
        'Finance Office',
        "Mayor's Office",
    ];

    public function createStepsForRequest(BudgetRequest $request): void
    {
        foreach (self::DEFAULT_STEPS as $index => $name) {
            $approved = $name === 'Budget Requested';

            BudgetRequestStep::query()->create([
                'budget_request_id' => $request->id,
                'name' => $name,
                'sort_order' => $index + 1,
                'approved' => $approved,
                'approved_at' => $approved ? $request->submitted_at : null,
            ]);
        }

        $this->refreshRequestMeta($request);
    }

    public function syncApprovedStep(string $stepName): void
    {
        if (in_array($stepName, ['Budget Requested', 'Completed'], true)) {
            if ($stepName === 'Completed') {
                return;
            }
        }

        BudgetRequest::query()
            ->where('status', '!=', 'rejected')
            ->with('steps')
            ->each(function (BudgetRequest $request) use ($stepName) {
                $current = $this->currentApprovableStep($request);
                if (!$current || $current->name !== $stepName) {
                    return;
                }

                $current->forceFill([
                    'approved' => true,
                    'approved_at' => now(),
                ])->save();

                $this->maybeCompleteRequest($request);
                $this->refreshRequestMeta($request->fresh('steps'));
            });
    }

    public function currentApprovableStep(BudgetRequest $request): ?BudgetRequestStep
    {
        return $request->steps
            ->first(fn (BudgetRequestStep $step) => !$step->approved && !in_array($step->name, ['Completed'], true));
    }

    public function currentDepartment(BudgetRequest $request): ?string
    {
        $completed = $request->steps->firstWhere('name', 'Completed');
        if ($completed?->approved) {
            return 'Completed';
        }

        $current = $this->currentApprovableStep($request);
        if (!$current) {
            return null;
        }

        if ($current->name === 'Budget Requested') {
            return self::DEPARTMENT_STEPS[0] ?? null;
        }

        if ($current->name === 'Completed') {
            return 'Completed';
        }

        return $current->name;
    }

    public function calculateProgress(BudgetRequest $request): int
    {
        $steps = $request->steps->filter(
            fn (BudgetRequestStep $step) => in_array($step->name, self::DEPARTMENT_STEPS, true)
        );

        if ($steps->isEmpty()) {
            return 0;
        }

        $approved = $steps->where('approved', true)->count();

        return (int) round(($approved / $steps->count()) * 100);
    }

    public function deriveStatus(BudgetRequest $request): string
    {
        if ($request->status === 'rejected') {
            return 'rejected';
        }

        $completed = $request->steps->firstWhere('name', 'Completed');

        if ($completed?->approved) {
            return 'completed';
        }

        $deptSteps = $request->steps->filter(
            fn (BudgetRequestStep $step) => in_array($step->name, self::DEPARTMENT_STEPS, true)
        );

        $allDeptsApproved = $deptSteps->isNotEmpty() && $deptSteps->every(fn ($s) => $s->approved);

        if ($allDeptsApproved) {
            return 'approved';
        }

        $approvedCount = $deptSteps->where('approved', true)->count();

        if ($approvedCount === 0) {
            return 'pending';
        }

        return 'under_review';
    }

    public function refreshRequestMeta(BudgetRequest $request): void
    {
        $request->load('steps');

        $status = $this->deriveStatus($request);
        $request->forceFill(['status' => $status])->save();

        if (in_array($status, ['approved', 'completed'], true)) {
            Transaction::query()
                ->where('budget_request_id', $request->id)
                ->update(['is_visible_in_transactions' => true]);
        }
    }

    private function maybeCompleteRequest(BudgetRequest $request): void
    {
        $pending = $request->steps
            ->filter(fn (BudgetRequestStep $step) => !in_array($step->name, ['Completed'], true))
            ->contains(fn (BudgetRequestStep $step) => !$step->approved);

        if ($pending) {
            return;
        }

        $completed = $request->steps->firstWhere('name', 'Completed');
        if ($completed && !$completed->approved) {
            $completed->forceFill([
                'approved' => true,
                'approved_at' => now(),
            ])->save();
        }
    }

    public function formatStep(BudgetRequestStep $step): array
    {
        return [
            'id' => $step->id,
            'name' => $step->name,
            'approved' => $step->approved,
            'date' => $step->approved_at
                ? Carbon::parse($step->approved_at)->format('M j, Y')
                : null,
        ];
    }

    public function formatRequest(BudgetRequest $request): array
    {
        $request->loadMissing(['steps', 'creator']);

        $status = $this->deriveStatus($request);
        $statusLabels = [
            'pending' => 'Pending',
            'under_review' => 'Under Review',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            'completed' => 'Completed',
        ];

        return [
            'id' => $request->request_number,
            'requestId' => $request->request_number,
            'title' => $request->title,
            'requestedBy' => $request->creator?->full_name ?? 'Unknown',
            'currentDepartment' => $this->currentDepartment($request) ?? '—',
            'status' => $statusLabels[$status] ?? 'Pending',
            'statusKey' => $status,
            'progress' => $this->calculateProgress($request),
            'submittedDate' => Carbon::parse($request->submitted_at)->format('M j, Y'),
            'departments' => $request->steps->map(fn ($s) => $this->formatStep($s))->values()->all(),
        ];
    }
}
