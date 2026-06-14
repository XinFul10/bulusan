<?php

namespace App\Services;

use App\Models\BudgetRequest;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class NotificationService
{
    private const DEPARTMENT_STEPS = [
        'Department Head',
        'Budget Office',
        'Finance Office',
        "Mayor's Office",
    ];

    public function notifyNewSubmission(BudgetRequest $request): void
    {
        $request->loadMissing('creator');
        $requestNumber = $request->request_number;
        $firstApprover = self::DEPARTMENT_STEPS[0];

        $this->notifyDepartment(
            $firstApprover,
            'New Budget Request',
            "New budget request {$requestNumber} is awaiting your approval.",
            'approval_request',
            $request
        );

        $this->notifyAdmins(
            'New Budget Request',
            "New budget request {$requestNumber} was submitted and is awaiting {$firstApprover} approval.",
            'system',
            $request
        );
    }

    public function notifyStepApproved(BudgetRequest $request, string $approvedStepName): void
    {
        $request->loadMissing(['creator', 'steps']);
        $requestNumber = $request->request_number;

        if ($request->created_by) {
            $isFullyApproved = $this->allDepartmentStepsApproved($request);

            if ($isFullyApproved) {
                $this->create(
                    $request->created_by,
                    'Budget Request Fully Approved',
                    "Your budget request {$requestNumber} has been fully approved.",
                    'approval_update',
                    $request
                );
            } else {
                $this->create(
                    $request->created_by,
                    'Budget Request Approved',
                    "Your request {$requestNumber} was approved by {$approvedStepName}.",
                    'approval_update',
                    $request
                );
            }
        }

        $this->notifyAdmins(
            'Approval Recorded',
            "Budget request {$requestNumber} was approved by {$approvedStepName}.",
            'system',
            $request
        );

        if ($this->allDepartmentStepsApproved($request)) {
            return;
        }

        $nextStep = $this->nextPendingStep($request);
        if ($nextStep) {
            $this->notifyDepartment(
                $nextStep,
                'Approval Required',
                "Budget request {$requestNumber} is awaiting your approval.",
                'approval_request',
                $request
            );
        }
    }

    public function notifyRejection(BudgetRequest $request, string $department, string $reason): void
    {
        $request->loadMissing('creator');
        $requestNumber = $request->request_number;

        $message = "Your request {$requestNumber} was rejected by {$department}.\nReason: {$reason}";

        if ($request->created_by) {
            $this->create(
                $request->created_by,
                'Budget Request Rejected',
                $message,
                'rejection',
                $request
            );
        }

        $this->notifyAdmins(
            'Budget Request Rejected',
            "Budget request {$requestNumber} was rejected by {$department}.",
            'system',
            $request
        );
    }

    public function findUsersByDepartment(string $stepName): Collection
    {
        return User::query()
            ->where('status', 'active')
            ->get()
            ->filter(fn (User $user) => $this->departmentMatches($user->department, $stepName));
    }

    public function isApproverDepartment(User $user): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        foreach (self::DEPARTMENT_STEPS as $step) {
            if ($this->departmentMatches($user->department, $step)) {
                return true;
            }
        }

        return false;
    }

    private function notifyAdmins(
        string $title,
        string $message,
        string $type,
        ?BudgetRequest $request = null
    ): void {
        $admins = User::query()
            ->where('role', 'admin')
            ->where('status', 'active')
            ->get();

        foreach ($admins as $admin) {
            $this->create($admin->id, $title, $message, $type, $request);
        }
    }

    private function notifyDepartment(
        string $department,
        string $title,
        string $message,
        string $type,
        BudgetRequest $request
    ): void {
        $users = $this->findUsersByDepartment($department);

        foreach ($users as $user) {
            $this->create($user->id, $title, $message, $type, $request);
        }
    }

    private function create(
        int $userId,
        string $title,
        string $message,
        string $type,
        ?BudgetRequest $request = null,
        ?string $targetPage = null
    ): void {
        Notification::query()->create([
            'user_id' => $userId,
            'budget_request_id' => $request?->id,
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'target_page' => $targetPage ?? $this->resolveTargetPage($type, $title),
        ]);
    }

    private function resolveTargetPage(string $type, string $title): string
    {
        if ($type === 'approval_update' && str_contains($title, 'Fully Approved')) {
            return '/transactions';
        }

        return '/tracking';
    }

    private function allDepartmentStepsApproved(BudgetRequest $request): bool
    {
        $deptSteps = $request->steps->filter(
            fn ($step) => in_array($step->name, self::DEPARTMENT_STEPS, true)
        );

        return $deptSteps->isNotEmpty() && $deptSteps->every(fn ($s) => $s->approved);
    }

    private function nextPendingStep(BudgetRequest $request): ?string
    {
        foreach (self::DEPARTMENT_STEPS as $stepName) {
            $step = $request->steps->firstWhere('name', $stepName);
            if ($step && ! $step->approved) {
                return $stepName;
            }
        }

        return null;
    }

    private function departmentMatches(?string $userDepartment, string $stepName): bool
    {
        if (! $userDepartment) {
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
}
