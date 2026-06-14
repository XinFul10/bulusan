<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeederAccountsTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeded_office_accounts_exist_for_budget_approval(): void
    {
        $this->artisan('db:seed')->assertOk();

        $this->assertDatabaseHas('users', [
            'username' => 'department_head',
            'department' => 'Department Head',
            'role' => 'staff',
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('users', [
            'username' => 'budget_office',
            'department' => 'Budget Office',
            'role' => 'staff',
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('users', [
            'username' => 'finance_office',
            'department' => 'Finance Office',
            'role' => 'staff',
            'status' => 'active',
        ]);
    }
}
