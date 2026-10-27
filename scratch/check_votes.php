<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$award = App\Models\VotingAward::find(11);
echo "Award: {$award->name}\n\n";

$votes = App\Models\VotingVote::with(['nominee', 'voter'])
    ->where('voting_award_id', 11)
    ->get();

$byVoter = $votes->groupBy('voter_id');
foreach ($byVoter as $voterId => $vList) {
    $voterName = $vList->first()->voter?->name ?? "Voter #{$voterId}";
    echo "Ballot from: {$voterName} (ID: {$voterId})\n";
    foreach ($vList->sortByDesc('rank') as $v) {
        echo "  - Rank {$v->rank} ({$v->rank} pts): {$v->nominee->name}\n";
    }
    echo "\n";
}

echo "--- Summary of Nominee Points & Rank Distribution ---\n";
foreach ($award->nominees as $n) {
    $ranks = $n->votes->pluck('rank')->all();
    $rankCounts = array_count_values($ranks);
    echo "Nominee: {$n->name}\n";
    echo "  Total Points: " . array_sum($ranks) . " (Average: " . number_format(array_sum($ranks)/count($byVoter), 2) . ")\n";
    echo "  Rank 5 votes (1st choice, 5 pts): " . ($rankCounts[5] ?? 0) . "\n";
    echo "  Rank 4 votes (2nd choice, 4 pts): " . ($rankCounts[4] ?? 0) . "\n";
    echo "  Rank 3 votes (3rd choice, 3 pts): " . ($rankCounts[3] ?? 0) . "\n";
    echo "  Rank 2 votes (4th choice, 2 pts): " . ($rankCounts[2] ?? 0) . "\n";
    echo "  Rank 1 votes (5th choice, 1 pt ): " . ($rankCounts[1] ?? 0) . "\n\n";
}
