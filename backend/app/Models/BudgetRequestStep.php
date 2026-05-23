<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetRequestStep extends Model
{
    protected $fillable = [
        'budget_request_id',
        'name',
        'sort_order',
        'approved',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'approved' => 'boolean',
            'approved_at' => 'datetime',
        ];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(BudgetRequest::class, 'budget_request_id');
    }
}
