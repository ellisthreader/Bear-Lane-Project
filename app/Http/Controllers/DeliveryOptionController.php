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
        ]);

        try {
            $data = $this->deliveryOptionService->getOptions(
                $request->user(),
                $validated['postcode'] ?? null,
                $validated['country'] ?? null,
                $validated['city'] ?? null,
                $validated['street1'] ?? null,
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
