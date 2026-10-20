@extends('emails.layouts.base')

@php
    $customerName = trim((string) ($name ?? '')) ?: 'Unknown';
    $customerEmail = trim((string) ($email ?? ''));
    $phone = trim((string) ($phone ?? ''));
    $budget = trim((string) ($budget ?? ''));
    $details = trim((string) ($details ?? ''));
    $reference = trim((string) ($reference ?? ''));
    $invoiceReference = trim((string) ($invoiceReference ?? ''));
    $imageUrls = collect((array) ($imageUrls ?? []))->map(fn ($u) => trim((string) $u))->filter()->values();
    $submittedAt = isset($submittedAt) && $submittedAt ? $submittedAt : now();
    $submittedLabel = $submittedAt instanceof \DateTimeInterface ? $submittedAt->format('D j M Y, H:i') : (string) $submittedAt;
    $replyHref = $customerEmail !== '' ? 'mailto:' . $customerEmail . '?subject=' . rawurlencode('Your print specialist request ' . $reference) : url('/admin/support');

    $emailTitle = 'New print specialist request ' . $reference;
    $emailEyebrow = 'Admin · Sales';
    $emailHeading = 'New print specialist request';
    $emailSubheading = 'A customer has asked to speak to a print specialist.';
    $emailPreheader = $customerName . ' · ' . ($budget !== '' ? 'Budget ' . $budget : 'No budget given') . ' · ' . $reference;

    $rowLabel = 'padding:8px 0;font-size:13px;color:#7A6640;width:150px;vertical-align:top;';
    $rowValue = 'padding:8px 0;font-size:14px;color:#1F1A13;font-weight:600;vertical-align:top;';
@endphp

@section('content')
    @if (!empty($adminName))
        <p style="margin:0 0 16px;font-size:14px;color:#6B5A34;">Hi {{ $adminName }},</p>
    @endif

    {{-- Key facts --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #EBE2CF;border-radius:14px;background:#FFFFFF;border-collapse:separate;margin:0 0 20px;">
        <tr>
            <td class="bl-stack" width="34%" style="padding:12px 14px;text-align:center;border-right:1px solid #F0E8D6;">
                <p style="margin:0 0 3px;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">Reference</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#1F1A13;">{{ $reference }}</p>
            </td>
            <td class="bl-stack" width="33%" style="padding:12px 14px;text-align:center;border-right:1px solid #F0E8D6;">
                <p style="margin:0 0 3px;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">Budget</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#1F1A13;">{{ $budget !== '' ? $budget : '—' }}</p>
            </td>
            <td class="bl-stack" width="33%" style="padding:12px 14px;text-align:center;background:#FFF8E8;">
                <p style="margin:0 0 3px;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">Images</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#1F1A13;">{{ $imageUrls->count() }}</p>
            </td>
        </tr>
    </table>

    {{-- Customer --}}
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">Customer</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #EBE2CF;border-radius:14px;background:#FFFCF4;border-collapse:separate;margin:0 0 22px;">
        <tr>
            <td style="padding:6px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr><td style="{{ $rowLabel }}">Name</td><td style="{{ $rowValue }}">{{ $customerName }}</td></tr>
                    <tr><td style="{{ $rowLabel }}">Email</td><td style="{{ $rowValue }}">@if ($customerEmail !== '')<a href="mailto:{{ $customerEmail }}" style="color:#8A6D2B;text-decoration:none;">{{ $customerEmail }}</a>@else — @endif</td></tr>
                    <tr><td style="{{ $rowLabel }}">Phone</td><td style="{{ $rowValue }}">{{ $phone !== '' ? $phone : '—' }}</td></tr>
                    @if ($invoiceReference !== '')
                        <tr><td style="{{ $rowLabel }}">Quote / invoice ref</td><td style="{{ $rowValue }}">{{ $invoiceReference }}</td></tr>
                    @endif
                    <tr><td style="{{ $rowLabel }}">Submitted</td><td style="{{ $rowValue }}">{{ $submittedLabel }}</td></tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- Brief --}}
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">Customer brief</p>
    <div style="padding:14px 16px;border:1px solid #EBE2CF;border-radius:12px;background:#FFFFFF;font-size:14px;line-height:1.7;color:#3B3020;white-space:pre-wrap;">{{ $details !== '' ? $details : 'No details provided.' }}</div>

    {{-- Attachments --}}
    @if ($imageUrls->isNotEmpty())
        <p style="margin:22px 0 8px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">Uploaded images</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #EBE2CF;border-radius:12px;border-collapse:separate;">
            @foreach ($imageUrls as $index => $url)
                <tr>
                    <td style="padding:10px 14px;font-size:13px;border-bottom:{{ $loop->last ? '0' : '1px solid #F2ECDD' }};">
                        <a href="{{ $url }}" style="color:#8A6D2B;font-weight:600;text-decoration:none;">Image {{ $index + 1 }}</a>
                        <span style="color:#9A8B68;"> &middot; {{ basename(parse_url($url, PHP_URL_PATH) ?: $url) }}</span>
                    </td>
                </tr>
            @endforeach
        </table>
    @endif

    {{-- Actions --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
        <tr>
            <td align="center">
                <a href="{{ $replyHref }}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#1F1A13;color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;">Reply to customer</a>
                <span style="display:inline-block;width:10px;">&nbsp;</span>
                <a href="{{ url('/admin/support') }}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#FFFFFF;border:1px solid #DCCFB4;color:#4E3F1F;font-size:14px;font-weight:700;text-decoration:none;">Open in support</a>
            </td>
        </tr>
    </table>
@endsection
