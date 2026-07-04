/* Mindful — guided meditation app
 *
 * Voice: Edge TTS (offline pre-generated) OR Kokoro TTS (local open-source, 82M params)
 * Audio assets in /audio/aria/, /audio/guy/, /audio/kokoro-aria/, /audio/kokoro-guy/*.mp3
 * Fallback to browser TTS when a file is missing.
 */

// ——— State ———
const stateText = document.getElementById('stateText');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const musicBtn = document.getElementById('musicBtn');
const ambient = document.getElementById('ambient');
const ambientCalm = document.getElementById('ambient-calm');
const ambientFocus = document.getElementById('ambient-focus');
const ambientSleep = document.getElementById('ambient-sleep');
const ambientGratitude = document.getElementById('ambient-gratitude');
const ambientAir = document.getElementById('ambient-air');
const ambientOcean = document.getElementById('ambient-ocean');
const ambientWind = document.getElementById('ambient-wind');
const ambientNoblesse = document.getElementById('ambient-noblesse');
const ambientFluide = document.getElementById('ambient-fluide');
const ambientDolphin = document.getElementById('ambient-dolphin');
const ambientAbundance = document.getElementById('ambient-abundance');
const ambientKahena = document.getElementById('ambient-kahena');
const ambientEmbrace = document.getElementById('ambient-embrace');
const ambientGlobe = document.getElementById('ambient-globe');
const ambientSoulColors = document.getElementById('ambient-soul-colors');
const allAmbient = [ambient, ambientCalm, ambientFocus, ambientSleep, ambientGratitude, ambientAir, ambientOcean, ambientWind, ambientNoblesse, ambientFluide, ambientDolphin, ambientAbundance, ambientKahena, ambientEmbrace, ambientGlobe, ambientSoulColors];
const musicVolume = document.getElementById('musicVolume');
const musicVolumeVal = document.getElementById('musicVolumeVal');
const voiceSelect = document.getElementById('voiceSelect');
const historyList = document.getElementById('historyList');
const breathingCircle = document.querySelector('.breathing-circle');
const sessionPicker = document.getElementById('sessionPicker');
const themeSelect = document.getElementById('themeSelect');
const bellIntervalSelect = document.getElementById('bellInterval');
const testBellBtn = document.getElementById('testBellBtn');
const patternPicker = document.getElementById('patternPicker');
const breathPicker = document.getElementById('breathPicker');
const voiceVolume = document.getElementById('voiceVolume');
const voiceVolumeVal = document.getElementById('voiceVolumeVal');
const moodRow = document.getElementById('moodRow');
const moodCheckin = document.getElementById('moodCheckin');
const streakBadge = document.getElementById('streakBadge');
const statsSummary = document.getElementById('statsSummary');
const darkModeBtn = document.getElementById('darkModeBtn');
const progressFill = document.getElementById('progressFill');

let selectedMinutes = 5;
let selectedTheme = 'calm';
let audioOn = true;
let running = false;
let sessionTimer = null;
let cueTimer = null;
let sessionStartTime = null;
let currentAudio = null;
let breathSeconds = 7;             // default; restored from localStorage on init
let breathingPattern = 'equal';   // restored from sessionStorage on init
let progressIntervalId = null;     // cleared in endSession
let animationFrameId = null;
let patternPhaseTextLocked = false;
let courseSessionTheme = null;     // original theme for intro-course sessions

// ——— 7-Day Intro Course ———
const COURSE_DAYS = [
  { title: 'Day 1 — Becoming aware', theme: 'calm', minutes: 5 },
  { title: 'Day 2 — Sensing the body', theme: 'bodyscan', minutes: 7 },
  { title: 'Day 3 — Opening the heart', theme: 'metta', minutes: 7 },
  { title: 'Day 4 — Quieting the mind', theme: 'focus', minutes: 7 },
  { title: 'Day 5 — Gratitude', theme: 'gratitude', minutes: 5 },
  { title: 'Day 6 — Rest and release', theme: 'sleep', minutes: 10 },
  { title: 'Day 7 — Sitting freely', theme: 'open', minutes: 10 }
];
const COURSE_KEY = 'mindful.courseDay';

function getCourseDay() {
  const raw = localStorage.getItem(COURSE_KEY);
  const day = raw ? parseInt(raw, 10) : 1;
  return Math.max(1, Math.min(COURSE_DAYS.length, day || 1));
}
function setCourseDay(day) {
  localStorage.setItem(COURSE_KEY, String(Math.max(1, Math.min(COURSE_DAYS.length, day))));
}
function getCourseTheme() {
  return COURSE_DAYS[getCourseDay() - 1].theme;
}
function getCourseMinutes() {
  return COURSE_DAYS[getCourseDay() - 1].minutes;
}
function advanceCourseDay() {
  const next = getCourseDay() + 1;
  if (next > COURSE_DAYS.length) {
    setCourseDay(1);
  } else {
    setCourseDay(next);
  }
}

