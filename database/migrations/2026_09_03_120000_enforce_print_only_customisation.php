<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $decode = static function (mixed $value): array {
            if (is_array($value)) {
                return $value;
            }

            $decoded = json_decode((string) $value, true);

            return is_array($decoded) ? $decoded : [];
        };

        if (Schema::hasTable('order_items')) {
            if (Schema::hasColumn('order_items', 'design_type')) {
                DB::table('order_items')->update(['design_type' => 'printing']);
            }

            if (Schema::hasColumn('order_items', 'design_payload')) {
                DB::table('order_items')
                    ->whereNotNull('design_payload')
                    ->orderBy('id')
                    ->eachById(function (object $item) use ($decode): void {
                        $payload = $decode($item->design_payload);
                        $payload['design_type'] = 'printing';

                        DB::table('order_items')->where('id', $item->id)->update([
                            'design_payload' => json_encode($payload, JSON_UNESCAPED_SLASHES),
                        ]);
                    });
            }
        }

        if (Schema::hasTable('saved_designs')) {
            DB::table('saved_designs')
                ->orderBy('id')
                ->eachById(function (object $design) use ($decode): void {
                    $payload = $decode($design->design_payload);
                    $payload['selectedDesignType'] = 'printing';

                    DB::table('saved_designs')->where('id', $design->id)->update([
                        'design_payload' => json_encode($payload, JSON_UNESCAPED_SLASHES),
                    ]);
                });
        }

        if (Schema::hasTable('instant_quotes')) {
            DB::table('instant_quotes')
                ->orderBy('id')
                ->eachById(function (object $quote) use ($decode): void {
                    $items = array_map(static function (mixed $item): mixed {
                        if (is_array($item)) {
                            $item['designType'] = 'Print';
                        }

                        return $item;
                    }, $decode($quote->items));

                    DB::table('instant_quotes')->where('id', $quote->id)->update([
                        'items' => json_encode($items, JSON_UNESCAPED_SLASHES),
                    ]);
                });
        }

        if (Schema::hasTable('store_settings')) {
            $setting = DB::table('store_settings')->where('key', 'design_pricing')->first();
            if ($setting) {
                $value = $decode($setting->value);
                $printing = is_array($value['printing'] ?? null) ? $value['printing'] : [];

                DB::table('store_settings')->where('id', $setting->id)->update([
                    'value' => json_encode(['printing' => $printing], JSON_UNESCAPED_SLASHES),
                ]);
            }
        }

        if (Schema::hasTable('support_messages')) {
            DB::table('support_messages')
                ->where('source_type', 'artist_request')
                ->update([
                    'source_type' => 'print_request',
                    'subject' => 'Speak to a Print Specialist',
                ]);
        }

        if (Schema::hasTable('products')) {
            $product = DB::table('products')->where('slug', 'bear-lane-signature-tee')->first();
            if ($product) {
                DB::table('products')->where('id', $product->id)->update([
                    'name' => 'Signature Printed Tee',
                    'description' => 'A soft premium tee finished with a signature Bear Lane print.',
                ]);

                if (Schema::hasTable('images')) {
                    DB::table('images')
                        ->where('imageable_type', 'App\\Models\\Product')
                        ->where('imageable_id', $product->id)
                        ->update(['path' => 'images/HomepageGenerated/signature-printed-tee.png']);
                }
            }
        }
    }

    public function down(): void
    {
        // This one-way content normalisation intentionally keeps existing data print-only.
    }
};
