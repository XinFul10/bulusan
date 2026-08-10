<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemLog;
use Illuminate\Http\Request;

class SystemLogController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Only admin and head of tourism can view system logs
        if (!in_array($user->role, ['admin', 'head of tourism'], true)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $logs = SystemLog::query()
            ->with('user:id,username,full_name,role')
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json([
            'data' => $logs->items(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'total' => $logs->total(),
                'per_page' => $logs->perPage(),
                'last_page' => $logs->lastPage(),
            ],
        ]);
    }

    public function show(Request $request, SystemLog $log)
    {
        $user = $request->user();

        // Only admin and head of tourism can view system logs
        if (!in_array($user->role, ['admin', 'head of tourism'], true)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'data' => $log->load('user:id,username,full_name,role'),
        ]);
    }
}
