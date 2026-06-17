<?php

namespace Tests\Feature;

use App\Models\BudgetApprovalStep;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetApprovalHeadOfTourismTest extends TestCase
{
    use RefreshDatabase;

    public function test_head_of_tourism_approves_one_step_at_a_time(): void
    {
        $head = User::factory()->create([
            'role' => 'head of tourism',
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

        $response = $this->actingAs($head, 'sanctum')
            ->postJson("/api/budget/approval-steps/{$first->id}/approve");

        $response->assertOk();
        $this->assertTrue($first->fresh()->approved);
        $this->assertFalse($second->fresh()->approved);
    }
}
