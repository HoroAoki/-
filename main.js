let map;
let userMarker;
let markersLayer = L.layerGroup();
let isFirst = true;
// 手動で追加するゴミ箱のリスト
const manualBins = [
    { id: 901, name: "追加ゴミ箱1", lat: 35.3190, lng: 139.5505 },
    { id: 902, name: "追加ゴミ箱2", lat: 35.3200, lng: 139.5510 }
];

document.addEventListener('DOMContentLoaded', () => {
    // 初期表示
    map = L.map('map').setView([35.6895, 139.6917], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    markersLayer.addTo(map);

    startTracking();
});

function startTracking() {
    if (!navigator.geolocation) {
        alert("GPSが使えないブラウザです");
        return;
    }
    navigator.geolocation.watchPosition(updatePosition, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
}

async function updatePosition(position) {
    const { latitude, longitude } = position.coords;
    const userPos = [latitude, longitude];

    if (isFirst) {
        map.setView(userPos, 17);
        // 初回のみネットから周辺のゴミ箱を取得
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
    
    getAddress(latitude, longitude);
}

// ネット（OpenStreetMap）からゴミ箱データを取得する関数
async function fetchNearbyTrashBins(lat, lng) {
    document.getElementById('nearest-status').innerText = "近くのゴミ箱を検索中...";
    
    // 周囲1km以内のゴミ箱を探すクエリ
    const query = `
        [out:json];
        node["amenity"="waste_basket"](around:1000, ${lat}, ${lng});
        out body;
    `;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const bins = data.elements;

        if (bins.length === 0) {
            document.getElementById('nearest-status').innerText = "半径1km以内にゴミ箱が見つかりませんでした。";
            return;
        }

        displayBins(bins, lat, lng);
    } catch (e) {
        console.error("データの取得に失敗しました", e);
        document.getElementById('nearest-status').innerText = "ゴミ箱データの取得に失敗しました。";
    }
}

function displayBins(bins, userLat, userLng) {
    markersLayer.clearLayers();
    const allBins = [...bins, ...(typeof manualBins !== 'undefined' ? manualBins : [])];
    let nearest = null;
    let minDiv = Infinity;

    allBins.forEach(bin => {
        const binLat = bin.lat;
        const binLng = bin.lon || bin.lng; 
        const d = getDistance(userLat, userLng, binLat, binLng);
        if (d < minDiv) {
            minDiv = d;
            nearest = bin;
        }
        const icon = L.divIcon({
            html: `<div style="font-size: 25px;">🗑️</div>`,
            className: 'trash-icon',
            iconSize: [30, 30]
        });
        L.marker([binLat, binLng], { icon }).addTo(markersLayer)
         .bindPopup(bin.name || "ゴミ箱");
    });

    if (nearest) {
        const nearestLat = nearest.lat;
        const nearestLng = nearest.lon || nearest.lng;
        const nearestIcon = L.divIcon({
            html: `<div style="font-size: 45px; filter: drop-shadow(0 0 5px red);">🗑️</div>`,
            className: 'trash-icon',
            iconSize: [50, 50]
        });
        L.marker([nearestLat, nearestLng], { icon: nearestIcon }).addTo(markersLayer)
         .bindPopup(`<b>一番近いゴミ箱: ${nearest.name || ""}</b>`).openPopup();
        document.getElementById('nearest-status').innerHTML = 
            `最寄りのゴミ箱まで約 <b>${Math.round(minDiv)}m</b> です。`;
    }
}

async function getAddress(lat, lng) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`, {
            headers: { 'Accept-Language': 'ja' }
        });
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
