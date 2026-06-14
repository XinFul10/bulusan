<?php

namespace Tests\Feature;

use App\Models\BudgetRequest;
use App\Models\BudgetRequestStep;
use App\Models\User;
use App\Services\BudgetRequestWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetRequestVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_department_head_can_approve_the_selected_request_step(): void
    {
        $requester = User::factory()->create([
            'role' => 'staff',
            'status' => 'active',
            'department' => 'Finance Office',
        ]);

        $approver = User::factory()->create([
            'role' => 'staff',
            'status' => 'active',
            'department' => 'Department Head',
        ]);

        $workflow = app(BudgetRequestWorkflow::class);

        $budgetRequest = BudgetRequest::query()->create([
            'request_number' => 'BR-2026-APPROVAL',
            'title' => 'Approval test request',
            'status' => 'pending',
            'created_by' => $requester->id,
            'submitted_at' => now()->subDay(),
        ]);

        $workflow->createStepsForRequest($budgetRequest);
        $workflow->refreshRequestMeta($budgetRequest->fresh('steps'));

        $step = $budgetRequest->steps()->where('name', 'Department Head')->firstOrFail();

        $response = $this->actingAs($approver, 'sanctum')
            ->postJson("/api/budget/requests/{$budgetRequest->request_number}/steps/{$step->id}/approve");

        $response->assertOk();

        $this->assertTrue(
            $budgetRequest->fresh('steps')->steps
                ->firstWhere('name', 'Department Head')
                ->approved
        );
    }

    public function test_department_head_can_see_requests_created_by_other_users_in_tracking(): void
    {
        $requester = User::factory()->create([
            'role' => 'staff',
            'status' => 'active',
            'department' => 'Finance Office',
        ]);

        $approver = User::factory()->create([
            'role' => 'staff',
            'status' => 'active',
            'department' => 'Department Head',
        ]);

        $workflow = app(BudgetRequestWorkflow::class);

        $budgetRequest = BudgetRequest::query()->create([
            'request_number' => 'BR-2026-001',
            'title' => 'Shared tracking request',
            'status' => 'pending',
            'created_by' => $requester->id,
            'submitted_at' => now()->subDay(),
        ]);

        $workflow->createStepsForRequest($budgetRequest);
        $workflow->refreshRequestMeta($budgetRequest->fresh('steps'));

        $response = $this->actingAs($approver, 'sanctum')
            ->getJson('/api/budget/requests');

        $response->assertOk();
        $this->assertNotEmpty($response->json('data'));
        $this->assertTrue(
            collect($response->json('data'))->contains('requestId', 'BR-2026-001')
        );
    }
}
