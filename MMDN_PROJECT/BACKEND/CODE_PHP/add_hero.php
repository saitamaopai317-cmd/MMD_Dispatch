<?php
header('Content-Type: application/json');
require_once 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) die(json_encode(["success" => false, "error" => "No payload"]));

try {
    // Randomize their spawn location on the grid between 20% and 80%
    $x = rand(20, 80); 
    $y = rand(20, 80);

    $stmt = $pdo->prepare("INSERT INTO heroes (name, skill, status, x, y) VALUES (?, ?, 'RESTING', ?, ?)");
    $stmt->execute([$data['name'], $data['skill'], $x, $y]);
    
    echo json_encode(["success" => true]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>