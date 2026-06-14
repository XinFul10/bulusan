<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetRequest;
use App\Models\User;
use App\Services\BudgetRequestWorkflow;
use Illuminate\Http\Request;

class BudgetRequestController extends Controller
{
    public function __construct(private BudgetRequestWorkflow $workflow)
    {
    }

    public function index(Request $request)
    {
        $this->ensureSampleRequests($request->user());

        $query = BudgetRequest::query()
            ->with(['steps', 'creator:id,full_name'])
            ->orderByDesc('submitted_at');

        /** @var User $user */
        $user = $request->user();
        if ($user->role !== 'admin') {
            $query->where('created_by', $user->id);
        }

        $requests = $query->get()->map(fn (BudgetRequest $r) => $this->workflow->formatRequest($r));

        return response()->json(['data' => $requests]);
    }

    public function show(Request $request, BudgetRequest $budgetRequest)
    {
        /** @var User $user */
        $user = $request->user();
        if ($user->role !== 'admin' && $budgetRequest->created_by !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'data' => $this->workflow->formatRequest($budgetRequest->load(['steps', 'creator'])),
        ]);
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
