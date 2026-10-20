<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\Order;
use Illuminate\Support\Facades\Storage;

class InvoiceController extends Controller
{
    public function download($orderId)
    {
        $order = Order::with('items')->findOrFail($orderId);

        // If PDF missing, regenerate automatically
        if (!$order->invoice_path || !Storage::disk('public')->exists($order->invoice_path)) {

            $pdf = Pdf::loadView('invoices.invoice', ['order' => $order]);

            $filePath = 'invoices/invoice_' . $order->order_number . '.pdf';

            Storage::disk('public')->put($filePath, $pdf->output());

            $order->invoice_path = $filePath;
            $order->save();
        }

        $fullPath = storage_path('app/public/' . $order->invoice_path);

        return response()->download($fullPath);
    }


    public function preview($orderId)
    {
        $order = Order::with('items')->findOrFail($orderId);

        $pdf = Pdf::loadView('invoices.invoice', ['order' => $order]);

        return $pdf->stream('invoice_' . $order->order_number . '.pdf');
    }
}
