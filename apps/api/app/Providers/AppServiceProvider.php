<?php

namespace App\Providers;

use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // App ini API-only tanpa route bernama `login`. Tanpa ini, request yang
        // belum terautentikasi (mis. token mobile kedaluwarsa) memicu
        // RouteNotFoundException [login] → 500, bukan 401 JSON yang benar.
        Authenticate::redirectUsing(fn () => null);
    }
}
