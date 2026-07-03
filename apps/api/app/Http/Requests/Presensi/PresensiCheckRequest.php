<?php

namespace App\Http\Requests\Presensi;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Dipakai untuk check-in maupun check-out. Foto WAJIB dikirim sebagai file
 * multipart (bukan base64) agar bisa divalidasi sebagai gambar sungguhan
 * (Laravel memverifikasi konten via getimagesize, bukan sekadar ekstensi)
 * dan dibatasi ukurannya sebelum masuk ke server.
 */
class PresensiCheckRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'accuracy_meter' => ['nullable', 'numeric', 'min:0', 'max:500'],
            'foto' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:5120', 'dimensions:min_width=200,min_height=200'],
            'catatan' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'foto.required' => 'Foto selfie wajib disertakan.',
            'foto.image' => 'File yang diunggah harus berupa gambar.',
            'foto.max' => 'Ukuran foto maksimal 5 MB.',
            'latitude.required' => 'Lokasi GPS tidak terdeteksi. Aktifkan GPS dan coba lagi.',
        ];
    }
}
