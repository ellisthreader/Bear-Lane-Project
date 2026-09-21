@extends('emails.layouts.base')

@php
    $customerName = trim((string) ($name ?? '')) ?: 'there';
    $reference = trim((string) ($reference ?? ''));
    $email = trim((string) ($email ?? ''));
    $phone = trim((string) ($phone ?? ''));
    $budget = trim((string) ($budget ?? ''));
    $details = trim((string) ($details ?? ''));
    $invoiceReference = trim((string) ($invoiceReference ?? ''));
    $imageCount = (int) ($imageCount ?? 0);

    $emailTitle = 'Print specialist request ' . $reference;
    $emailEyebrow = 'Request received';
    $emailHeading = 'Thanks, ' . $customerName . ' — we have your request';
    $emailSubheading = 'A print specialist will review your brief and get back to you shortly.';
    $emailPreheader = 'Reference ' . $reference . ' · We will be in touch within one working day.';

    $rowLabel = 'padding:9px 0;font-size:13px;color:#7A6640;width:150px;vertical-align:top;border-bottom:1px solid #F2ECDD;';
    $rowValue = 'padding:9px 0;font-size:14px;color:#1F1A13;font-weight:600;vertical-align:top;border-bottom:1px solid #F2ECDD;';
@endphp

@section('content')
    {{-- Reference card --}}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E7D8B4;border-radius:16px;background:#FFF8E8;border-collapse:separate;margin:0 0 22px;">
        <tr>
            <td class="bl-stack" width="50%" style="padding:14px 16px;border-right:1px solid #EFE3C8;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">Your reference</p>
                <p style="margin:0;font-size:20px;font-weight:800;color:#1F1A13;">{{ $reference }}</p>
            </td>
            <td class="bl-stack" width="50%" style="padding:14px 16px;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">Status</p>
                <p style="margin:0;"><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#FFFFFF;border:1px solid #C6A75E;color:#8A6D2B;font-size:12px;font-weight:700;">Received</span></p>
            </td>
        </tr>
    </table>

    {{-- Details --}}
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">Your details</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
        <tr><td style="{{ $rowLabel }}">Email</td><td style="{{ $rowValue }}">{{ $email !== '' ? $email : 'Not provided' }}</td></tr>
        <tr><td style="{{ $rowLabel }}">Phone</td><td style="{{ $rowValue }}">{{ $phone !== '' ? $phone : 'Not provided' }}</td></tr>
        <tr><td style="{{ $rowLabel }}">Budget</td><td style="{{ $rowValue }}">{{ $budget !== '' ? $budget : 'Not provided' }}</td></tr>
        @if ($invoiceReference !== '')
            <tr><td style="{{ $rowLabel }}">Quote / invoice ref</td><td style="{{ $rowValue }}">{{ $invoiceReference }}</td></tr>
        @endif
        <tr><td style="{{ $rowLabel }}">Attached images</td><td style="{{ $rowValue }}">{{ $imageCount > 0 ? $imageCount . ' ' . ($imageCount === 1 ? 'image' : 'images') : 'None' }}</td></tr>
    </table>

    {{-- Brief --}}
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">Your brief</p>
    <div style="padding:14px 16px;border:1px solid #EBE2CF;border-radius:12px;background:#FFFCF4;font-size:14px;line-height:1.7;color:#3B3020;white-space:pre-wrap;">{{ $details !== '' ? $details : 'No additional details were provided.' }}</div>

    {{-- Next steps --}}
    <p style="margin:24px 0 12px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A6D2B;font-weight:700;">What happens next</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        @foreach ([
            ['1', 'A specialist reviews your brief', 'We look at your artwork, quantities and the best print method for the job.'],
            ['2', 'We get in touch', 'Expect an email or call within one working day, quoting ' . $reference . '.'],
            ['3', 'You receive a tailored quote', 'A confirmed price, lead time and proof before anything goes to print.'],
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

    <p style="margin:10px 0 0;font-size:13px;line-height:1.7;color:#7A6640;">
        Need to add something to your brief? Just reply to this email and quote <strong style="color:#5F5133;">{{ $reference }}</strong>.
    </p>
@endsection
