<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Memproses foto selfie presensi: validasi ulang bahwa file benar-benar
 * gambar (defense-in-depth di luar validasi FormRequest), lalu di-decode
 * & di-encode ulang lewat GD. Proses re-encode ini secara efektif
 * MENGHAPUS metadata EXIF (termasuk koordinat GPS yang mungkin terekam
 * kamera) dan menetralkan payload berbahaya yang diselundupkan di dalam
 * file gambar (mis. polyglot GIF/PHP). Nama file dibuat acak (UUID),
 * TIDAK pernah memakai nama asli dari klien.
 */
class SelfiePhotoService
{
    public function simpan(UploadedFile $file, string $folder): string
    {
        $imageInfo = @getimagesize($file->getRealPath());
        if ($imageInfo === false) {
            throw new \RuntimeException('File yang diunggah bukan gambar yang valid.');
        }

        $mime = $imageInfo['mime'];
        $source = match ($mime) {
            'image/jpeg' => imagecreatefromjpeg($file->getRealPath()),
            'image/png' => imagecreatefrompng($file->getRealPath()),
            default => throw new \RuntimeException('Format gambar tidak didukung.'),
        };

        if ($source === false) {
            throw new \RuntimeException('Gagal memproses gambar.');
        }

        // Batasi dimensi maksimum agar tidak jadi vektor decompression-bomb.
        $maxDimension = 2000;
        $width = imagesx($source);
        $height = imagesy($source);

        if ($width > $maxDimension || $height > $maxDimension) {
            $ratio = min($maxDimension / $width, $maxDimension / $height);
            $newWidth = (int) ($width * $ratio);
            $newHeight = (int) ($height * $ratio);
            $resized = imagecreatetruecolor($newWidth, $newHeight);
            imagecopyresampled($resized, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            imagedestroy($source);
            $source = $resized;
        }

        $filename = $folder.'/'.now()->format('Y/m').'/'.Str::uuid()->toString().'.jpg';
        $fullPath = Storage::disk('public')->path($filename);
        Storage::disk('public')->makeDirectory(dirname($filename));

        imagejpeg($source, $fullPath, 85);
        imagedestroy($source);

        return $filename;
    }
}
