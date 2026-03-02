<?php

namespace App\Http\Middleware;

use App\Services\AdminActivityLogService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrackAdminActivity
{
    public function __construct(private readonly AdminActivityLogService $activityLogService)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (!$this->shouldTrack($request, $response)) {
            return $response;
        }

        $route = $request->route();
        $routeName = $route?->getName() ?: 'admin.unknown';
        $title = $this->titleFromRoute($routeName);

        $routeParams = collect($route?->parameters() ?? [])
            ->map(fn ($value) => is_scalar($value) ? (string) $value : (is_object($value) && method_exists($value, 'getKey') ? (string) $value->getKey() : gettype($value)))
            ->all();

        $this->activityLogService->logFromRequest(
            $request,
            'admin_action',
            $title,
            "Route action completed: {$routeName}",
            [
                'icon' => 'sparkles',
                'metadata' => [
                    'route' => $routeName,
                    'method' => $request->method(),
                    'path' => $request->path(),
                    'params' => $routeParams,
                ],
            ]
        );

        return $response;
    }

    private function shouldTrack(Request $request, Response $response): bool
    {
        if ($this->activityLogService->wasLogged($request)) {
            return false;
        }

        if (!$request->user() || !(bool) $request->user()->is_admin) {
            return false;
        }

        if (!$this->activityLogService->canWrite()) {
            return false;
        }

        if (in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return false;
        }

        return $response->getStatusCode() < 400;
    }

    private function titleFromRoute(string $routeName): string
    {
        $clean = str_replace(['admin.', '.', '_'], ['', ' ', ' '], $routeName);
        $clean = trim(preg_replace('/\s+/', ' ', $clean) ?: '');
        return $clean !== '' ? ucfirst($clean) : 'Admin action completed';
    }
}
