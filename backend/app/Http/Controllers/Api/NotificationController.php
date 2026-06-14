<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(private NotificationService $notificationService)
    {
    }

    public function index(Request $request)
    {
        /** @var User $user */
        $user = $request->user();

        $query = Notification::query()
            ->with('budgetRequest:id,request_number,title')
            ->orderByDesc('created_at');

        if ($user->role !== 'admin') {
            $query->where('user_id', $user->id);
        }

        $notifications = $query->get()->map(fn (Notification $n) => $this->formatNotification($n));

        return response()->json([
            'data' => $notifications,
            'unread_count' => $notifications->where('isRead', false)->count(),
        ]);
    }

    public function unreadCount(Request $request)
    {
        /** @var User $user */
        $user = $request->user();

        $query = Notification::query()->whereNull('read_at');

        if ($user->role !== 'admin') {
            $query->where('user_id', $user->id);
        }

        return response()->json(['count' => $query->count()]);
    }

    public function markAsRead(Request $request, Notification $notification)
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->role !== 'admin' && $notification->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (! $notification->read_at) {
            $notification->forceFill(['read_at' => now()])->save();
        }

        return response()->json([
            'data' => $this->formatNotification($notification->fresh(['budgetRequest'])),
        ]);
    }

    public function markAllAsRead(Request $request)
    {
        /** @var User $user */
        $user = $request->user();

        $query = Notification::query()->whereNull('read_at');

        if ($user->role !== 'admin') {
            $query->where('user_id', $user->id);
        }

        $query->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read']);
    }

    private function formatNotification(Notification $notification): array
    {
        $requestId = $notification->budgetRequest?->request_number;
        $targetPage = $notification->target_page
            ?? $this->resolveTargetPage($notification->type, $notification->title);

        return [
            'id' => $notification->id,
            'title' => $notification->title,
            'message' => $notification->message,
            'type' => $notification->type,
            'isRead' => $notification->read_at !== null,
            'readAt' => $notification->read_at?->toIso8601String(),
            'dateTime' => Carbon::parse($notification->created_at)->format('M j, Y g:i A'),
            'createdAt' => $notification->created_at?->toIso8601String(),
            'requestId' => $requestId,
            'targetPage' => $targetPage,
            'budgetRequestId' => $requestId,
            'budgetRequestTitle' => $notification->budgetRequest?->title,
        ];
    }

    private function resolveTargetPage(string $type, string $title): string
    {
        if ($type === 'approval_update' && str_contains($title, 'Fully Approved')) {
            return '/transactions';
        }

        return '/tracking';
    }
}
