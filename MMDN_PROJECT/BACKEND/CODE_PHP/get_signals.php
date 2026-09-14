<?php
header('Content-Type: application/json');
// Prevent browser caching so the map always sees the newest pings
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");

try {
    // Connect using the new dedicated user
    $pdo = new PDO("mysql:host=localhost;dbname=san_frans_sector", "sdn_user", "admin123");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Fetch only active signals
    $stmt = $pdo->query("SELECT * FROM signals WHERE status = 'active'");
    $signals = [];
    
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $signals[] = $row;
    }
    
    // Send the data back to the Terminal OS map
    echo json_encode(["success" => true, "data" => $signals]);

} catch (PDOException $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>