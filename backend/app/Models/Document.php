<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    protected $fillable = [
        'uploader_name',
        'description',
        'destination',
        'manually_delivered',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'manually_delivered' => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
