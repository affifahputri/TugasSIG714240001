// 1. Inisialisasi Peta
const map = L.map("map").setView([-6.8710, 107.5735], 16);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// 2. Ikon Pin Biru (Jemput / Awal) dan Merah (Tujuan / Akhir)
const iconBiru = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const iconMerah = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// 3. Ikon Motor Gojek
const iconMotor = L.divIcon({
  className: "motor-wrapper",
  html: `<img id="motor-rider" class="motor-icon-smooth" src="https://cdn-icons-png.flaticon.com/512/3063/3063822.png" style="width: 32px; height: 32px; transform-origin: center center; display: block;" />`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// Rumus Arah Putar Motor (Bearing)
function hitungSudut(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLon = (lon2 - lon1) * rad;
  const y = Math.sin(dLon) * Math.cos(lat2 * rad);
  const x = Math.cos(lat1 * rad) * Math.sin(lat2 * rad) - Math.sin(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// 4. Render Rute & Animasi dari Biru ke Merah
fetch("./rute_10k.geojson")
  .then(res => res.json())
  .then(geojsonData => {
    let routeCoords = [];

    const layerGeo = L.geoJSON(geojsonData, {
      style: {
        color: "#00AA13",
        weight: 6,
        opacity: 0.9
      },
      pointToLayer: function (feature, latlng) {
        const isJemput = feature.properties && feature.properties.keterangan && feature.properties.keterangan.includes("Jemput");
        // Titik jemput pin biru, titik tujuan pin merah
        return L.marker(latlng, { icon: isJemput ? iconBiru : iconMerah });
      },
      onEachFeature: function (feature, layer) {
        if (feature.geometry.type === "LineString") {
          routeCoords = feature.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        }
        if (feature.properties) {
          const title = feature.properties.nama_rute || feature.properties.keterangan || "Info";
          const desc = feature.properties.lokasi || feature.properties.ongkos || "";
          layer.bindPopup(`<b>${title}</b><br>${desc}`);
        }
      }
    }).addTo(map);

    map.fitBounds(layerGeo.getBounds());

    // 5. Animasi Meluncur dari Biru ke Merah
    if (routeCoords.length > 1) {
      const smoothRoute = [];
      const stepsPerSegment = 20;

      for (let i = 0; i < routeCoords.length - 1; i++) {
        const start = routeCoords[i];
        const end = routeCoords[i + 1];
        
        // Sudut arah motor pas ke depan arah laju
        const angle = (hitungSudut(start[0], start[1], end[0], end[1]) - 90 + 360) % 360;

        for (let j = 0; j < stepsPerSegment; j++) {
          const lat = start[0] + (end[0] - start[0]) * (j / stepsPerSegment);
          const lng = start[1] + (end[1] - start[1]) * (j / stepsPerSegment);
          smoothRoute.push({ latlng: [lat, lng], angle: angle });
        }
      }

      const bikeMarker = L.marker(smoothRoute[0].latlng, { icon: iconMotor }).addTo(map);
      let currIndex = 0;

      setInterval(() => {
        currIndex = (currIndex + 1) % smoothRoute.length;
        const currentPos = smoothRoute[currIndex];

        bikeMarker.setLatLng(currentPos.latlng);

        const imgEl = document.getElementById("motor-rider");
        if (imgEl) {
          imgEl.style.transform = `rotate(${currentPos.angle}deg)`;
        }
      }, 50);
    }
  })
  .catch(err => console.error(err));