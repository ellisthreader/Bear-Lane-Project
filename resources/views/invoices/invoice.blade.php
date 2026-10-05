<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice #{{ $order->order_number }}</title>

    <style>
        @page {
            size: A4;
            margin: 12mm;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #2f2f2f;
            font-size: 11px;
        }

        .invoice-wrapper {
            background: #fff;
            padding: 12px;
            width: auto;
            border: 1px solid #dbc27d;
            overflow: hidden;
        }

        .header {
            border-bottom: 2px solid #c9a24d;
            padding-bottom: 8px;
            margin-bottom: 10px;
        }

        .brand {
            font-size: 14px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #8a6d2b;
            margin-bottom: 4px;
            font-weight: 700;
        }

        .header-title {
            font-size: 18px;
            margin: 0;
            color: #111827;
            font-weight: 700;
        }

        .muted {
            color: #6b7280;
        }

        .two-col {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
            table-layout: fixed;
        }
        .two-col td {
            vertical-align: top;
            padding: 3px 0;
            word-wrap: break-word;
        }

        .section-title {
            font-size: 12px;
            font-weight: bold;
            margin: 12px 0 6px;
            color: #8a6d2b;
            border-left: 3px solid #c9a24d;
            padding-left: 6px;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            margin-bottom: 10px;
            table-layout: fixed;
        }

        .items-table th {
            background: #f8efdb;
            color: #6f5724;
            padding: 6px;
            font-size: 10px;
            text-align: left;
            border-bottom: 1px solid #e8dcc0;
            word-wrap: break-word;
        }

        .items-table td {
            border-bottom: 1px solid #ececec;
            padding: 6px;
            word-wrap: break-word;
        }

        .summary-table {
            width: 48%;
            margin-left: auto;
            border-collapse: collapse;
            background: #fcfaf5;
            border: 1px solid #eadcb9;
        }

        .summary-table td {
            padding: 5px 8px;
        }

        .summary-label {
            font-weight: bold;
            color: #374151;
        }

        .summary-total {
            font-size: 13px;
            font-weight: bold;
            border-top: 1px solid #d9c28b;
            color: #000;
        }

        .footer {
            text-align: left;
            font-size: 10px;
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid #e8dcc0;
            color: #666;
        }
    </style>
</head>

<body>

<div class="invoice-wrapper">

    <div class="header">
        <div class="brand">Bear Lane</div>
        <h1 class="header-title">Invoice #{{ $order->order_number }}</h1>
        <p style="margin:6px 0 0;" class="muted">Date: {{ $order->created_at->format('d M Y') }}</p>
    </div>


    <div class="section-title">Billing Information</div>

    <table class="two-col">
        <tr>
            <td><strong>Name:</strong></td>
            <td>{{ $order->first_name }} {{ $order->last_name }}</td>
        </tr>
        <tr>
            <td><strong>Email:</strong></td>
            <td>{{ $order->email }}</td>
        </tr>
        <tr>
            <td><strong>Address:</strong></td>
            <td>{{ $order->address_line1 }}, {{ $order->city }}, {{ $order->postcode }}</td>
        </tr>
    </table>

    <div class="section-title">Order Details</div>

    <table class="items-table">
        <thead>
        <tr>
            <th style="width:50%">Product</th>
            <th style="width:10%">Qty</th>
            <th style="width:20%">Price (£)</th>
            <th style="width:20%">Total (£)</th>
        </tr>
        </thead>

        <tbody>
        @foreach ($order->items as $item)
            <tr>
                <td>{{ $item->product_name }}</td>
                <td>{{ $item->quantity }}</td>
                <td>£{{ number_format($item->unit_price, 2) }}</td>
                <td>£{{ number_format($item->line_total, 2) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>


    <table class="summary-table">
        <tr>
            <td class="summary-label">Subtotal:</td>
            <td>£{{ number_format($order->subtotal, 2) }}</td>
        </tr>

        @if ($order->discount_amount > 0)
            <tr>
                <td class="summary-label">Discount:</td>
                <td>-£{{ number_format($order->discount_amount, 2) }}</td>
            </tr>
        @endif

        <tr>
            <td class="summary-label">VAT (20%):</td>
            <td>£{{ number_format($order->vat, 2) }}</td>
        </tr>

        <tr>
            <td class="summary-label">Shipping:</td>
            <td>£{{ number_format($order->shipping, 2) }}</td>
        </tr>

        <tr class="summary-total">
            <td>Total:</td>
            <td>£{{ number_format($order->total, 2) }}</td>
        </tr>
    </table>

    <div class="footer">
        Thank you for shopping with Bear Lane.
        <br>For support contact <strong>support@bearlane.co.uk</strong>
    </div>

</div>

</body>
</html>
