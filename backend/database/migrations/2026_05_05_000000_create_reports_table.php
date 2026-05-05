<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // budget_summary, obligation_details, etc.
            $table->string('type_label');
            $table->date('date_from')->nullable();
            $table->date('date_to')->nullable();
            $table->string('category')->nullable();
            $table->json('data'); // Store report data as JSON
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
