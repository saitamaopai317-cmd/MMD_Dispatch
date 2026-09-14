let activeState = { heroes: {}, threat_level: 0 };
let liveSignals = []; 
let selectedHeroes = []; 
let selectedIncidentId = null;
let isAnimating = false; 
let gameLoop;
let heroChartInstance = null;

// --- MAP CAMERA STATE ---
let currentZoom = 1;
let panX = 0, panY = 0;
let isDragging = false;
let startX, startY, startPanX, startPanY;
let controlsInitialized = false;

// --- PROCEDURAL CITY ---
let staticCityHTML = '<div id="wireframe-layer" style="width:100%; height:100%; position:absolute; top:0; left:0; z-index:2; opacity:0; transition: opacity 0.1s linear;">';
for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
        if (Math.random() > 0.25) { 
            const w = 4 + Math.random() * 3; 
            const h = 4 + Math.random() * 3; 
            const x = col * 6.5 + (Math.random() * 2);
            const y = row * 6.5 + (Math.random() * 2);
            const isComplex = Math.random() > 0.85 ? 'wf-complex' : '';
            staticCityHTML += `<div class="wf-bldg ${isComplex}" style="left:${x}%; top:${y}%; width:${w}%; height:${h}%;"></div>`;
        }
    }
}
staticCityHTML += '</div>';

function initMapControls() {
    if(controlsInitialized) return;
    const viewport = document.querySelector('.map-viewport');
    if(!viewport) return;
    
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? -0.25 : 0.25;
        currentZoom = Math.max(1, Math.min(currentZoom + zoomDelta, 4));
        updateMapTransform();
    });

    viewport.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        startPanX = panX; startPanY = panY;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const rect = viewport.getBoundingClientRect();
        const dx = ((e.clientX - startX) / rect.width * 100) / currentZoom;
        const dy = ((e.clientY - startY) / rect.height * 100) / currentZoom;
        panX = startPanX + dx;
        panY = startPanY + dy;
        updateMapTransform();
    });

    window.addEventListener('mouseup', () => { isDragging = false; });
    controlsInitialized = true;
}

function updateMapTransform() {
    const mapGrid = document.getElementById('map-grid');
    if(mapGrid) {
        mapGrid.style.transform = `scale(${currentZoom}) translate(${panX}%, ${panY}%)`;
        mapGrid.style.transition = isDragging ? 'none' : 'transform 0.3s ease-out';
        
        const wfLayer = document.getElementById('wireframe-layer');
        if(wfLayer) wfLayer.style.opacity = Math.min(1, Math.max(0, (currentZoom - 1.5) / 1.5));
    }
}

// --- LIVE DATABASE RADAR ---
async function scanForSignals() {
    if (isAnimating) return; 

    try {
        const sigRes = await fetch('/BACKEND/CODE_PHP/get_signals.php');
        const sigData = await sigRes.json();
        
        const heroRes = await fetch('/BACKEND/CODE_PHP/get_heroes.php');
        const heroData = await heroRes.json();

        if (sigData.success && heroData.success) {
            liveSignals = sigData.data;
            activeState.threat_level = Math.min(liveSignals.length * 15, 100); 
            
            activeState.heroes = heroData.heroes; 
            
            if (selectedIncidentId && !liveSignals.find(s => String(s.id) === selectedIncidentId)) {
                zoomOut();
            } else {
                renderMap();
                renderRoster(); 
                validateAction();
            }
            checkGameOver();
            if (selectedHeroes.length > 0) updateHeroStatsUI();
        }
    } catch (err) {}
}

window.purgeSector = function() {
    fetch('/BACKEND/CODE_PHP/clear_signals.php', {
        headers: { 'X-SDN-Auth': 'SFXC-BlackOps-2026-Alpha' }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            liveSignals = []; zoomOut(); renderMap();
        }
    });
}

