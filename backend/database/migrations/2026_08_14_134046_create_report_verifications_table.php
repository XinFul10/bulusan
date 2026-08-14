<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('report_verifications', function (Blueprint $table) {
            $table->id();
            $table->string('verification_code')->unique();
            $table->string('type');
            $table->string('type_label');
            $table->date('date_from')->nullable();
            $table->date('date_to')->nullable();
            $table->string('category')->nullable();
            $table->json('data');
            $table->timestamp('generated_at');
            $table->foreignId('created_by')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            
            $table->index('verification_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_verifications');
    }
};
