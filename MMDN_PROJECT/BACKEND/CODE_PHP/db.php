<?php
$host = 'localhost';
$dbname = 'san_frans_sector';
$username = 'atlas';
$password = 'admin123';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    // Set PDO to throw exceptions on errors
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(["success" => false, "error" => "DATABASE LINK SEVERED: " . $e->getMessage()]));
}
?>