<?php

namespace App\Http\Controllers;

use App\Services\DeliveryOptionService;
use Illuminate\Http\Request;

class DeliveryOptionController extends Controller
{
    public function __construct(private readonly DeliveryOptionService $deliveryOptionService)
    {
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'postcode' => ['nullable', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'max:2'],
            'city' => ['nullable', 'string', 'max:120'],
            'street1' => ['nullable', 'string', 'max:180'],
            'cart_items' => ['nullable', 'array'],
            'cart_items.*.id' => ['nullable'],
            'cart_items.*.slug' => ['nullable', 'string', 'max:255'],
            'cart_items.*.name' => ['nullable', 'string', 'max:255'],
            'cart_items.*.title' => ['nullable', 'string', 'max:255'],
            'cart_items.*.size' => ['nullable', 'string', 'max:40'],
            'cart_items.*.colour' => ['nullable', 'string', 'max:100'],
            'cart_items.*.quantity' => ['nullable', 'integer', 'min:1', 'max:999'],
            'cart_items.*.preferred_courier' => ['nullable', 'string', 'in:evri,royal_mail,dpd'],
            'cart_items.*.weight_kg' => ['nullable', 'numeric', 'min:0.01', 'max:200'],
            'cart_items.*.length_cm' => ['nullable', 'numeric', 'min:0.01', 'max:500'],
            'cart_items.*.width_cm' => ['nullable', 'numeric', 'min:0.01', 'max:500'],
            'cart_items.*.height_cm' => ['nullable', 'numeric', 'min:0.01', 'max:500'],
            'cart_items.*.dimension_unit' => ['nullable', 'string', 'in:cm,in'],
        ]);

        try {
            $data = $this->deliveryOptionService->getOptions(
                $request->user(),
                $validated['postcode'] ?? null,
                $validated['country'] ?? null,
                $validated['city'] ?? null,
                $validated['street1'] ?? null,
                is_array($validated['cart_items'] ?? null) ? $validated['cart_items'] : [],
            );
            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Unable to fetch delivery options',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
