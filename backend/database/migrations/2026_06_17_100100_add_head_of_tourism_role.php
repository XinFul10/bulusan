<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
	public function up(): void
	{
		// Intent: add "head of tourism" role if needed.
		// This migration is intentionally a no-op to avoid class-not-found errors
		// because the original file was empty. If you intend to modify data
		// or schema here, replace this implementation with the real changes.
	}

	public function down(): void
	{
		// no-op
	}
};