// --- CLICK HANDLERS (WITH CIVILIAN AUTO-SELECT) ---
window.selectPing = function(incidentId, e) {
    if (isAnimating) return;
    if (e) e.stopPropagation();
    
    selectedIncidentId = String(incidentId);
    const sig = liveSignals.find(s => String(s.id) === selectedIncidentId);
    if (!sig) return;
    
    const xPos = (sig.id * 27) % 80 + 10;
    const yPos = (sig.id * 19) % 80 + 10;
    currentZoom = 3;
    panX = 50 - xPos; panY = 50 - yPos;
    
    const unzoomBtn = document.getElementById('btn-unzoom');
    if (unzoomBtn) unzoomBtn.style.display = 'block';

    // AUTO-SELECT SQUAD IF CIVILIAN APP SENT IT
    if (sig.requested_heroes) {
        const reqList = sig.requested_heroes.split(',').filter(id => activeState.heroes[id]);
        if (reqList.length > 0) {
            selectedHeroes = reqList;
            renderRoster(); // Visually highlights them
        }
    }
    
    renderMap(); 
    validateAction(); 
    updateMapTransform();
}

window.zoomOut = function() {
    if (isAnimating) return;
    selectedIncidentId = null;
    currentZoom = 1; panX = 0; panY = 0;
    
    const unzoomBtn = document.getElementById('btn-unzoom');
    if (unzoomBtn) unzoomBtn.style.display = 'none';
    
    const actionBar = document.getElementById('action-bar');
    if (actionBar) actionBar.style.display = 'none';
    
    renderMap(); updateMapTransform();
}

document.addEventListener('DOMContentLoaded', () => {
    const viewport = document.querySelector('.map-viewport');
    if (viewport) {
        viewport.addEventListener('click', (e) => {
            if (e.target.classList.contains('emergency-ping')) return;
            if (!isDragging && currentZoom > 1) zoomOut();
        });
    }
});

// --- AUTH & SETUP ---
async function submitLogin() {
    const passwordInput = document.getElementById('terminal-pass');
    const errorDisplay = document.getElementById('login-error');
    if (!passwordInput.value) return;
    errorDisplay.innerText = "AUTHENTICATING...";

    try {
        const res = await fetch('/BACKEND/CODE_PHP/auth.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: passwordInput.value })
        });
        const data = await res.json();

        if (data.success) {
            sessionStorage.setItem('sdn_token', data.token);
            sessionStorage.setItem('sdn_role', data.role);
            
            errorDisplay.style.color = "var(--teal)"; 
            errorDisplay.innerText = data.message;
            
            setTimeout(() => {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('app-screen').style.display = 'flex';
                
                if (data.role === 'super_admin') {
                    const vaultBtn = document.getElementById('nav-classified');
                    if (vaultBtn) vaultBtn.style.display = 'block';
                    renderVault();
                }
                
                generateNewMap();
            }, 600);
        } else {
            errorDisplay.style.color = "var(--pin-danger)"; errorDisplay.innerText = data.message;
        }
    } catch (err) {}
}

function switchTab(tabId) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.view-container').forEach(view => view.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(`view-${tabId}`).classList.add('active');
}

function startGameLoop() {
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(scanForSignals, 3000);
    scanForSignals();
}

async function generateNewMap() {
    if (isAnimating) return;
    try {
        selectedHeroes = []; zoomOut();
        document.getElementById('game-over').style.display = 'none';
        startGameLoop(); initMapControls(); 
    } catch (err) {}
}

function checkGameOver() {
    if (activeState.threat_level >= 100) {
        document.getElementById('game-over').style.display = 'block';
        if (currentZoom === 1) zoomOut(); 
    }
}

