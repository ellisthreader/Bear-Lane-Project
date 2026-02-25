<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Your Quote</title>
</head>
<body>
    <h2>Hello {{ $name }},</h2>
    <p>Here’s your quote:</p>
    <p><strong>Total: £{{ number_format($total, 2) }}</strong></p>

    <ul>
        @foreach($items as $item)
            <li>{{ $item['quantity'] }} × {{ $item['productType'] }} 
            ({{ $item['designType'] }}, {{ $item['sizeCategory'] }}: {{ $item['size'] }})</li>
        @endforeach
    </ul>

    <p>Thank you for using our service!</p>
</body>
</html>
