<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add soft-delete support to the reports table.
     *
     * Rows are never hard-deleted so that verification codes remain
     * verifiable even after a user removes a report from their list.
     */
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->softDeletes(); // adds `deleted_at` nullable timestamp
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
