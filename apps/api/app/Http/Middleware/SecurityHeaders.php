<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Header keamanan tambahan untuk hardening (defense-in-depth).
 * Berlaku untuk semua respons API — mencegah clickjacking, MIME sniffing,
 * kebocoran referrer, dan membatasi permission browser yang tidak perlu.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=()');
        $response->headers->set('X-Permitted-Cross-Domain-Policies', 'none');

        if (! $request->isMethod('GET')) {
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        }

        if (app()->environment('production')) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
