<?php

namespace App\Http\Controllers;

use App\Models\CookieConsentLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class CookieConsentController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'version' => ['required', 'integer', 'min:1'],
            'status' => ['required', 'string', 'in:accept_all,reject_non_essential,custom'],
            'preferences' => ['required', 'array'],
            'preferences.necessary' => ['required', 'boolean'],
            'preferences.analytics' => ['required', 'boolean'],
            'preferences.marketing' => ['required', 'boolean'],
            'consentedAt' => ['nullable', 'date'],
        ]);

        $consentedAt = isset($validated['consentedAt'])
            ? Carbon::parse((string) $validated['consentedAt'])
            : now();

        $ip = trim((string) $request->ip());
        $ipHash = $ip !== ''
            ? hash('sha256', $ip . '|' . (string) config('app.key'))
            : null;

        CookieConsentLog::query()->create([
            'user_id' => optional($request->user())->id,
            'session_id' => Str::limit((string) $request->session()->getId(), 120, ''),
            'consent_version' => (int) $validated['version'],
            'status' => (string) $validated['status'],
            'necessary' => (bool) data_get($validated, 'preferences.necessary', true),
            'analytics' => (bool) data_get($validated, 'preferences.analytics', false),
            'marketing' => (bool) data_get($validated, 'preferences.marketing', false),
            'consented_at' => $consentedAt,
            'ip_hash' => $ipHash,
            'user_agent' => Str::limit((string) ($request->userAgent() ?? ''), 600, ''),
        ]);

        return response()->json(['success' => true]);
    }
}
