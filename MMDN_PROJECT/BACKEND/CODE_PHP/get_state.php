<?php
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Content-Type: application/json');

// FIXED PATH LOGIC
$db_path = __DIR__ . '/../QUERY/db.json';

if (file_exists($db_path)) {
    echo file_get_contents($db_path);
} else {
    echo json_encode(["error" => "Database file not found."]);
}
?>