<?php

namespace App\Http\Controllers\Quote;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\InstantQuote;

class InstantQuoteController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'quoteNumber' => 'required|string|max:20',
            'items' => 'required|array',
            'total' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $quote = InstantQuote::create([
            'name' => $request->name,
            'email' => $request->email,
            'quote_number' => $request->quoteNumber,
            'items' => json_encode($request->items),
            'total' => $request->total,
        ]);

        return response()->json(['success' => true, 'quote' => $quote]);
    }
}
