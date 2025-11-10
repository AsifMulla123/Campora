// public/javascripts/clusterMap.js
document.addEventListener('DOMContentLoaded', function () {
  try {
    const container = document.getElementById('cluster-map');
    if (!container) {
      console.warn('clusterMap: #cluster-map element not found');
      return;
    }
    container.style.height = container.style.height || '600px';

    // parse campgrounds
    let items = [];
    if (window.campgrounds && Array.isArray(window.campgrounds)) {
      items = window.campgrounds;
    } else if (window.campgroundsJSON) {
      try { items = JSON.parse(window.campgroundsJSON); } catch (e) { console.error('clusterMap: invalid campgroundsJSON', e); }
    } else {
      console.warn('clusterMap: no campgrounds data found');
    }

    const defaultCenter = [20, 78];
    const map = L.map('cluster-map').setView(defaultCenter, 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const markers = L.markerClusterGroup();
    const bounds = L.latLngBounds();

    let added = 0;
    items.forEach(c => {
      if (!c.geometry || !Array.isArray(c.geometry.coordinates) || c.geometry.coordinates.length < 2) return;
      // GeoJSON coordinates are [lng, lat]
      const lng = parseFloat(c.geometry.coordinates[0]);
      const lat = parseFloat(c.geometry.coordinates[1]);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;
      const m = L.marker([lat, lng]);
      const popup = `<strong><a href="/campgrounds/${c._id}">${escapeHtml(c.title || 'Camp')}</a></strong><br>${escapeHtml(c.location || '')}`;
      m.bindPopup(popup);
      markers.addLayer(m);
      bounds.extend([lat, lng]);
      added++;
    });

    map.addLayer(markers);

    if (added > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
      console.log(`clusterMap: added ${added} markers and fit bounds`);
    } else {
      console.log('clusterMap: no markers to add, showing default center');
    }

  } catch (err) {
    console.error('clusterMap error:', err);
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
});
