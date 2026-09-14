<?php
header('Content-Type: application/json');
$request = json_decode(file_get_contents('php://input'), true);

$action = $request['action']; 
$incident_id = $request['incident_id'];
$hero_ids = $request['hero_ids'] ?? []; // Now accepts an array of team members!

$db_path = __DIR__ . '/../QUERY/db.json';
$db = json_decode(file_get_contents($db_path), true);
$result_status = "error";

if (isset($db['incidents'][$incident_id]) && $db['incidents'][$incident_id]['status'] === 'active') {
    
    if ($action === 'timeout') {
        $db['incidents'][$incident_id]['status'] = 'failed';
        $db['threat_level'] += 20; 
        $result_status = "timeout";
    } 
    
    else if ($action === 'deploy' && !empty($hero_ids)) {
        $team_skills = [];
        $offset = 0; // Offsets the second hero slightly so they don't overlap on the map
        
        // Move all selected agents to the sector
        foreach ($hero_ids as $h_id) {
            if (isset($db['heroes'][$h_id])) {
                $db['heroes'][$h_id]['x'] = $db['incidents'][$incident_id]['x'] + ($offset * 2);
                $db['heroes'][$h_id]['y'] = $db['incidents'][$incident_id]['y'] - ($offset * 2);
                $team_skills[] = $db['heroes'][$h_id]['skill']; // Pool their skills
                $offset++;
            }
        }
        
        $req_skill = $db['incidents'][$incident_id]['req_skill'];
        
        // If ANY agent in the strike team has the required skill, success!
        if (in_array($req_skill, $team_skills)) {
            $db['incidents'][$incident_id]['status'] = 'resolved';
            $db['threat_level'] -= 10; 
            $result_status = "success";
        } else {
            $db['incidents'][$incident_id]['status'] = 'failed';
            $db['threat_level'] += 15; 
            $result_status = "mismatch";
        }
    }
    
    $db['threat_level'] = max(0, min(100, $db['threat_level']));
    file_put_contents($db_path, json_encode($db, JSON_PRETTY_PRINT));
}

echo json_encode(["result" => $result_status, "state" => $db]);
?>