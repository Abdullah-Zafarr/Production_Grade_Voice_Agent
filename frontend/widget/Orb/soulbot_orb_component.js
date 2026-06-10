// Robust Orb Logic for Integration
const orb = document.getElementById('orb');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');
const thoughtLabel = document.getElementById('thoughtLabel');
const buttons = Array.from(document.querySelectorAll('#controls button[data-state]'));
const blinkBtn = document.getElementById('blinkBtn');

const stateMap = {
  idle: { text: 'Idle', dot: '#49c177', thought: 'Thinking' },
  listening: { text: 'Listening…', dot: '#2f7dd7', thought: 'Listening' },
  thinking: { text: 'Thinking…', dot: '#2f7dd7', thought: 'Thinking' },
  speaking: { text: 'Speaking…', dot: '#ff9f4a', thought: 'Speaking' },
  writing: { text: 'Writing…', dot: '#7d65ff', thought: 'Writing' }
};

function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clearStates() {
  if (orb) {
    orb.classList.remove('is-listening', 'is-thinking', 'is-speaking', 'is-writing');
  }
}

function setSoulbotState(state) {
  if (!orb) return;
  
  clearStates();
  orb.dataset.state = state;
  const config = stateMap[state] || stateMap.idle;
  
  // Defensive DOM updates
  if (statusText) statusText.textContent = config.text;
  if (statusDot) {
    statusDot.style.background = config.dot;
    statusDot.style.boxShadow = `0 0 0 6px ${hexToRgba(config.dot, 0.16)}`;
  }
  if (thoughtLabel) thoughtLabel.textContent = config.thought;

  if (state === 'listening') orb.classList.add('is-listening');
  if (state === 'thinking') orb.classList.add('is-thinking');
  if (state === 'speaking') orb.classList.add('is-speaking');
  if (state === 'writing') orb.classList.add('is-writing');

  buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.state === state));
}

function blink() {
  if (!orb) return;
  orb.classList.add('is-blink');
  setTimeout(() => orb.classList.remove('is-blink'), 180);
}

// Event Listeners with existence checks
if (buttons.length > 0) {
    buttons.forEach(btn => {
      btn.addEventListener('click', () => setSoulbotState(btn.dataset.state));
    });
}

if (blinkBtn) {
    blinkBtn.addEventListener('click', blink);
}

// Natural blinking loop
(function naturalBlinkLoop() {
  const delay = 2200 + Math.random() * 2800;
  setTimeout(() => {
    blink();
    naturalBlinkLoop();
  }, delay);
})();

// Expose for integration
window.setSoulbotState = setSoulbotState;
window.soulbotBlink = blink;
