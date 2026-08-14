<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('obligation_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->cascadeOnDelete();
            $table->unsignedBigInteger('amount');
            $table->date('date');
            $table->string('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Backfill existing transactions that already have obligated amounts > 0
        $transactions = DB::table('transactions')
            ->where('obligated_amount', '>', 0)
            ->get();

        foreach ($transactions as $txn) {
            DB::table('obligation_entries')->insert([
                'transaction_id' => $txn->id,
                'amount' => $txn->obligated_amount,
                'date' => $txn->transaction_date ?? now()->toDateString(),
                'note' => 'Initial obligation (migrated)',
                'created_by' => $txn->created_by,
                'created_at' => $txn->created_at ?? now(),
                'updated_at' => $txn->updated_at ?? now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('obligation_entries');
    }
};
