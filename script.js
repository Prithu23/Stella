// ── CONFIG ────────────────────────────────────────────────
const API_KEY = 'ecmyfaicnzwwdmah';
const BASE_URL = 'http://127.0.0.1:5000';

// ── STAR PARALLAX BACKGROUND ──────────────────────────────
const canvas = document.getElementById('starCanvas');
const ctx = canvas.getContext('2d');

canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  initStars();
});

let mouse  = { x: 0, y: 0 };
let target = { x: 0, y: 0 };

window.addEventListener('mousemove', (e) => {
  target.x = (e.clientX / window.innerWidth)  - 0.5;
  target.y = (e.clientY / window.innerHeight) - 0.5;
});

const layers = [
  { count: 180, strength: 18,  minSize: 0.4, maxSize: 0.9, minOp: 0.3, maxOp: 0.6 },
  { count: 100, strength: 38,  minSize: 0.8, maxSize: 1.4, minOp: 0.5, maxOp: 0.8 },
  { count:  40, strength: 65,  minSize: 1.2, maxSize: 2.2, minOp: 0.7, maxOp: 1.0 },
];

let stars = [];

function initStars() {
  stars = [];
  layers.forEach(layer => {
    for (let i = 0; i < layer.count; i++) {
      stars.push({
        x:             Math.random(),
        y:             Math.random(),
        size:          layer.minSize + Math.random() * (layer.maxSize - layer.minSize),
        opacity:       layer.minOp  + Math.random() * (layer.maxOp  - layer.minOp),
        twinkleSpeed:  0.005 + Math.random() * 0.01,
        twinkleOffset: Math.random() * Math.PI * 2,
        strength:      layer.strength,
      });
    }
  });
}

function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const time = Date.now() * 0.001;
  stars.forEach(star => {
    const ox = mouse.x * star.strength;
    const oy = mouse.y * star.strength;
    const px = star.x * canvas.width  + ox;
    const py = star.y * canvas.height + oy;
    const twinkle = star.opacity * (0.7 + 0.3 * Math.sin(time * star.twinkleSpeed * 60 + star.twinkleOffset));
    ctx.beginPath();
    ctx.arc(px, py, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220, 220, 255, ${twinkle})`;
    ctx.fill();
  });
}

function animate() {
  mouse.x += (target.x - mouse.x) * 0.1;
  mouse.y += (target.y - mouse.y) * 0.1;
  drawStars();
  requestAnimationFrame(animate);
}

initStars();
animate();

// ── IMAGE PREVIEW ─────────────────────────────────────────
let uploadedFile = null;

function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const maxSize = 1000;
      let w = img.width;
      let h = img.height;

      if (w > maxSize || h > maxSize) {
        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
        else { w = (w / h) * maxSize; h = maxSize; }
      }

      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      canvas.toBlob(blob => {
        uploadedFile = new File([blob], 'sky.jpg', { type: 'image/jpeg' });
      }, 'image/jpeg', 0.9);

      document.getElementById('previewImg').src = e.target.result;
      document.getElementById('preview').style.display = 'block';
      document.getElementById('analyzeBtn').style.display = 'inline-block';
      document.getElementById('results').style.display = 'none';
      setStatus('');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── STATUS HELPER ─────────────────────────────────────────
function setStatus(msg, isError = false) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
  el.className = isError ? 'error' : '';
}

// ── LOGIN ─────────────────────────────────────────────────
async function getSession() {
  setStatus('Connecting to Astrometry.net...');

  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: API_KEY })
  });

  const data = await res.json();
  console.log('Login response:', data);

  if (data.status !== 'success') {
    throw new Error('Login failed — check your API key');
  }

  return data.session;
}

// ── UPLOAD IMAGE ──────────────────────────────────────────
async function uploadImage(session) {
  setStatus('Uploading image to Astrometry.net...');

  const formData = new FormData();
  formData.append('session', session);
  formData.append('file', uploadedFile);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  console.log('Upload response:', data);

  if (data.status !== 'success') {
    throw new Error('Image upload failed');
  }

  return data.subid;
}

// ── POLL SUBMISSION ───────────────────────────────────────
async function pollSubmission(subid) {
  setStatus('⏳ Astrometry.net is processing your image...');

  while (true) {
    const res = await fetch(`${BASE_URL}/submissions/${subid}`);
    const data = await res.json();
    console.log('Submission status:', data);

    if (data.jobs && data.jobs.length > 0 && data.jobs[0] !== null) {
      const jobid = data.jobs[0];
      console.log('Job ID:', jobid);
      return jobid;
    }

    await new Promise(r => setTimeout(r, 5000));
  }
}

// ── GET RESULTS ───────────────────────────────────────────
async function getResults(jobid) {
  setStatus('🔍 Fetching star data...');

  while (true) {
    const res = await fetch(`${BASE_URL}/jobs/${jobid}`);
    const data = await res.json();
    console.log('Job status:', data);

    if (data.status === 'success') break;
    if (data.status === 'failure') throw new Error('Astrometry.net could not solve this image');

    await new Promise(r => setTimeout(r, 5000));
  }

  const res = await fetch(`${BASE_URL}/jobs/${jobid}/info`);
  const info = await res.json();
  console.log('Results:', info);
  return info;
}

// ── DISPLAY RESULTS ───────────────────────────────────────
function displayResults(data) {
  const constellations = [];
  const stars = [];
  const seen = new Set();

  data.objects_in_field.forEach(item => {
    const clean = item.trim();
    if (!clean || seen.has(clean)) return;

    if (clean.startsWith('Part of the constellation')) {
      const name = clean.replace('Part of the constellation ', '');
      if (!seen.has(name)) { constellations.push(name); seen.add(name); }
    } else if (clean.startsWith('The star')) {
      const name = clean.replace('The star ', '');
      if (!seen.has(name)) { stars.push(name); seen.add(name); }
    }
  });

  document.getElementById('constellationTags').innerHTML = constellations.map(c =>
    `<span class="tag constellation">⭐ ${c}</span>`
  ).join('');

  document.getElementById('starTags').innerHTML = stars.map(s =>
    `<span class="tag">${s}</span>`
  ).join('');

  const cal = data.calibration;
  document.getElementById('calibrationData').innerHTML = `
    <div class="cal-item"><span>Right Ascension</span><strong>${cal.ra.toFixed(4)}°</strong></div>
    <div class="cal-item"><span>Declination</span><strong>${cal.dec.toFixed(4)}°</strong></div>
    <div class="cal-item"><span>Radius</span><strong>${cal.radius.toFixed(2)}°</strong></div>
  `;

  document.getElementById('results').style.display = 'block';
  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── ANALYZE BUTTON ────────────────────────────────────────
async function analyze() {
  if (!uploadedFile) return;

  try {
    document.getElementById('analyzeBtn').disabled = true;

    const session = await getSession();
    const subid = await uploadImage(session);
    console.log('Submission ID:', subid);

    const jobid = await pollSubmission(subid);
    const results = await getResults(jobid);

    console.log('Final results:', results);
    setStatus('✦ Stars identified!');
    displayResults(results);

  } catch (err) {
    setStatus(err.message, true);
  } finally {
    document.getElementById('analyzeBtn').disabled = false;
  }
}