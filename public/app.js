/* ═══════════════════════════════════════════════════════
   CivicNavigator AI — Frontend Application Logic
═══════════════════════════════════════════════════════ */
'use strict';

// ── State ─────────────────────────────────────────────
const state = {
  map: null,
  markers: [],
  directionsService: null,
  directionsRenderer: null,
  trafficLayer: null,
  trafficOn: false,
  userLocation: null,
  selectedPlace: null,
  chatHistory: [],
  isLoading: false,
  mapsApiKey: '',
  lastFocus: null,
};

// ── DOM refs ──────────────────────────────────────────
const $ = id => document.getElementById(id);
const chatMessages  = $('chat-messages');
const chatInput     = $('chat-input');
const sendBtn       = $('send-btn');
const chatForm      = $('chat-form');
const locationInput = $('location-input');
const statusDot     = $('status-dot');
const statusLabel   = $('status-label');
const suggestionsRow = $('suggestions-row');
const placeCard     = $('place-card');
const mapLoading    = $('map-loading');
const electionBanner = $('election-banner');
const electionBannerText = $('election-banner-text');

// ── Initialise ────────────────────────────────────────
async function init() {
  setupInputAutoResize();
  setupEventListeners();
  showWelcomeMessage();

  try {
    // Fetch public config (Maps API key) from backend
    const cfg = await fetch('/api/config').then(r => r.json());
    state.mapsApiKey = cfg.mapsApiKey;

    // Load Google Maps script dynamically
    if (state.mapsApiKey) {
      await loadGoogleMaps(state.mapsApiKey);
    } else {
      showToast('Google Maps API key missing — map disabled.', 'error');
      mapLoading.innerHTML = '<p style="color:#ff4757">Map unavailable. Set GOOGLE_MAPS_API_KEY.</p>';
    }

    // Health check → set status
    const health = await fetch('/health').then(r => r.json());
    setStatus(health.services.gemini ? 'online' : 'error',
              health.services.gemini ? 'AI Ready' : 'Gemini key missing');

    // Load upcoming election info
    loadElectionBanner();
  } catch (err) {
    console.error('Init error:', err);
    setStatus('error', 'Connection failed');
  }
}

// ── Google Maps ───────────────────────────────────────
function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    window.initGoogleMap = () => {
      initMap();
      resolve();
    };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMap`;
    s.async = true; s.defer = true;
    s.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(s);
  });
}

function initMap() {
  const mapEl = $('map');

  state.map = new google.maps.Map(mapEl, {
    center: { lat: 39.8283, lng: -98.5795 }, // Contiguous US center
    zoom: 4,
    disableDefaultUI: true,
    zoomControl: true,
    zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
    styles: darkMapStyles(),
    gestureHandling: 'greedy',
  });

  state.directionsService = new google.maps.DirectionsService();
  state.directionsRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: false,
    polylineOptions: { strokeColor: '#4f7ef8', strokeWeight: 5, strokeOpacity: 0.85 },
  });
  state.directionsRenderer.setMap(state.map);

  state.trafficLayer = new google.maps.TrafficLayer();

  mapLoading.style.display = 'none';

  // Try geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        state.userLocation = { lat, lng };
        state.map.setCenter({ lat, lng });
        state.map.setZoom(11);
        addUserMarker({ lat, lng });
        reverseGeocode(lat, lng);
      },
      () => {} // silent fail
    );
  }
}

function addUserMarker(pos) {
  new google.maps.Marker({
    position: pos,
    map: state.map,
    title: 'Your Location',
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: '#10d06e',
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 2,
    },
  });
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${state.mapsApiKey}`);
    const data = await res.json();
    const addr = data?.results?.[0]?.formatted_address;
    if (addr && locationInput) {
      locationInput.value = addr;
      state.userLocation.address = addr;
    }
  } catch {}
}

