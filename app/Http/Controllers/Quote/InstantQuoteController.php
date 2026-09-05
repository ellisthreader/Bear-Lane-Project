<?php

namespace App\Http\Controllers\Quote;

use App\Http\Controllers\Controller;
use App\Services\AdminNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Mail\Message;
use App\Models\InstantQuote;
use App\Services\Security\RecaptchaService;

class InstantQuoteController extends Controller
{
    public function store(Request $request, RecaptchaService $recaptchaService, AdminNotificationService $adminNotificationService)
    {
        $recaptchaService->verifyOrFail($request, 'instant_quote');

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

        try {
            Mail::send([], [], function (Message $message) use ($request) {
                $message->to((string) $request->email)
                    ->subject('Your Instant Quote')
                    ->from((string) env('MAIL_FROM_ADDRESS'), (string) env('MAIL_FROM_NAME'));

                $message->html($this->generateQuoteHtml([
                    'name' => (string) $request->name,
                    'email' => (string) $request->email,
                    'items' => (array) $request->items,
                    'total' => (float) $request->total,
                    'quoteNumber' => (string) $request->quoteNumber,
                ]));
            });
        } catch (\Throwable $e) {
            Log::error('Instant quote email failed', [
                'email' => (string) $request->email,
                'quote_number' => (string) $request->quoteNumber,
                'error' => $e->getMessage(),
            ]);
        }

        $adminNotificationService->sendAdminEventEmail(
            'instant_quote_generated',
            'New Instant Quote Generated',
            'A customer generated an instant quote',
            "Quote number: {$quote->quote_number}\nName: {$quote->name}\nEmail: {$quote->email}\nTotal: £" . number_format((float) $quote->total, 2)
        );

        return response()->json(['success' => true, 'quote' => $quote]);
    }

    /**
     * @param array{name:string,email:string,items:array,total:float,quoteNumber:string} $data
     */
    private function generateQuoteHtml(array $data): string
    {
        $itemsHtml = '';
        foreach ((array) ($data['items'] ?? []) as $item) {
            $quantity = (int) ($item['quantity'] ?? 1);
            $productType = (string) ($item['productType'] ?? '');
            $designType = (string) ($item['designType'] ?? '');
            $sizeCategory = (string) ($item['sizeCategory'] ?? '');
            $size = (string) ($item['size'] ?? '');

            $itemsHtml .= "
                <tr>
                    <td style='padding: 10px; border: 1px solid #eee;'>{$quantity}</td>
                    <td style='padding: 10px; border: 1px solid #eee;'>{$productType}</td>
                    <td style='padding: 10px; border: 1px solid #eee;'>{$designType}</td>
                    <td style='padding: 10px; border: 1px solid #eee;'>{$sizeCategory}</td>
                    <td style='padding: 10px; border: 1px solid #eee;'>{$size}</td>
                </tr>
            ";
        }

        return "
        <div style='font-family: Arial, sans-serif; color: #333; max-width: 650px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);'>
            <div style='text-align: center; margin-bottom: 20px;'>
                <img src='" . asset('images/BLText.png') . "' alt='Bear Lane' style='max-width: 150px;'>
            </div>

            <h2 style='color: #C9A24D; text-align: center; margin-bottom: 10px;'>Hello {$data['name']},</h2>
            <p style='font-size: 14px; text-align: center; font-weight: bold; color: #555; margin-bottom: 30px;'>
                Quote #: {$data['quoteNumber']}
            </p>
            <p style='font-size: 16px; text-align: center; margin-bottom: 30px;'>
                Thank you for requesting an instant quote. Here is your summary:
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
                    {$itemsHtml}
                </tbody>
            </table>

            <p style='font-size: 18px; font-weight: bold; text-align: right; color: #C9A24D; margin-bottom: 30px;'>
                Total Quote: £" . number_format((float) ($data['total'] ?? 0), 2) . "
            </p>

            <p style='font-size: 14px; color: #666; text-align: center; margin-top: 20px;'>
                Bear Lane Studio
            </p>
        </div>";
    }
}
