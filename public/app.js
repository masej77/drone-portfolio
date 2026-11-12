const WAYPOINTS = {
  overview: {
    id: 'overview',
    label: 'SECTOR OVERVIEW',
    pinX: 50,
    pinY: 50,
    scale: 1.0,
    altitude: 120.0,
    gimbal: -75,
    coords: '56.1629° N, 10.2039° E'
  },
  about: {
    id: 'about',
    label: 'WP-01 // HILLSIDE STUDIO',
    pinX: 50.5,
    pinY: 49.5,
    scale: 2.55,
    altitude: 32.0,
    gimbal: -86,
    coords: '56.1629° N, 10.2039° E'
  },
  services: {
    id: 'services',
    label: 'WP-02 // WIND TURBINE RIDGE',
    pinX: 73.5,
    pinY: 21.5,
    scale: 2.45,
    altitude: 45.0,
    gimbal: -82,
    coords: '56.1784° N, 10.2310° E'
  },
  contact: {
    id: 'contact',
    label: 'WP-03 // HARBOR LANDING ZONE',
    pinX: 81.5,
    pinY: 63.5,
    scale: 2.6,
    altitude: 18.0,
    gimbal: -90,
    coords: '56.1492° N, 10.2418° E'
  }
};

const ORDER = ['overview', 'about', 'services', 'contact'];

let currentKey = 'overview';
let currentAltitude = 120.0;
let targetAltitude = 120.0;
let currentAirspeed = 0.2;
let transitBoost = 0;

// Mouse parallax target
let pointerX = 0;
let pointerY = 0;
let smoothPointerX = 0;
let smoothPointerY = 0;

const cameraEl = document.getElementById('drone-camera');
const hoverRigEl = document.getElementById('drone-hover-rig');
const reticleEl = document.getElementById('hud-center-reticle');

const altEl = document.getElementById('telemetry-alt');
const spdEl = document.getElementById('telemetry-spd');
const gimbalEl = document.getElementById('telemetry-gimbal');
const dbEl = document.getElementById('telemetry-db');
const activeTargetEl = document.getElementById('hud-active-target');
const coordsEl = document.getElementById('hud-coords');

function computeCameraTransform(wp) {
  if (wp.id === 'overview') {
    return {
      tx: 0,
      ty: 0,
      scale: 1.0,
      reticleX: 50,
      reticleY: 50
    };
  }

  const isMobile = window.innerWidth <= 680;
  // Frame the zoomed-in landmark on the right side of the screen on desktop
  // (or upper area on mobile) so the left HUD panel never obscures the subject!
  const screenX = isMobile ? 50 : 66;
  const screenY = isMobile ? 24 : 50;

  const s = wp.scale;
  let tx = (screenX - 50) - (wp.pinX - 50) * s;
  let ty = (screenY - 50) - (wp.pinY - 50) * s;

  // Clamp translation so we never expose the edge of the world canvas
  const maxOffset = (s * 1.08 - 1) * 50;
  tx = Math.max(-maxOffset, Math.min(maxOffset, tx));
  ty = Math.max(-maxOffset, Math.min(maxOffset, ty));

  return {
    tx,
    ty,
    scale: s,
    reticleX: screenX,
    reticleY: screenY
  };
}

function flyToWaypoint(key) {
  const wp = WAYPOINTS[key];
  if (!wp) return;

  const prevKey = currentKey;
  currentKey = key;
  targetAltitude = wp.altitude;

  if (prevKey !== key) {
    transitBoost = 15.6;
    cameraEl.classList.add('is-flying');
    setTimeout(() => cameraEl.classList.remove('is-flying'), 1100);
  }

  const { tx, ty, scale, reticleX, reticleY } = computeCameraTransform(wp);

  cameraEl.style.transform = `translate3d(${tx.toFixed(2)}%, ${ty.toFixed(2)}%, 0) scale(${scale})`;
  cameraEl.classList.toggle('is-zoomed', key !== 'overview');

  // Move optical target reticle to lock onto the zoomed landmark
  if (reticleEl) {
    reticleEl.style.left = `${reticleX}%`;
    reticleEl.style.top = `${reticleY}%`;
    reticleEl.classList.toggle('is-locked', key !== 'overview');
  }

  // Update HUD text
  if (gimbalEl) gimbalEl.textContent = `${wp.gimbal}°`;
  if (activeTargetEl) activeTargetEl.textContent = wp.label;
  if (coordsEl) coordsEl.textContent = wp.coords;

  // Update active navigation buttons
  document.querySelectorAll('.hud-nav-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.target === key);
  });

  // Update active ground pins
  document.querySelectorAll('.ground-pin').forEach((pin) => {
    pin.classList.toggle('is-active', pin.dataset.target === key);
  });

  // Update active stage panel
  document.querySelectorAll('.stage-panel').forEach((panel) => {
    panel.classList.toggle('is-active', panel.id === `panel-${key}`);
  });
}

// Continuous organic drone hover animation & telemetry interpolation
function animateDroneLoop(now) {
  const t = now * 0.001;

  // Smooth mouse parallax
  smoothPointerX += (pointerX - smoothPointerX) * 0.05;
  smoothPointerY += (pointerY - smoothPointerY) * 0.05;

  // Organic multi-sine hover sway simulating stabilized drone in coastal wind
  const hoverX = Math.sin(t * 0.65) * 6 + Math.cos(t * 1.1) * 3 + smoothPointerX * -14;
  const hoverY = Math.cos(t * 0.55) * 5 + Math.sin(t * 0.95) * 2.5 + smoothPointerY * -10;
  const rollDeg = Math.sin(t * 0.5) * 0.45 + smoothPointerX * -0.8;

  if (hoverRigEl) {
    hoverRigEl.style.transform = `translate3d(${hoverX.toFixed(2)}px, ${hoverY.toFixed(2)}px, 0) rotateZ(${rollDeg.toFixed(3)}deg)`;
  }

  // Interpolate live altitude & airspeed in the HUD
  currentAltitude += (targetAltitude - currentAltitude) * 0.07;
  transitBoost *= 0.92;
  const microWindSpeed = 0.2 + Math.abs(Math.sin(t * 0.8)) * 0.3;
  currentAirspeed = microWindSpeed + transitBoost;

  if (altEl) altEl.textContent = `${currentAltitude.toFixed(1)} m`;
  if (spdEl) spdEl.textContent = `${currentAirspeed.toFixed(1)} m/s`;

  requestAnimationFrame(animateDroneLoop);
}

