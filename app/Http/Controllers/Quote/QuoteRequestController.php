<?php

namespace App\Http\Controllers\Quote;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\QuoteRequest;

class QuoteRequestController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'required|string',
            'budget' => 'nullable|string',
            'details' => 'required|string',
            'images.*' => 'image|max:5120' // 5MB max per image
        ]);

        $imagePaths = [];

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('quote-requests', 'public');
                $imagePaths[] = $path;
            }
        }

        $quote = QuoteRequest::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'budget' => $request->budget,
            'details' => $request->details,
            'images' => $imagePaths,
        ]);

        return response()->json([
            'message' => 'Quote request submitted successfully',
            'data' => $quote
        ], 201);
    }
}
