<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('instant_quotes', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('quote_number')->unique();
            $table->json('items'); // Stores all products as JSON
            $table->decimal('total', 10, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('instant_quotes');
    }
};
