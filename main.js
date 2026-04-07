let map;
let userMarker;
let markersLayer = L.layerGroup();
let isFirst = true;

// 【ここを編集】表示したいゴミ箱を好きなだけ追加してください
const manualBins = [
    { id: 901, name: "鎌倉駅前", lat: 35.3190, lng: 139.5505 },
    { id: 902, name: "追加ゴミ箱2", lat: 35.3200, lng: 139.5510 },
    { id: 903, name: "小町通り付近", lat: 35.3215, lng: 139.5520 }
];

document.addEventListener('DOMContentLoaded', () => {
    // 初期表示（東京にしていますが、GPSが動けば現在地に飛びます）
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
    // 現在地を監視
    navigator.geolocation.watchPosition(updatePosition, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
}

function updatePosition(position) {
    const { latitude, longitude } = position.coords;
    const userPos = [latitude, longitude];

    if (isFirst) {
        map.setView(userPos, 17);
        isFirst = false;
    } else {
        map.panTo(userPos);
    }

    // 青い現在地マーカーを表示
    if (userMarker) {
        userMarker.setLatLng(userPos);
    } else {
        userMarker = L.circleMarker(userPos, { color: '#3498db', fillColor: '#fff', fillOpacity: 1, radius: 8, weight: 3 }).addTo(map);
    }
    
    // ゴミ箱を表示する命令を実行
    displayBins(latitude, longitude);
    getAddress(latitude, longitude);
}

function displayBins(userLat, userLng) {
    markersLayer.clearLayers();
    
    let nearest = null;
    let minDiv = Infinity;

    // manualBins（手動リスト）だけを処理する
    manualBins.forEach(bin => {
        const d = getDistance(userLat, userLng, bin.lat, bin.lng);
        
        if (d < minDiv) {
            minDiv = d;
            nearest = bin;
        }

        const icon = L.divIcon({
            html: `<div style="font-size: 25px;">🗑️</div>`,
            className: 'trash-icon',
            iconSize: [30, 30]
        });

        L.marker([bin.lat, bin.lng], { icon }).addTo(markersLayer)
         .bindPopup(bin.name);
    });

    // 一番近いゴミ箱を強調
    if (nearest) {
        const nearestIcon = L.divIcon({
            html: `<div style="font-size: 45px; filter: drop-shadow(0 0 5px red);">🗑️</div>`,
            className: 'trash-icon',
            iconSize: [50, 50]
        });
        L.marker([nearest.lat, nearest.lng], { icon: nearestIcon }).addTo(markersLayer)
         .bindPopup(`<b>一番近いゴミ箱: ${nearest.name}</b>`).openPopup();

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
