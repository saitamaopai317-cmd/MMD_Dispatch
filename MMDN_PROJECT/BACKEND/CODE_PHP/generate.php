<?php
// Hide PHP warnings so they don't break our JSON feed!
error_reporting(0);
header('Cache-Control: no-store, no-cache');
header('Content-Type: application/json');

$villains = ["Riot Boss", "Cyber-Ninja", "Mutant Hound", "Rogue AI"];
$civilians = ["Trapped Workers", "Lost Child", "Injured VIP", "Stranded Pilot"];
$skills = ["tech", "elemental", "brawler"];

$incidents = [];
$num_incidents = rand(3, 5);

for ($i = 1; $i <= $num_incidents; $i++) {
    $id = "00" . $i;
    $is_combat = rand(0, 1) == 1;
    
    $incidents[$id] = [
        "id" => $id,
        "type" => $is_combat ? "combat" : "rescue",
        "target" => $is_combat ? "VILLAIN: " . $villains[array_rand($villains)] : "CIVILIAN: " . $civilians[array_rand($civilians)],
        "req_skill" => $skills[array_rand($skills)], 
        "time_left" => rand(25, 45),                 
        "status" => "active",                        
        "x" => rand(15, 85),
        "y" => rand(15, 75),
        "width" => rand(60, 120),
        "height" => rand(60, 120)
    ];
}

$decorations = [];
for ($i = 0; $i < 6; $i++) {
    $decorations[] = [
        "type" => rand(0, 1) == 1 ? "mountain" : "road",
        "x" => rand(0, 90), "y" => rand(0, 90), "size" => rand(100, 300)
    ];
}

$db = [
    "threat_level" => 20, 
    "heroes" => [
        "H1" => ["id" => "H1", "name" => "SONAR", "skill" => "tech", "status" => "RESTING", "x" => 15, "y" => 90],
        "H2" => ["id" => "H2", "name" => "FLAMBAE", "skill" => "elemental", "status" => "RESTING", "x" => 50, "y" => 90],
        "H3" => ["id" => "H3", "name" => "ATLAS", "skill" => "brawler", "status" => "RESTING", "x" => 85, "y" => 90]
    ],
    "incidents" => $incidents,
    "decorations" => $decorations
];

$db_path = __DIR__ . '/../QUERY/db.json';

// Safety check: Attempt to save, and catch errors if it fails
$saved = file_put_contents($db_path, json_encode($db, JSON_PRETTY_PRINT));

if ($saved === false) {
    echo json_encode(["success" => false, "error" => "Failed to write to db.json. Check permissions!"]);
    exit;
}

echo json_encode(["success" => true, "state" => $db]);
?>