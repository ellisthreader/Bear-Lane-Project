<?php

namespace App\Services;

use App\Models\AdminActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AdminActivityLogService
{
    /**
     * Keys excluded from metadata logging.
     *
     * @var array<int, string>
     */
    private array $sensitiveKeys = [
        'password',
        'password_confirmation',
        'token',
        'current_password',
        'new_password',
        'authorization',
    ];

    public function canWrite(): bool
    {
        return Schema::hasTable('admin_activity_logs');
    }

    public function markLogged(Request $request): void
    {
        $request->attributes->set('admin_activity_logged', true);
    }

    public function wasLogged(Request $request): bool
    {
        return (bool) $request->attributes->get('admin_activity_logged', false);
    }

    public function logFromRequest(
        Request $request,
        string $type,
        string $title,
        ?string $description = null,
        array $context = []
    ): ?AdminActivityLog {
        $entry = $this->log(
            $request->user(),
            $type,
            $title,
            $description,
            [
                'route_name' => optional($request->route())->getName(),
                'request_method' => $request->method(),
                'path' => $request->path(),
                'ip_address' => $request->ip(),
                ...$context,
            ]
        );

        if ($entry) {
            $this->markLogged($request);
        }

        return $entry;
    }

    public function log(
        ?User $actor,
        string $type,
        string $title,
        ?string $description = null,
        array $context = []
    ): ?AdminActivityLog {
        if (!$this->canWrite()) {
            return null;
        }

        if ($actor && !(bool) $actor->is_admin) {
            return null;
        }

        $icon = (string) ($context['icon'] ?? $this->iconForType($type));
        $metadata = $this->sanitizeMetadata((array) ($context['metadata'] ?? []));
        $subjectType = isset($context['subject_type']) ? (string) $context['subject_type'] : null;
        $subjectId = isset($context['subject_id']) ? (int) $context['subject_id'] : null;
        $subjectLabel = isset($context['subject_label']) ? (string) $context['subject_label'] : null;

        try {
            return AdminActivityLog::query()->create([
                'admin_user_id' => $actor?->id,
                'admin_user_name' => $actor?->name ?: $actor?->username,
                'activity_type' => Str::limit(trim($type), 120, ''),
                'icon' => Str::limit(trim($icon) ?: 'sparkles', 40, ''),
                'title' => Str::limit(trim($title), 255, ''),
                'description' => $description ? Str::limit(trim($description), 2000, '') : null,
                'subject_type' => $subjectType ? Str::limit($subjectType, 200, '') : null,
                'subject_id' => $subjectId,
                'subject_label' => $subjectLabel ? Str::limit($subjectLabel, 255, '') : null,
                'route_name' => isset($context['route_name']) ? (string) $context['route_name'] : null,
                'request_method' => isset($context['request_method']) ? (string) $context['request_method'] : null,
                'path' => isset($context['path']) ? (string) $context['path'] : null,
                'ip_address' => isset($context['ip_address']) ? (string) $context['ip_address'] : null,
                'metadata' => $metadata ?: null,
            ]);
        } catch (\Throwable $exception) {
            Log::warning('Admin activity log write failed', [
                'error' => $exception->getMessage(),
                'activity_type' => $type,
                'title' => $title,
            ]);

            return null;
        }
    }

    public function extractChanges(
        array $before,
        array $after,
        array $fieldLabels = [],
        array $ignoredFields = ['updated_at', 'created_at']
    ): array {
        $ignoredLookup = array_fill_keys($ignoredFields, true);
        $allKeys = collect(array_keys($before))
            ->merge(array_keys($after))
            ->unique()
            ->values();

        $changes = [];
        foreach ($allKeys as $key) {
            if (isset($ignoredLookup[$key])) {
                continue;
            }

            $oldValue = $before[$key] ?? null;
            $newValue = $after[$key] ?? null;

            if ($this->normalizeForComparison($oldValue) === $this->normalizeForComparison($newValue)) {
                continue;
            }

            $changes[] = [
                'field' => $key,
                'label' => $fieldLabels[$key] ?? Str::headline(str_replace('_', ' ', (string) $key)),
                'before' => $this->formatValue($oldValue),
                'after' => $this->formatValue($newValue),
            ];
        }

        return $changes;
    }

    public function summarizeChanges(array $changes, int $limit = 5): string
    {
        if ($changes === []) {
            return 'No tracked field updates.';
        }

        $segments = collect($changes)
            ->take($limit)
            ->map(function (array $change) {
                $before = $change['before'];
                $after = $change['after'];
                return "{$change['label']}: {$before} -> {$after}";
            })
            ->values()
            ->all();

        $remaining = count($changes) - count($segments);
        if ($remaining > 0) {
            $segments[] = "+{$remaining} more change(s)";
        }

        return implode(' | ', $segments);
    }

    public function modelContext(Model $model, ?string $label = null): array
    {
        return [
            'subject_type' => $model::class,
            'subject_id' => (int) $model->getKey(),
            'subject_label' => $label ?: $this->defaultModelLabel($model),
        ];
    }

    private function defaultModelLabel(Model $model): string
    {
        $labelCandidates = ['title', 'name', 'slug', 'email', 'question', 'id'];
        foreach ($labelCandidates as $field) {
            $value = $model->getAttribute($field);
            if ($value === null) {
                continue;
            }

            $text = trim((string) $value);
            if ($text !== '') {
                return $text;
            }
        }

        return class_basename($model) . ' #' . $model->getKey();
    }

    private function normalizeForComparison(mixed $value): string
    {
        if ($value === null) {
            return '__NULL__';
        }
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_scalar($value)) {
            return (string) $value;
        }

        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '__UNSERIALIZABLE__';
    }

    private function formatValue(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '(empty)';
        }

        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if (is_scalar($value)) {
            return Str::limit((string) $value, 140, '...');
        }

        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return $json === false ? '(complex value)' : Str::limit($json, 140, '...');
    }

    private function sanitizeMetadata(array $metadata): array
    {
        $output = [];
        foreach ($metadata as $key => $value) {
            $keyString = (string) $key;
            if (in_array(strtolower($keyString), $this->sensitiveKeys, true)) {
                continue;
            }

            if (is_array($value)) {
                $output[$keyString] = $this->sanitizeMetadata($value);
                continue;
            }

            if (is_object($value)) {
                $output[$keyString] = '(object)';
                continue;
            }

            if ($value === null || is_bool($value) || is_numeric($value)) {
                $output[$keyString] = $value;
                continue;
            }

            $output[$keyString] = Str::limit((string) $value, 500, '...');
        }

        return $output;
    }

    private function iconForType(string $type): string
    {
        $value = strtolower($type);

        return match (true) {
            str_contains($value, 'product') => 'package',
            str_contains($value, 'faq') => 'faq',
            str_contains($value, 'article') => 'article',
            str_contains($value, 'chat') => 'message',
            str_contains($value, 'warning') => 'alert',
            str_contains($value, 'email') => 'mail',
            str_contains($value, 'user') || str_contains($value, 'profile') => 'user',
            str_contains($value, 'archive') => 'archive',
            str_contains($value, 'sale') => 'sale',
            str_contains($value, 'quote') => 'quote',
            str_contains($value, 'review') => 'review',
            default => 'sparkles',
        };
    }
}
