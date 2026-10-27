<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Voting Events
        Schema::create('voting_events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('banner_path')->nullable();
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->string('status', 20)->default('draft')->index(); // draft, scheduled, published, closed, archived
            $table->string('results_visibility', 25)->default('after_closing'); // public, voters_only, after_closing, hidden
            $table->boolean('allow_vote_changes')->default(false);
            $table->integer('created_by')->nullable();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->timestamps();
        });

        // 2. Voting Awards
        Schema::create('voting_awards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voting_event_id')->constrained('voting_events')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('image_path')->nullable();
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->boolean('allow_vote_changes')->nullable(); // null inherits from event
            $table->string('results_visibility', 25)->default('inherit'); // inherit, public, voters_only, after_closing, hidden
            $table->string('status', 20)->default('active')->index(); // active, inactive
            $table->integer('display_order')->default(0);
            $table->timestamps();
        });

        // 3. Voting Nominees
        Schema::create('voting_nominees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voting_award_id')->constrained('voting_awards')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('photo_path')->nullable();
            $table->string('department')->nullable();
            $table->string('organization')->nullable();
            $table->string('status', 20)->default('active')->index(); // active, inactive
            $table->integer('display_order')->default(0);
            $table->timestamps();
        });

        // 4. Voting Votes
        Schema::create('voting_votes', function (Blueprint $table) {
            $table->id();
            $table->integer('voter_id');
            $table->foreign('voter_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreignId('voting_event_id')->constrained('voting_events')->cascadeOnDelete();
            $table->foreignId('voting_award_id')->constrained('voting_awards')->cascadeOnDelete();
            $table->foreignId('voting_nominee_id')->constrained('voting_nominees')->cascadeOnDelete();
            $table->dateTime('voted_at');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            // Strict unique constraint: one vote per voter per award
            $table->unique(['voter_id', 'voting_award_id'], 'voter_award_unique');
            $table->index(['voting_event_id', 'voting_award_id']);
            $table->index(['voting_nominee_id']);
        });

        // 5. Voting Audit Logs
        Schema::create('voting_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->string('action'); // e.g. event.created, vote.cast, results.exported
            $table->string('auditable_type')->nullable();
            $table->unsignedBigInteger('auditable_id')->nullable();
            $table->text('description')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['action', 'created_at']);
            $table->index(['auditable_type', 'auditable_id']);
        });

        // 6. Voting User Eligibilities (Optional custom restriction per event)
        Schema::create('voting_user_eligibilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voting_event_id')->constrained('voting_events')->cascadeOnDelete();
            $table->integer('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->boolean('is_eligible')->default(true);
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->unique(['voting_event_id', 'user_id'], 'event_user_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('voting_user_eligibilities');
        Schema::dropIfExists('voting_audit_logs');
        Schema::dropIfExists('voting_votes');
        Schema::dropIfExists('voting_nominees');
        Schema::dropIfExists('voting_awards');
        Schema::dropIfExists('voting_events');
    }
};