// ——— Progress bar logic ———
function updateProgress() {
  if (!running || !sessionStartTime) return;
  const totalMs = selectedMinutes * 60 * 1000;
  const elapsed = Date.now() - sessionStartTime;
  const pct = Math.min(100, (elapsed / totalMs) * 100);
  if (progressFill) progressFill.style.width = pct + '%';
}

function startProgressTracking() {
  if (progressFill) progressFill.style.width = '0%';
  updateProgress();
  progressIntervalId = setInterval(updateProgress, 500);
}

function stopProgressTracking() {
  if (progressIntervalId) { clearInterval(progressIntervalId); progressIntervalId = null; }
}

// ——— Bell synthesis (Web Audio API) ———
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function bellFreq(theme, hz) {
  // Use caller-supplied override when given, else derive from theme
  return hz || (432 + (theme.charCodeAt(0) % 7) * 30);
}

function playBell(theme, overrideHz, durationSec) {
  const ctx = getAudioCtx();
  const fundamental = overrideHz || bellFreq(theme);
  const freqs  = [fundamental, fundamental * 2.4, fundamental * 5.95, fundamental * 8.2];
  const gains  = [0.30, 0.12, 0.04, 0.02];

  if (overrideHz === 528 || overrideHz === 432) {
    // session-start bell (432) and end-session bell (528)
    gains[0] = overrideHz === 528 ? 0.33 : 0.30;
  }

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
  masterGain.connect(ctx.destination);

  freqs.forEach((f, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, ctx.currentTime);
    gain.gain.setValueAtTime(gains[i], ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationSec);
  });
}

// ——— Pattern picker ———
function getStoredPattern() {
  const stored = sessionStorage.getItem('mindful.breathPattern');
  return stored || 'equal';
}

function setBreathingPattern(pattern) {
  breathingPattern = pattern;
  sessionStorage.setItem('mindful.breathPattern', pattern);
  patternPicker.querySelectorAll('button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pattern === pattern);
  });
}

function lockPatternPicker() {
  patternPicker.querySelectorAll('button').forEach(b => b.disabled = true);
}

function unlockPatternPicker() {
  patternPicker.querySelectorAll('button').forEach(b => b.disabled = false);
}

patternPicker.addEventListener('click', e => {
  if (running) return;
  const btn = e.target.closest('button');
  if (!btn || btn.disabled) return;
  setBreathingPattern(btn.dataset.pattern);
});

setBreathingPattern(getStoredPattern());

// ——— Breath picker ———
function getStoredBreathPace() {
  const stored = localStorage.getItem('mindful.breathPace');
  return stored ? parseInt(stored, 10) : 7;
}

function setBreathPace(seconds) {
  breathSeconds = seconds;
  localStorage.setItem('mindful.breathPace', seconds);
  // Update animation duration on the circle immediately (idle state)
  const dur = breathSeconds * 2000 + 'ms';
  breathingCircle.style.animationDuration = dur;
  const inner = breathingCircle.querySelector('.inner');
  if (inner) inner.style.animationDuration = dur;
  // Update active button
  breathPicker.querySelectorAll('button').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.seconds, 10) === seconds);
  });
}

function lockBreathPicker() {
  breathPicker.querySelectorAll('button').forEach(b => b.disabled = true);
}

function unlockBreathPicker() {
  breathPicker.querySelectorAll('button').forEach(b => b.disabled = false);
}

breathPicker.addEventListener('click', e => {
  if (running) return;
  const btn = e.target.closest('button');
  if (!btn || btn.disabled) return;
  setBreathPace(parseInt(btn.dataset.seconds, 10));
});

// Restore on page load
setBreathPace(getStoredBreathPace());

// ——— Bell picker & test button ———
testBellBtn.addEventListener('click', () => {
  playBell(selectedTheme, null, 2.5);
});