// Event Listeners for Navigation
document.querySelectorAll('[data-target]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    flyToWaypoint(el.dataset.target);
  });
});

document.querySelectorAll('[data-goto]').forEach((el) => {
  el.addEventListener('click', () => {
    flyToWaypoint(el.dataset.goto);
  });
});

const brandHomeBtn = document.getElementById('brand-home-btn');
if (brandHomeBtn) {
  brandHomeBtn.addEventListener('click', () => flyToWaypoint('overview'));
  brandHomeBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      flyToWaypoint('overview');
    }
  });
}

// Click on open background when zoomed in returns to 120m overview
document.getElementById('drone-viewport').addEventListener('click', (e) => {
  if (currentKey !== 'overview' && !e.target.closest('.ground-pin')) {
    flyToWaypoint('overview');
  }
});

// Mouse Parallax
window.addEventListener('pointermove', (e) => {
  pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
  pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// Recompute camera framing on resize
window.addEventListener('resize', () => {
  flyToWaypoint(currentKey);
});

// Keyboard shortcuts (Escape / 0 -> Overview, 1 -> About, 2 -> Services, 3 -> Contact, Arrows)
window.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
    if (e.key === 'Escape') document.activeElement.blur();
    return;
  }

  if (e.key === 'Escape' || e.key === '0') {
    flyToWaypoint('overview');
  } else if (e.key === '1') {
    flyToWaypoint('about');
  } else if (e.key === '2') {
    flyToWaypoint('services');
  } else if (e.key === '3') {
    flyToWaypoint('contact');
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    const nextIdx = (ORDER.indexOf(currentKey) + 1) % ORDER.length;
    flyToWaypoint(ORDER[nextIdx]);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    const prevIdx = (ORDER.indexOf(currentKey) - 1 + ORDER.length) % ORDER.length;
    flyToWaypoint(ORDER[prevIdx]);
  }
});

// Scroll wheel flight progression between waypoints
let lastWheelTime = 0;
window.addEventListener(
  'wheel',
  (e) => {
    // Allow normal scrolling inside a panel if its content overflows
    const panel = e.target.closest('.stage-panel');
    if (panel && panel.scrollHeight > panel.clientHeight) {
      return;
    }

    const now = Date.now();
    if (now - lastWheelTime < 950) return;
    if (Math.abs(e.deltaY) < 24) return;

    lastWheelTime = now;
    const dir = e.deltaY > 0 ? 1 : -1;
    const currentIdx = ORDER.indexOf(currentKey);
    const nextIdx = (currentIdx + dir + ORDER.length) % ORDER.length;
    flyToWaypoint(ORDER[nextIdx]);
  },
  { passive: true }
);

// =========================================================
// CLOUDFLARE D1 TELEMETRY & CONTACT FORM INTEGRATION
// =========================================================
async function loadD1Status() {
  const statusTextEl = document.getElementById('d1-status-text');
  const missionCountEl = document.getElementById('d1-mission-count');

  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    if (dbEl) {
      dbEl.textContent = data.ok ? 'ONLINE' : 'STANDBY';
      dbEl.style.color = data.ok ? 'var(--accent-emerald)' : 'var(--accent-amber)';
    }

    if (statusTextEl) {
      statusTextEl.textContent = data.motd
        ? `${data.status} — "${data.motd}"`
        : data.status || 'CLEAR FOR DISPATCH — EASA CERTIFIED';
    }

    if (missionCountEl && typeof data.loggedMissions === 'number') {
      missionCountEl.textContent = `${data.loggedMissions} DISPATCHES LOGGED`;
    }
  } catch {
    if (dbEl) dbEl.textContent = 'LOCAL';
    if (statusTextEl) {
      statusTextEl.textContent = 'CLEAR FOR DISPATCH — EASA A2 / STS CERTIFIED';
    }
  }
}

const contactForm = document.getElementById('contact-form');
const feedbackEl = document.getElementById('form-feedback');
const submitBtn = document.getElementById('btn-submit-contact');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    feedbackEl.className = 'form-feedback';
    feedbackEl.textContent = '';

    const payload = {
      name: document.getElementById('input-name').value.trim(),
      email: document.getElementById('input-email').value.trim(),
      service: document.getElementById('input-service').value,
      location: document.getElementById('input-location').value.trim(),
      message: document.getElementById('input-message').value.trim()
    };

    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'TRANSMITTING TO D1...';

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        feedbackEl.className = 'form-feedback is-visible is-success';
        feedbackEl.textContent = `[${data.missionId}] ${data.message}`;
        contactForm.reset();
        loadD1Status();
      } else {
        throw new Error(data.error || 'Unable to log request.');
      }
    } catch (err) {
      feedbackEl.className = 'form-feedback is-visible is-error';
      feedbackEl.textContent = `TRANSMISSION ERROR: ${err.message}`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// Start drone telemetry loop & fetch initial D1 state
requestAnimationFrame(animateDroneLoop);
loadD1Status();
