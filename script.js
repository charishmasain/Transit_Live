// Init Map with Dark Theme (CartoDB Dark Matter)
const map = L.map('map', { zoomControl: false }).setView([13.0102, 80.2459], 13);
L.control.zoom({ position: 'topright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap, © CartoDB'
}).addTo(map);

// Premium Bus Icon SVG Function
const getBusIcon = (color) => {
    return L.divIcon({
        className: 'custom-bus-marker-container',
        html: `
            <div class="pulse-marker-wrapper">
                <div class="pulse-marker-ring" style="background: ${color}40; animation: markerPulse 2s infinite ease-out;"></div>
                <div class="pulse-marker-icon" style="background: ${color}; box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 15px ${color}80;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z" fill="white" stroke="white" stroke-width="1.5"/></svg>
                </div>
            </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24]
    });
};

// Bus Routes Data
const busData = {
    '401': {
        name: 'Bus 401',
        nextStop: 'Campus',
        timeToCampus: 5,
        color: '#3B82F6',
        glowColor: '#6366F1',
        originCoords: [13.0010, 80.2460], // Approaching
        destinations: [
            { id: 0, name: 'Adyar Depot', journeyTime: 24, route: [[13.0102, 80.2459], [13.0075, 80.2500], [13.0031, 80.2543], [13.0012, 80.2568]], routeStops: ["Campus", "IIT Gate", "Gandhi Nagar", "Adyar Depot"] },
            { id: 1, name: 'Besant Nagar', journeyTime: 28, route: [[13.0102, 80.2459], [13.0075, 80.2600], [13.0000, 80.2700]], routeStops: ["Campus", "Adyar Signal", "Besant Nagar"] }
        ]
    },
    '204': {
        name: 'Bus 204',
        nextStop: 'Campus',
        timeToCampus: 12,
        color: '#10B981',
        glowColor: '#059669',
        originCoords: [13.0450, 80.2400],
        destinations: [
            { id: 0, name: 'Anna Nagar', journeyTime: 29, route: [[13.0102, 80.2459], [13.0400, 80.2300], [13.0850, 80.2100]], routeStops: ["Campus", "Nungambakkam", "Anna Nagar"] },
            { id: 1, name: 'Koyambedu', journeyTime: 30, route: [[13.0102, 80.2459], [13.0500, 80.2200], [13.0700, 80.1900]], routeStops: ["Campus", "Vadapalani", "Koyambedu"] }
        ]
    },
    '105': {
        name: 'Bus 105',
        nextStop: 'Campus',
        timeToCampus: 8,
        color: '#F59E0B',
        glowColor: '#D97706',
        originCoords: [13.0120, 80.2200],
        destinations: [
            { id: 0, name: 'Tambaram', journeyTime: 31, route: [[13.0102, 80.2459], [12.9800, 80.2100], [12.9200, 80.1300]], routeStops: ["Campus", "Pallavaram", "Tambaram"] }
        ]
    }
};

let currentBusId = null;
let currentDestId = null;
let routeLine = null;
let routeGlowLine = null;
let marker = null;
let isTracking = false;
let isAdmin = false;
let animationFrameId;

const busSearch = document.getElementById('busSearch');
const searchBox = document.getElementById('searchBox');
const destSelect = document.getElementById('destSelect');
const emptyState = document.getElementById('emptyState');
const busInfoDetails = document.getElementById('busInfoDetails');

busSearch.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (busData[val]) {
        searchBox.style.borderColor = '#10B981';
        loadBus(val);
    } else {
        searchBox.style.borderColor = '';
        if (currentBusId) {
            currentBusId = null;
            emptyState.style.display = 'flex';
            busInfoDetails.style.display = 'none';
            if (marker) map.removeLayer(marker);
            if (routeLine) map.removeLayer(routeLine);
            if (routeGlowLine) map.removeLayer(routeGlowLine);
            destSelect.innerHTML = '<option value="">Select My Stop...</option>';
            destSelect.disabled = true;
            map.setView([13.0102, 80.2459], 13);
        }
    }
});

function loadBus(busId) {
    currentBusId = busId;
    const data = busData[busId];

    emptyState.style.display = 'none';
    busInfoDetails.style.display = 'flex';
    document.getElementById('displayBusName').textContent = data.name;
    document.getElementById('nextStopText').textContent = data.nextStop;
    document.getElementById('nextStopText').title = data.nextStop;
    document.getElementById('timeToCampus').textContent = data.timeToCampus;

    destSelect.innerHTML = '<option value="">Select Destination...</option>';
    data.destinations.forEach(dest => {
        const opt = document.createElement('option');
        opt.value = dest.id;
        opt.textContent = dest.name;
        destSelect.appendChild(opt);
    });
    destSelect.disabled = false;
    document.getElementById('destFlowItem').style.opacity = '0.5';
    document.getElementById('destText').textContent = 'Select my stop above';
    lucide.createIcons();

    if (marker) map.removeLayer(marker);
    if (routeLine) map.removeLayer(routeLine);
    if (routeGlowLine) map.removeLayer(routeGlowLine);

    marker = L.marker(data.originCoords, { icon: getBusIcon(data.color) }).addTo(map);
    map.flyTo(data.originCoords, 15);
    marker.bindPopup(`<div style="font-family: 'Outfit'; text-align: center;"><b>${data.name}</b><br>Approaching Campus</div>`).openPopup();
}

destSelect.addEventListener('change', (e) => {
    if (e.target.value === "") return;
    const destId = e.target.value;
    loadDestination(destId);
});

function loadDestination(destId) {
    currentDestId = destId;
    const data = busData[currentBusId];
    const destData = data.destinations[destId];

    document.getElementById('destFlowItem').style.opacity = '1';
    document.getElementById('destText').textContent = destData.name;
    
    // Arrival at My Stop should maintain the short 5-6 minute ETA from current location to the stop
    document.getElementById('timeToCampus').textContent = data.timeToCampus;

    if (routeLine) map.removeLayer(routeLine);
    if (routeGlowLine) map.removeLayer(routeGlowLine);

    routeLine = L.polyline(destData.route, {
        color: data.color, weight: 4, opacity: 0.9, dashArray: '8, 8', lineCap: 'round'
    }).addTo(map);

    routeGlowLine = L.polyline(destData.route, {
        color: data.glowColor, weight: 12, opacity: 0.25, lineCap: 'round'
    }).addTo(map);

    map.fitBounds(routeLine.getBounds(), { padding: [80, 80] });

    marker.setLatLng(destData.route[0]);
    marker.bindPopup(`<div style="font-family: 'Outfit'; text-align: center;"><b>${data.name}</b><br>Boarding at Campus</div>`).openPopup();
    
    // Start moving little by little automatically
    setTimeout(() => {
        startTrackingSequence();
    }, 800);
}

const roleSwitch = document.getElementById('roleSwitch');
if (localStorage.getItem('isFaculty') === 'true') {
    roleSwitch.checked = true;
    isAdmin = true;
    document.querySelectorAll('.role-text')[0].classList.toggle('active', false);
    document.querySelectorAll('.role-text')[1].classList.toggle('active', true);
}
roleSwitch.addEventListener('change', (e) => {
    localStorage.setItem('isFaculty', e.target.checked);
    location.reload();
});

function animateMarker(startPos, endPos, duration, callback) {
    const startTime = performance.now();
    function step(currentTime) {
        if (!isTracking) return;
        const elapsed = currentTime - startTime;
        let progress = Math.min(elapsed / duration, 1);
        const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const currentLat = startPos[0] + (endPos[0] - startPos[0]) * ease;
        const currentLng = startPos[1] + (endPos[1] - startPos[1]) * ease;
        marker.setLatLng([currentLat, currentLng]);

        if (progress < 1) {
            animationFrameId = requestAnimationFrame(step);
        } else {
            if (callback) callback();
        }
    }
    animationFrameId = requestAnimationFrame(step);
}

async function startTrackingSequence() {
    if (isTracking) return;
    isTracking = true;
    busSearch.disabled = true;
    destSelect.disabled = true;
    searchBox.style.opacity = '0.5';

    const statusBadge = document.getElementById('statusBadge');
    statusBadge.textContent = "Live Tracking";
    statusBadge.className = 'status-pill status-active';
    document.querySelector('.live-dot').classList.add('active');

    lucide.createIcons();

    let currentStepIndex = 0;
    const currentData = busData[currentBusId];
    const destData = currentData.destinations[currentDestId];
    const routeCoordinates = destData.route;

    function moveToNextPoint() {
        if (!isTracking) return;

        if (currentStepIndex >= routeCoordinates.length - 1) {
            statusBadge.textContent = "Completed";
            statusBadge.className = 'status-pill status-idle';
            document.querySelector('.live-dot').classList.remove('active');
            document.getElementById('timeToCampus').textContent = "0";

            const notif = document.getElementById('notificationText');
            notif.className = 'notification-banner success';
            notif.innerHTML = `<i data-lucide="check-circle"></i><span style="font-weight: 700;">Arrived at your stop!</span>`;
            lucide.createIcons();
            marker.bindPopup(`<div style="font-family: 'Outfit'; text-align: center;"><b>${currentData.name}</b><br>Arrived at your stop!</div>`).openPopup();

            document.getElementById('nextStopText').textContent = "Terminus";
            
            isTracking = false;
            busSearch.disabled = false;
            destSelect.disabled = false;
            searchBox.style.opacity = '1';
            return;
        }

        const startPt = routeCoordinates[currentStepIndex];
        const endPt = routeCoordinates[currentStepIndex + 1];
        
        if (destData.routeStops && destData.routeStops[currentStepIndex + 1]) {
            document.getElementById('nextStopText').textContent = destData.routeStops[currentStepIndex + 1];
            document.getElementById('nextStopText').title = destData.routeStops[currentStepIndex + 1];
        }

        const remainingPoints = routeCoordinates.length - 1 - currentStepIndex;
        // Traffic Engine: Add 2-3 mins randomly if there's traffic ahead
        const trafficDelay = (remainingPoints > 0 && Math.random() > 0.5) ? Math.floor(Math.random() * 2) + 2 : 0;
        let calculatedEta = Math.round(destData.journeyTime * (remainingPoints / (routeCoordinates.length - 1))) + trafficDelay;
        let myStopEta = Math.round(currentData.timeToCampus * (remainingPoints / (routeCoordinates.length - 1))) + trafficDelay;
        
        if (remainingPoints === 0) {
            calculatedEta = 0;
            myStopEta = 0;
        }

        document.getElementById('timeToCampus').textContent = myStopEta;
        
        const popupMsg = trafficDelay > 0 ? `<b style="color: #F59E0B">Traffic delay! (+${trafficDelay}m)</b>` : `<b>${currentData.name}</b><br>On the way`;
        marker.bindPopup(`<div style="font-family: 'Outfit'; text-align: center;">${popupMsg}<br>${myStopEta} mins remaining</div>`);

        animateMarker(startPt, endPt, 18000, () => {
            currentStepIndex++;
            setTimeout(() => { if (isTracking) moveToNextPoint(); }, 500);
        });
    }

    moveToNextPoint();
}
