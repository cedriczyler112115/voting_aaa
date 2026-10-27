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
        Schema::table('voting_votes', function (Blueprint $table) {
            $table->unsignedSmallInteger('rank')->default(1)->after('voting_nominee_id');
            $table->index('voter_id');
            $table->unique(['voter_id', 'voting_award_id', 'voting_nominee_id'], 'voter_award_nominee_unique');
            $table->unique(['voter_id', 'voting_award_id', 'rank'], 'voter_award_rank_unique');
            $table->dropUnique('voter_award_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('voting_votes', function (Blueprint $table) {
            $table->unique(['voter_id', 'voting_award_id'], 'voter_award_unique');
            $table->dropUnique('voter_award_nominee_unique');
            $table->dropUnique('voter_award_rank_unique');
            $table->dropIndex(['voter_id']);
            $table->dropColumn('rank');
        });
    }
};
