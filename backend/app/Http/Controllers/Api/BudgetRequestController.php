<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetRequest;
use App\Models\BudgetRequestStep;
use App\Models\User;
use App\Models\SystemLog;
use App\Services\BudgetRequestWorkflow;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BudgetRequestController extends Controller
{
    public function __construct(
        private BudgetRequestWorkflow $workflow,
        private NotificationService $notifications
    ) {
    }

    public function index(Request $request)
    {
        $query = BudgetRequest::query()
            ->with(['steps', 'creator:id,full_name'])
            ->orderByDesc('submitted_at');

        /** @var User $user */
        $user = $request->user();

        // Only approval-capable roles should see every request in tracking.
        // Other staff roles remain limited to their own submissions.
        if (!$this->canViewAllRequests($user)) {
            $query->where('created_by', $user->id);
        }

        $requests = $query->get()->map(fn (BudgetRequest $r) => $this->workflow->formatRequest($r));

        return response()->json(['data' => $requests]);
    }

    public function approveStep(Request $request, BudgetRequest $budgetRequest, BudgetRequestStep $budgetRequestStep)
    {
        /** @var User $user */
        $user = $request->user();

        if (!$this->canViewAllRequests($user) && $budgetRequest->created_by !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $step = $budgetRequest->steps()->find($budgetRequestStep->id);

        if (!$step) {
            return response()->json(['message' => 'Approval step not found'], 404);
        }

        if (in_array($step->name, ['Budget Requested', 'Completed'], true)) {
            return response()->json(['message' => 'This step cannot be approved'], 422);
        }

        if (!$this->canApproveStep($user, $step)) {
            return response()->json(['message' => 'You are not authorized to approve this step'], 403);
        }

        $current = $this->workflow->currentApprovableStep($budgetRequest->fresh('steps'));

        if (!$current || $current->id !== $step->id) {
            return response()->json(['message' => 'This step is not awaiting approval'], 422);
        }

        $step->forceFill([
            'approved' => true,
            'approved_at' => now(),
        ])->save();

        $this->workflow->completeIfAllApproved($budgetRequest->fresh('steps'));
        $this->workflow->refreshRequestMeta($budgetRequest->fresh('steps'));

        $freshRequest = $budgetRequest->fresh(['steps', 'creator']);
        $this->notifications->notifyStepApproved($freshRequest, $step->name);

        // Log approval
        SystemLog::log(
            $user->id,
            'APPROVE',
            'BudgetRequest',
            "Approved step '{$step->name}' for request {$budgetRequest->request_number}",
            $budgetRequest->id,
            ['step' => $step->name, 'request_number' => $budgetRequest->request_number],
            $request
        );

        return response()->json([
            'message' => 'Approval recorded',
            'data' => $this->workflow->formatRequest($freshRequest),
        ]);
    }

    public function rejectStep(Request $request, BudgetRequest $budgetRequest, BudgetRequestStep $budgetRequestStep)
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        if (!$this->canViewAllRequests($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $step = $budgetRequest->steps()->find($budgetRequestStep->id);

        if (!$step) {
            return response()->json(['message' => 'Approval step not found'], 404);
        }

        if (in_array($step->name, ['Budget Requested', 'Completed'], true)) {
            return response()->json(['message' => 'This step cannot be rejected'], 422);
        }

        if (!$this->canApproveStep($user, $step)) {
            return response()->json(['message' => 'You are not authorized to reject this step'], 403);
        }

        $current = $this->workflow->currentApprovableStep($budgetRequest->fresh('steps'));

        if ($user->role !== 'admin' && (!$current || $current->id !== $step->id)) {
            return response()->json(['message' => 'This step is not awaiting approval'], 422);
        }

        $budgetRequest->forceFill(['status' => 'rejected'])->save();

        $this->notifications->notifyRejection($budgetRequest->fresh('creator'), $step->name, $data['reason']);

        return response()->json([
            'message' => 'Request rejected',
            'data' => $this->workflow->formatRequest($budgetRequest->fresh(['steps', 'creator'])),
        ]);
    }

    public function show(Request $request, BudgetRequest $budgetRequest)
    {
        /** @var User $user */
        $user = $request->user();

        if (!$this->canViewAllRequests($user) && $budgetRequest->created_by !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'data' => $this->workflow->formatRequest($budgetRequest->load(['steps', 'creator'])),
        ]);
    }

    public function adminApproveStage(Request $request, BudgetRequest $budgetRequest)
    {
        /** @var User $user */
        $user = $request->user();

        if (!$this->isPrivilegedRole($user)) {
            return response()->json(['message' => 'Unauthorized — Admin or Head of Tourism only'], 403);
        }

        $freshRequest = $budgetRequest->fresh('steps');
        $current = $this->workflow->currentApprovableStep($freshRequest);

        if (!$current) {
            return response()->json(['message' => 'No pending stage to approve — request may already be completed.'], 422);
        }

        $stepName = $current->name;

        $current->forceFill([
            'approved'    => true,
            'approved_at' => now(),
        ])->save();

        $this->workflow->completeIfAllApproved($freshRequest->fresh('steps'));
        $this->workflow->refreshRequestMeta($freshRequest->fresh('steps'));

        $freshRequest = $budgetRequest->fresh(['steps', 'creator']);
        $this->notifications->notifyStepApproved($freshRequest, $stepName);

        SystemLog::log(
            $user->id,
            'ADMIN_APPROVE_STAGE',
            'BudgetRequest',
            "Admin override: {$user->full_name} approved stage '{$stepName}' on behalf of the department for request {$budgetRequest->request_number}",
            $budgetRequest->id,
            [
                'step'           => $stepName,
                'request_number' => $budgetRequest->request_number,
                'override_by'    => $user->full_name,
                'override_role'  => $user->role,
            ],
            $request
        );

        return response()->json([
            'message' => "Stage '{$stepName}' approved successfully.",
            'data'    => $this->workflow->formatRequest($freshRequest),
        ]);
    }

    public function adminFastTrack(Request $request, BudgetRequest $budgetRequest)
    {
        /** @var User $user */
        $user = $request->user();

        if (!$this->isPrivilegedRole($user)) {
            return response()->json(['message' => 'Unauthorized — Admin or Head of Tourism only'], 403);
        }

        if ($budgetRequest->status === 'rejected') {
            return response()->json(['message' => 'Cannot fast-track a rejected request.'], 422);
        }

        $freshRequest = $budgetRequest->fresh('steps');

        $pendingSteps = $freshRequest->steps->filter(
            fn ($s) => !$s->approved && !in_array($s->name, ['Budget Requested'], true)
        );

        if ($pendingSteps->isEmpty()) {
            return response()->json(['message' => 'Request is already fully completed.'], 422);
        }

        $bypassedNames = $pendingSteps
            ->filter(fn ($s) => $s->name !== 'Completed')
            ->pluck('name')
            ->values()
            ->all();

        // Approve all pending steps at once
        $pendingSteps->each(fn ($s) => $s->forceFill([
            'approved'    => true,
            'approved_at' => now(),
        ])->save());

        $this->workflow->refreshRequestMeta($budgetRequest->fresh('steps'));

        SystemLog::log(
            $user->id,
            'ADMIN_FAST_TRACK',
            'BudgetRequest',
            "Admin fast-track: {$user->full_name} bypassed " . implode(', ', $bypassedNames) . " for request {$budgetRequest->request_number}",
            $budgetRequest->id,
            [
                'bypassed_stages' => $bypassedNames,
                'request_number'  => $budgetRequest->request_number,
                'override_by'     => $user->full_name,
                'override_role'   => $user->role,
            ],
            $request
        );

        return response()->json([
            'message' => 'Request fast-tracked to Completed.',
            'data'    => $this->workflow->formatRequest($budgetRequest->fresh(['steps', 'creator'])),
        ]);
    }

    private function isPrivilegedRole(User $user): bool
    {
        return in_array($user->role, ['admin', 'head of tourism'], true);
    }

    private function canApproveStep(User $user, BudgetRequestStep $step): bool
    {
        if (in_array($step->name, ['Budget Requested', 'Completed'], true)) {
            return false;
        }

        if ($this->isPrivilegedRole($user)) {
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
            'budget office'   => ['budget office', 'office of the budget'],
            'finance office'  => ['finance office', 'office of finance', 'finance'],
            "mayor's office"  => ["mayor's office", 'office of the mayor', 'mayors office', 'mayor office'],
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

    private function canViewAllRequests(User $user): bool
    {
        if ($this->isPrivilegedRole($user)) {
            return true;
        }

        $approvedDepartments = [
            'department head',
            'budget office',
            'finance office',
            "mayor's office",
            'mayor office',
            'mayors office',
        ];

        $normalizedRole       = strtolower(str_replace(['_', '-'], ' ', (string) $user->role));
        $normalizedDepartment = strtolower(str_replace(['_', '-'], ' ', (string) $user->department));

        return in_array($normalizedRole, $approvedDepartments, true)
            || in_array($normalizedDepartment, $approvedDepartments, true)
            || str_contains($normalizedDepartment, 'department head')
            || str_contains($normalizedDepartment, 'budget office')
            || str_contains($normalizedDepartment, 'finance office')
            || str_contains($normalizedDepartment, "mayor's office")
            || str_contains($normalizedDepartment, 'mayor office');
    }
}
