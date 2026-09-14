<?php
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);

$heroId = (int)$data['hero_id'];
$action = $data['action'];

$conn = new mysqli("localhost", "root", "", "san_frans_sector");

// Dynamically boost stats based on the type of good deed
if ($action === 'civilian_saved') {
    // Saving a civilian boosts Defense and Agility by +2
    $conn->query("UPDATE heroes SET stat_defense = stat_defense + 2, stat_agility = stat_agility + 2, deeds_logged = deeds_logged + 1 WHERE id = $heroId");
} 
elseif ($action === 'threat_neutralized') {
    // Defeating an enemy boosts Combat by +3
    $conn->query("UPDATE heroes SET stat_combat = stat_combat + 3, deeds_logged = deeds_logged + 1 WHERE id = $heroId");
}

echo json_encode(["status" => "Record logged successfully"]);
?>