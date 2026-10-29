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
        // 1. Voting Criteria per Event
        Schema::create('voting_criteria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voting_event_id')->constrained('voting_events')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('max_score', 5, 2)->default(0);
            $table->integer('display_order')->default(0);
            $table->timestamps();

            $table->index('voting_event_id');
        });

        // 2. Adjust Voting Votes table for scoring
        Schema::table('voting_votes', function (Blueprint $table) {
            // Drop rank unique constraint to allow multiple nominees with identical scores/ranks
            $table->dropUnique('voter_award_rank_unique');
            $table->decimal('score', 6, 2)->default(0)->after('voting_nominee_id');
            $table->unsignedSmallInteger('rank')->nullable()->change();
        });

        // 3. Voting Vote Scores breakdown per criterion
        Schema::create('voting_vote_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voting_vote_id')->constrained('voting_votes')->cascadeOnDelete();
            $table->foreignId('voting_criterion_id')->constrained('voting_criteria')->cascadeOnDelete();
            $table->decimal('score', 5, 2)->default(0);
            $table->timestamps();

            $table->unique(['voting_vote_id', 'voting_criterion_id'], 'vote_criterion_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('voting_vote_scores');

        Schema::table('voting_votes', function (Blueprint $table) {
            $table->dropColumn('score');
            $table->unsignedSmallInteger('rank')->default(1)->nullable(false)->change();
            $table->unique(['voter_id', 'voting_award_id', 'rank'], 'voter_award_rank_unique');
        });

        Schema::dropIfExists('voting_criteria');
    }
};
