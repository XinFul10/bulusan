<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    public function index()
    {
        $docs = Document::query()
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'data' => $docs->map(fn (Document $d) => [
                'id' => $d->id,
                'uploaderName' => $d->uploader_name,
                'description' => $d->description,
                'destination' => $d->destination,
                'manuallyDelivered' => (bool) $d->manually_delivered,
                'created_at' => $d->created_at?->toIso8601String(),
            ]),
            'total' => $docs->count(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'uploaderName' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:255'],
            'destination' => ['required', 'string', 'max:255'],
            'manuallyDelivered' => ['sometimes', 'boolean'],
        ]);

        $doc = Document::create([
            'uploader_name' => $data['uploaderName'],
            'description' => $data['description'],
            'destination' => $data['destination'],
            'manually_delivered' => (bool) ($data['manuallyDelivered'] ?? false),
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => [
                'id' => $doc->id,
                'uploaderName' => $doc->uploader_name,
                'description' => $doc->description,
                'destination' => $doc->destination,
                'manuallyDelivered' => (bool) $doc->manually_delivered,
                'created_at' => $doc->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function update(Request $request, Document $document)
    {
        $data = $request->validate([
            'uploaderName' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'string', 'max:255'],
            'destination' => ['sometimes', 'string', 'max:255'],
            'manuallyDelivered' => ['sometimes', 'boolean'],
        ]);

        $patch = [];
        if (array_key_exists('uploaderName', $data)) $patch['uploader_name'] = $data['uploaderName'];
        if (array_key_exists('description', $data)) $patch['description'] = $data['description'];
        if (array_key_exists('destination', $data)) $patch['destination'] = $data['destination'];
        if (array_key_exists('manuallyDelivered', $data)) $patch['manually_delivered'] = (bool) $data['manuallyDelivered'];

        $document->fill($patch)->save();

        return response()->json([
            'data' => [
                'id' => $document->id,
                'uploaderName' => $document->uploader_name,
                'description' => $document->description,
                'destination' => $document->destination,
                'manuallyDelivered' => (bool) $document->manually_delivered,
                'created_at' => $document->created_at?->toIso8601String(),
            ],
        ]);
    }
}

