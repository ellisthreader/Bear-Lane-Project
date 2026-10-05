<?php

namespace App\Http\Controllers;

use App\Models\ReturnRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SecureMediaController extends Controller
{
    public function returnProof(Request $request, ReturnRequest $returnRequest, int $index)
    {
        $user = $request->user();
        $isAdmin = (bool) ($user?->is_admin ?? false);
        $isOwner = $user && (int) $returnRequest->user_id === (int) $user->id;

        abort_unless($isAdmin || $isOwner, 403);

        $paths = array_values((array) ($returnRequest->proof_paths ?? []));
        abort_unless(array_key_exists($index, $paths), 404);

        $path = trim((string) $paths[$index]);
        abort_if($path === '', 404);

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return redirect()->away($path);
        }

        $path = ltrim($path, '/');

        $publicDisk = Storage::disk('public');
        if ($publicDisk->exists($path)) {
            return $publicDisk->response($path);
        }

        $privateDisk = Storage::disk('local');
        if ($privateDisk->exists($path)) {
            return $privateDisk->response($path);
        }

        abort(404);
    }
}
