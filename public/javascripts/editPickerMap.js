// public/javascripts/editPickerMap.js
document.addEventListener('DOMContentLoaded', function () {
  try {
    const mapEl = document.getElementById('pickerMapEdit');
    if (!mapEl) return;

    // Parse campground data injected from the server
    let campground = null;
    if (window.campgroundJSON) {
      try {
        campground = JSON.parse(window.campgroundJSON);
      } catch (e) {
        console.error('editPickerMap: Failed to parse campgroundJSON', e);
      }
    }

    // Default center and zoom
    let defaultLat = 20, defaultLng = 78, defaultZoom = 5;

    // Try to get coords from campground or form inputs
    let initialLat = defaultLat, initialLng = defaultLng;

    if (campground && campground.geometry && Array.isArray(campground.geometry.coordinates)) {
      initialLng = campground.geometry.coordinates[0];
      initialLat = campground.geometry.coordinates[1];
      defaultZoom = 10;
    } else {
      // Try reading from form inputs
      const latInput = document.getElementById('latitude');
      const lngInput = document.getElementById('longitude');
      if (latInput && latInput.value) initialLat = parseFloat(latInput.value);
      if (lngInput && lngInput.value) initialLng = parseFloat(lngInput.value);
    }

    // Create map
    const pickerMap = L.map('pickerMapEdit').setView([initialLat, initialLng], defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(pickerMap);

    let marker = null;

    // If we have initial coords, place marker
    if (!Number.isNaN(initialLat) && !Number.isNaN(initialLng)) {
      marker = L.marker([initialLat, initialLng]).addTo(pickerMap);
    }

    // On map click, update inputs and move marker
    pickerMap.on('click', function(e) {
      const lat = e.latlng.lat.toFixed(6);
      const lng = e.latlng.lng.toFixed(6);
      document.getElementById('latitude').value = lat;
      document.getElementById('longitude').value = lng;
      if (marker) marker.setLatLng(e.latlng);
      else marker = L.marker(e.latlng).addTo(pickerMap);
    });

    // If inputs change manually, move marker
    function setMarkerFromInputs() {
      const latVal = parseFloat(document.getElementById('latitude').value);
      const lngVal = parseFloat(document.getElementById('longitude').value);
      if (!Number.isNaN(latVal) && !Number.isNaN(lngVal)) {
        const latlng = L.latLng(latVal, lngVal);
        if (marker) marker.setLatLng(latlng);
        else marker = L.marker(latlng).addTo(pickerMap);
        pickerMap.setView(latlng, 10);
      }
    }
    document.getElementById('latitude').addEventListener('change', setMarkerFromInputs);
    document.getElementById('longitude').addEventListener('change', setMarkerFromInputs);

  } catch (err) {
    console.error('editPickerMap error:', err);
  }
});
