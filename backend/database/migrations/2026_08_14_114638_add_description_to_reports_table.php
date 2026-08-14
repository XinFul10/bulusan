<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add an optional free-text description/notes field to reports.
     * The description is included in PDF/Excel exports and survives soft-delete.
     */
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->text('description')->nullable()->after('verification_code');
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropColumn('description');
        });
    }
};
