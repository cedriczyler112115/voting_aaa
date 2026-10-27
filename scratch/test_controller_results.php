<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\VotingController;
use App\Http\Controllers\Admin\VotingResultController;

echo "=== Testing VotingController@tabulationResults ===" . PHP_EOL;

$controller = app(VotingController::class);
$user = User::find(1); // Admin user
$req = Request::create('/tabulation-results', 'GET');
$req->setUserResolver(fn () => $user);

$response = $controller->tabulationResults($req);
$data = $response->toResponse($req)->getOriginalContent()->getData();

echo "Awards in Tabulation: " . count($data['page']['props']['awards']) . PHP_EOL;
if (!empty($data['page']['props']['awards'])) {
    $firstAward = $data['page']['props']['awards'][0];
    echo "First Award Name: " . $firstAward['name'] . PHP_EOL;
    foreach ($firstAward['nominees'] as $nominee) {
        echo "  Nominee: {$nominee['name']}, Rank: {$nominee['rank']}, Avg: {$nominee['average_score']}, Total: {$nominee['total_points']}" . PHP_EOL;
    }
}

echo PHP_EOL . "=== Testing Admin VotingResultController@index ===" . PHP_EOL;

$adminController = app(VotingResultController::class);
$adminResponse = $adminController->index($req);
$adminData = $adminResponse->toResponse($req)->getOriginalContent()->getData();

echo "Awards in Admin Results: " . count($adminData['page']['props']['awards']) . PHP_EOL;
if (!empty($adminData['page']['props']['awards'])) {
    $firstAward = $adminData['page']['props']['awards'][0];
    echo "First Award Name: " . $firstAward['name'] . PHP_EOL;
    foreach ($firstAward['nominees'] as $nominee) {
        echo "  Nominee: {$nominee['name']}, Rank: {$nominee['rank']}, Avg: {$nominee['average_score']}, Total: {$nominee['total_points']}" . PHP_EOL;
    }
}
