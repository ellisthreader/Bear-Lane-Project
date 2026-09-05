<?php

namespace App\Http\Controllers;

use App\Models\SavedDesign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavedDesignController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'saved_design_id' => ['nullable', 'integer'],
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'name' => ['nullable', 'string', 'max:120'],
            'payload' => ['required', 'array'],
            'payload.viewImageStates' => ['present', 'array'],
            'payload.positions' => ['present', 'array'],
            'payload.sizes' => ['present', 'array'],
            'payload.uploadedImages' => ['present', 'array'],
            'payload.currentViewKey' => ['required', 'in:front,back,leftSleeve,rightSleeve'],
            'payload.selectedColour' => ['nullable', 'string', 'max:100'],
            'payload.selectedSize' => ['nullable', 'string', 'max:100'],
            'payload.selectedDesignType' => ['nullable', 'string', 'in:printing'],
            'payload.baseViewImages' => ['nullable', 'array'],
            'payload.baseViewImages.front' => ['nullable', 'string'],
            'payload.baseViewImages.back' => ['nullable', 'string'],
            'payload.baseViewImages.leftSleeve' => ['nullable', 'string'],
            'payload.baseViewImages.rightSleeve' => ['nullable', 'string'],
            'payload.previewByView' => ['nullable', 'array'],
            'payload.previewByView.front' => ['nullable', 'array'],
            'payload.previewByView.back' => ['nullable', 'array'],
            'payload.previewByView.leftSleeve' => ['nullable', 'array'],
            'payload.previewByView.rightSleeve' => ['nullable', 'array'],
            'payload.compositePngByView' => ['nullable', 'array'],
            'payload.compositePngByView.front' => ['nullable', 'string'],
            'payload.compositePngByView.back' => ['nullable', 'string'],
            'payload.compositePngByView.leftSleeve' => ['nullable', 'string'],
            'payload.compositePngByView.rightSleeve' => ['nullable', 'string'],
        ]);

        $validated['payload']['selectedDesignType'] = 'printing';

        $savedDesign = null;

        if (!empty($validated['saved_design_id'])) {
            $savedDesign = SavedDesign::where('id', $validated['saved_design_id'])
                ->where('user_id', $request->user()->id)
                ->first();
        }

        if ($savedDesign) {
            $savedDesign->update([
                'product_id' => $validated['product_id'],
                'name' => $validated['name'] ?: 'Untitled Design',
                'design_payload' => $validated['payload'],
            ]);
        } else {
            $savedDesign = SavedDesign::create([
                'user_id' => $request->user()->id,
                'product_id' => $validated['product_id'],
                'name' => $validated['name'] ?: 'Untitled Design',
                'design_payload' => $validated['payload'],
            ]);
        }

        $savedDesign->load(['product.images']);

        return response()->json([
            'savedDesign' => [
                'id' => $savedDesign->id,
                'name' => $savedDesign->name,
                'product' => [
                    'id' => $savedDesign->product?->id,
                    'name' => $savedDesign->product?->name,
                    'slug' => $savedDesign->product?->slug,
                    'images' => $savedDesign->product?->images
                        ? $savedDesign->product->images->pluck('url')->values()->all()
                        : [],
                ],
                'previewImage' => data_get($savedDesign->design_payload, 'compositePngByView.front')
                    ?: data_get(
                        $savedDesign->design_payload,
                        'compositePngByView.' . data_get($savedDesign->design_payload, 'currentViewKey')
                    )
                    ?: $savedDesign->product?->images?->first()?->url,
                'updatedAt' => $savedDesign->updated_at?->toIso8601String(),
                'payload' => $savedDesign->design_payload,
            ],
        ]);
    }

    public function destroy(Request $request, SavedDesign $savedDesign): JsonResponse
    {
        if ((int) $savedDesign->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $savedDesign->delete();

        return response()->json(['deleted' => true]);
    }

    public function rename(Request $request, SavedDesign $savedDesign): JsonResponse
    {
        if ((int) $savedDesign->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $savedDesign->update([
            'name' => trim((string) $validated['name']) ?: 'Untitled Design',
        ]);

        return response()->json([
            'savedDesign' => [
                'id' => $savedDesign->id,
                'name' => $savedDesign->name,
            ],
        ]);
    }
}
