<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetApprovalStep;
use App\Models\BudgetRequest;
use App\Models\User;
use App\Models\SystemLog;
use App\Services\BudgetRequestWorkflow;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BudgetApprovalController extends Controller
{
    public function __construct(
        private BudgetRequestWorkflow $requestWorkflow,
        private NotificationService $notifications
    ) {
    }

    private const DEFAULT_STEPS = [
        'Budget Requested',
        'Department Head',
        'Budget Office',
        'Finance Office',
        "Mayor's Office",
        'Completed',
    ];

    public function index()
    {
        $this->ensureDefaultSteps();

        $steps = BudgetApprovalStep::query()
            ->orderBy('sort_order')
            ->get()
            ->map(fn (BudgetApprovalStep $step) => $this->formatStep($step));

        return response()->json(['data' => $steps]);
    }

    public function approve(Request $request, BudgetApprovalStep $step)
    {
        $this->ensureDefaultSteps();

        /** @var User $user */
        $user = $request->user();

        if (!$this->canApproveStep($user, $step)) {
            return response()->json(['message' => 'You are not authorized to approve this step'], 403);
        }

        $current = $this->currentApprovableStep();

        if (!$current || $current->id !== $step->id) {
            return response()->json(['message' => 'This step is not awaiting approval'], 422);
        }

        $step->forceFill([
            'approved' => true,
            'approved_at' => now(),
            'approved_by' => $user->id,
        ])->save();

        $this->maybeCompleteWorkflow();

        $affectedRequests = BudgetRequest::query()
            ->where('status', '!=', 'rejected')
            ->with(['steps', 'creator'])
            ->get()
            ->filter(fn (BudgetRequest $r) => $this->requestWorkflow->currentApprovableStep($r)?->name === $step->name);

        $this->requestWorkflow->syncApprovedStep($step->name);

        foreach ($affectedRequests as $budgetRequest) {
            $this->notifications->notifyStepApproved($budgetRequest->fresh(['steps', 'creator']), $step->name);
        }

        $steps = BudgetApprovalStep::query()
            ->orderBy('sort_order')
            ->get()
            ->map(fn (BudgetApprovalStep $s) => $this->formatStep($s));

        // Log approval
        SystemLog::log(
            $user->id,
            'APPROVE',
            'ApprovalStep',
            "Approved step '{$step->name}'",
            $step->id,
            ['step' => $step->name, 'affected_requests' => count($affectedRequests)],
            $request
        );

        return response()->json([
            'message' => 'Approval recorded',
            'data' => $steps,
        ]);
    }

    private function ensureDefaultSteps(): void
    {
        if (BudgetApprovalStep::query()->exists()) {
            return;
        }

        foreach (self::DEFAULT_STEPS as $index => $name) {
            $approved = $name === 'Budget Requested';

            BudgetApprovalStep::query()->create([
                'name' => $name,
                'sort_order' => $index + 1,
                'approved' => $approved,
                'approved_at' => $approved ? now() : null,
            ]);
        }
    }

    private function currentApprovableStep(): ?BudgetApprovalStep
    {
        return BudgetApprovalStep::query()
            ->where('approved', false)
            ->whereNotIn('name', ['Completed'])
            ->orderBy('sort_order')
            ->first();
    }

    private function maybeCompleteWorkflow(): void
    {
        $pending = BudgetApprovalStep::query()
            ->where('approved', false)
            ->whereNotIn('name', ['Completed'])
            ->exists();

        if ($pending) {
            return;
        }

        BudgetApprovalStep::query()
            ->where('name', 'Completed')
            ->where('approved', false)
            ->update([
                'approved' => true,
                'approved_at' => now(),
            ]);
    }

    private function canApproveStep(User $user, BudgetApprovalStep $step): bool
    {
        if (in_array($step->name, ['Budget Requested', 'Completed'], true)) {
            return false;
        }

        if ($user->role === 'head of tourism') {
            return true;
        }

        return $this->departmentMatches($user->department, $step->name);
    }

    private function departmentMatches(?string $userDepartment, string $stepName): bool
    {
        if (!$userDepartment) {
            return false;
        }

        $normalize = fn (?string $value) => Str::lower(trim((string) $value));

        $userNorm = $normalize($userDepartment);
        $stepNorm = $normalize($stepName);

        if ($userNorm === $stepNorm) {
            return true;
        }

        $aliases = [
            'department head' => ['department head', 'dept head', 'head of department'],
            'budget office' => ['budget office', 'office of the budget'],
            'finance office' => ['finance office', 'office of finance', 'finance'],
            "mayor's office" => ["mayor's office", 'office of the mayor', 'mayors office', 'mayor office'],
        ];

        foreach ($aliases as $canonical => $values) {
            if ($stepNorm === $canonical && in_array($userNorm, $values, true)) {
                return true;
            }
            if (in_array($stepNorm, $values, true) && in_array($userNorm, $values, true)) {
                return true;
            }
        }

        return str_contains($userNorm, $stepNorm) || str_contains($stepNorm, $userNorm);
    }

    private function formatStep(BudgetApprovalStep $step): array
    {
        return [
            'id' => $step->id,
            'name' => $step->name,
            'approved' => $step->approved,
            'date' => $step->approved_at
                ? Carbon::parse($step->approved_at)->format('M j, Y g:i A')
                : null,
        ];
    }
}
