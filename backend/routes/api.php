<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\BudgetController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['ok' => true]));

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

Route::get('/me', [MeController::class, 'show'])->middleware('auth:sanctum');
Route::put('/me', [MeController::class, 'update'])->middleware('auth:sanctum');
Route::post('/me/avatar', [MeController::class, 'avatar'])->middleware('auth:sanctum');

Route::get('/dashboard/stats', [DashboardController::class, 'stats'])->middleware('auth:sanctum');

Route::get('/transactions', [TransactionController::class, 'index'])->middleware('auth:sanctum');
Route::post('/transactions', [TransactionController::class, 'store'])->middleware('auth:sanctum');
Route::put('/transactions/{transaction}', [TransactionController::class, 'update'])->middleware('auth:sanctum');
Route::delete('/transactions/{transaction}', [TransactionController::class, 'destroy'])->middleware('auth:sanctum');

Route::get('/categories', [\App\Http\Controllers\Api\CategoryController::class, 'index'])->middleware('auth:sanctum');

Route::get('/users', [UserController::class, 'index'])->middleware('auth:sanctum');
Route::post('/users', [UserController::class, 'store'])->middleware('auth:sanctum');
Route::put('/users/{user}', [UserController::class, 'update'])->middleware('auth:sanctum');
Route::delete('/users/{user}', [UserController::class, 'destroy'])->middleware('auth:sanctum');

Route::get('/documents', [DocumentController::class, 'index'])->middleware('auth:sanctum');
Route::post('/documents', [DocumentController::class, 'store'])->middleware('auth:sanctum');
Route::put('/documents/{document}', [DocumentController::class, 'update'])->middleware('auth:sanctum');

Route::post('/budget', [BudgetController::class, 'setBudget'])->middleware('auth:sanctum');
Route::get('/budget', [BudgetController::class, 'getCurrentBudget'])->middleware('auth:sanctum');
