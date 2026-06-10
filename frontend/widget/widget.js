(function () {
  // ── Guard: currentScript can be null if loaded async/deferred ──
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  if (!script) return;

  // ── Read data attributes ──
  var position = script.getAttribute('data-position') || 'bottom-right';
  var color    = script.getAttribute('data-color')    || '#0b3363';
  var text     = script.getAttribute('data-text')     || 'Talk to our agent';
  var autoOpen = script.getAttribute('data-auto-open') === 'true';

  // ── Derive the orb URL correctly ──
  // script.src = "https://domain.com/orb/widget.js"
  // We want iframe to point to "https://domain.com/orb" (the index.html served at /orb)
  // Fix: strip everything from "/widget.js" onward — gives us the /orb base correctly.
  var scriptSrc = script.src || '';
  var orbUrl = scriptSrc.replace(/\/widget\.js(\?.*)?$/, '');
  // orbUrl is now "https://soul-imaging-voice-agent.fly.dev/orb"
  // That's exactly where the Orb index.html is served by FastAPI (app.mount("/orb", ...))

  // ── Container ──
  var container = document.createElement('div');
  container.style.cssText = [
    'position:fixed',
    'z-index:2147483647',
    'display:flex',
    'flex-direction:column',
    'align-items:flex-end',
    position.includes('bottom') ? 'bottom:30px' : 'top:30px',
    position.includes('right')  ? 'right:30px'  : 'left:30px'
  ].join(';');

  // ── Iframe ──
  var iframe = document.createElement('iframe');
  iframe.src              = orbUrl;
  iframe.title            = 'Soul Imaging Voice Agent';
  iframe.allow            = 'microphone; autoplay; clipboard-write'; // CRITICAL: mic permission
  iframe.allowFullscreen  = true;
  iframe.setAttribute('loading', 'lazy');
  iframe.style.cssText = [
    'border:none',
    'border-radius:24px',
    'box-shadow:0 12px 64px rgba(0,0,0,0.3)',
    'margin-bottom:15px',
    'transition:opacity 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    'display:none',
    'opacity:0',
    'transform:translateY(15px)',
    // Responsive: 420px on desktop, 100vw-40px on mobile
    'width:min(420px, calc(100vw - 40px))',
    'height:min(680px, calc(100vh - 120px))'
  ].join(';');

  // ── Toggle open/close ──
  function openWidget() {
    iframe.style.display = 'block';
    // Trigger transition on next frame
    requestAnimationFrame(function () {
      iframe.style.opacity = '1';
      iframe.style.transform = 'translateY(0)';
    });
  }

  function closeWidget() {
    iframe.style.opacity = '0';
    iframe.style.transform = 'translateY(15px)';
    setTimeout(function () { iframe.style.display = 'none'; }, 300);
  }

  var isOpen = false;

  // ── Button ──
  var button = document.createElement('button');
  button.setAttribute('aria-label', text);
  button.setAttribute('aria-expanded', 'false');
  button.style.cssText = [
    'background:' + color,
    'color:white',
    'border:none',
    'width:64px',
    'height:64px',
    'border-radius:50%',
    'cursor:pointer',
    'box-shadow:0 6px 20px rgba(0,0,0,0.2)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'transition:transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
    'outline:none'
  ].join(';');

  // ── Icons ──
  var phoneIcon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
  var arrowRightIcon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';

  button.innerHTML = phoneIcon;

  button.addEventListener('mouseenter', function () {
    button.style.transform = 'scale(1.05) translateY(-2px)';
    button.style.boxShadow = '0 12px 32px rgba(0,0,0,0.3)';
  });
  button.addEventListener('mouseleave', function () {
    button.style.transform = 'scale(1) translateY(0)';
    button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
  });

  button.addEventListener('click', function () {
    isOpen = !isOpen;
    button.setAttribute('aria-expanded', String(isOpen));
    button.innerHTML = isOpen ? arrowRightIcon : phoneIcon;
    if (isOpen) {
      openWidget();
    } else {
      closeWidget();
    }
  });

  // ── Assemble: iframe on top, button on bottom (flex-column) ──
  container.appendChild(iframe);
  container.appendChild(button);
  document.body.appendChild(container);

  // ── Auto-open support ──
  if (autoOpen) {
    isOpen = true;
    button.setAttribute('aria-expanded', 'true');
    button.innerHTML = arrowRightIcon;
    openWidget();
  }
})();