// ── Polling Place Search ──────────────────────────────
async function findPollingPlaces() {
  const address = locationInput.value.trim();
  if (!address && !state.userLocation) {
    showToast('Please enter your address first.', 'error');
    locationInput.focus();
    return;
  }

  clearMapMarkers();
  showToast('Searching for polling places…');

  try {
    const body = address
      ? { address }
      : { lat: state.userLocation.lat, lng: state.userLocation.lng };

    const res = await fetch('/api/polling-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!data.places || data.places.length === 0) {
      showToast('No polling places found nearby.', 'error');
      return;
    }

    // Fit bounds to all markers
    const bounds = new google.maps.LatLngBounds();
    if (state.userLocation) bounds.extend(state.userLocation);

    data.places.places.forEach((place, i) => {
      if (!place.lat || !place.lng) return;
      const pos = { lat: place.lat, lng: place.lng };
      bounds.extend(pos);

      const marker = new google.maps.Marker({
        position: pos,
        map: state.map,
        title: place.name,
        animation: google.maps.Animation.DROP,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pollingMarkerSVG(i + 1))}`,
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 36),
        },
      });

      marker.addListener('click', () => showPlaceCard(place, marker));
      state.markers.push(marker);
    });

    state.map.fitBounds(bounds, { padding: 60 });
    showToast(`Found ${data.places.places.length} civic locations nearby.`, 'success');

    // Chat message summarising results
    const summary = data.places.places.slice(0, 3)
      .map((p, i) => `${i+1}. **${p.name}** — ${p.distance || 'nearby'}${p.duration ? ` (${p.duration} drive)` : ''}`)
      .join('\n');
    addBotMessage(`📍 **Nearest civic/polling locations:**\n\n${summary}\n\nClick any pin on the map for details and directions.`);
  } catch (err) {
    console.error(err);
    showToast('Error searching for polling places.', 'error');
  }
}

function clearMapMarkers() {
  state.markers.forEach(m => m.setMap(null));
  state.markers = [];
  state.directionsRenderer?.setDirections({ routes: [] });
  placeCard.hidden = true;
}

function showPlaceCard(place, marker) {
  state.selectedPlace = place;
  $('place-card-icon').textContent = placeIcon(place.icon);
  $('place-card-name').textContent = place.name;
  $('place-card-addr').textContent = place.address || 'Address unavailable';

  const meta = $('place-card-meta');
  meta.innerHTML = '';
  if (place.distance) meta.innerHTML += `<span class="meta-badge">📏 ${place.distance}</span>`;
  if (place.duration) meta.innerHTML += `<span class="meta-badge">🕒 ${place.duration}</span>`;
  if (place.openNow === true) meta.innerHTML += `<span class="meta-badge open">✅ Open</span>`;
  if (place.openNow === false) meta.innerHTML += `<span class="meta-badge closed">🔴 Closed</span>`;

  placeCard.hidden = false;
  
  // Accessibility: Manage focus
  state.lastFocus = document.activeElement;
  placeCard.focus();

  if (marker) {
    state.map.panTo(marker.getPosition());
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => marker.setAnimation(null), 1400);
  }
}

// ── Directions ────────────────────────────────────────
function getDirectionsToSelected() {
  const place = state.selectedPlace;
  if (!place) return;

  const origin = state.userLocation || locationInput.value;
  if (!origin) { showToast('Enable location or enter your address.', 'error'); return; }

  const dest = { lat: place.lat, lng: place.lng };

  state.directionsService.route(
    { origin, destination: dest, travelMode: google.maps.TravelMode.DRIVING },
    (result, status) => {
      if (status === 'OK') {
        state.directionsRenderer.setDirections(result);
        const leg = result.routes[0].legs[0];
        addBotMessage(`🗺️ Route to **${place.name}**:\n• Distance: ${leg.distance.text}\n• Estimated time: ${leg.duration.text}\n\nDrive safely and remember to bring your voter ID! 🗳️`);
        placeCard.hidden = true;
      } else {
        showToast('Could not calculate route.', 'error');
      }
    }
  );
}

// ── Chat ──────────────────────────────────────────────
function showWelcomeMessage() {
  addBotMessage(
    `👋 **Welcome to CivicNavigator AI!**\n\nI'm your nonpartisan election assistant, powered by Google Gemini. I can help you:\n\n🏫 Find your **polling place**\n📋 Guide you through **voter registration**\n📅 Check upcoming **election dates**\n🪪 Explain **voter ID requirements**\n📬 Set up **absentee/mail voting**\n⚖️ Know your **voting rights**\n\nEnter your address above to get personalised guidance, or tap a quick action to get started!`,
    false // no animation delay
  );
}

async function sendMessage(text) {
  if (state.isLoading || !text.trim()) return;
  text = text.trim();

  addUserMessage(text);
  state.chatHistory.push({ role: 'user', text });
  setSuggestions([]);
  setLoading(true);

  try {
    const location = state.userLocation
      ? { ...state.userLocation, address: locationInput.value }
      : locationInput.value
        ? { address: locationInput.value }
        : null;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        location,
        history: state.chatHistory.slice(-8),
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    addBotMessage(data.reply);
    state.chatHistory.push({ role: 'model', text: data.reply });

    if (data.suggestions?.length) setSuggestions(data.suggestions);

    // Auto-trigger map search if intent is polling
    if (data.intent === 'polling_location') {
      setTimeout(findPollingPlaces, 600);
    }
  } catch (err) {
    console.error(err);
    addBotMessage(`⚠️ Sorry, I encountered an error: ${err.message}\n\nPlease check the server is running and API keys are configured.`);
  } finally {
    setLoading(false);
  }
}

// ── Message Rendering ─────────────────────────────────
function addUserMessage(text) {
  const el = createMsgEl('user', text);
  chatMessages.appendChild(el);
  scrollChat();
}

function addBotMessage(text, animate = true) {
  const el = createMsgEl('bot', formatMarkdown(text));
  if (!animate) el.style.animationDuration = '0s';
  chatMessages.appendChild(el);
  scrollChat();
}

function createMsgEl(type, htmlContent) {
  const wrap = document.createElement('div');
  wrap.className = `msg ${type}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = type === 'bot' ? '🗳️' : '👤';

  const content = document.createElement('div');
  content.className = 'msg-content';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = htmlContent;

  const time = document.createElement('span');
  time.className = 'msg-time';
  time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  content.appendChild(bubble);
  content.appendChild(time);
  wrap.appendChild(avatar);
  wrap.appendChild(content);
  return wrap;
}

function showTypingIndicator() {
  const el = document.createElement('div');
  el.className = 'msg bot'; el.id = 'typing-indicator';
  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar'; avatar.textContent = '🗳️';
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
  el.appendChild(avatar); el.appendChild(bubble);
  chatMessages.appendChild(el);
  scrollChat();
}

function removeTypingIndicator() {
  $('typing-indicator')?.remove();
}

// ── Markdown formatting ───────────────────────────────
function formatMarkdown(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') // escape HTML
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

// ── Suggestions ───────────────────────────────────────
function setSuggestions(list) {
  suggestionsRow.innerHTML = '';
  list.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'suggestion-chip';
    btn.textContent = s;
    btn.addEventListener('click', () => {
      chatInput.value = s;
      chatForm.dispatchEvent(new Event('submit'));
    });
    suggestionsRow.appendChild(btn);
  });
}

// ── Helpers ───────────────────────────────────────────
function setLoading(on) {
  state.isLoading = on;
  sendBtn.disabled = on || !chatInput.value.trim();
  if (on) showTypingIndicator();
  else removeTypingIndicator();
}

function setStatus(type, label) {
  statusDot.className = `status-dot ${type}`;
  statusLabel.textContent = label;
}

function scrollChat() {
  requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function showToast(msg, type = '') {
  const toast = $('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.className = 'toast', 3200);
}

function setupInputAutoResize() {
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    sendBtn.disabled = !chatInput.value.trim() || state.isLoading;
  });
}

function placeIcon(type) {
  const icons = { library: '📚', school: '🏫', government: '🏛️', community: '🏢', polling: '🗳️' };
  return icons[type] || '📍';
}

function pollingMarkerSVG(num) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="42" viewBox="0 0 36 42">
    <ellipse cx="18" cy="40" rx="6" ry="2" fill="rgba(0,0,0,0.3)"/>
    <path d="M18 0C10.3 0 4 6.3 4 14c0 10.5 14 28 14 28S32 24.5 32 14C32 6.3 25.7 0 18 0z" fill="#4f7ef8"/>
    <circle cx="18" cy="14" r="9" fill="white"/>
    <text x="18" y="18.5" text-anchor="middle" font-size="10" font-weight="700" fill="#1e3a8a" font-family="Arial">${num}</text>
  </svg>`;
}

async function loadElectionBanner() {
  try {
    const res = await fetch('/api/elections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: 'United States' }),
    });
    const data = await res.json();
    if (data.elections?.length) {
      const next = data.elections[0];
      electionBannerText.textContent = `Next: ${next.name} — ${next.formattedDate}`;
    } else {
      electionBannerText.textContent = 'Visit vote.gov for upcoming election dates in your area';
    }
  } catch {
    electionBannerText.textContent = 'Visit vote.gov for upcoming election dates in your area';
  }
}

function darkMapStyles() {
  return [
    { elementType: 'geometry', stylers: [{ color: '#0d1b2e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1b2e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b7fa3' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2744' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0d1b2e' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1e3a8a' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#4f7ef8' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3a5278' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#111f38' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0c1e2e' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#12253c' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1a2744' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#8b9fc0' }] },
    { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#4f7ef8' }] },
  ];
}

// ── Event Listeners ───────────────────────────────────
function setupEventListeners() {
  // Chat form submit
  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text || state.isLoading) return;
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;
    sendMessage(text);
  });

  // Enter key (Shift+Enter = newline)
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  });

  // Quick action buttons
  document.querySelectorAll('.qa-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.dataset.query;
      chatInput.value = query;
      sendBtn.disabled = false;
      chatForm.dispatchEvent(new Event('submit'));
    });
  });

  // Detect location
  $('detect-location-btn').addEventListener('click', () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported.', 'error'); return; }
    showToast('Detecting your location…');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        state.userLocation = { lat, lng };
        if (state.map) {
          state.map.setCenter({ lat, lng });
          state.map.setZoom(11);
          addUserMarker({ lat, lng });
        }
        reverseGeocode(lat, lng);
        showToast('Location detected!', 'success');
      },
      () => showToast('Location access denied.', 'error')
    );
  });

  // Map controls
  $('find-polling-map-btn').addEventListener('click', findPollingPlaces);

  $('toggle-traffic-btn').addEventListener('click', () => {
    if (!state.map || !state.trafficLayer) return;
    state.trafficOn = !state.trafficOn;
    state.trafficLayer.setMap(state.trafficOn ? state.map : null);
    $('toggle-traffic-btn').classList.toggle('active', state.trafficOn);
    showToast(state.trafficOn ? 'Traffic layer enabled' : 'Traffic layer disabled');
  });

  $('reset-map-btn').addEventListener('click', () => {
    clearMapMarkers();
    if (state.map) {
      state.map.setCenter(state.userLocation || { lat: 39.8283, lng: -98.5795 });
      state.map.setZoom(state.userLocation ? 11 : 4);
    }
    showToast('Map reset');
  });

  // Place card
  $('place-card-close').addEventListener('click', () => { 
    placeCard.hidden = true; 
    if (state.lastFocus) state.lastFocus.focus();
  });
  $('place-card-directions').addEventListener('click', getDirectionsToSelected);
}

// ── Boot ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