// ——— Audio playback helper ———
function playAudioFile(relPath) {
  return new Promise((resolve) => {
    if (currentAudio) { try { currentAudio.pause(); } catch (e) {} currentAudio = null; }
    const folder = selectedVoiceFolder();
    const a = new Audio('/mindful/audio/' + folder + '/' + relPath + '.mp3');
    currentAudio = a;
    const v = voiceVolume ? parseInt(voiceVolume.value, 10) / 100 : 1.0;
    a.volume = v;
    a.onended = () => { currentAudio = null; resolve(); };
    a.onerror = () => {
      currentAudio = null;
      // Try fallback to edge_tts packs if Kokoro file fails
      const isKokoro = folder.startsWith('kokoro-');
      if (isKokoro) {
        const fallbackFolder = folder === 'kokoro-aria' ? 'aria' : 'guy';
        const b = new Audio('/mindful/audio/' + fallbackFolder + '/' + relPath + '.mp3');
        currentAudio = b;
        const v = voiceVolume ? parseInt(voiceVolume.value, 10) / 100 : 1.0;
        b.volume = v;
        b.onended = () => { currentAudio = null; resolve(); };
        b.onerror = () => {
          currentAudio = null;
          // Last resort: browser TTS with matching voice gender
          if (speechSynthesis) {
            speechSynthesis.cancel();
            const voices = speechSynthesis.getVoices();
            const wantFemale = folder.includes('aria') || folder === 'kokoro-aria';
            const voice = voices.find(v => wantFemale ? /female|samantha|karen|zira|aria/i.test(v.name) : /male|david|mark|guy/i.test(v.name));
            const u = new SpeechSynthesisUtterance(fallbackText(relPath));
            u.rate = 0.8; u.pitch = 0.85;
            const v = voiceVolume ? parseInt(voiceVolume.value, 10) / 100 : 1.0;
            u.volume = v;
            if (voice) u.voice = voice;
            u.onend = resolve; u.onerror = resolve;
            speechSynthesis.speak(u);
          } else {
            resolve();
          }
        };
        b.play().catch(() => { currentAudio = null; resolve(); });
        return;
      }
      // Edge TTS file failed: try browser TTS with matching gender
      if (speechSynthesis) {
        speechSynthesis.cancel();
        const voices = speechSynthesis.getVoices();
        const wantFemale = !folder || folder === 'aria';
        const voice = voices.find(v => wantFemale ? /female|samantha|karen|zira/i.test(v.name) : /male|david|mark/i.test(v.name));
        const u = new SpeechSynthesisUtterance(fallbackText(relPath));
        u.rate = 0.8; u.pitch = 0.85;
        const v = voiceVolume ? parseInt(voiceVolume.value, 10) / 100 : 1.0;
        u.volume = v;
        if (voice) u.voice = voice;
        u.onend = resolve; u.onerror = resolve;
        speechSynthesis.speak(u);
      } else {
        resolve();
      }
    };
    a.play().catch(() => { currentAudio = null; resolve(); });
  });
}

function fallbackText(relPath) {
  return relPath.replace(/__/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ——— Session picker ———
sessionPicker.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    if (running) return;
    sessionPicker.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMinutes = parseInt(btn.dataset.minutes, 10);
  });
});

themeSelect.addEventListener('change', () => {
  selectedTheme = themeSelect.value;
  if (selectedTheme === 'intro-course') {
    selectedMinutes = getCourseMinutes();
  }
  sessionStorage.removeItem('mindful.themeAutoSuggested');
});

function selectedVoiceFolder() {
  const v = voiceSelect.value;
  if (v === 'guy')   return 'guy';
  if (v === 'kokoro-guy')   return 'kokoro-guy';
  if (v === 'kokoro-aria')  return 'kokoro-aria';
  return 'aria';
}

// ——— Music fade helpers ———
function fadeAmbientIn(targetEl, fromVol, toVol, durationMs) {
  if (!targetEl) return;
  const startTime = Date.now();
  targetEl.volume = fromVol;
  const iv = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    targetEl.volume = fromVol + (toVol - fromVol) * progress;
    if (progress >= 1) {
      clearInterval(iv);
      targetEl.volume = toVol;
    }
  }, 50);
  targetEl.play().catch(() => clearInterval(iv));
}

function fadeAmbientOut(targetEl, durationMs) {
  if (!targetEl) return;
  const startVol = targetEl.volume;
  if (startVol <= 0.001) {
    targetEl.pause();
    targetEl.currentTime = 0;
    return;
  }
  const startTime = Date.now();
  const iv = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    targetEl.volume = startVol * (1 - progress);
    if (progress >= 1) {
      clearInterval(iv);
      targetEl.pause();
      targetEl.currentTime = 0;
      targetEl.volume = startVol;
    }
  }, 50);
}

const TRACK_POOLS = {
  calm: ['ambient-calm', 'ambient-air', 'ambient-embrace', 'ambient'],
  focus: ['ambient-focus', 'ambient-noblesse', 'ambient-wind', 'ambient-globe'],
  sleep: ['ambient-sleep', 'ambient-ocean', 'ambient-dolphin', 'ambient-fluide'],
  gratitude: ['ambient-gratitude', 'ambient-kahena', 'ambient-abundance', 'ambient-soul-colors']
};

// ——— Music toggle ———
function stopAllAmbient() {
  allAmbient.forEach(el => fadeAmbientOut(el, 1500));
}
function startThemeAmbient() {
  const pool = TRACK_POOLS[selectedTheme] || ['ambient'];
  const targetId = pool[Math.floor(Math.random() * pool.length)];
  const target = document.getElementById(targetId);
  if (!target) return;
  const targetVol = parseInt(musicVolume.value, 10) / 100;
  fadeAmbientIn(target, 0, targetVol, 1500);
}

musicBtn.addEventListener('click', () => {
  audioOn = !audioOn;
  musicBtn.textContent = `\u266a Ambient music: ${audioOn ? 'ON' : 'OFF'}`;
  if (!audioOn) stopAllAmbient(); else startThemeAmbient();
});

