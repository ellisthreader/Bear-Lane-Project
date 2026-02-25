<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Mail\Message;

class QuoteController extends Controller
{
    public function sendQuote(Request $request)
    {
        Log::info('sendQuote called', $request->all());

        $request->validate([
            'name' => 'required|string',
            'email' => 'required|email',
            'items' => 'required|array|min:1',
            'total' => 'required|numeric',
            'quoteNumber' => 'required|numeric', // Added validation for quote number
        ]);

        $data = $request->only(['name', 'email', 'items', 'total', 'quoteNumber']);

        $data['items'] = array_map(function ($item) {
            return [
                'quantity' => $item['quantity'] ?? 1,
                'productType' => $item['productType'] ?? '',
                'designType' => $item['designType'] ?? '',
                'sizeCategory' => $item['sizeCategory'] ?? '',
                'size' => $item['size'] ?? '',
            ];
        }, $data['items']);

        try {
            Mail::send([], [], function (Message $message) use ($data) {
                $message->to($data['email'])
                        ->subject('Your Quote')
                        ->from(env('MAIL_FROM_ADDRESS'), env('MAIL_FROM_NAME'));

                $message->html($this->generateQuoteHtml($data));
            });

            Log::info('Quote email sent successfully', ['email' => $data['email'], 'quoteNumber' => $data['quoteNumber']]);

            return response()->json(['message' => 'Quote sent successfully']);

        } catch (\Exception $e) {

            Log::error('sendQuote failed: ' . $e->getMessage(), [
                'data' => $data
            ]);

            return response()->json([
                'message' => 'Failed to send quote',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate HTML quote email (NO embedded images)
     */
    private function generateQuoteHtml(array $data): string
    {
        $itemsHtml = '';

        foreach ($data['items'] as $item) {
            $itemsHtml .= "
                <tr>
                    <td style='padding: 10px; border: 1px solid #eee;'>{$item['quantity']}</td>
                    <td style='padding: 10px; border: 1px solid #eee;'>{$item['productType']}</td>
                    <td style='padding: 10px; border: 1px solid #eee;'>{$item['designType']}</td>
                    <td style='padding: 10px; border: 1px solid #eee;'>{$item['sizeCategory']}</td>
                    <td style='padding: 10px; border: 1px solid #eee;'>{$item['size']}</td>
                </tr>
            ";
        }

        return "
        <div style='font-family: Arial, sans-serif; color: #333; max-width: 650px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);'>
            
            <!-- Logo (NO ATTACHMENT) -->
            <div style='text-align: center; margin-bottom: 20px;'>
                <img src='http://localhost/images/BLText.png' 
                     alt='Company Logo' 
                     style='max-width: 150px;'>
            </div>

            <h2 style='color: #C9A24D; text-align: center; margin-bottom: 10px;'>
                Hello {$data['name']},
            </h2>

            <p style='font-size: 14px; text-align: center; font-weight: bold; color: #555; margin-bottom: 30px;'>
                Quote #: {$data['quoteNumber']}
            </p>

            <p style='font-size: 16px; text-align: center; margin-bottom: 30px;'>
                Thank you for requesting a quote! Here’s a summary of your selected items:
            </p>

            <table style='width: 100%; border-collapse: collapse; margin-bottom: 30px;'>
                <thead>
                    <tr style='background-color: #f8f8f8;'>
                        <th style='padding: 12px; border: 1px solid #eee;'>Qty</th>
                        <th style='padding: 12px; border: 1px solid #eee;'>Product</th>
                        <th style='padding: 12px; border: 1px solid #eee;'>Design</th>
                        <th style='padding: 12px; border: 1px solid #eee;'>Category</th>
                        <th style='padding: 12px; border: 1px solid #eee;'>Size</th>
                    </tr>
                </thead>
                <tbody>
                    $itemsHtml
                </tbody>
            </table>

            <p style='font-size: 18px; font-weight: bold; text-align: right; color: #C9A24D; margin-bottom: 30px;'>
                Total Quote: £{$data['total']}
            </p>

            <p style='font-size: 14px; color: #666; text-align: center; margin-top: 20px;'>
                This quote is based on your selected items and specifications. 
                Prices are subject to change until confirmed.<br><br>
                Best regards,<br>
                <span style='color: #C9A24D; font-weight: bold;'>
                    Bear Lane Team
                </span>
            </p>
        </div>
        ";
    }
}
