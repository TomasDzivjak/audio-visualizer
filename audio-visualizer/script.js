const canvas = document.getElementById("visualizerCanvas");
const ctx = canvas.getContext("2d");

const audio = document.getElementById("audio");
const audioFile = document.getElementById("audioFile");
const logoFile = document.getElementById("logoFile");
const bgFile = document.getElementById("bgFile");

const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");

const artistInput = document.getElementById("artistInput");
const trackInput = document.getElementById("trackInput");
const artistName = document.getElementById("artistName");
const trackName = document.getElementById("trackName");

const primaryColor = document.getElementById("primaryColor");
const secondaryColor = document.getElementById("secondaryColor");
const bassBoostSlider = document.getElementById("bassBoost");
const particleCountSlider = document.getElementById("particleCount");
const rainbowMode = document.getElementById("rainbowMode");
const glowMode = document.getElementById("glowMode");

const centerDisc = document.getElementById("centerDisc");
const centerLogo = document.getElementById("centerLogo");

let width, height, cx, cy;
let audioContext, analyser, source, dataArray;
let particles = [];
let animationId = null;
let hueShift = 0;

const DEFAULT_LOGO_SIZE = 280;

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  cx = width / 2;
  cy = height / 2;
}


function applyDefaultLogoSize() {
  centerDisc.style.width = `${DEFAULT_LOGO_SIZE}px`;
  centerDisc.style.height = `${DEFAULT_LOGO_SIZE}px`;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
applyDefaultLogoSize();


window.addEventListener("resize", resizeCanvas);
resizeCanvas();

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
applyDefaultLogoSize();


function createParticles(count) {
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.1 + 0.3,
      speedX: (Math.random() - 0.5) * 0.8,
      speedY: (Math.random() - 0.5) * 0.8,
      alpha: Math.random() * 0.6 + 0.2
    });
  }
}
createParticles(parseInt(particleCountSlider.value));

particleCountSlider.addEventListener("input", () => {
  createParticles(parseInt(particleCountSlider.value));
});

artistInput.addEventListener("input", () => {
  artistName.textContent = artistInput.value || "Unknown Artist";
});

trackInput.addEventListener("input", () => {
  trackName.textContent = trackInput.value || "Unknown Track";
});

function setupAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;

    source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
  }
}

audioFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const objectURL = URL.createObjectURL(file);
  audio.src = objectURL;

  const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
  if (!trackInput.value) {
    trackInput.value = nameWithoutExtension;
    trackName.textContent = nameWithoutExtension;
  }
});

logoFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  centerLogo.src = URL.createObjectURL(file);
});

bgFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  document.body.style.backgroundImage = `url('${URL.createObjectURL(file)}')`;
});

playBtn.addEventListener("click", async () => {
  if (!audio.src) {
    alert("Najprv nahraj MP3 súbor.");
    return;
  }

  setupAudio();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  audio.play();
  if (!animationId) animate();
});

pauseBtn.addEventListener("click", () => {
  audio.pause();
});


function applyDefaultLogoSize() {
  centerDisc.style.width = `${DEFAULT_LOGO_SIZE}px`;
  centerDisc.style.height = `${DEFAULT_LOGO_SIZE}px`;
}


function getAverageFrequency(start, end) {
  let sum = 0;
  let count = 0;
  for (let i = start; i < end; i++) {
    sum += dataArray[i];
    count++;
  }
  return count ? sum / count : 0;
}

function drawParticles(bassEnergy) {
  for (const p of particles) {
    p.x += p.speedX * (1 + bassEnergy * 0.01);
    p.y += p.speedY * (1 + bassEnergy * 0.01);

    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;

    const sizeBoost = bassEnergy * 0.0075;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size + sizeBoost, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
    ctx.fill();
  }
}

