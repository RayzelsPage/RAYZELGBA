// RayzelsGBA — Deluxe v3
const canvas = document.getElementById('gbaScreen');
const romDrop = document.getElementById('romDrop');
const romFile = document.getElementById('romFile');
const romMeta = document.getElementById('romMeta');
const romNameEl = document.getElementById('romName');
const romStatusEl = document.getElementById('romStatus');
const cheatListDiv = document.getElementById('cheatList');
const yearEl = document.getElementById('year');
const splash = document.getElementById('splash');
const toggleThemeBtn = document.getElementById('toggleTheme');
const fpsEl = document.getElementById('fps');
const batteryFill = document.getElementById('batteryFill');
const overlay = document.getElementById('overlay');
const btnPause = document.getElementById('btnPause');

let gba = null;
let savedState = null;
let cheats = JSON.parse(localStorage.getItem('rayzels.cheats') || '[]');
let recents = JSON.parse(localStorage.getItem('rayzels.recents') || '[]'); // [{name, size}]
yearEl.textContent = new Date().getFullYear();

// Splash hide after a moment or on first interaction
window.addEventListener('load', () => setTimeout(()=> splash.classList.add('hidden'), 900));

// Theme toggle
const THEME_KEY = 'rayzels.theme';
const savedTheme = localStorage.getItem(THEME_KEY) || 'auto';
applyTheme(savedTheme);
toggleThemeBtn.addEventListener('click', () => {
  const next = (localStorage.getItem(THEME_KEY) || 'auto') === 'dark' ? 'light'
             : (localStorage.getItem(THEME_KEY) || 'auto') === 'light' ? 'auto' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});
function applyTheme(mode){
  document.body.classList.remove('theme-dark','theme-light','theme-auto');
  document.body.classList.add(`theme-${mode}`);
}

// Helpers
function setStatus(name, statusText="Ready"){
  romMeta.hidden = false;
  romNameEl.textContent = name;
  romStatusEl.textContent = statusText;
  splash.classList.add('hidden');
}
function vibrate(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(_){} }
function addRecent(name, size){
  // keep most recent 6 unique by name+size
  recents = [{name, size}, ...recents.filter(r => r.name!==name || r.size!==size)].slice(0,6);
  localStorage.setItem('rayzels.recents', JSON.stringify(recents));
  renderRecents();
}

// Recents UI
const recentPanel = document.getElementById('recentPanel');
const recentList = document.getElementById('recentList');
const clearRecent = document.getElementById('clearRecent');
function renderRecents(){
  recentList.innerHTML = '';
  if(!recents.length){ recentPanel.hidden = true; return; }
  recentPanel.hidden = false;
  recents.forEach(r => {
    const chip = document.createElement('button');
    chip.className = 'recent-item';
    chip.textContent = `${r.name} • ${Math.round(r.size/1024)} KB`;
    chip.title = 'Select this ROM again via the file picker';
    chip.addEventListener('click', ()=> romFile.click()); // open picker to re-select
    recentList.appendChild(chip);
  });
}
clearRecent.addEventListener('click', ()=>{
  recents = []; localStorage.setItem('rayzels.recents','[]'); renderRecents();
});
renderRecents();

// Boot
function bootWithBuffer(name, buffer){
  gba = new GBA(canvas);
  gba.loadROM(new Uint8Array(buffer));
  try{ gba.run(); }catch(e){}
  setStatus(name, "Running");
}

// Drag & drop / Browse
romDrop.addEventListener('dragover', e => { e.preventDefault(); });
romDrop.addEventListener('drop', async e => {
  e.preventDefault();
  const file = e.dataTransfer.files?.[0];
  if(!file || !file.name.toLowerCase().endsWith('.gba')) return alert("Please drop a .gba file.");
  const buf = await file.arrayBuffer();
  addRecent(file.name, file.size);
  bootWithBuffer(file.name, buf);
});
romFile.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if(!file) return;
  if(!file.name.toLowerCase().endsWith('.gba')) return alert("Please choose a .gba file.");
  const buf = await file.arrayBuffer();
  addRecent(file.name, file.size);
  bootWithBuffer(file.name, buf);
});