musicVolume.addEventListener('input', () => {
  const v = parseInt(musicVolume.value, 10) / 100;
  allAmbient.forEach(el => { el.volume = v; });
  musicVolumeVal.textContent = `${musicVolume.value}%`;
});

allAmbient.forEach(el => { el.volume = 0.35; });
musicVolume.value = 35;
musicVolumeVal.textContent = '35%';

if (voiceVolume && voiceVolumeVal) {
  voiceVolumeVal.textContent = voiceVolume.value + '%';
  voiceVolume.addEventListener('input', () => {
    voiceVolumeVal.textContent = voiceVolume.value + '%';
    const v = parseInt(voiceVolume.value, 10) / 100;
    if (currentAudio && currentAudio.volume !== undefined) currentAudio.volume = v;
  });
}

// ——— rAF breathing animation ———
function lerp(a, b, t) { return a + (b - a) * t; }
function EASING(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

function getPatternPhases() {
  const bs = breathSeconds;
  switch (breathingPattern) {
    case 'box':
      return [
        { text: 'Breathe in…', startScale: 1, endScale: 1.5, duration: bs * 1000 },
        { text: 'Hold…', startScale: 1.5, endScale: 1.5, duration: bs * 1000 },
        { text: 'Breathe out…', startScale: 1.5, endScale: 1, duration: bs * 1000 },
        { text: 'Hold…', startScale: 1, endScale: 1, duration: bs * 1000 }
      ];
    case '478':
      return [
        { text: 'Breathe in…', startScale: 1, endScale: 1.5, duration: 4000 },
        { text: 'Hold…', startScale: 1.5, endScale: 1.5, duration: 7000 },
        { text: 'Breathe out…', startScale: 1.5, endScale: 1, duration: 8000 }
      ];
    default:
      return [
        { text: 'Breathe in\u2026', startScale: 1, endScale: 1.15, duration: bs * 1000 },
        { text: 'Breathe out\u2026', startScale: 1.15, endScale: 1, duration: bs * 1000 }
      ];
  }
}

function getPatternCycleMs() {
  switch (breathingPattern) {
    case 'box': return 16000;
    case '478': return 19000;
    default: return breathSeconds * 2 * 1000;
  }
}

function startBreathingAnimation() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  const phases = getPatternPhases();
  let phaseIndex = 0;
  const now = Date.now();
  patternPhaseStartTime = now;
  const p = phases[0];
  currentPhaseText = p.text;
  currentPhaseScaleStart = p.startScale;
  currentPhaseScaleEnd = p.endScale;
  patternPhaseDuration = p.duration;

  function step() {
    if (!running) return;
    const elapsed = Date.now() - patternPhaseStartTime;

    if (elapsed >= patternPhaseDuration) {
      phaseIndex = (phaseIndex + 1) % phases.length;
      const next = phases[phaseIndex];
      patternPhaseStartTime = Date.now();
      currentPhaseText = next.text;
      currentPhaseScaleStart = next.startScale;
      currentPhaseScaleEnd = next.endScale;
      patternPhaseDuration = next.duration;
    }

    const phaseElapsed = Date.now() - patternPhaseStartTime;
    const progress = Math.min(1, phaseElapsed / patternPhaseDuration);
    const scale = lerp(currentPhaseScaleStart, currentPhaseScaleEnd, EASING(progress));

    breathingCircle.style.transform = `scale(${scale})`;
    const inner = breathingCircle.querySelector('.inner');
    if (inner) inner.style.transform = `scale(${scale})`;
    if (!patternPhaseTextLocked) stateText.textContent = currentPhaseText;

    animationFrameId = requestAnimationFrame(step);
  }

  animationFrameId = requestAnimationFrame(step);
}

function stopBreathingAnimation() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  breathingCircle.style.transform = '';
  const inner = breathingCircle.querySelector('.inner');
  if (inner) inner.style.transform = '';
}

function setPatternPhase(text, startScale, endScale, durationMs) {
  currentPhaseText = text;
  currentPhaseScaleStart = startScale;
  currentPhaseScaleEnd = endScale;
  patternPhaseStartTime = Date.now();
  patternPhaseDuration = durationMs;
}

// ——— Countdown (3 seconds before session starts) ———
async function startCountdown() {
  stateText.textContent = 'Get ready…';
  // Pause ambient during countdown; will fade in at "1"
  stopAllAmbient();

  await wait(600);

  for (let n = 3; n >= 1; n--) {
    stateText.textContent = String(n);
    await wait(1000);
    if (!running) return;
  }

  // Fade in ambient at "go"
  if (audioOn) startThemeAmbient();

  // Session-start bell: 432 Hz, 1.5 s
  playBell(selectedTheme, 432, 1.5);
  await wait(1500);

  stateText.textContent = '';
}

// ——— Session engine ———
const wait = ms => new Promise(r => setTimeout(r, ms));

