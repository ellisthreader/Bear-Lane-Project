<?php

namespace App\Http\Controllers;

use App\Services\DeliverySlotService;
use Illuminate\Http\Request;

class DeliverySlotController extends Controller
{
    public function __construct(private readonly DeliverySlotService $slotService)
    {
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'postcode' => ['nullable', 'string', 'max:20'],
        ]);

        try {
            return response()->json([
                'days' => $this->slotService->getAvailableSlots($validated['postcode'] ?? null),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Unable to fetch delivery slots',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function reserve(Request $request)
    {
        $validated = $request->validate([
            'slot_id' => ['required', 'integer', 'exists:delivery_slots,id'],
            'postcode' => ['nullable', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'max:2'],
            'city' => ['nullable', 'string', 'max:120'],
            'street1' => ['nullable', 'string', 'max:180'],
        ]);

        try {
            $reservation = $this->slotService->reserveSlot((int) $validated['slot_id'], [
                'postcode' => $validated['postcode'] ?? null,
                'country' => $validated['country'] ?? null,
                'city' => $validated['city'] ?? null,
                'street1' => $validated['street1'] ?? null,
            ]);

            return response()->json([
                'reservation_id' => $reservation->id,
                'slot_id' => $reservation->slot_id,
                'expires_at' => $reservation->expires_at,
                'status' => $reservation->status,
                'selected_delivery_date' => optional($reservation->selected_delivery_date)->toDateString(),
                'calculated_ship_date' => optional($reservation->calculated_ship_date)->toDateString(),
                'shipping_service' => $reservation->shipping_service,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Unable to reserve slot',
                'message' => $e->getMessage(),
            ], 409);
        }
    }

    public function confirm(Request $request)
    {
        $validated = $request->validate([
            'reservation_id' => ['required', 'integer', 'exists:reservations,id'],
            'order_id' => ['nullable', 'integer', 'exists:orders,id'],
            'shipping_rate' => ['nullable', 'string', 'max:120'],
        ]);

        try {
            $reservation = $this->slotService->confirmReservation(
                (int) $validated['reservation_id'],
                isset($validated['order_id']) ? (int) $validated['order_id'] : null,
                $validated['shipping_rate'] ?? null,
            );

            return response()->json([
                'reservation_id' => $reservation->id,
                'status' => $reservation->status,
                'slot_id' => $reservation->slot_id,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Unable to confirm reservation',
                'message' => $e->getMessage(),
            ], 409);
        }
    }

    public function cancel(Request $request)
    {
        $validated = $request->validate([
            'reservation_id' => ['required', 'integer', 'exists:reservations,id'],
        ]);

        try {
            $this->slotService->cancelReservation((int) $validated['reservation_id']);

            return response()->json([
                'reservation_id' => (int) $validated['reservation_id'],
                'status' => 'cancelled',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Unable to cancel reservation',
                'message' => $e->getMessage(),
            ], 409);
        }
    }
}