// Cheats
function renderCheats(){
  cheatListDiv.innerHTML = '';
  if(!cheats.length){
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.style.padding = '10px';
    empty.textContent = 'No cheats added yet.';
    cheatListDiv.appendChild(empty);
    return;
  }
  cheats.forEach((c, i) => {
    const row = document.createElement('div');
    row.className = 'cheat-item';
    const left = document.createElement('div');
    left.className = 'cheat-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'cheat-toggle';
    checkbox.checked = c.enabled;
    checkbox.addEventListener('change', () => { c.enabled = checkbox.checked; persistCheats(); });
    const label = document.createElement('div');
    label.textContent = `0x${c.addr.toUpperCase()} = 0x${c.val.toUpperCase()}`;
    left.appendChild(checkbox);
    left.appendChild(label);
    const right = document.createElement('div');
    const rm = document.createElement('button');
    rm.className = 'btn tiny ghost';
    rm.textContent = 'Remove';
    rm.addEventListener('click', () => { cheats.splice(i,1); persistCheats(); renderCheats(); });
    right.appendChild(rm);
    row.appendChild(left);
    row.appendChild(right);
    cheatListDiv.appendChild(row);
  });
}
function persistCheats(){ localStorage.setItem('rayzels.cheats', JSON.stringify(cheats)); }
document.getElementById('btnAddCheat').addEventListener('click', () => {
  const addr = document.getElementById('cheatAddress').value.trim();
  const val  = document.getElementById('cheatValue').value.trim();
  if(!addr || !val || !/^[0-9a-fA-F]+$/.test(addr) || !/^[0-9a-fA-F]+$/.test(val)){
    alert('Please enter valid hex for both address and value.'); return;
  }
  cheats.push({ addr: addr.toUpperCase(), val: val.toUpperCase(), enabled: true });
  persistCheats(); renderCheats();
});
// Export/Import cheats
document.getElementById('btnExportCheats').addEventListener('click', () => {
  const data = new Blob([JSON.stringify(cheats, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url; a.download = 'rayzels-cheats.json'; a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 1000);
});
document.getElementById('cheatsFile').addEventListener('change', async (e) => {
  const file = e.target.files?.[0]; if(!file) return;
  try{
    const text = await file.text();
    const parsed = JSON.parse(text);
    if(!Array.isArray(parsed)) throw new Error('Invalid format');
    cheats = parsed; persistCheats(); renderCheats();
  }catch(err){ alert('Invalid cheats file.'); }
});

function applyCheats(){
  if(!gba) return;
  cheats.forEach(c => {
    if(!c.enabled) return;
    try{
      const address = parseInt(c.addr, 16);
      const value   = parseInt(c.val, 16);
      gba.memory.view.setUint16(address, value, true);
    }catch(e){ /* ignore */ }
  });
}
setInterval(applyCheats, 100);
renderCheats();

// State controls
document.getElementById('btnSave').addEventListener('click', saveState);
document.getElementById('btnLoad').addEventListener('click', loadState);
document.getElementById('btnReset').addEventListener('click', resetCore);
function saveState(){
  if(!gba) return alert('Load a ROM first.');
  try{
    savedState = gba.saveState();
    localStorage.setItem('rayzels.state', JSON.stringify(savedState));
    alert('State saved.');
  }catch(e){ alert('State saved in memory.'); }
}
function loadState(){
  if(!gba) return alert('Load a ROM first.');
  const ls = localStorage.getItem('rayzels.state');
  const src = ls ? JSON.parse(ls) : savedState;
  if(!src) return alert('No saved state found.');
  gba.loadState(src); applyCheats(); alert('State loaded.');
}
function resetCore(){
  if(!gba) return;
  try{ gba.pause(); }catch(e){}; try{ gba.reset(); }catch(e){}; try{ gba.run(); }catch(e){};
}

// Keyboard
document.addEventListener('keydown', e => setKey(e, true));
document.addEventListener('keyup',   e => setKey(e, false));
function setKey(e, pressed){
  if(!gba) return;
  const map = {
    'ArrowUp':'UP', 'ArrowDown':'DOWN', 'ArrowLeft':'LEFT', 'ArrowRight':'RIGHT',
    'KeyZ':'A', 'KeyX':'B', 'KeyA':'L', 'KeyS':'R',
    'Enter':'START', 'ShiftRight':'SELECT', 'ShiftLeft':'SELECT', 'Escape': 'PAUSE'
  };
  const key = map[e.code];
  if(!key) return;
  e.preventDefault();
  if(key==='PAUSE' && pressed){ toggleOverlay(); return; }
  gba.keys[key] = pressed;
  if(pressed) vibrate(8);
}

// Touch controls + haptics
document.querySelectorAll('.touch-controls [data-key]').forEach(btn => {
  const key = btn.getAttribute('data-key');
  ['touchstart','touchend','mousedown','mouseup','mouseleave'].forEach(evt => {
    btn.addEventListener(evt, (e) => {
      e.preventDefault();
      if(!gba) return;
      const pressed = (evt === 'touchstart' || evt === 'mousedown');
      gba.keys[key] = pressed;
      if(pressed) vibrate(10);
    }, {passive:false});
  });
});

// FPS meter + perf battery (target 60fps approximation via rAF)
let frames = 0, lastTime = performance.now();
function tick(){
  frames++;
  const now = performance.now();
  if(now - lastTime >= 1000){
    const fps = frames; frames = 0; lastTime = now;
    fpsEl.textContent = `FPS: ${fps}`;
    const pct = Math.max(0, Math.min(100, Math.round((fps/60)*100)));
    batteryFill.style.width = pct + '%';
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Overlay controls
const ovResume = document.getElementById('ovResume');
const ovSave   = document.getElementById('ovSave');
const ovLoad   = document.getElementById('ovLoad');
const ovReset  = document.getElementById('ovReset');
const ovTheme  = document.getElementById('ovTheme');
const ovClose  = document.getElementById('ovClose');

btnPause.addEventListener('click', toggleOverlay);
ovClose.addEventListener('click', toggleOverlay);
ovResume.addEventListener('click', () => { try{ gba.run(); }catch(e){}; toggleOverlay(false); });
ovSave.addEventListener('click', saveState);
ovLoad.addEventListener('click', loadState);
ovReset.addEventListener('click', resetCore);
ovTheme.addEventListener('click', () => {
  const next = (localStorage.getItem('rayzels.theme') || 'auto') === 'dark' ? 'light'
             : (localStorage.getItem('rayzels.theme') || 'auto') === 'light' ? 'auto' : 'dark';
  localStorage.setItem('rayzels.theme', next);
  applyTheme(next);
});

function toggleOverlay(show){
  const willShow = (typeof show === 'boolean') ? show : overlay.hasAttribute('hidden');
  if(willShow){
    overlay.removeAttribute('hidden');
    try{ gba.pause(); }catch(e){}
  }else{
    overlay.setAttribute('hidden','');
    try{ gba.run(); }catch(e){}
  }
}
