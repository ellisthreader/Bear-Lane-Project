<?php

namespace App\Http\Controllers;

use App\Services\ShippoRateService;
use Illuminate\Http\Request;

class ShippingRateController extends Controller
{
    public function __construct(private readonly ShippoRateService $shippoRateService)
    {
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'postcode' => ['required', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'max:2'],
            'city' => ['nullable', 'string', 'max:120'],
            'street1' => ['nullable', 'string', 'max:180'],
        ]);

        $fromAddress = [
            'name'    => "Ellis' Courses",
            'street1' => '390 Springfield Road',
            'city'    => 'Chelmsford',
            'zip'     => 'CM2 6AT',
            'country' => 'GB',
        ];

        $toAddress = [
            'name' => 'Checkout Customer',
            'street1' => $validated['street1'] ?? 'Address pending',
            'city' => $validated['city'] ?? 'London',
            'zip' => $validated['postcode'],
            'country' => strtoupper($validated['country'] ?? 'GB'),
        ];

        $parcel = [
            'length' => '30',
            'width' => '25',
            'height' => '5',
            'distance_unit' => 'cm',
            'weight' => '1.2',
            'mass_unit' => 'kg',
        ];

        try {
            $rates = $this->shippoRateService->getFilteredRates($fromAddress, $toAddress, $parcel, 2);
            return response()->json(['rates' => $rates]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Unable to fetch shipping rates.',
                'message' => $e->getMessage(),
            ], 503);
        }
    }
}