async function breathingCues(totalMinutes) {
  const totalMs = totalMinutes * 60 * 1000;
  const start = Date.now();
  const t = selectedTheme;

  // ── Open mode: no voice, pure quiet breathing for the whole duration ──
  if (t === 'open') {
    patternPhaseTextLocked = false;
    const bellIntervalMinutes = parseInt(bellIntervalSelect.value, 10);
    let breathCycles = 0;
    const cycleMs = getPatternCycleMs();
    while (running && (Date.now() - start) < totalMs) {
      if (breathingPattern === 'box') {
        const boxMs = breathSeconds * 1000;
        setPatternPhase('Breathe in…', 1, 1.5, boxMs);
        await wait(boxMs);
        if (!running) return;
        setPatternPhase('Hold…', 1.5, 1.5, boxMs);
        await wait(boxMs);
        if (!running) return;
        setPatternPhase('Breathe out…', 1.5, 1, boxMs);
        await wait(boxMs);
        if (!running) return;
        setPatternPhase('Hold…', 1, 1, boxMs);
        await wait(boxMs);
        if (!running) return;
      } else if (breathingPattern === '478') {
        setPatternPhase('Breathe in\u2026', 1, 1.5, 4000);
        await wait(4000);
        if (!running) return;
        setPatternPhase('Hold\u2026', 1.5, 1.5, 7000);
        await wait(7000);
        if (!running) return;
        setPatternPhase('Breathe out\u2026', 1.5, 1, 8000);
        await wait(8000);
        if (!running) return;
      } else {
        setPatternPhase('Breathe in\u2026', 1, 1.15, breathSeconds * 1000);
        await wait(breathSeconds * 1000);
        if (!running) return;
        setPatternPhase('Breathe out\u2026', 1.15, 1, breathSeconds * 1000);
        await wait(breathSeconds * 1000);
        if (!running) return;
      }

      breathCycles++;
      const bellIntervalMs = bellIntervalMinutes * 60 * 1000;
      if (bellIntervalMs > 0 && (breathCycles * cycleMs) >= bellIntervalMs) {
        playBell(t, null, 2.5);
        breathCycles = 0;
      }
    }
    return;
  }

  // ── 1. Opening (skip for SOS) ──
  if (t !== 'sos') {
    stateText.textContent = 'Settling…';
    await playAudioFile('opening_' + t);
    await wait(3000);
  }

  // ── 2. Deep breaths ──
  const breathSets = t === 'sos' ? 1 : 3;
  for (let b = 1; b <= breathSets; b++) {
    stateText.textContent = 'Deep breath in…';
    await playAudioFile('breathe_in_' + b);
    await wait(t === 'sos' ? 1000 : 2000);
    stateText.textContent = '…and release';
    await playAudioFile('breathe_out_' + b);
    await wait(t === 'sos' ? 1000 : 2000);
  }
  if (t === 'sos') await wait(1000);

  // ── 3. Body section ──
  if (t === 'metta') {
    for (let i = 0; i < 3; i++) {
      if (!running) return;
      stateText.textContent = 'Relaxing…';
      await playAudioFile('body_metta_' + i);
      await wait(2000);
    }
  } else if (t === 'bodyscan') {
    for (let i = 0; i < 15; i++) {
      if (!running) return;
      stateText.textContent = 'Scanning…';
      await playAudioFile('body_bodyscan_' + i);
      await wait(3000);
    }
  } else if (t !== 'sos') {
    stateText.textContent = 'Relaxing…';
    await playAudioFile('relax_intro_' + t);
    await wait(2000);
    const bodyCount = t === 'gratitude' ? 3 : (t === 'focus' ? 4 : 5);
    for (let i = 0; i < bodyCount; i++) {
      if (!running) return;
      stateText.textContent = 'Relaxing…';
      await playAudioFile('body_' + t + '_' + i);
      await wait(1500);
    }
  }

  if (!running) return;

  // ── 4. Transition (skip for SOS) ──
  if (t !== 'sos') {
    stateText.textContent = 'Continuing…';
    await playAudioFile('transition');
    await wait(3000);
  }

  // ── 5. Practice ──
  const practiceFiles = [];
  switch (t) {
    case 'metta':
      for (let i = 0; i < 5; i++) practiceFiles.push('practice_metta_' + i);
      break;
    case 'bodyscan':
      practiceFiles.push('practice_bodyscan_0', 'practice_bodyscan_1');
      break;
    case 'sos':
      practiceFiles.push('practice_calm_0', 'practice_calm_1', 'practice_calm_2');
      break;
    default:
      for (let i = 0; i < 5; i++) practiceFiles.push('practice_' + t + '_' + i);
  }
  const practiceWait = t === 'metta' ? 4000 : (t === 'bodyscan' ? 3000 : 2000);
  for (const f of practiceFiles) {
    if (!running) return;
    stateText.textContent = 'Practicing…';
    await playAudioFile(f);
    await wait(practiceWait);
  }

  if (!running) return;

  // ── 6. Quiet phase ──
  const quietTarget = totalMs - 35000;
  patternPhaseTextLocked = false;
  stateText.textContent = 'Following your breath\u2026';

  let reminders = [];
  switch (t) {
    case 'calm':
      reminders = ['reminder_calm_0','reminder_calm_1','reminder_calm_2'];
      break;
    case 'focus':
      reminders = ['reminder_focus_0','reminder_focus_1','reminder_focus_2'];
      break;
    case 'sleep':
      reminders = ['reminder_sleep_0','reminder_sleep_1','reminder_sleep_2'];
      break;
    case 'metta':
      reminders = ['reminder_metta_0', 'reminder_metta_1'];
      break;
    case 'bodyscan':
      reminders = ['reminder_bodyscan_0', 'reminder_bodyscan_1'];
      break;
    case 'gratitude':
      reminders = ['reminder_gratitude_0','reminder_gratitude_1','reminder_gratitude_2'];
      break;
  }

  const bellIntervalMinutes = parseInt(bellIntervalSelect.value, 10);
  let breathCycles = 0;
  let reminderIdx = 0;
  const cycleMs = getPatternCycleMs();

  const quietStart = Date.now();
  const sosQuietCap = t === 'sos' ? 60000 : Infinity;

  while (running && (Date.now() - start) < quietTarget) {
    if (t === 'sos' && (Date.now() - quietStart) >= sosQuietCap) break;

    if (breathingPattern === 'box') {
      const boxMs = breathSeconds * 1000;
      setPatternPhase('Breathe in…', 1, 1.5, boxMs);
      await wait(boxMs);
      if (!running) break;
      setPatternPhase('Hold…', 1.5, 1.5, boxMs);
      await wait(boxMs);
      if (!running) break;
      setPatternPhase('Breathe out…', 1.5, 1, boxMs);
      await wait(boxMs);
      if (!running) break;
      setPatternPhase('Hold…', 1, 1, boxMs);
      await wait(boxMs);
      if (!running) break;
    } else if (breathingPattern === '478') {
      setPatternPhase('Breathe in\u2026', 1, 1.5, 4000);
      await wait(4000);
      if (!running) break;
      setPatternPhase('Hold\u2026', 1.5, 1.5, 7000);
      await wait(7000);
      if (!running) break;
      setPatternPhase('Breathe out\u2026', 1.5, 1, 8000);
      await wait(8000);
      if (!running) break;
    } else {
      setPatternPhase('Breathe in\u2026', 1, 1.15, breathSeconds * 1000);
      await wait(breathSeconds * 1000);
      if (!running) break;
      setPatternPhase('Breathe out\u2026', 1.15, 1, breathSeconds * 1000);
      await wait(breathSeconds * 1000);
      if (!running) break;
    }

    breathCycles++;
    const bellIntervalMs = bellIntervalMinutes * 60 * 1000;
    if (bellIntervalMs > 0 && (breathCycles * cycleMs) >= bellIntervalMs) {
      playBell(t, null, 2.5);
      breathCycles = 0;
    }

    const elapsedQuiet = Date.now() - quietStart;
    if (t === 'sos') {
      // max 1 reminder at ~30s
      if (reminderIdx < 1 && reminderIdx < reminders.length && elapsedQuiet > 30000) {
        patternPhaseTextLocked = true;
        await playAudioFile(reminders[reminderIdx]);
        reminderIdx++;
        patternPhaseTextLocked = false;
      }
    } else {
      if (reminderIdx < reminders.length && elapsedQuiet > (reminderIdx + 1) * 240000) {
        patternPhaseTextLocked = true;
        await playAudioFile(reminders[reminderIdx]);
        reminderIdx++;
        patternPhaseTextLocked = false;
      }
    }
  }

  patternPhaseTextLocked = true;

  // ── 7. Close ──
  if (!running) return;
  stateText.textContent = 'Waking gently…';

  let closeFiles = [];
  let closeWait = 2000;
  switch (t) {
    case 'metta':
      closeFiles = ['close_metta_0', 'close_metta_1', 'close_metta_2'];
      closeWait = 3000;
      break;
    case 'bodyscan':
      closeFiles = ['close_bodyscan_0', 'close_bodyscan_1', 'close_bodyscan_2'];
      closeWait = 3000;
      break;
    case 'sos':
      closeFiles = ['close_calm_2', 'close_calm_3'];
      closeWait = 2000;
      break;
    default:
      closeFiles = t === 'calm'
        ? ['close_calm_0','close_calm_1','close_calm_2','close_calm_3']
        : ['close_' + t + '_0','close_' + t + '_1','close_' + t + '_2'];
  }

  for (const f of closeFiles) {
    if (!running) return;
    await playAudioFile(f);
    await wait(closeWait);
  }

  return;
}

