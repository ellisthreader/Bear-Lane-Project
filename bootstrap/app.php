<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Contracts\Http\Kernel as HttpKernelContract;
use App\Http\Kernel as AppHttpKernel;
use Illuminate\Contracts\Console\Kernel as ConsoleKernelContract;
use App\Console\Kernel as AppConsoleKernel;
use Illuminate\Contracts\Debug\ExceptionHandler;
use App\Exceptions\Handler;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Add your Inertia and other web middlewares here
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->withBindings([
        HttpKernelContract::class => AppHttpKernel::class,
        ConsoleKernelContract::class => AppConsoleKernel::class,
        ExceptionHandler::class => Handler::class,
    ])
    ->create();
