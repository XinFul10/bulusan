<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transaction extends Model
{
    protected $fillable = [
        'transaction_date',
        'description',
        'category_id',
        'allocated_amount',
        'obligated_amount',
        'created_by',
        'budget_request_id',
        'is_visible_in_transactions',
    ];

    protected function casts(): array
    {
        return [
            'transaction_date' => 'date',
            'is_visible_in_transactions' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function budgetRequest(): BelongsTo
    {
        return $this->belongsTo(BudgetRequest::class);
    }

    public function obligationEntries(): HasMany
    {
        return $this->hasMany(ObligationEntry::class)->orderBy('date', 'desc')->orderBy('id', 'desc');
    }
}
