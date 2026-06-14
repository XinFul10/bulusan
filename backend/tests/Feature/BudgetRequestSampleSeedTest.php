<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetRequestSampleSeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_sample_budget_requests_can_be_seeded_for_multiple_users_without_conflicts(): void
    {
        $firstUser = User::factory()->create([
            'role' => 'staff',
            'status' => 'active',
        ]);

        $secondUser = User::factory()->create([
            'role' => 'staff',
            'status' => 'active',
        ]);

        $firstResponse = $this->actingAs($firstUser, 'sanctum')
            ->getJson('/api/budget/requests');

        $firstResponse->assertOk();

        $secondResponse = $this->actingAs($secondUser, 'sanctum')
            ->getJson('/api/budget/requests');

        $secondResponse->assertOk();
        $this->assertCount(3, $secondResponse->json('data'));
    }
}
