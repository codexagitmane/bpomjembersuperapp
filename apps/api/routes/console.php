<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Reminder email H-1 booking konsultasi — tiap hari 07:00 WIB.
// Membutuhkan cron entry: * * * * * php artisan schedule:run (lihat DEPLOYMENT.md).
use Illuminate\Support\Facades\Schedule;

Schedule::command('booking:kirim-reminder')->dailyAt('07:00')->timezone('Asia/Jakarta');
