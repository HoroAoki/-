let map;
let userMarker;
let markersLayer = L.layerGroup();
let isFirst = true;

// 【手動データ】ここにあるものは、ネットの成否に関わらず必ず出ます
const manualBins = [
    { id: 901, name: "鎌倉駅前", lat: 35.3190, lng: 139.5505 },
    { id: 902, name: "追加ゴミ箱2", lat: 35.3200, lng: 139.5510 }
];

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map').setView([35.6895, 139.6917], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    markersLayer.addTo(map);
    startTracking();
});

function startTracking() {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition(updatePosition, handleError, {
        enableHighAccuracy: true, timeout: 10000, maximumAge: 0
    });
}

function updatePosition(position) {
    const { latitude, longitude } = position.coords;
    const userPos = [latitude, longitude];

    if (isFirst) {
        map.setView(userPos, 15);
        // ネット取得を呼び出すが、完了を待たずに次へ進む
        fetchNearbyTrashBins(latitude, longitude);
        isFirst = false;
    } else {
        map.panTo(userPos);
    }

    if (userMarker) {
        userMarker.setLatLng(userPos);
    } else {
        userMarker = L.circleMarker(userPos, { color: '#3498db', fillColor: '#fff', fillOpacity: 1, radius: 8, weight: 3 }).addTo(map);
    }
    
    // ネットの返事を待たずに、まず手動分だけ表示させておく
    displayBins([], latitude, longitude);
    getAddress(latitude, longitude);
}

async function fetchNearbyTrashBins(lat, lng) {
    document.getElementById('nearest-status').innerText = "周辺を捜索中...(手動分は表示済)";
    
    // 負荷を減らすため、半径を3km(3000)に少しだけ絞りつつ、タイムアウトを設定
    const query = `[out:json][timeout:15];node["amenity"~"waste_basket|recycling"](around:3000, ${lat}, ${lng});out body;`;
    const url = `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒で諦める設定

        const response = await fetch(url, { signal: controller.signal });
        const data = await response.json();
        const bins = data.elements || [];

        displayBins(bins, lat, lng);
        if (bins.length === 0) {
            document.getElementById('nearest-status').innerText = "3km以内に登録データなし。手動分のみ表示。";
        }
    } catch (e) {
        document.getElementById('nearest-status').innerText = "通信タイムアウト。手動分のみ表示中。";
        displayBins([], lat, lng);
    }
}

function displayBins(bins, userLat, userLng) {
    markersLayer.clearLayers();
    const allBins = [...bins, ...manualBins];
    let nearest = null;
    let minDiv = Infinity;

    allBins.forEach(bin => {
        const binLat = bin.lat;
        const binLng = bin.lon || bin.lng; 
        const d = getDistance(userLat, userLng, binLat, binLng);
        if (d < minDiv) { minDiv = d; nearest = bin; }

        L.marker([binLat, binLng], { 
            icon: L.divIcon({ html: `<div style="font-size: 25px;">🗑️</div>`, className: 'trash-icon', iconSize: [30, 30] }) 
        }).addTo(markersLayer).bindPopup(bin.tags?.name || bin.name || "ゴミ箱");
    });

    if (nearest) {
        document.getElementById('nearest-status').innerHTML = `最寄りまで約 <b>${Math.round(minDiv)}m</b>`;
    }
}

async function getAddress(lat, lng) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`, { headers: { 'Accept-Language': 'ja' } });
        const data = await res.json();
        document.getElementById('address-display').innerText = `現在地: ${data.display_name}`;
    } catch (e) {}
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function handleError(err) {
    document.getElementById('nearest-status').innerText = "GPSを許可してください。";
}
