<?php

namespace App\Http\Controllers;

use App\Models\UserWishlistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = UserWishlistItem::query()
            ->where('user_id', $request->user()->id)
            ->latest('updated_at')
            ->get();

        return response()->json([
            'wishlist_items' => $items->map(fn (UserWishlistItem $item) => $this->mapItem($item))->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_key' => 'required|string|max:191',
            'product_id' => 'nullable|integer',
            'product_slug' => 'nullable|string|max:255',
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'price' => 'nullable|numeric|min:0',
            'image' => 'nullable|string|max:2000',
        ]);

        $item = UserWishlistItem::updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'item_key' => $validated['item_key'],
            ],
            [
                'product_id' => $validated['product_id'] ?? null,
                'product_slug' => $validated['product_slug'] ?? null,
                'name' => $validated['name'],
                'brand' => $validated['brand'] ?? null,
                'price' => $validated['price'] ?? null,
                'image' => $validated['image'] ?? null,
            ]
        );

        return response()->json([
            'success' => true,
            'wishlist_item' => $this->mapItem($item->fresh()),
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_key' => 'required|string|max:191',
        ]);

        UserWishlistItem::query()
            ->where('user_id', $request->user()->id)
            ->where('item_key', $validated['item_key'])
            ->delete();

        return response()->json(['success' => true]);
    }

    private function mapItem(UserWishlistItem $item): array
    {
        return [
            'id' => $item->item_key,
            'name' => $item->name,
            'brand' => $item->brand,
            'price' => $item->price !== null ? (float) $item->price : null,
            'image' => $item->image,
            'slug' => $item->product_slug,
            'product_id' => $item->product_id,
        ];
    }
}
