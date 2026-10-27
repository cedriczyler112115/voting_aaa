<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\VotingAward;
use App\Models\VotingEvent;
use App\Models\VotingNominee;
use App\Models\VotingVote;
use App\Models\User;

echo "=== Testing Tie Breakers & Average Score ===" . PHP_EOL;

$award = VotingAward::with(['nominees.votes'])->first();

if ($award) {
    echo "Award: {$award->name} (ID: {$award->id})" . PHP_EOL;
    $distinctBallots = VotingVote::where('voting_award_id', $award->id)->distinct('voter_id')->count('voter_id');
    echo "Distinct ballots: {$distinctBallots}" . PHP_EOL;

    $sortedNominees = $award->getSortedNominees();
    echo "Sorted Nominees count: " . $sortedNominees->count() . PHP_EOL;

    foreach ($sortedNominees as $index => $nominee) {
        $points = (int) $nominee->votes->sum('rank');
        $avg = $distinctBallots > 0 ? round($points / $distinctBallots, 2) : 0;
        $avgFormatted = number_format($avg, 2, '.', '');
        echo "  Rank " . ($index + 1) . ": Nominee ID {$nominee->id} ({$nominee->name}) - Points: {$points}, Avg: {$avgFormatted} avg" . PHP_EOL;
    }
} else {
    echo "No awards found." . PHP_EOL;
}

// Test Simulated Tie Breaker Scenario
echo PHP_EOL . "=== Testing Simulated Tie Breaker Comparator ===" . PHP_EOL;

// Create mock objects or test the exact tie-breaking logic with in-memory collection
$nomineeA = new VotingNominee(['name' => 'Nominee A']);
$nomineeA->id = 101;
$nomineeA->display_order = 1;
// Nominee A has votes: 5, 5, 2, 2 => Total = 14. Rank 5 count = 2, Rank 2 count = 2
$votesA = collect([
    new VotingVote(['rank' => 5]),
    new VotingVote(['rank' => 5]),
    new VotingVote(['rank' => 2]),
    new VotingVote(['rank' => 2]),
]);
$nomineeA->setRelation('votes', $votesA);

$nomineeB = new VotingNominee(['name' => 'Nominee B']);
$nomineeB->id = 102;
$nomineeB->display_order = 2;
// Nominee B has votes: 4, 4, 3, 3 => Total = 14. Rank 5 count = 0, Rank 4 count = 2, Rank 3 count = 2
$votesB = collect([
    new VotingVote(['rank' => 4]),
    new VotingVote(['rank' => 4]),
    new VotingVote(['rank' => 3]),
    new VotingVote(['rank' => 3]),
]);
$nomineeB->setRelation('votes', $votesB);

$testAward = new VotingAward(['name' => 'Test Award']);
$testAward->setRelation('nominees', collect([$nomineeB, $nomineeA]));

$result = $testAward->getSortedNominees();

echo "Nominee A points: " . $nomineeA->votes->sum('rank') . PHP_EOL;
echo "Nominee B points: " . $nomineeB->votes->sum('rank') . PHP_EOL;
echo "First place after tie-break: " . $result->first()->name . " (Expected: Nominee A because A has two Rank 5s vs B's zero Rank 5s)" . PHP_EOL;

if ($result->first()->name === 'Nominee A') {
    echo "SUCCESS: Tie-breaker ranked Nominee A higher!" . PHP_EOL;
} else {
    echo "FAILURE: Tie-breaker failed." . PHP_EOL;
}