// --- DYNAMIC DISPATCH LOGIC ---
async function executeDispatch() {
    if (selectedHeroes.length === 0 || !selectedIncidentId || isAnimating) return;
    
    isAnimating = true; 
    document.getElementById('action-bar').style.display = 'none';
    
    const sig = liveSignals.find(s => String(s.id) === selectedIncidentId);
    if (!sig) { isAnimating = false; return; }
    
    const isVillain = sig.signal_type === 'villain';
    const targetX = (sig.id * 27) % 80 + 10;
    const targetY = (sig.id * 19) % 80 + 10;

    selectedHeroes.forEach((id, index) => {
        const heroWrapper = document.getElementById(`hero-pin-${id}`);
        if(heroWrapper) {
            heroWrapper.style.left = `calc(${targetX}% + ${index === 1 ? 2 : 0}%)`;
            heroWrapper.style.top = `calc(${targetY}% + ${index === 1 ? -2 : 0}%)`;
        }
    });

    setTimeout(async () => {
        const fxDiv = document.createElement('div');
        fxDiv.style.position = "absolute";
        fxDiv.style.left = `${targetX}%`; fxDiv.style.top = `${targetY}%`;
        
        if (isVillain) {
            fxDiv.innerText = '💥'; fxDiv.style.fontSize = '30px'; 
            selectedHeroes.forEach(id => {
                const el = document.getElementById(`hero-pin-${id}`);
                if(el) el.style.transform += ' rotate(15deg)'; 
            });
        } else {
            fxDiv.innerText = '➕'; fxDiv.style.color = "#4caf50"; fxDiv.style.fontSize = '24px';
        }

        if(currentZoom > 1.5) fxDiv.style.transform = 'translate(-50%, -50%) scale(0.33)';
        document.getElementById('map-grid').appendChild(fxDiv);
        
        setTimeout(() => fxDiv.remove(), 1200); 

        setTimeout(async () => {
            try {
                await fetch('/BACKEND/CODE_PHP/clear_signals.php?id=' + selectedIncidentId, {
                    headers: { 'X-SDN-Auth': 'SFXC-BlackOps-2026-Alpha' }
                }); 
                
                selectedHeroes.forEach(id => {
                    const el = document.getElementById(`hero-pin-${id}`);
                    if(el) el.style.transform = el.style.transform.replace(' rotate(15deg)', '');
                });

                const bubble = document.createElement('div');
                bubble.className = `speech-bubble`;
                bubble.innerText = isVillain ? "Villain neutralized! Area secure." : "Civilians safe! Medical rendered.";
                bubble.style.left = `${targetX}%`; bubble.style.top = `${targetY - 6}%`; 
                if(currentZoom > 1.5) bubble.style.transform = 'translate(-50%, -100%) scale(0.33)';
                document.getElementById('map-grid').appendChild(bubble); 

                const actionType = isVillain ? 'threat_neutralized' : 'civilian_saved';
                const logMessage = isVillain ? 'Neutralized hostile target in sector.' : 'Medical aid rendered; civilian secured.';
                
                await Promise.all(selectedHeroes.map(async heroId => {
                    const h = activeState.heroes[heroId];
                    if (h) await logHeroAction(heroId, h.name, actionType, logMessage);
                }));
                
                isAnimating = false; 
                await scanForSignals(); 
                updateHeroStatsUI();

                setTimeout(() => { bubble.remove(); zoomOut(); }, 3000); 
            } catch (err) { isAnimating = false; }
        }, 1500);
    }, 600); 
}

