<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BudgetRequest extends Model
{
    protected $fillable = [
        'request_number',
        'title',
        'status',
        'created_by',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function steps(): HasMany
    {
        return $this->hasMany(BudgetRequestStep::class)->orderBy('sort_order');
    }

    public function getRouteKeyName(): string
    {
        return 'request_number';
    }
}
