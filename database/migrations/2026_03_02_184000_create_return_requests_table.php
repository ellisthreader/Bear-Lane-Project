<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('return_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->json('selected_items');
            $table->string('reason_code', 80);
            $table->string('reason_category', 80);
            $table->text('reason_text')->nullable();
            $table->json('proof_paths');
            $table->string('status', 80)->default('pending');
            $table->text('admin_note')->nullable();
            $table->boolean('admin_override')->default(false);
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('more_info_requested_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->decimal('refund_amount', 10, 2)->nullable();
            $table->date('delivery_date')->nullable();
            $table->date('eligibility_expires_at')->nullable();
            $table->boolean('is_within_window')->default(true);
            $table->string('shippo_transaction_id')->nullable();
            $table->string('shippo_label_url')->nullable();
            $table->string('shippo_tracking_number')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_requests');
    }
};

