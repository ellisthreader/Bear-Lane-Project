<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\ShippingService;
use Illuminate\Support\Facades\Log;

class ShippingController extends Controller
{
    protected ShippingService $shippingService;

    public function __construct(ShippingService $shippingService)
    {
        $this->shippingService = $shippingService;
    }

    public function rates(Request $request)
    {
        $validated = $request->validate([
            'to_address' => 'required|array',
            'to_address.name' => 'required|string',
            'to_address.street1' => 'required|string',
            'to_address.city' => 'required|string',
            'to_address.zip' => 'required|string',
            'to_address.country' => 'required|string',
            'parcel'     => 'required|array',
            'parcel.length' => 'required',
            'parcel.width' => 'required',
            'parcel.height' => 'required',
            'parcel.distance_unit' => 'required|string',
            'parcel.weight' => 'required',
            'parcel.mass_unit' => 'required|string',
        ]);

        // Your business' FROM address (fixed)
        $fromAddress = [
            'name'    => "Ellis' Courses",
            'street1' => '390 Springfield Road',
            'city'    => 'Chelmsford',
            'zip'     => 'CM2 6AT',
            'country' => 'GB',
        ];

        // Use real TO address provided by the request
        $toAddress = $validated['to_address'];

        // Use real parcel dimensions from request
        $parcel = $validated['parcel'];

        try {
            $rates = $this->shippingService->getRates($fromAddress, $toAddress, $parcel);
            return response()->json($rates);
        } catch (\Throwable $e) {
            Log::error('Shipping rates request failed', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Unable to fetch shipping rates.',
                'message' => $e->getMessage(),
            ], 503);
        }
    }
}
