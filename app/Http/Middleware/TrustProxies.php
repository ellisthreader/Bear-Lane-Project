<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustProxies as Middleware;
use Illuminate\Http\Request;

class TrustProxies extends Middleware
{
    /**
     * Trust all proxies (required on managed platforms like Railway).
     *
     * @var array<int, string>|string|null
     */
    protected $proxies = '*';

    /**
     * Use forwarded headers from proxy/load balancer.
     *
     * @var int
     */
    protected $headers = Request::HEADER_X_FORWARDED_AWS_ELB | Request::HEADER_X_FORWARDED_HOST;
}

