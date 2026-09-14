<?php
header('Content-Type: application/json');

// WAF Tripwire
$headers = getallheaders();
if (!isset($headers['X-SDN-Auth']) || $headers['X-SDN-Auth'] !== 'SFXC-BlackOps-2026-Alpha') {
    http_response_code(403);
    echo json_encode(["success" => false, "error" => "Unauthorized Uplink"]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$hero_id = $input['hero_id'] ?? '';
$name = $input['name'] ?? '';
$skill = $input['skill'] ?? '';

if (!$hero_id || !$name) {
    echo json_encode(["success" => false, "error" => "Missing agent data."]);
    exit;
}

try {
    $pdo = new PDO("mysql:host=localhost;dbname=san_frans_sector", "sdn_user", "admin123");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Inject the black ops agent into the active MariaDB roster
    $stmt = $pdo->prepare("INSERT INTO heroes (hero_id, name, skill, status, x, y, stat_combat, stat_defense, stat_agility, stat_comms, stat_intel) VALUES (:id, :name, :skill, 'RESTING', 50, 50, 85, 80, 75, 50, 90)");
    $stmt->execute([
        'id' => $hero_id,
        'name' => $name,
        'skill' => $skill
    ]);

    echo json_encode(["success" => true]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "error" => "DB Error"]);
}
?>