// ——— Start / Stop ———
async function startSession() {
  if (running) return;
  running = true;

  sessionStartTime = new Date();
  startBtn.disabled = true;
  stopBtn.disabled = false;
  lockBreathPicker();
  lockPatternPicker();

  courseSessionTheme = null;

  // ——— Soundscape mode: no timer, no voice, play until stopped ———
  if (selectedTheme === 'soundscape') {
    stateText.textContent = 'Soundscape playing…';
    stateText.classList.add('soundscape');
    if (progressFill) progressFill.style.display = 'none';

    // Gentle start bell at 432 Hz, 1.5 s
    playBell(selectedTheme, 432, 1.5);
    await wait(500);

    // Circle stays static — no animate class, no rAF
    if (audioOn) startThemeAmbient();

    // Wait until stopped
    while (running) {
      await wait(200);
    }

    // endSession already handled cleanup and end bell
    return;
  }

  // ——— Normal session ———
  const originalTheme = selectedTheme;
  const originalMinutes = selectedMinutes;
  if (selectedTheme === 'intro-course') {
    courseSessionTheme = selectedTheme;
    selectedTheme = getCourseTheme();
    selectedMinutes = getCourseMinutes();
    stateText.textContent = COURSE_DAYS[getCourseDay() - 1].title;
  }

  if (selectedTheme === 'sos') {
    selectedMinutes = 3;
  }

  // Start rAF breathing animation (replaces CSS .animate class)
  startBreathingAnimation();

  // 3-second countdown (ambient music intentionally paused during this)
  await startCountdown();
  if (!running) {
    selectedTheme = courseSessionTheme || selectedTheme;
    selectedMinutes = originalMinutes;
    courseSessionTheme = null;
    return;
  }

  // Progress tracking kicks off after countdown, aligned with session
  startProgressTracking();

  if (audioOn) startThemeAmbient();
  await breathingCues(selectedMinutes);

  // Restore theme/minutes for course or SOS
  selectedTheme = courseSessionTheme || selectedTheme;
  selectedMinutes = originalMinutes;

  if (running) {
    // End-of-session bell: 528 Hz, 3 s, slightly louder
    playBell(selectedTheme, 528, 3.0);
    await wait(2000);
    if (selectedTheme !== 'open') {
      await playAudioFile('session_complete');
    }
  }

  endSession(running ? 'completed' : 'interrupted');
}