// --- RENDER MAP & UI ---
function renderMap() {
    const mapGrid = document.getElementById('map-grid');
    if (!mapGrid) return;
    
    const threatLevel = activeState.threat_level || 0;
    const threatColor = threatLevel > 70 ? 'red' : 'var(--pin-danger)';
    
    let mapHTML = `<div class="highway-main"></div><div class="highway-cross"></div><div class="rotonda"></div>${staticCityHTML}`;

    liveSignals.forEach(sig => {
        const xPos = (sig.id * 27) % 80 + 10;
        const yPos = (sig.id * 19) % 80 + 10;
        const isSelected = selectedIncidentId === String(sig.id);
        
        const isVillain = sig.signal_type === 'villain';
        const pinColor = isVillain ? '#fbc02d' : 'var(--pin-danger)';
        const pulseEffect = isSelected ? `box-shadow: 0 0 20px white, 0 0 40px white;` : `box-shadow: 0 0 15px ${pinColor};`;
        const icon = isVillain ? '⚠️' : '🆘';
        const typeLabel = isVillain ? 'VILLAIN THREAT' : 'MEDICAL SOS';

        mapHTML += `
            <div class="emergency-ping live-db-ping" 
                 style="left: ${xPos}%; top: ${yPos}%; background: ${pinColor}; ${pulseEffect}" 
                 onclick="selectPing('${sig.id}', event)"
                 title="[${typeLabel}] ${sig.civilian_name}">
            </div>
        `;

        if (isSelected) {
            let aiAdvisoryHTML = '';
            if (sig.requested_heroes) {
                const reqNames = sig.requested_heroes.split(',')
                                   .map(id => activeState.heroes[id] ? activeState.heroes[id].name : id)
                                   .join(' & ');
                
                aiAdvisoryHTML = `
                    <div style="background: rgba(30,185,166,0.15); border: 1px dashed var(--teal); padding: 8px; margin-top: 12px; font-size: 10px; color: var(--teal); text-align: left; border-radius: 4px;">
                        <strong style="color:#fff;">🤖 CIVILIAN AI ADVISORY:</strong><br>
                        <span style="color:#d0ebe5;">Recommended Response:</span><br> 
                        <span style="color:#ffeb3b; font-weight:bold; font-size: 12px;">[ ${reqNames} ]</span>
                    </div>
                `;
            }

            mapHTML += `
                <div class="target-block" style="left: ${xPos}%; top: ${yPos}%; width: 60px; height: 60px;">
                    <div class="incident-details" style="min-width: 220px;">
                        <div style="font-size: 2.5rem; margin-bottom:-5px;">${icon}</div>
                        <div style="color:white; font-size:12px; font-weight:bold; margin-top:10px; border-bottom:1px solid #e29e3e; padding-bottom:5px;">
                            ${sig.civilian_name.toUpperCase()}
                        </div>
                        <div class="req-skill-text" style="margin-top:8px; font-size:10px;">${typeLabel}</div>
                        ${aiAdvisoryHTML}
                    </div>
                </div>
            `;
        }
    });

    if (activeState.heroes) {
        Object.values(activeState.heroes).forEach(hero => {
            const heroTransform = (currentZoom > 1.5) ? 'translate(-50%,-50%) scale(0.33)' : 'translate(-50%,-50%) scale(1)';
            mapHTML += `
                <div id="hero-pin-${hero.id}" class="hero-pin ${hero.status}" style="position:absolute; left: ${hero.x}%; top: ${hero.y}%; transform:${heroTransform}; transition: 0.8s;">
                    ${hero.name.charAt(0)}
                </div>
            `;
        });
    }

    mapGrid.innerHTML = mapHTML;
    
    const threatBarFill = document.getElementById('threat-bar-fill');
    const threatTitleText = document.getElementById('threat-title-text');
    if (threatBarFill) { threatBarFill.style.width = `${threatLevel}%`; threatBarFill.style.background = threatColor; }
    if (threatTitleText) { threatTitleText.innerText = `CITY THREAT LEVEL: ${threatLevel}%`; }
}

function renderRoster() {
    const roster = document.getElementById('roster');
    if (!roster) return;
    roster.innerHTML = '';
    if(!activeState.heroes) return;

    Object.values(activeState.heroes).forEach(hero => {
        const card = document.createElement('div');
        const isSelected = selectedHeroes.includes(hero.id);
        card.className = `roster-card ${isSelected ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="status-bar status-${hero.status}">${hero.status}</div>
            <div class="portrait">👤 <div class="skill-tag">${hero.skill}</div></div>
            <div class="name-plate">${hero.name}</div>
        `;
        card.onclick = () => { 
            if (isAnimating) return;
            const index = selectedHeroes.indexOf(hero.id);
            if (index > -1) selectedHeroes.splice(index, 1);
            else {
                if (selectedHeroes.length < 2) selectedHeroes.push(hero.id); 
                else { selectedHeroes.shift(); selectedHeroes.push(hero.id); }
            }
            renderRoster(); 
            validateAction(); 
            updateCommsUI();
            updateHeroStatsUI();
        };
        roster.appendChild(card);
    });
}

