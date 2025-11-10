// public/javascripts/showPageMap.js
document.addEventListener('DOMContentLoaded', function () {
  try {
    const container = document.getElementById('map');
    if (!container) {
      console.warn('showPageMap: #map element not found');
      return;
    }
    container.style.height = container.style.height || '400px';

    // Expect data injected as window.campgroundJSON or window.campground
    let camp = null;
    if (window.campground && typeof window.campground === 'object') {
      camp = window.campground;
    } else if (window.campgroundJSON) {
      try { camp = JSON.parse(window.campgroundJSON); } catch (e) { console.error('showPageMap: invalid campgroundJSON', e); }
    } else {
      console.warn('showPageMap: no campground data found');
    }

    // default coords
    let lat = 20, lng = 78;

    if (camp && camp.geometry && Array.isArray(camp.geometry.coordinates) && camp.geometry.coordinates.length >= 2) {
      // GeoJSON is [lng, lat] -> convert to Leaflet [lat, lng]
      lng = parseFloat(camp.geometry.coordinates[0]);
      lat = parseFloat(camp.geometry.coordinates[1]);
      console.log('showPageMap: using geometry from DB:', { lng, lat, raw: camp.geometry.coordinates });
    } else {
      console.warn('showPageMap: no geometry found — using default coords');
    }

    if (window._campMap) try { window._campMap.remove(); } catch (e) {}
    window._campMap = L.map('map').setView([lat, lng], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(window._campMap);

    const popupHtml = `<strong>${escapeHtml(camp && camp.title ? camp.title : 'Camp')}</strong><br>${escapeHtml(camp && camp.location ? camp.location : '')}`;
    L.marker([lat, lng]).addTo(window._campMap).bindPopup(popupHtml).openPopup();

    console.log('showPageMap: map loaded', { lat, lng });
  } catch (err) {
    console.error('showPageMap error:', err);
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
});
