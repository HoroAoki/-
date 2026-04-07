let map;
let userMarker;
let markersLayer = L.layerGroup();
let isFirst = true;

// サンプルゴミ箱データ
const trashBins = [
    { id: 1, name: "Station Bin", lat: 35.6812, lng: 139.7671 },
    { id: 2, name: "Park Bin", lat: 35.6850, lng: 139.7520 },
    { id: 3, name: "Store Bin", lat: 35.3190, lng: 139.5505 } // 鎌倉付近
];

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map').setView([35.6895, 139.6917], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    markersLayer.addTo(map);

    startTracking();
});

function startTracking() {
    if (!navigator.geolocation) {
        alert("GPSが使えないブラウザです");
        return;
    }

    // リアルタイム追跡
    navigator.geolocation.watchPosition(updatePosition, handleError, {
        enableHighAccuracy: true, // GPSを強制使用
        timeout: 10000,
        maximumAge: 0
    });
}

async function updatePosition(position) {
    const { latitude, longitude } = position.coords;
    const userPos = [latitude, longitude];

    if (isFirst) {
        map.setView(userPos, 16);
        isFirst = false;
    } else {
        map.panTo(userPos);
    }

    // 現在地マーカー
    if (userMarker) {
        userMarker.setLatLng(userPos);
    } else {
        userMarker = L.circleMarker(userPos, { color: 'blue', radius: 10 }).addTo(map);
    }

    // 1. 座標から詳細住所を取得 (逆ジオコーディング)
    getAddress(latitude, longitude);

    // 2. 最寄りの計算と表示
    findNearest(latitude, longitude);
}

// Nominatim API で住所を取得
async function getAddress(lat, lng) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: { 'Accept-Language': 'ja' }
        });
        const data = await res.json();
        document.getElementById('address-display').innerText = `現在地: ${data.display_name}`;
    } catch (e) {
        console.error("住所取得失敗");
    }
}

async function findNearest(lat, lng) {
    let nearest = null;
    let minDiv = Infinity;

    trashBins.forEach(bin => {
        const d = getDistance(lat, lng, bin.lat, bin.lng);
        if (d < minDiv) {
            minDiv = d;
            nearest = bin;
        }
    });

    markersLayer.clearLayers();
    trashBins.forEach(async bin => {
        const isNear = bin.id === nearest.id;
        const icon = L.divIcon({
            html: `<div style="font-size: ${isNear ? '40px' : '20px'};">🗑️</div>`,
            iconSize: [40, 40],
            className: 'trash-icon'
        });

        let name = bin.name;
        if (isNear) {
            // MyMemoryで翻訳
            name = await translate(bin.name);
            document.getElementById('nearest-status').innerHTML = 
                `最寄り: <b>${name}</b> (約${Math.round(minDiv)}m)`;
        }

        L.marker([bin.lat, bin.lng], { icon }).addTo(markersLayer).bindPopup(name);
    });
}

async function translate(text) {
    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ja`);
        const data = await res.json();
        return data.responseData.translatedText;
    } catch { return text; }
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function handleError(err) {
    document.getElementById('nearest-status').innerText = `エラー: ${err.message}. HTTPS接続か確認してください。`;
}
