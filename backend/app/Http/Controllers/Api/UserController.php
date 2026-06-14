<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    private function requireAdmin(Request $request): void
    {
        if ($request->user()?->role !== 'admin') {
            abort(403, 'Admin access required.');
        }
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'username' => $user->username,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $user->status,
            'department' => $user->department,
            'last_login' => $user->last_login?->toIso8601String(),
            'avatar_url' => $user->avatarUrl(),
        ];
    }

    public function index(Request $request)
    {
        $this->requireAdmin($request);

        $users = User::query()->orderBy('id')->get();

        return response()->json([
            'data' => $users->map(fn (User $u) => $this->formatUser($u)),
        ]);
    }

    public function store(Request $request)
    {
        $this->requireAdmin($request);

        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'username' => ['required', 'string', 'max:50', 'unique:users,username'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', 'in:admin,staff'],
            'department' => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::create([
            'username' => $data['username'],
            'full_name' => $data['full_name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'status' => 'active',
            'department' => $data['department'] ?? null,
        ]);

        return response()->json(['data' => $this->formatUser($user)], 201);
    }

    public function update(Request $request, User $user)
    {
        $this->requireAdmin($request);

        $data = $request->validate([
            'full_name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'role' => ['sometimes', 'in:admin,staff'],
            'status' => ['sometimes', 'in:active,inactive'],
            'password' => ['sometimes', 'string', 'min:6'],
            'department' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->fill($data)->save();

        return response()->json(['data' => $this->formatUser($user)]);
    }

    public function destroy(Request $request, User $user)
    {
        $this->requireAdmin($request);

        if ($request->user()->id === $user->id) {
            abort(422, 'Cannot delete the currently logged in user.');
        }

        $user->delete();

        return response()->json(['success' => true]);
    }
}
