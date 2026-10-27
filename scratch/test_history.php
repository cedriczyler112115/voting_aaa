<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\VotingController;

$controller = app(VotingController::class);
$user = User::find(3); // Voter who cast votes
if (!$user) {
    $user = User::first();
}

echo "Testing history for user: {$user->name} (ID: {$user->id})\n";

// 1. Without filter
$req1 = Request::create('/voting-history', 'GET');
$req1->setUserResolver(fn () => $user);
$res1 = $controller->history($req1);
$data1 = $res1->toResponse($req1)->getOriginalContent()->getData()['page']['props'];

echo "Unfiltered votes count: " . count($data1['votes']['data']) . "\n";
echo "Events available: " . count($data1['events']) . "\n";
echo "Awards available: " . count($data1['awards']) . "\n";

// 2. With event filter
if (!empty($data1['events'])) {
    $eventId = $data1['events'][0]['id'];
    echo "\nTesting with event_id={$eventId}:\n";
    $req2 = Request::create('/voting-history?event_id=' . $eventId, 'GET');
    $req2->setUserResolver(fn () => $user);
    $res2 = $controller->history($req2);
    $data2 = $res2->toResponse($req2)->getOriginalContent()->getData()['page']['props'];
    echo "Filtered votes count: " . count($data2['votes']['data']) . "\n";
    echo "Selected event: " . $data2['selected_event_id'] . "\n";
}