async function endSession(status) {
  running = false;

  // Stop rAF animation if active
  stopBreathingAnimation();

  stopBtn.disabled = true;
  startBtn.disabled = false;
  unlockBreathPicker();
  unlockPatternPicker();
  stopProgressTracking();

  if (progressFill) progressFill.style.width = '0%';

  clearTimeout(sessionTimer);
  clearTimeout(cueTimer);
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  if (currentAudio) { try { currentAudio.pause(); } catch (e) {} currentAudio = null; }
  stopAllAmbient();

  if (selectedTheme === 'soundscape') {
    // No history, no mood checkin for soundscape
    playBell(selectedTheme, 528, 3.0);
    stateText.classList.remove('soundscape');
    stateText.textContent = 'Soundscape stopped';
    progressFill.style.display = '';
    breathingCircle.style.transform = '';
    const inner = breathingCircle.querySelector('.inner');
    if (inner) inner.style.transform = '';
    return;
  }

  stateText.textContent = status === 'completed' ? 'Well done. See you tomorrow.' : 'Ready when you are.';
  breathingCircle.classList.remove('animate');
  breathingCircle.style.animationDuration = '';
  const inner = breathingCircle.querySelector('.inner');
  if (inner) inner.style.animationDuration = '';

  if (status === 'completed') {
    saveHistory(selectedMinutes, courseSessionTheme || selectedTheme);
    if (moodCheckin) moodCheckin.classList.remove('hidden');
    if (courseSessionTheme) {
      advanceCourseDay();
      courseSessionTheme = null;
    }
  } else {
    if (moodCheckin) moodCheckin.classList.add('hidden');
  }
}

startBtn.addEventListener('click', startSession);
stopBtn.addEventListener('click', () => endSession('interrupted'));

if (moodRow) {
  moodRow.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const mood = btn.dataset.mood;
    if (!mood) return;
    moodRow.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    const key = 'mindful.history.v1';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    if (list.length > 0) {
      list[0].mood = mood;
      localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
      renderHistory();
      computeStreak();
    }

    setTimeout(() => {
      if (moodCheckin) moodCheckin.classList.add('hidden');
    }, 2000);
  });
}

// ——— History ———
function saveHistory(minutes, theme) {
  const key = 'mindful.history.v1';
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  const item = { date: new Date().toISOString(), duration: minutes, theme: theme };
  existing.unshift(item);
  localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
  renderHistory();
  computeStreak();
}

