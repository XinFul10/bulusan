<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regression test for: "Report verification breaks after a Saved Report is deleted"
 *
 * A verification code is an audit/certification stamp that must remain
 * verifiable regardless of whether the report still appears in the
 * Saved Reports list.
 */
class ReportVerificationAfterDeleteTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'role'   => 'admin',
            'status' => 'active',
        ]);
    }

    /**
     * Helper: create a report row directly (bypasses HTTP so no transaction
     * calculation is needed in tests where we only care about the code).
     */
    private function makeReport(string $verificationCode): Report
    {
        return Report::create([
            'type'              => 'budget_summary',
            'type_label'        => 'Budget Summary',
            'date_from'         => '2026-01-01',
            'date_to'           => '2026-12-31',
            'category'          => 'All',
            'data'              => [],
            'created_by'        => $this->user->id,
            'verification_code' => $verificationCode,
        ]);
    }

    /** Step 1 baseline: verifying a live (non-deleted) report succeeds. */
    public function test_verify_returns_valid_for_existing_report(): void
    {
        $code   = '#TestCode1234';
        $report = $this->makeReport($code);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/reports/verify', ['code' => $code]);

        $response->assertOk();
        $this->assertTrue($response->json('valid'));
        $this->assertEquals($report->id, $response->json('report.id'));
    }

    /**
     * THE REGRESSION:
     * Generate a report → verify succeeds → delete from Saved Reports →
     * verify again → must still succeed (not "no matching report found").
     */
    public function test_verify_still_succeeds_after_report_is_deleted_from_saved_reports(): void
    {
        $code   = '#DeletedCode99';
        $report = $this->makeReport($code);

        // 1. Verify before deletion — sanity check
        $beforeDelete = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/reports/verify', ['code' => $code]);

        $beforeDelete->assertOk();
        $this->assertTrue($beforeDelete->json('valid'), 'Pre-delete verification should be valid');

        // 2. Delete from Saved Reports (soft-delete)
        $deleteResponse = $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/reports/{$report->id}");

        $deleteResponse->assertOk();
        $this->assertSoftDeleted('reports', ['id' => $report->id]);

        // 3. Verify AFTER deletion — this is the regression assertion
        $afterDelete = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/reports/verify', ['code' => $code]);

        $afterDelete->assertOk();
        $this->assertTrue(
            $afterDelete->json('valid'),
            'Verification must succeed even after the report is removed from Saved Reports'
        );
        $this->assertEquals(
            $report->id,
            $afterDelete->json('report.id'),
            'The verified report id must match the original'
        );
        $this->assertTrue(
            $afterDelete->json('report.is_deleted'),
            'The response should flag the report as deleted so the UI can annotate it'
        );
    }

    /** The deleted report must NOT appear in the Saved Reports list. */
    public function test_deleted_report_is_excluded_from_saved_reports_list(): void
    {
        $code   = '#HiddenReport1';
        $report = $this->makeReport($code);

        // Soft-delete it
        $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/reports/{$report->id}")
            ->assertOk();

        // Index should not contain the deleted report
        $list = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/reports');

        $list->assertOk();
        $ids = collect($list->json('data'))->pluck('id')->toArray();
        $this->assertNotContains(
            $report->id,
            $ids,
            'Soft-deleted report must not appear in the Saved Reports list'
        );
    }

    /** An unknown / never-generated code returns valid=false. */
    public function test_verify_returns_invalid_for_unknown_code(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/reports/verify', ['code' => '#UnknownXXXXXX']);

        $response->assertOk();
        $this->assertFalse($response->json('valid'));
    }

    /** Test updating description on a report (including soft-deleted reports). */
    public function test_update_description_works_on_active_and_soft_deleted_reports(): void
    {
        $code   = '#DescTestCode1';
        $report = $this->makeReport($code);

        // Update description on active report
        $patchResponse = $this->actingAs($this->user, 'sanctum')
            ->patchJson("/api/reports/{$report->id}/description", [
                'description' => 'Audited by Regional Office on Q3.',
            ]);

        $patchResponse->assertOk();
        $this->assertEquals('Audited by Regional Office on Q3.', $patchResponse->json('description'));

        // Soft delete the report
        $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/reports/{$report->id}")
            ->assertOk();

        // Update description on soft-deleted report
        $patchAfterDelete = $this->actingAs($this->user, 'sanctum')
            ->patchJson("/api/reports/{$report->id}/description", [
                'description' => 'Updated note after archival.',
            ]);

        $patchAfterDelete->assertOk();
        $this->assertEquals('Updated note after archival.', $patchAfterDelete->json('description'));

        // Verify that verify endpoint returns the updated description
        $verifyResponse = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/reports/verify', ['code' => $code]);

        $verifyResponse->assertOk();
        $this->assertTrue($verifyResponse->json('valid'));
        $this->assertEquals('Updated note after archival.', $verifyResponse->json('report.description'));
    }
}

