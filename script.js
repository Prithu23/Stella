// ── CONFIG ────────────────────────────────────────────────
const API_KEY = 'ecmyfaicnzwwdmah';
const BASE_URL = 'https://corsproxy.io/?https://nova.astrometry.net/api';

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
  uploadedFile = file;
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('previewImg').src = e.target.result;
    document.getElementById('preview').style.display = 'block';
    document.getElementById('analyzeBtn').style.display = 'inline-block';
    setStatus('');
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

// ── STEP 1: Login → get session key ──────────────────────
async function getSession() {
  setStatus('Connecting to Astrometry.net...');

  const formData = new FormData();
  formData.append('request-json', JSON.stringify({ apikey: API_KEY }));

  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  console.log('Login response:', data);

  if (data.status !== 'success') {
    throw new Error('Login failed — check your API key');
  }

  return data.session;
}

// ── ANALYZE BUTTON ────────────────────────────────────────
async function analyze() {
  if (!uploadedFile) return;

  try {
    document.getElementById('analyzeBtn').disabled = true;

    const session = await getSession();
    console.log('Session key:', session);
    setStatus('✦ Connected! Session key received.');

  } catch (err) {
    setStatus(err.message, true);
  } finally {
    document.getElementById('analyzeBtn').disabled = false;
  }
}