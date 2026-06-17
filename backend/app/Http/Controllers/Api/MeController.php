<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class MeController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                'id' => $user->id,
                'username' => $user->username,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'department' => $user->department,
                'last_login' => $user->last_login?->toIso8601String(),
                'avatar_url' => $user->avatarUrl(),
            ],
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'full_name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['sometimes', 'string', 'min:6'],
        ]);

        $changes = [];

        if (isset($data['full_name']) && $data['full_name'] !== $user->full_name) {
            $changes['full_name'] = ['from' => $user->full_name, 'to' => $data['full_name']];
        }
        if (isset($data['email']) && $data['email'] !== $user->email) {
            $changes['email'] = ['from' => $user->email, 'to' => $data['email']];
        }

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
            $changes['password'] = 'Password changed';
        }

        $user->fill($data)->save();

        // Log profile update
        if (!empty($changes)) {
            SystemLog::log(
                $user->id,
                'UPDATE',
                'Profile',
                "Updated own profile",
                $user->id,
                $changes,
                $request
            );
        }

        return $this->show($request);
    }

    public function avatar(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'avatar' => ['required', 'file', 'image', 'max:2048'],
        ]);

        $path = $data['avatar']->store('avatars', 'public');
        $user->forceFill(['avatar_path' => $path])->save();

        return $this->show($request);
    }
}

