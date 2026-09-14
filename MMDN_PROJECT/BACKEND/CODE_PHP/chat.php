<?php
header('Content-Type: application/json');

// 1. Receive the message from the Javascript frontend
$request = json_decode(file_get_contents('php://input'), true);
$userMessage = $request['message'] ?? '';

// Catch the hero data and map state sent from Javascript
$heroName = isset($request['hero_name']) ? $request['hero_name'] : 'Agent';
$heroSkill = isset($request['hero_skill']) ? $request['hero_skill'] : 'tactical';
$activeThreats = isset($request['active_threats']) ? (int)$request['active_threats'] : 0;

if (!$userMessage) {
    echo json_encode(["reply" => "ERROR: NO TRANSMISSION RECEIVED."]);
    exit;
}

// 2. The TUF Laptop's local IP and LM Studio Port
$apiUrl = 'http://192.168.68.53:1234/v1/chat/completions';

// 3. Inform the AI about the actual map state so it stops hallucinating enemies
$mapContext = ($activeThreats > 0) ? "There are currently $activeThreats active threats reported on your sector map." : "The sector map is currently clear and secure. There are NO active enemies right now. You are on standby.";

// 4. The AI Persona (DYNAMIC SYSTEM PROMPT)
$systemPrompt = "You are $heroName, a highly trained $heroSkill specialist operating in Sector San Franz. $mapContext Keep your reply under 2 sentences, gritty, and strictly in-character as a field agent. Do not invent enemies or threats if the map is clear. Do not break character. Do not ever introduce yourself as an AI or ATLAS.";

// 5. Package the data for LM Studio
$data = [
    "model" => "local-model", // LM Studio routes this automatically
    "messages" => [
        ["role" => "system", "content" => $systemPrompt],
        ["role" => "user", "content" => $userMessage]
    ],
    "temperature" => 0.7,
    "max_tokens" => 150
];

// 6. Send the request across the Wi-Fi bridge
$ch = curl_init($apiUrl);   
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 60); // Wait max 60 seconds for the GPU to reply

$response = curl_exec($ch);

// Handle connection failures
if (curl_errno($ch)) {
    echo json_encode(["reply" => "[SYSTEM ERROR: COMM LINK SEVERED - " . curl_error($ch) . "]"]);
    curl_close($ch);
    exit;
}

curl_close($ch);
$responseData = json_decode($response, true);

// Extract the AI's reply from the JSON
$aiReply = $responseData['choices'][0]['message']['content'] ?? "LM STUDIO ERROR: " . $response;

// Send it back to the Terminal OS screen
echo json_encode(["reply" => $aiReply]);
?>