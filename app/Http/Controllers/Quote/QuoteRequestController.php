<?php

namespace App\Http\Controllers\Quote;

use App\Http\Controllers\Controller;
use App\Models\SupportMessage;
use App\Services\AdminNotificationService;
use App\Services\OpenAiModerationService;
use App\Services\Security\RecaptchaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Models\QuoteRequest;

class QuoteRequestController extends Controller
{
    public function store(
        Request $request,
        OpenAiModerationService $moderationService,
        RecaptchaService $recaptchaService,
        AdminNotificationService $adminNotificationService
    ): JsonResponse
    {
        $recaptchaService->verifyOrFail($request, 'quote_request');

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
            foreach ($request->file('images') as $index => $image) {
                if (!$image instanceof UploadedFile) {
                    continue;
                }

                $imageDataUrl = $this->uploadedImageToDataUrl($image);
                if (!$imageDataUrl) {
                    return response()->json([
                        'message' => 'One image could not be processed. Please upload a different image.',
                    ], 422);
                }

                try {
                    $moderation = $moderationService->moderateImageDataUrl($imageDataUrl, 'Quote request image upload');
                } catch (\Throwable $exception) {
                    Log::error('Quote request image moderation failed', [
                        'error' => $exception->getMessage(),
                        'email' => (string) $request->input('email', ''),
                        'image_index' => $index,
                        'ip' => $request->ip(),
                    ]);

                    return response()->json([
                        'message' => 'Image moderation is temporarily unavailable. Please try again shortly.',
                    ], 503);
                }

                if (!empty($moderation['blocked'])) {
                    $reason = $moderationService->summarizeViolationReason($moderation);
                    $moderationService->logFlaggedMessage('[quote-request-image-upload-blocked]', $moderation, [
                        'endpoint' => '/api/quote-request',
                        'email' => (string) $request->input('email', ''),
                        'image_index' => $index,
                        'ip' => $request->ip(),
                    ]);

                    return response()->json([
                        'message' => "One image was blocked by content checks ({$reason}). Please upload a different image.",
                        'warning' => true,
                    ], 422);
                }

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

        SupportMessage::query()->create([
            'user_id' => $request->user()?->id,
            'quote_request_id' => $quote->id,
            'source_type' => 'artist_request',
            'name' => (string) $quote->name,
            'email' => (string) $quote->email,
            'phone' => (string) ($quote->phone ?? ''),
            'subject' => 'Speak to an Embroidery Artist',
            'message' => (string) ($quote->details ?? ''),
            'attachments' => (array) ($quote->images ?? []),
            'metadata' => [
                'budget' => (string) ($quote->budget ?? ''),
                'invoice_reference' => trim((string) $request->input('invoice_reference', '')),
            ],
            'status' => 'new',
        ]);

        try {
            Mail::send('emails.quote-request-confirmation', [
                'name' => (string) $quote->name,
                'email' => (string) $quote->email,
                'phone' => (string) ($quote->phone ?? ''),
                'budget' => (string) ($quote->budget ?? ''),
                'details' => (string) ($quote->details ?? ''),
                'reference' => (string) ('BL-ARTIST-' . $quote->id),
            ], function ($message) use ($quote) {
                $message->to((string) $quote->email)
                    ->subject('Your Embroidery Artist Request')
                    ->from((string) env('MAIL_FROM_ADDRESS'), (string) env('MAIL_FROM_NAME'));
            });
        } catch (\Throwable $exception) {
            Log::error('Quote request confirmation email failed', [
                'quote_request_id' => $quote->id,
                'email' => (string) $quote->email,
                'error' => $exception->getMessage(),
            ]);
        }

        $adminNotificationService->sendAdminEventEmail(
            'quote_request_submitted',
            'New Embroidery Artist Request',
            'New embroidery artist request submitted',
            "Reference: BL-ARTIST-{$quote->id}\nName: {$quote->name}\nEmail: {$quote->email}\nPhone: {$quote->phone}\nBudget: " . ($quote->budget ?: 'Not provided')
        );

        return response()->json([
            'message' => 'Quote request submitted successfully',
            'data' => $quote
        ], 201);
    }

    private function uploadedImageToDataUrl(UploadedFile $file): ?string
    {
        $binary = @file_get_contents($file->getRealPath());
        if ($binary === false) {
            return null;
        }

        $mime = strtolower(trim((string) ($file->getMimeType() ?: 'image/jpeg')));
        if (!str_starts_with($mime, 'image/')) {
            return null;
        }

        return 'data:' . $mime . ';base64,' . base64_encode($binary);
    }
}