function renderHistory() {
  const key = 'mindful.history.v1';
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  const labels = { calm: 'Morning calm', focus: 'Focus', sleep: 'Sleep', gratitude: 'Gratitude', metta: 'Loving-Kindness', bodyscan: 'Deep body scan', sos: 'SOS', open: 'Open' };
  const moodEmoji = { great: '😌', good: '🙂', ok: '😐', difficult: '😓', rough: '😤' };
  historyList.innerHTML = '';
  if (!list.length) {
    historyList.innerHTML = `
      <div class="empty-state">
        <div class="breathing-circle empty-circle"></div>
        <p class="empty">Your journey begins here.</p>
        <p class="empty-sub">Start your first session above.</p>
      </div>`;
    return;
  }
  list.slice(0, 20).forEach(item => {
    const d = new Date(item.date);
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const moodStr = item.mood && moodEmoji[item.mood] ? ` ${moodEmoji[item.mood]}` : '';
    const li = document.createElement('li');
    li.innerHTML = `<span class="dur">${item.duration} min</span><span class="stamp">${labels[item.theme] || item.theme} · ${dateStr} at ${timeStr}${moodStr}</span>`;
    historyList.appendChild(li);
  });
}
renderHistory();
computeStreak();

function computeStreak() {
  const key = 'mindful.history.v1';
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  const totalMinutes = list.reduce((sum, item) => sum + (item.duration || 0), 0);
  if (statsSummary) statsSummary.textContent = `${totalMinutes} total min`;

  if (!list.length) {
    if (streakBadge) streakBadge.textContent = '🔥 0 day streak';
    return 0;
  }

  const today = new Date();
  today.setHours(0,0,0,0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sessionDays = list.map(item => {
    const d = new Date(item.date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  });
  const uniqueDays = [...new Set(sessionDays)];

  const mostRecent = uniqueDays[0];
  if (mostRecent !== today.getTime() && mostRecent !== yesterday.getTime()) {
    if (streakBadge) streakBadge.textContent = '🔥 0 day streak';
    return 0;
  }

  let streak = 0;
  let checkDate = new Date(mostRecent === today.getTime() ? today : yesterday);

  for (let i = 0; i < uniqueDays.length; i++) {
    const d = new Date(uniqueDays[i]);
    if (d.getTime() === checkDate.getTime()) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  if (streakBadge) streakBadge.textContent = `🔥 ${streak} day streak`;
  return streak;
}

// ——— Dark mode ———
function applyDarkMode(isDark) {
  document.body.classList.toggle('dark', isDark);
  if (darkModeBtn) darkModeBtn.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('mindful.darkMode', isDark ? '1' : '0');
}

const storedDark = localStorage.getItem('mindful.darkMode');
if (storedDark !== null) {
  applyDarkMode(storedDark === '1');
} else {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyDarkMode(prefersDark);
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (localStorage.getItem('mindful.darkMode') === null) {
    applyDarkMode(e.matches);
  }
});

darkModeBtn.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark');
  applyDarkMode(!isDark);
});

// ——— Daily quote ———
const QUOTES = [
  "The present moment is filled with joy and happiness. If you are attentive, you will see it. - Thich Nhat Hanh",
  "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor. - Thich Nhat Hanh",
  "The mind is everything. What you think you become. - Buddha",
  "Quiet the mind, and the soul will speak. - Ma Jaya Sati Bhagavati",
  "Almost everything will work again if you unplug it for a few minutes, including you. - Anne Lamott",
  "Inhale the future, exhale the past.",
  "You are the sky. Everything else is just the weather. - Pema Chodron",
  "Breathe. Let go. And remind yourself that this very moment is the only one you know you have for sure. - Oprah Winfrey",
  "Peace comes from within. Do not seek it without. - Buddha",
  "The little things? The little moments? They aren't little. - Jon Kabat-Zinn",
  "Be where you are, not where you think you should be.",
  "Within you, there is a stillness and a sanctuary to which you can retreat at any time. - Hermann Hesse",
];
const dailyQuoteEl = document.getElementById('dailyQuote');
if (dailyQuoteEl && QUOTES.length) {
  dailyQuoteEl.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

// ——— Keyboard shortcut: spacebar toggle ———
document.addEventListener('keydown', e => {
  if (e.code !== 'Space') return;
  const tag = document.activeElement?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea' || tag === 'button') return;
  e.preventDefault();
  if (running) {
    endSession('interrupted');
  } else {
    startSession();
  }
});

// ——— Auto-play music on first user gesture ———
document.addEventListener('click', () => {
  if (audioOn) startThemeAmbient();
}, { once: true });

// ——— Time-of-day session suggestion ———
(function() {
  const FLAG_KEY = 'mindful.themeAutoSuggested';
  if (sessionStorage.getItem(FLAG_KEY)) return;

  const hour = new Date().getHours();
  let suggested;
  if (hour >= 5 && hour < 10) suggested = 'calm';
  else if (hour >= 10 && hour < 14) suggested = 'focus';
  else if (hour >= 14 && hour < 17) suggested = 'gratitude';
  else if (hour >= 17 && hour < 22) suggested = 'sleep';
  else suggested = 'sleep'; // night: 22–5

  if (suggested && themeSelect.querySelector('option[value="' + suggested + '"]')) {
    themeSelect.value = suggested;
    selectedTheme = suggested;
    sessionStorage.setItem(FLAG_KEY, '1');
  }
})();