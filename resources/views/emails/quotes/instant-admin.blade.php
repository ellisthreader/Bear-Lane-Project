@extends('emails.layouts.base')

@php
    $quoteNumber = trim((string) ($quoteNumber ?? ''));
    $customerName = trim((string) ($name ?? '')) ?: 'Unknown';
    $customerEmail = trim((string) ($email ?? ''));
    $items = (array) ($items ?? []);
    $total = (float) ($total ?? 0);
    $submittedAt = isset($submittedAt) && $submittedAt ? $submittedAt : now();
    $submittedLabel = $submittedAt instanceof \DateTimeInterface ? $submittedAt->format('D j M Y, H:i') : (string) $submittedAt;
    $accountStatus = trim((string) ($accountStatus ?? ''));
    $unitCount = collect($items)->sum(fn ($item) => max(1, (int) (is_array($item) ? ($item['quantity'] ?? 1) : 1)));
    $replySubject = rawurlencode('Your Bear Lane quote #' . $quoteNumber);
    $replyHref = $customerEmail !== '' ? 'mailto:' . $customerEmail . '?subject=' . $replySubject : url('/admin/dashboard');

    $emailTitle = 'New instant quote #' . $quoteNumber;
    $emailEyebrow = 'Admin · Sales';
    $emailHeading = 'New instant quote';
    $emailSubheading = 'A customer has generated a quote on the website. Details below.';
    $emailPreheader = $customerName . ' · £' . number_format($total, 2) . ' · Quote #' . $quoteNumber;

    $factCell = 'padding:12px 14px;text-align:center;vertical-align:top;';
    $factLabel = 'margin:0 0 3px;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#8A6D2B;font-weight:700;';
    $factValue = 'margin:0;font-size:18px;font-weight:800;color:#1F1A13;';
    $rowLabel = 'padding:8px 0;font-size:13px;color:#7A6640;width:130px;vertical-align:top;';
    $rowValue = 'padding:8px 0;font-size:14px;color:#1F1A13;font-weight:600;vertical-align:top;';
@endphp

@section('content')
    @if (!empty($adminName))
        <p style="margin:0 0 16px;font-size:14px;color:#6B5A34;">Hi {{ $adminName }},</p>
    @endif

    {{-- Key facts strip --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #EBE2CF;border-radius:14px;background:#FFFFFF;border-collapse:separate;margin:0 0 20px;">
        <tr>
            <td class="bl-stack" width="25%" style="{{ $factCell }}border-right:1px solid #F0E8D6;">
                <p style="{{ $factLabel }}">Quote</p>
                <p style="{{ $factValue }}">#{{ $quoteNumber }}</p>
            </td>
            <td class="bl-stack" width="25%" style="{{ $factCell }}border-right:1px solid #F0E8D6;">
                <p style="{{ $factLabel }}">Lines</p>
                <p style="{{ $factValue }}">{{ count($items) }}</p>
            </td>
            <td class="bl-stack" width="25%" style="{{ $factCell }}border-right:1px solid #F0E8D6;">
                <p style="{{ $factLabel }}">Units</p>
                <p style="{{ $factValue }}">{{ $unitCount }}</p>
            </td>
            <td class="bl-stack" width="25%" style="{{ $factCell }}background:#FFF8E8;">
                <p style="{{ $factLabel }}">Total</p>
                <p style="{{ $factValue }}color:#8A6D2B;">£{{ number_format($total, 2) }}</p>
            </td>
        </tr>
    </table>

    {{-- Customer card --}}
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">Customer</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #EBE2CF;border-radius:14px;background:#FFFCF4;border-collapse:separate;margin:0 0 22px;">
        <tr>
            <td style="padding:6px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td style="{{ $rowLabel }}">Name</td>
                        <td style="{{ $rowValue }}">{{ $customerName }}</td>
                    </tr>
                    <tr>
                        <td style="{{ $rowLabel }}">Email</td>
                        <td style="{{ $rowValue }}">
                            @if ($customerEmail !== '')
                                <a href="mailto:{{ $customerEmail }}" style="color:#8A6D2B;text-decoration:none;">{{ $customerEmail }}</a>
                            @else
                                —
                            @endif
                        </td>
                    </tr>
                    @if ($accountStatus !== '')
                        <tr>
                            <td style="{{ $rowLabel }}">Account</td>
                            <td style="{{ $rowValue }}">{{ $accountStatus }}</td>
                        </tr>
                    @endif
                    <tr>
                        <td style="{{ $rowLabel }}">Submitted</td>
                        <td style="{{ $rowValue }}">{{ $submittedLabel }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- Items --}}
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">Quoted items</p>
    @include('emails.quotes._items-table', ['items' => $items, 'total' => $total])

    {{-- Actions --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
        <tr>
            <td align="center">
                <a href="{{ $replyHref }}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#1F1A13;color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;">Reply to customer</a>
                <span style="display:inline-block;width:10px;">&nbsp;</span>
                <a href="{{ url('/admin/dashboard') }}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#FFFFFF;border:1px solid #DCCFB4;color:#4E3F1F;font-size:14px;font-weight:700;text-decoration:none;">Open admin</a>
            </td>
        </tr>
        <tr>
            <td align="center" style="padding:10px 0 0;font-size:12px;color:#8F8060;line-height:1.6;">
                The customer has been sent a copy of this estimate and told that a confirmed price will follow.
            </td>
        </tr>
    </table>
@endsection