function drawRing(bassEnergy, midEnergy, trebleEnergy) {
  const logoRadius = centerDisc.offsetWidth / 2;
  const baseRadius = logoRadius + 8;
  const points = 140;
  const boost = parseInt(bassBoostSlider.value) / 100;
  const time = performance.now() * 0.0025;

  const amplitudes = [];

  for (let i = 0; i <= points; i++) {
    const t = i / points; // 0..1

    const freqIndex = Math.floor(t * (dataArray.length * 0.45));
    const freq = dataArray[freqIndex] / 255;

    // po otočení o 90° chceme väčší "výdych" hore a dole,
    // menší v strede po bokoch
    const verticalEmphasis = Math.pow(Math.sin(t * Math.PI), 0.65);
    const shapeBias = 0.35 + verticalEmphasis * 0.9;

    const amp =
      freq * 75 * boost * shapeBias +
      bassEnergy * 0.11 * shapeBias +
      midEnergy * 0.03 +
      Math.sin(time + t * 10) * 1.5;

    amplitudes.push(Math.max(0, amp));
  }

  const leftPoints = [];
  const rightPoints = [];

  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const y = cy - baseRadius + t * (baseRadius * 2);
    const normalized = (y - cy) / baseRadius; // -1 .. 1

    const circleX = Math.sqrt(Math.max(0, 1 - normalized * normalized)) * baseRadius;
    const amp = amplitudes[i];

    leftPoints.push({
      x: cx - circleX - amp,
      y
    });

    rightPoints.push({
      x: cx + circleX + amp,
      y
    });
  }

  ctx.save();
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (rainbowMode.checked) {
    const gradient = ctx.createLinearGradient(cx, cy - baseRadius * 1.4, cx, cy + baseRadius * 1.4);
    gradient.addColorStop(0.00, "#00f0ff");
    gradient.addColorStop(0.18, "#00ff95");
    gradient.addColorStop(0.38, "#ffe600");
    gradient.addColorStop(0.55, "#ff5a36");
    gradient.addColorStop(0.74, "#ff3bd4");
    gradient.addColorStop(1.00, "#7a5cff");
    ctx.strokeStyle = gradient;
    ctx.shadowColor = "#ffffff";
  } else {
    const gradient = ctx.createLinearGradient(cx, cy - baseRadius, cx, cy + baseRadius);
    gradient.addColorStop(0, primaryColor.value);
    gradient.addColorStop(1, secondaryColor.value);
    ctx.strokeStyle = gradient;
    ctx.shadowColor = primaryColor.value;
  }

  ctx.shadowBlur = glowMode.checked ? 22 + bassEnergy * 0.18 : 0;

  // left half
  ctx.beginPath();
  ctx.moveTo(leftPoints[0].x, leftPoints[0].y);
  for (let i = 1; i < leftPoints.length - 2; i++) {
    const xc = (leftPoints[i].x + leftPoints[i + 1].x) / 2;
    const yc = (leftPoints[i].y + leftPoints[i + 1].y) / 2;
    ctx.quadraticCurveTo(leftPoints[i].x, leftPoints[i].y, xc, yc);
  }
  ctx.quadraticCurveTo(
    leftPoints[leftPoints.length - 2].x,
    leftPoints[leftPoints.length - 2].y,
    leftPoints[leftPoints.length - 1].x,
    leftPoints[leftPoints.length - 1].y
  );
  ctx.stroke();

  // right half - mirror
  ctx.beginPath();
  ctx.moveTo(rightPoints[0].x, rightPoints[0].y);
  for (let i = 1; i < rightPoints.length - 2; i++) {
    const xc = (rightPoints[i].x + rightPoints[i + 1].x) / 2;
    const yc = (rightPoints[i].y + rightPoints[i + 1].y) / 2;
    ctx.quadraticCurveTo(rightPoints[i].x, rightPoints[i].y, xc, yc);
  }
  ctx.quadraticCurveTo(
    rightPoints[rightPoints.length - 2].x,
    rightPoints[rightPoints.length - 2].y,
    rightPoints[rightPoints.length - 1].x,
    rightPoints[rightPoints.length - 1].y
  );
  ctx.stroke();

  ctx.restore();
}

/* function drawInnerGlow(bassEnergy) {
  const radius = parseInt(circleSizeSlider.value) / 2 + 10;
  const glow = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 1.7);
  glow.addColorStop(0, "rgba(255,255,255,0)");
  glow.addColorStop(0.5, "rgba(255,255,255,0.03)");
  glow.addColorStop(1, `rgba(255,255,255,${0.06 + bassEnergy / 2000})`);

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.8, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();
}
 */
function animate() {
  animationId = requestAnimationFrame(animate);

  ctx.clearRect(0, 0, width, height);

  if (!analyser) return;

  analyser.getByteFrequencyData(dataArray);

  const bassEnergy = getAverageFrequency(0, 20);
  const midEnergy = getAverageFrequency(20, 80);
  const trebleEnergy = getAverageFrequency(80, 140);

  drawParticles(bassEnergy);
  drawRing(bassEnergy, midEnergy, trebleEnergy);

  const scale = 1 + bassEnergy / 1800;
  centerDisc.style.transform = `translate(-50%, -50%) scale(${scale})`;

  hueShift += 1.2;
}