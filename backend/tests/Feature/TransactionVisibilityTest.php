<?php

namespace Tests\Feature;

use App\Models\BudgetRequest;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_transactions_start_hidden_and_only_appear_after_approval_visibility_is_enabled(): void
    {
        $user = User::factory()->create([
            'role' => 'staff',
            'status' => 'active',
        ]);

        $category = Category::query()->create([
            'name' => 'Test Category',
            'allocation' => 0,
        ]);

        $createResponse = $this->actingAs($user, 'sanctum')
            ->postJson('/api/transactions', [
                'transaction_date' => now()->toDateString(),
                'description' => 'New request for approval',
                'category_id' => $category->id,
                'allocated_amount' => 5000,
                'obligated_amount' => 0,
            ]);

        $createResponse->assertCreated();

        $transaction = Transaction::query()->latest('id')->first();

        $this->assertNotNull($transaction);
        $this->assertFalse($transaction->is_visible_in_transactions);
        $this->assertNotNull($transaction->budget_request_id);
        $this->assertTrue(BudgetRequest::query()->where('id', $transaction->budget_request_id)->exists());

        $initialList = $this->actingAs($user, 'sanctum')
            ->getJson('/api/transactions');

        $initialList->assertOk();
        $this->assertCount(0, $initialList->json('data'));

        $transaction->forceFill([
            'is_visible_in_transactions' => true,
        ])->save();

        $approvedList = $this->actingAs($user, 'sanctum')
            ->getJson('/api/transactions');

        $approvedList->assertOk();
        $this->assertCount(1, $approvedList->json('data'));
        $this->assertSame($transaction->id, $approvedList->json('data.0.id'));
    }
}
