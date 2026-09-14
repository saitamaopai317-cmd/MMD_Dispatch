<?php
header('Content-Type: application/json');

// Check if the map sent a specific incident ID
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

try {
    // Connect securely using the new dedicated Terminal OS user
    $pdo = new PDO("mysql:host=localhost;dbname=san_frans_sector", "sdn_user", "admin123");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // If an ID was sent, delete only that specific threat. Otherwise, clear everything.
    if ($id) {
        $stmt = $pdo->prepare("DELETE FROM signals WHERE id = :id");
        $stmt->execute(['id' => $id]);
    } else {
        $pdo->exec("DELETE FROM signals");
    }

    echo json_encode(["success" => true]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>