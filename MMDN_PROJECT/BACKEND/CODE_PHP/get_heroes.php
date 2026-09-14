<?php
header('Content-Type: application/json');
require_once 'db.php';

try {
    $stmt = $pdo->query("SELECT * FROM heroes");
    $heroes = [];
    
    // Format the database rows to match what your JavaScript expects
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $heroes[$row['id']] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'skill' => $row['skill'],
            'status' => $row['status'],
            'x' => (int)$row['x'],
            'y' => (int)$row['y']
        ];
    }
    echo json_encode(["success" => true, "heroes" => $heroes]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>