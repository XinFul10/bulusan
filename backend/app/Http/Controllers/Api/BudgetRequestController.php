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
        $this->ensureSampleRequests($request->user());

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

    private function canApproveStep(User $user, BudgetRequestStep $step): bool
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

    private function canViewAllRequests(User $user): bool
    {
        if ($user->role === 'admin' || $user->role === 'head of tourism') {
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

        $normalizedRole = strtolower(str_replace(['_', '-'], ' ', (string) $user->role));
        $normalizedDepartment = strtolower(str_replace(['_', '-'], ' ', (string) $user->department));

        return in_array($normalizedRole, $approvedDepartments, true)
            || in_array($normalizedDepartment, $approvedDepartments, true)
            || str_contains($normalizedDepartment, 'department head')
            || str_contains($normalizedDepartment, 'budget office')
            || str_contains($normalizedDepartment, 'finance office')
            || str_contains($normalizedDepartment, "mayor's office")
            || str_contains($normalizedDepartment, 'mayor office');
    }

    private function ensureSampleRequests(User $user): void
    {
        if (BudgetRequest::query()->where('created_by', $user->id)->exists()) {
            return;
        }

        $samples = [
            [
                'title' => 'IT Equipment Purchase',
                'submitted_at' => now()->subDays(2),
                'step_approvals' => ['Department Head', 'Budget Office'],
            ],
            [
                'title' => 'Tourism Promotion Materials',
                'submitted_at' => now()->subDay(),
                'step_approvals' => ['Department Head'],
            ],
            [
                'title' => 'Staff Training Workshop',
                'submitted_at' => now(),
                'step_approvals' => [],
            ],
        ];

        foreach ($samples as $index => $sample) {
            $requestNumber = sprintf('BR-%s-%03d-%d', now()->format('Y'), $index + 1, $user->id);

            $budgetRequest = BudgetRequest::query()->create([
                'request_number' => $requestNumber,
                'title' => $sample['title'],
                'status' => 'pending',
                'created_by' => $user->id,
                'submitted_at' => $sample['submitted_at'],
            ]);

            $this->workflow->createStepsForRequest($budgetRequest);

            foreach ($sample['step_approvals'] as $stepName) {
                $step = $budgetRequest->steps()->where('name', $stepName)->first();
                if ($step) {
                    $step->forceFill([
                        'approved' => true,
                        'approved_at' => now(),
                    ])->save();
                }
            }

            $this->workflow->refreshRequestMeta($budgetRequest->fresh('steps'));
        }
    }
}
