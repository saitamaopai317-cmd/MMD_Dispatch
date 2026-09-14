# Sector Defense Network (SDN) System
Course / Module: Web Development & Cybersecurity (LAMP Stack)
Project Focus: Dynamic Dispatch Routing, Real-Time Database Telemetry, and Zero-Trust Security Architecture

1. System Overview

The Sector Defense Network (SDN) is a multi-tier, real-time emergency dispatch ecosystem built on a LAMP stack (Linux, Apache, MariaDB, PHP). It facilitates instant communication between civilians and a tactical dispatcher using asynchronous JavaScript (Fetch API) and dynamic MariaDB polling. The system goes beyond standard CRUD operations by incorporating an AI Advisory engine for automated squad selection, a dynamically rendered geographic interface, and a standalone Security Operations Center (SOC) capable of root-level database lockdowns.
2. Technical Architecture

    Frontend Environment: HTML5, CSS3, Vanilla JavaScript (ES6+), Chart.js (Data Visualization).

    Backend Environment: PHP 8.x (Stateless REST-like API endpoints).

    Database: MariaDB (Relational structure, accessed via PDO with strict prepared statements).

    Security Layer: Custom Web Application Firewall (WAF) with session-based rate limiting and dynamic SQL privilege revocation.

3. Core System Modules
Module A: The Tactical Dispatcher (Command Center)

The primary interface for emergency operators.

    Live Radar Engine: A procedural JavaScript grid that queries MariaDB every 3 seconds (get_signals.php) to fetch active SOS pings.

    Squad Auto-Resolution: Reads the requested_heroes string attached to incoming database signals. If the Civilian AI requested specific operatives (e.g., H3, H1), the Dispatcher UI automatically highlights and pre-selects those heroes on the roster.

    Role-Based Access Control (RBAC): Dual-tier login system. Standard dispatchers (200727) receive map access. Director-level authentication (OVERWATCH2026) unlocks the Classified Vault.

Module B: Civilian Emergency Uplink (Client App)

A mobile-optimized, frictionless reporting tool for citizens in distress.

    Emergency Routing Lock: The UI is hidden behind a secure dialpad. Civilians must input 911 to trigger a JavaScript DOM rewrite that slides the actual SOS menu into view, preventing accidental or automated spam.

    AI Tactical Advisor: A simulated AI companion that reads the chosen emergency type (Medical vs. Villain). It runs client-side logic to determine the optimal response squad (e.g., pairing a Brawler with a Tech support) and bundles this recommendation into the network payload.

    Active Telemetry: Fetches the live hero database to display the current status (RESTING vs DEPLOYED) of all sector operatives in real time.

Module C: Sentinel Gateway (Standalone SOC Dashboard)

An isolated security terminal hosted on a separate port (localhost:9000), designed to protect the system from brute-force and zero-day attacks.

    Global WAF (waf.php): Tracks IP request frequency via PHP $_SESSION. Enforces strict rate limits (15 requests per 5 seconds).

    DEFCON-1 Protocol: A physical dashboard button requiring a master override code (GHOST_PROTOCOL). When triggered, it creates a lockdown.state file and executes a root-level MariaDB command:

SQL

REVOKE INSERT, UPDATE, DELETE, DROP ON san_frans_sector.* FROM 'sdn_user'@'localhost';
FLUSH PRIVILEGES;

This severs the PHP application's ability to modify data, instantly neutralizing SQL injection vulnerabilities during an active attack while keeping the system online in a read-only state.
Module D: The Classified Vault

A specialized module accessible only to Director-level accounts, used to inject elite reserve operatives into the live database.

    Data Visualization: Utilizes Chart.js to generate interactive, side-by-side radar charts visualizing the combat and intelligence stats of black-ops agents.

    Dynamic Roster Injection: Clicking 'Authorize Deployment' sends an encrypted POST request to authorize_agent.php, executing an INSERT statement that pushes the classified hero directly into the active MariaDB heroes table, instantly making them available on the Dispatcher map.

4. Database Schema Structure

Table: signals (Emergency Incidents)
Column	Type	Description
id	INT (PK, AI)	Unique incident identifier.
civilian_name	VARCHAR(100)	Sanitized input of the reporter.
location	VARCHAR(150)	Sector or street coordinates.
signal_type	ENUM	Classified as 'emergency' or 'villain'.
requested_heroes	VARCHAR(255)	CSV string of AI-recommended hero IDs (e.g., 'H3,H1').
created_at	TIMESTAMP	Auto-generated timestamp.

Table: heroes (Active Roster)
Column	Type	Description
hero_id	VARCHAR(10) (PK)	Unique agent code (e.g., 'H1', 'C2').
name	VARCHAR(50)	Public alias of the operative.
skill	VARCHAR(30)	Tactical class (Tech, Brawler, Elemental).
status	VARCHAR(20)	Current deployment state ('RESTING', 'DEPLOYED').
stat_combat	INT	Base combat metric (1-100), levels up dynamically via log_action.php.
5. Security & Mitigation Summary

    XSS & SQLi Tripwires: send_signal.php features a Regex-based payload scanner. If <script>, UNION SELECT, or DROP TABLE is detected, the request is dropped with a 403 Forbidden header and a CTF flag is returned.

    Prepared Statements: All MariaDB queries utilize strict PDO prepared statements ($stmt->execute(['name' => $name])), separating SQL syntax from user data.

    Data Sanitization: Implementation of htmlspecialchars() and strip_tags() ensures cross-site scripting payloads are neutralized before database insertion.