function validateAction() {
    const bar = document.getElementById('action-bar');
    const textNode = document.getElementById('action-text');
    const btn = document.getElementById('deploy-btn');
    
    if (selectedHeroes.length > 0 && selectedIncidentId) {
        const sig = liveSignals.find(s => String(s.id) === selectedIncidentId);
        const allAvailable = selectedHeroes.every(id => activeState.heroes[id].status === "RESTING");
        
        if (allAvailable && sig) {
            bar.style.display = 'flex';
            const squadNames = selectedHeroes.map(id => activeState.heroes[id].name).join(" & ");
            const typeLabel = sig.signal_type === 'villain' ? 'NEUTRALIZE' : 'SECURE';
            
            const isAiMatch = sig.requested_heroes && (selectedHeroes.slice().sort().join(',') === sig.requested_heroes.split(',').sort().join(','));
            
            if (isAiMatch) {
                textNode.innerHTML = `<span style="color:#ffeb3b;">[AI ADVISORY MATCH]</span> DEPLOY [${squadNames}] TO ${typeLabel}: ${sig.civilian_name.toUpperCase()}`;
            } else {
                textNode.innerText = `DEPLOY [${squadNames}] TO ${typeLabel}: ${sig.civilian_name.toUpperCase()}`;
            }
            
            textNode.style.color = "white";
            if(btn) { btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer"; }
        } else { bar.style.display = 'none'; }
    } else { bar.style.display = 'none'; }
}

// --- HERO STATS RADAR & LOGS ---
function updateHeroStatsUI() {
    const panel = document.getElementById('hero-stats-panel');
    if (!panel) return;

    if (selectedHeroes.length > 0) {
        const heroId = selectedHeroes[0];
        const hero = activeState.heroes[heroId];
        if (hero) {
            panel.style.display = 'flex';
            renderHeroStats(hero);
            return;
        }
    }
    panel.style.display = 'none';
}

function renderHeroStats(hero) {
    const canvas = document.getElementById('heroStatRadar');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (heroChartInstance) heroChartInstance.destroy();

    const combat = hero.stat_combat !== undefined ? parseInt(hero.stat_combat) : 65;
    const defense = hero.stat_defense !== undefined ? parseInt(hero.stat_defense) : 50;
    const agility = hero.stat_agility !== undefined ? parseInt(hero.stat_agility) : 70;
    const comms = hero.stat_comms !== undefined ? parseInt(hero.stat_comms) : 45;
    const intel = hero.stat_intel !== undefined ? parseInt(hero.stat_intel) : 60;

    heroChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Combat', 'Defense', 'Agility', 'Comms', 'Intel'],
            datasets: [{
                label: hero.name,
                data: [combat, defense, agility, comms, intel],
                backgroundColor: 'rgba(218, 165, 32, 0.45)',
                borderColor: '#daa520',
                pointBackgroundColor: '#ffcc00',
                pointBorderColor: '#ffffff',
                borderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    angleLines: { color: 'rgba(255, 255, 255, 0.15)' },
                    grid: { color: 'rgba(255, 255, 255, 0.12)', circular: false },
                    pointLabels: {
                        color: '#e6dfd1',
                        font: { family: "'SysFont', monospace", size: 10, weight: 'bold' }
                    },
                    ticks: { display: false, stepSize: 20 }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

async function logHeroAction(heroId, heroName, actionType, logMessage) {
    const logFeed = document.getElementById('hero-log-feed');
    if (logFeed) {
        const entry = document.createElement('div');
        entry.style.color = actionType === 'threat_neutralized' ? '#ffcc00' : '#1eb9a6';
        entry.innerText = `[${heroName}] ${logMessage}`;
        logFeed.insertBefore(entry, logFeed.firstChild);
    }

    try {
        await fetch('/BACKEND/CODE_PHP/log_action.php', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-SDN-Auth': 'SFXC-BlackOps-2026-Alpha'
            },
            body: JSON.stringify({ hero_id: heroId, action: actionType })
        });
    } catch (e) {}
}

// --- COMMS & AI CHATBOT LOGIC ---
function updateCommsUI() {
    const inputBox = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-btn');
    
    if (selectedHeroes.length > 0) {
        const win = document.getElementById('chat-window');
        const squadNames = selectedHeroes.map(id => activeState.heroes[id].name).join(" & ");
        
        if (inputBox) { inputBox.disabled = false; inputBox.placeholder = "Type tactical command here..."; }
        if (sendBtn) sendBtn.disabled = false;
        
        if (win.innerHTML === '') {
            win.innerHTML = `<div class="msg sys">SECURE TEAM CHANNEL OPEN: ${squadNames}</div>`;
        } else {
            win.innerHTML += `<div class="msg sys">CHANNEL SWITCHED: ${squadNames}</div>`;
        }
        win.scrollTop = win.scrollHeight;
    } else {
        document.getElementById('chat-window').innerHTML = `<div class="msg sys">SELECT AGENTS TO ESTABLISH LINK</div>`;
        if (inputBox) { inputBox.disabled = true; inputBox.placeholder = "Select a hero on the roster first..."; }
        if (sendBtn) sendBtn.disabled = true;
    }
}

async function sendChat() {
    const input = document.getElementById('chat-input');
    const win = document.getElementById('chat-window');
    const message = input.value.trim();
    
    if (!message || selectedHeroes.length === 0) return; 

    const heroId = selectedHeroes[0];
    const hero = activeState.heroes[heroId];

    win.innerHTML += `<div class="msg tx">${message}</div>`;
    input.value = ''; win.scrollTop = win.scrollHeight;

    const typingId = 'typing-' + Date.now();
    win.innerHTML += `<div id="${typingId}" class="msg rx" style="opacity:0.5;">${hero.name} is transmitting...</div>`;
    win.scrollTop = win.scrollHeight;

    try {
        const res = await fetch('/BACKEND/CODE_PHP/chat.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: message,
                hero_name: hero.name,    
                hero_skill: hero.skill,
                active_threats: liveSignals.length
            })
        });
        const data = await res.json();
        
        document.getElementById(typingId)?.remove();
        
        if (data.reply) {
            win.innerHTML += `<div class="msg rx" style="border-left: 3px solid #1eb9a6;"><strong>[${hero.name}]</strong>: ${data.reply}</div>`;
        } else { throw new Error("No AI reply"); }
        win.scrollTop = win.scrollHeight;
    } catch (err) {
        document.getElementById(typingId)?.remove();
        win.innerHTML += `<div class="msg rx" style="border-left: 3px solid #1eb9a6;"><strong>[${hero.name}]</strong>: Message received, Dispatch. Holding position.</div>`;
        win.scrollTop = win.scrollHeight;
    }
}

