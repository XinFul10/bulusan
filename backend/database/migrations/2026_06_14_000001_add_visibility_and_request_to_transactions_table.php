<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('budget_request_id')->nullable()->after('created_by')->constrained('budget_requests')->nullOnDelete();
            $table->boolean('is_visible_in_transactions')->default(true)->after('budget_request_id');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('budget_request_id');
            $table->dropColumn('is_visible_in_transactions');
        });
    }
};
