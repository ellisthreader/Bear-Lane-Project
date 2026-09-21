<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\PersonaliseCatalogueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PersonaliseAdminController extends Controller
{
    public function __construct(private readonly PersonaliseCatalogueService $catalogue)
    {
    }

    public function index(): Response
    {
        return Inertia::render('Admin/Other/Personalise', [
            'catalogue' => $this->catalogue->getCatalogue(),
            'products' => $this->catalogue->productLibrary(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'groups' => ['present', 'array', 'max:' . PersonaliseCatalogueService::MAX_GROUPS],
            'groups.*.key' => ['nullable', 'string', 'max:60'],
            'groups.*.label' => ['required', 'string', 'max:60'],
            'groups.*.description' => ['nullable', 'string', 'max:200'],
            'groups.*.product_ids' => ['present', 'array', 'max:' . PersonaliseCatalogueService::MAX_PRODUCTS_PER_GROUP],
            'groups.*.product_ids.*' => ['integer', 'exists:products,id'],
        ]);

        $catalogue = $this->catalogue->save($validated);

        return response()->json([
            'success' => true,
            'catalogue' => $catalogue,
            'message' => 'Personalise products updated.',
        ]);
    }
}
