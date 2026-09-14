<?php
header('Cache-Control: no-store, no-cache');
header('Content-Type: application/json');

// Read the raw incoming data from the login attempt
$raw_input = file_get_contents('php://input');
$url_input = urldecode($_SERVER['REQUEST_URI']);

// --- HACK4GOV WAF: TEACHER TRIPWIRE ---
$threat_signatures = [
    '/<script>/i',         // XSS attacks
    '/UNION SELECT/i',     // Database dumping
    '/DROP TABLE/i',       // Database destruction
    '/OR 1=1/i',           // Login bypasses
    '/SLEEP\(/i',          // Time-based blind SQLi
    '/javascript:/i',      // Malicious links
    '/-- /i'               // SQL comment injection
];

// Check if the password attempt contains any of the forbidden signatures
foreach ($threat_signatures as $pattern) {
    if (preg_match($pattern, $raw_input) || preg_match($pattern, $url_input)) {
        // Instantly kill the request and drop the CTF flag
        http_response_code(403);
        echo json_encode([
            "success" => false, 
            "message" => "SECURITY PROTOCOL TRIPPED: MALICIOUS PAYLOAD BLOCKED. FLAG{n1c3_try_t3ach3r_w4f_1s_4ct1v3}"
        ]);
        exit; // Stops the login script completely
    }
}
// --------------------------------------

// Decode the data now that we know it is safe
$request = json_decode($raw_input, true);
$password = $request['password'] ?? '';

// Define the dual clearance levels (Your custom code + the Director code)
$clearance_levels = [
    "200727" => ["role" => "admin", "msg" => "CLEARANCE GRANTED: WELCOME DISPATCHER"],
    "200828" => ["role" => "super_admin", "msg" => "CLEARANCE GRANTED: WELCOME DIRECTOR"]
];

if (array_key_exists($password, $clearance_levels)) {
    $user_data = $clearance_levels[$password];
    $token = bin2hex(random_bytes(16));
    
    echo json_encode([
        "success" => true,
        "token" => $token,
        "role" => $user_data['role'],
        "message" => $user_data['msg']
    ]);
} else {
    // Return access denial feedback
    echo json_encode([
        "success" => false,
        "message" => "ACCESS DENIED: INVALID SECURITY CLEARANCE"
    ]);
}
?>  