// --- THIRD-PARTY OPEN-METEO WEATHER API MODULE ---
window.weatherOverlayClass = '';
window.weatherIcon = "📡";
window.weatherTemp = "--";
window.weatherDesc = "CONNECTING...";
window.isRaining = false;
let testWeatherMode = 0; // 0=Live API, 1=Clouds, 2=Rain, 3=Storm

async function fetchWeather() {
    if (testWeatherMode !== 0) return; 

    try {
        // Added a controller timeout so a slow network connection can never hang your app
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=8.9475&longitude=125.5406&current=temperature_2m,weathercode,is_day', {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await res.json();
        const temp = data.current.temperature_2m;
        const code = data.current.weathercode;
        const isDay = data.current.is_day;
        
        let desc = "CLEAR"; let icon = "☀️"; let overlayClass = "";
        window.isRaining = false;

        if (code === 0 || code === 1) {
            desc = isDay ? "SUNNY" : "CLEAR SKY"; 
            icon = isDay ? "☀️" : "🌙";
            overlayClass = isDay ? "weather-sunny active" : "";
        } else if (code === 2 || code === 3) {
            desc = "CLOUDY"; icon = "☁️";
            overlayClass = "weather-clouds active";
        } else if (code >= 51 && code <= 67) {
            desc = "RAIN"; icon = "🌧️";
            window.isRaining = true;
            overlayClass = "weather-rain active";
        } else if (code >= 80 && code <= 82) {
            desc = "HEAVY RAIN"; icon = "🌧️";
            window.isRaining = true;
            overlayClass = "weather-rain active";
        } else if (code >= 95) {
            desc = "THUNDERSTORM"; icon = "⛈️";
            window.isRaining = true;
            overlayClass = "weather-storm active";
        }

        window.weatherTemp = temp;
        window.weatherDesc = desc;
        window.weatherIcon = icon;
        window.weatherOverlayClass = overlayClass;
        
    } catch(e) {
        console.warn("Weather API offline, using fallback tactical feed.", e);
        // Fallback data so the UI never breaks on stage if the network drops
        window.weatherTemp = "28";
        window.weatherDesc = "SECTOR CLEAR";
        window.weatherIcon = "📡";
        window.weatherOverlayClass = "";
    } finally {
        // Safely trigger your map render functions if they exist
        if (typeof renderMap === 'function') {
            renderMap(); 
        }
        if (typeof validateAction === 'function') {
            validateAction();
        }
        // Update the widget text directly on screen if it exists
        const widget = document.getElementById("weather-widget");
        if (widget) {
            widget.innerHTML = `${window.weatherIcon} ${window.weatherTemp}°C - ${window.weatherDesc}`;
        }
    }
}

// Manual override for testing rain lockout (Cycles via cloud icon button)
function toggleTestWeather() {
    testWeatherMode = (testWeatherMode + 1) % 4;
    window.isRaining = false;
    let overlayClass = "";
    
    if (testWeatherMode === 0) {
        fetchWeather(); 
        return;
    } else if (testWeatherMode === 1) {
        window.weatherDesc = "TEST: CLOUDS"; window.weatherIcon = "☁️";
        overlayClass = "weather-clouds active";
    } else if (testWeatherMode === 2) {
        window.weatherDesc = "TEST: RAIN"; window.weatherIcon = "🌧️";
        window.isRaining = true;
        overlayClass = "weather-rain active";
    } else if (testWeatherMode === 3) {
        window.weatherDesc = "TEST: STORM"; window.weatherIcon = "⛈️";
        window.isRaining = true;
        overlayClass = "weather-storm active";
    }
    window.weatherOverlayClass = overlayClass;
    
    // Update widget text for test modes
    const widget = document.getElementById("weather-widget");
    if (widget) {
        widget.innerHTML = `${window.weatherIcon} --°C - ${window.weatherDesc}`;
    }

    // Toggle the actual CSS weather overlay element on the map
    const fx = document.getElementById("weather-fx");
    if (fx) {
        fx.className = "weather-overlay " + overlayClass;
    }

    if (typeof renderMap === 'function') {
        renderMap();
        if (typeof validateAction === 'function') validateAction();
    }
}

// Auto-initialize weather fetch on load
document.addEventListener("DOMContentLoaded", () => {
    fetchWeather();
});