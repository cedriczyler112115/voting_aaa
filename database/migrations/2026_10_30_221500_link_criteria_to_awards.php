<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('voting_criteria', function (Blueprint $table) {
            $table->foreignId('voting_award_id')
                ->nullable()
                ->after('voting_event_id')
                ->constrained('voting_awards')
                ->cascadeOnDelete();
            $table->foreignId('voting_event_id')->nullable()->change();
            $table->index('voting_award_id');
        });

        // Migrate existing criteria data if any exists
        if (Schema::hasTable('voting_criteria') && Schema::hasTable('voting_awards')) {
            $existingCriteria = DB::table('voting_criteria')->whereNull('voting_award_id')->get();
            foreach ($existingCriteria as $criterion) {
                if ($criterion->voting_event_id) {
                    $awards = DB::table('voting_awards')
                        ->where('voting_event_id', $criterion->voting_event_id)
                        ->orderBy('id')
                        ->get();

                    if ($awards->isNotEmpty()) {
                        $firstAward = $awards->first();
                        DB::table('voting_criteria')->where('id', $criterion->id)->update([
                            'voting_award_id' => $firstAward->id,
                        ]);

                        foreach ($awards->slice(1) as $award) {
                            $newCritId = DB::table('voting_criteria')->insertGetId([
                                'voting_event_id' => $criterion->voting_event_id,
                                'voting_award_id' => $award->id,
                                'name' => $criterion->name,
                                'description' => $criterion->description,
                                'max_score' => $criterion->max_score,
                                'display_order' => $criterion->display_order,
                                'created_at' => $criterion->created_at ?? now(),
                                'updated_at' => $criterion->updated_at ?? now(),
                            ]);

                            $voteIds = DB::table('voting_votes')
                                ->where('voting_award_id', $award->id)
                                ->pluck('id');

                            if ($voteIds->isNotEmpty()) {
                                DB::table('voting_vote_scores')
                                    ->whereIn('voting_vote_id', $voteIds)
                                    ->where('voting_criterion_id', $criterion->id)
                                    ->update(['voting_criterion_id' => $newCritId]);
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('voting_criteria', function (Blueprint $table) {
            $table->dropForeign(['voting_award_id']);
            $table->dropIndex(['voting_award_id']);
            $table->dropColumn('voting_award_id');
            $table->foreignId('voting_event_id')->nullable(false)->change();
        });
    }
};

