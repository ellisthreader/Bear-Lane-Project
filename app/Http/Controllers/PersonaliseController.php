<?php

namespace App\Http\Controllers;

use App\Services\PersonaliseCatalogueService;
use Inertia\Inertia;
use Inertia\Response;

class PersonaliseController extends Controller
{
    public function __construct(private readonly PersonaliseCatalogueService $catalogue)
    {
    }

    /**
     * "Pick your product" – the products customers can personalise, grouped for browsing.
     */
    public function index(): Response
    {
        return Inertia::render('Personalise/PickProduct', [
            'catalogue' => $this->catalogue->getStorefrontCatalogue(),
        ]);
    }
}
