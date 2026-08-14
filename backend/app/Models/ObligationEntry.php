<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ObligationEntry extends Model
{
    protected $fillable = [
        'transaction_id',
        'amount',
        'date',
        'note',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'amount' => 'integer',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
