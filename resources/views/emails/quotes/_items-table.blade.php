@php
    /** @var array $items */
    $__rows = collect((array) ($items ?? []))->map(function ($item) {
        $item = is_array($item) ? $item : (array) $item;
        $qty = max(1, (int) ($item['quantity'] ?? 1));
        $price = isset($item['price']) && is_numeric($item['price']) ? (float) $item['price'] : null;
        $productGroup = trim((string) ($item['productGroup'] ?? ''));
        $productName = trim((string) ($item['productType'] ?? $item['product'] ?? ''));
        return [
            'quantity' => $qty,
            'product' => $productGroup !== '' && $productName !== '' ? $productGroup . ' › ' . $productName : $productName,
            'design' => trim((string) ($item['designType'] ?? $item['design'] ?? '')),
            'group' => trim((string) ($item['sizeCategory'] ?? $item['category'] ?? '')),
            'size' => trim((string) ($item['size'] ?? '')),
            'price' => $price,
        ];
    })->values();
    $__hasPrices = $__rows->contains(fn ($row) => $row['price'] !== null);
    $__subtotal = $__rows->sum(fn ($row) => (float) ($row['price'] ?? 0));
    $__total = isset($total) && is_numeric($total) ? (float) $total : $__subtotal;
    $th = 'padding:10px 12px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8A6D2B;font-weight:700;border-bottom:1px solid #EBE2CF;background:#FFF8E8;text-align:left;';
    $td = 'padding:12px;font-size:14px;line-height:1.5;color:#2D2515;border-bottom:1px solid #F2ECDD;vertical-align:top;';
@endphp
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #EBE2CF;border-radius:14px;border-collapse:separate;overflow:hidden;">
    <tr>
        <th style="{{ $th }}width:44px;">Qty</th>
        <th style="{{ $th }}">Product</th>
        <th style="{{ $th }}">Print style</th>
        <th style="{{ $th }}" class="bl-hide-sm">Group</th>
        <th style="{{ $th }}">Size</th>
        @if ($__hasPrices)
            <th style="{{ $th }}text-align:right;">Line price</th>
        @endif
    </tr>
    @forelse ($__rows as $row)
        <tr>
            <td style="{{ $td }}font-weight:700;">{{ $row['quantity'] }}</td>
            <td style="{{ $td }}font-weight:600;">{{ $row['product'] !== '' ? $row['product'] : '—' }}</td>
            <td style="{{ $td }}color:#5F5133;">{{ $row['design'] !== '' ? $row['design'] : '—' }}</td>
            <td style="{{ $td }}color:#5F5133;" class="bl-hide-sm">{{ $row['group'] !== '' ? $row['group'] : '—' }}</td>
            <td style="{{ $td }}color:#5F5133;">{{ $row['size'] !== '' ? $row['size'] : '—' }}</td>
            @if ($__hasPrices)
                <td style="{{ $td }}text-align:right;font-weight:700;white-space:nowrap;">{{ $row['price'] !== null ? '£' . number_format($row['price'], 2) : '—' }}</td>
            @endif
        </tr>
    @empty
        <tr>
            <td colspan="{{ $__hasPrices ? 6 : 5 }}" style="{{ $td }}color:#8F8060;text-align:center;">No items were added to this quote.</td>
        </tr>
    @endforelse
    @if ($__hasPrices)
        <tr>
            <td colspan="{{ $__hasPrices ? 5 : 4 }}" style="padding:10px 12px;font-size:13px;color:#7A6640;text-align:right;border-bottom:1px solid #F2ECDD;">Subtotal</td>
            <td style="padding:10px 12px;font-size:13px;color:#2D2515;text-align:right;font-weight:600;border-bottom:1px solid #F2ECDD;white-space:nowrap;">£{{ number_format($__subtotal, 2) }}</td>
        </tr>
    @endif
    <tr>
        <td colspan="{{ $__hasPrices ? 5 : 4 }}" style="padding:14px 12px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#8A6D2B;font-weight:700;text-align:right;background:#FFFCF4;">Estimated total</td>
        <td style="padding:14px 12px;font-size:18px;color:#1F1A13;text-align:right;font-weight:800;background:#FFFCF4;white-space:nowrap;">£{{ number_format($__total, 2) }}</td>
    </tr>
</table>
