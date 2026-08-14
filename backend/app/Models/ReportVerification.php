<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportVerification extends Model
{
    protected $fillable = [
        'verification_code',
        'type',
        'type_label',
        'date_from',
        'date_to',
        'category',
        'data',
        'generated_at',
        'created_by',
        'is_deleted',
    ];

    protected $casts = [
        'date_from' => 'date',
        'date_to' => 'date',
        'data' => 'array',
        'generated_at' => 'datetime',
        'is_deleted' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
