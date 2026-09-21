@extends('emails.layouts.base')

@php
    $quoteNumber = trim((string) ($quoteNumber ?? ''));
    $customerName = trim((string) ($name ?? '')) ?: 'there';
    $items = (array) ($items ?? []);
    $total = (float) ($total ?? 0);
    $quoteDate = isset($quoteDate) && $quoteDate ? $quoteDate : now();
    $quoteDateLabel = $quoteDate instanceof \DateTimeInterface ? $quoteDate->format('j M Y') : (string) $quoteDate;
    $specialistUrl = url('/?quote_tab=specialist&invoice_ref=' . rawurlencode('Q-' . $quoteNumber) . '#get-quote-instantly');
    $unitCount = collect($items)->sum(fn ($item) => max(1, (int) (is_array($item) ? ($item['quantity'] ?? 1) : 1)));

    $emailTitle = 'Your quote ' . ($quoteNumber !== '' ? '#' . $quoteNumber : '');
    $emailEyebrow = 'Instant Quote';
    $emailHeading = 'Your quote is ready';
    $emailSubheading = 'Here is a full breakdown of the estimate you requested.';
    $emailPreheader = 'Quote #' . $quoteNumber . ' · Estimated total £' . number_format($total, 2);

    $cell = 'padding:14px 16px;vertical-align:top;';
    $label = 'margin:0 0 4px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8A6D2B;font-weight:700;';
    $value = 'margin:0;font-size:16px;font-weight:700;color:#1F1A13;';
@endphp

@section('content')
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#3B3020;">
        Hello {{ $customerName }},<br>
        Thank you for using our instant quote tool. Your estimate is summarised below and a copy has been saved against your quote number.
    </p>

    {{-- Summary card --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E7D8B4;border-radius:16px;background:#FFF8E8;border-collapse:separate;margin:0 0 22px;">
        <tr>
            <td class="bl-stack" width="34%" style="{{ $cell }}border-right:1px solid #EFE3C8;">
                <p style="{{ $label }}">Quote number</p>
                <p style="{{ $value }}font-size:20px;">#{{ $quoteNumber }}</p>
            </td>
            <td class="bl-stack" width="33%" style="{{ $cell }}border-right:1px solid #EFE3C8;">
                <p style="{{ $label }}">Date</p>
                <p style="{{ $value }}">{{ $quoteDateLabel }}</p>
            </td>
            <td class="bl-stack" width="33%" style="{{ $cell }}">
                <p style="{{ $label }}">Status</p>
                <p style="margin:0;"><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#FFFFFF;border:1px solid #C6A75E;color:#8A6D2B;font-size:12px;font-weight:700;letter-spacing:0.04em;">Estimate</span></p>
            </td>
        </tr>
    </table>

    {{-- Items --}}
    <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">Your items &middot; {{ count($items) }} {{ count($items) === 1 ? 'line' : 'lines' }}, {{ $unitCount }} {{ $unitCount === 1 ? 'unit' : 'units' }}</p>
    @include('emails.quotes._items-table', ['items' => $items, 'total' => $total])

    {{-- Estimate callout --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 26px;">
        <tr>
            <td style="padding:14px 16px;border-left:4px solid #C6A75E;background:#FFFCF4;border-radius:0 12px 12px 0;font-size:13px;line-height:1.65;color:#5F5133;">
                <strong style="color:#1F1A13;">This is an estimate.</strong> Final pricing is confirmed once our team has reviewed your artwork, quantities and print positions. Nothing is charged at this stage.
            </td>
        </tr>
    </table>

    {{-- What happens next --}}
    <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">What happens next</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px;">
        @foreach ([
            ['1', 'We review your quote', 'A member of the team checks your items, print styles and sizes.'],
            ['2', 'We confirm your price', 'You will receive a confirmed price and lead time, usually within one working day.'],
            ['3', 'You approve and we print', 'Once you are happy, we prepare your artwork proof and start production.'],
        ] as [$step, $title, $copy])
            <tr>
                <td width="40" style="padding:0 0 12px;vertical-align:top;">
                    <span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:999px;background:#1F1A13;color:#FFFFFF;font-size:13px;font-weight:700;text-align:center;">{{ $step }}</span>
                </td>
                <td style="padding:0 0 12px 8px;vertical-align:top;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#1F1A13;">{{ $title }}</p>
                    <p style="margin:2px 0 0;font-size:13px;line-height:1.6;color:#6B5A34;">{{ $copy }}</p>
                </td>
            </tr>
        @endforeach
    </table>

    {{-- CTA --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center" style="padding:4px 0 6px;">
                <a href="{{ $specialistUrl }}" style="display:inline-block;padding:14px 26px;border-radius:999px;background:#C6A75E;color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">Speak to a print specialist</a>
            </td>
        </tr>
        <tr>
            <td align="center" style="padding:8px 0 0;font-size:12px;line-height:1.6;color:#8F8060;">
                Quote your reference <strong style="color:#5F5133;">Q-{{ $quoteNumber }}</strong> when you get in touch.
            </td>
        </tr>
    </table>
@endsection