// --- BLACK OPS VAULT LOGIC ---
const classifiedAgents = {
    "C1": { 
        name: "ECLIPSE", skill: "mental", true_name: "Kaelen Vance", blood_type: "O- Negative", 
        eval: "Clinical empathy suppression. Highly effective in combat, but requires mandatory psych evaluation every 6 months.",
        stats: { combat: 90, defense: 60, agility: 80, comms: 40, intel: 95 }
    },
    "C2": { 
        name: "OVERRIDE", skill: "tech", true_name: "Jax Mercer", blood_type: "AB+ Enhanced", 
        eval: "Textbook sociopathy channeled into tactical efficiency. Loyal to the paycheck and the team. Do not cross.",
        stats: { combat: 85, defense: 85, agility: 70, comms: 90, intel: 85 }
    }
};

let vaultChartInstances = {};

function renderVault() {
    const vaultContainer = document.querySelector('.vault-container');
    if (!vaultContainer) return;

    let html = `
        <h2 style="letter-spacing: 3px; margin-bottom: 15px; color: var(--pin-danger); border-bottom: 1px dashed var(--pin-danger); padding-bottom: 10px;">TOP SECRET: BLACK OPS VAULT</h2>
        <p style="color: #e6dfd1; margin-bottom: 25px; font-size: 0.9rem;">DIRECTOR-LEVEL CLEARANCE ACCEPTED. REVIEW DOSSIERS PRIOR TO ACTIVE DEPLOYMENT.</p>
        <div style="display:flex; gap:30px; justify-content:center; flex-wrap: wrap;">
    `;

    const activeHeroIds = Object.keys(activeState.heroes || {});

    Object.keys(classifiedAgents).forEach(id => {
        if (activeHeroIds.includes(id)) return;

        const agent = classifiedAgents[id];
        html += `
            <div id="vault-card-${id}" style="border:1px solid var(--pin-danger); background:rgba(5,0,0,0.9); width: 450px; display: flex; flex-direction: column; box-shadow: 0 0 20px rgba(226,91,62,0.15);">
                
                <!-- HEADER -->
                <div style="background: rgba(226,91,62,0.1); padding: 15px; border-bottom: 1px solid #331111;">
                    <h3 style="color:var(--pin-danger); margin:0; letter-spacing: 2px;">[ ALIAS: ${agent.name} ]</h3>
                    <div style="color:#aaa; font-size:12px; margin-top:5px;">CLASS: ${agent.skill.toUpperCase()}</div>
                </div>

                <!-- DOSSIER BODY (Side-by-side) -->
                <div style="display: flex; flex: 1; padding: 15px; gap: 15px;">
                    
                    <!-- LORE SECTION -->
                    <div style="flex: 1; text-align: left;">
                        <p style="font-size:11px; color:#888; margin-top:0;"><strong>TRUE ID:</strong> <span style="background:black; color:black; cursor:help;" onmouseover="this.style.color='#aaa'" onmouseout="this.style.color='black'">${agent.true_name}</span></p>
                        <p style="font-size:11px; color:#888;"><strong>BLOOD:</strong> ${agent.blood_type}</p>
                        <p style="font-size:10px; color:#bbb; margin:15px 0; border-top:1px dashed #441111; padding-top:10px; line-height: 1.4;"><em>"${agent.eval}"</em></p>
                    </div>

                    <!-- STATS SECTION -->
                    <div style="width: 150px; height: 150px; position: relative;">
                        <canvas id="vault-radar-${id}"></canvas>
                    </div>
                </div>

                <!-- ACTION BUTTON -->
                <button onclick="authorizeTransfer('${id}')" style="background:var(--pin-danger); color:white; border:none; padding:12px; font-family:inherit; font-weight:bold; cursor:pointer; text-transform:uppercase; letter-spacing: 1px; transition: 0.2s;">
                    [ AUTHORIZE DEPLOYMENT ]
                </button>
            </div>
        `;
    });

    if (Object.keys(classifiedAgents).length === 0 || Object.keys(classifiedAgents).every(id => activeHeroIds.includes(id))) {
        html += `<div style="color: #666; font-style: italic;">ALL RESERVE OPERATIVES CURRENTLY DEPLOYED IN SECTOR.</div>`;
    }

    html += `</div>`;
    vaultContainer.innerHTML = html;

    setTimeout(() => {
        Object.keys(classifiedAgents).forEach(id => {
            if (activeHeroIds.includes(id)) return;
            drawVaultChart(id, classifiedAgents[id]);
        });
    }, 50);
}

