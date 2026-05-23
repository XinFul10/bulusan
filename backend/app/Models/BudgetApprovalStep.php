<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetApprovalStep extends Model
{
    protected $fillable = [
        'name',
        'sort_order',
        'approved',
        'approved_at',
        'approved_by',
    ];

    protected function casts(): array
    {
        return [
            'approved' => 'boolean',
            'approved_at' => 'datetime',
        ];
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
