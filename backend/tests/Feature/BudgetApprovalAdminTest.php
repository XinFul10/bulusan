<?php

namespace Tests\Feature;

use App\Models\BudgetApprovalStep;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetApprovalAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_approval_marks_all_pending_budget_stages(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $first = BudgetApprovalStep::query()->create([
            'name' => 'Department Head',
            'sort_order' => 1,
            'approved' => false,
            'approved_at' => null,
        ]);

        $second = BudgetApprovalStep::query()->create([
            'name' => 'Budget Office',
            'sort_order' => 2,
            'approved' => false,
            'approved_at' => null,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/budget/approval-steps/{$first->id}/approve");

        $response->assertOk();
        $this->assertTrue($first->fresh()->approved);
        $this->assertTrue($second->fresh()->approved);
    }
}