function drawVaultChart(id, agent) {
    const canvas = document.getElementById(`vault-radar-${id}`);
    if (!canvas) return;
    
    if (vaultChartInstances[id]) {
        vaultChartInstances[id].destroy();
    }

    const ctx = canvas.getContext('2d');
    vaultChartInstances[id] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['ATK', 'DEF', 'AGI', 'COM', 'INT'],
            datasets: [{
                data: [agent.stats.combat, agent.stats.defense, agent.stats.agility, agent.stats.comms, agent.stats.intel],
                backgroundColor: 'rgba(226, 91, 62, 0.2)',
                borderColor: '#e25b3e',
                pointBackgroundColor: '#ff4d4d',
                pointBorderColor: '#ffffff',
                borderWidth: 1,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)', circular: true },
                    pointLabels: {
                        color: '#aaa',
                        font: { family: "'Courier New', monospace", size: 8 }
                    },
                    ticks: { display: false }
                }
            },
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });
}

async function authorizeTransfer(id) {
    const agent = classifiedAgents[id];
    if (!agent) return;

    const btn = document.querySelector(`#vault-card-${id} button`);
    if(btn) {
        btn.innerText = "UPLINKING...";
        btn.style.background = "yellow";
        btn.style.color = "black";
    }

    try {
        await fetch('/BACKEND/CODE_PHP/authorize_agent.php', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-SDN-Auth': 'SFXC-BlackOps-2026-Alpha' 
            },
            body: JSON.stringify({ 
                hero_id: id, 
                name: agent.name, 
                skill: agent.skill 
            })
        });

        delete classifiedAgents[id];
        await scanForSignals();
        renderVault();
        switchTab('map'); 
    } catch (e) {
        if(btn) { btn.innerText = "ERROR"; btn.style.background = "red"; }
    }
}