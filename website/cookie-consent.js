/* ===== COOKIE CONSENT — GDPR / LOPD-GDD Compliant ===== */
(function(){
  'use strict';

  /* ---------- i18n ---------- */
  var T = {
    es: {
      title: 'Usamos cookies',
      desc: 'Utilizamos cookies propias y de terceros para analizar el uso del sitio y personalizar tu experiencia. Puedes aceptar todas, rechazar las no esenciales o personalizar tu eleccion.',
      accept: 'Aceptar todas',
      reject: 'Rechazar todas',
      customize: 'Personalizar',
      prefsTitle: 'Preferencias de cookies',
      save: 'Guardar preferencias',
      essential: 'Esenciales',
      essentialDesc: 'Necesarias para el funcionamiento basico del sitio. No se pueden desactivar.',
      analytics: 'Analiticas',
      analyticsDesc: 'Nos ayudan a entender como se usa el sitio (Google Analytics). Los datos son anonimos.',
      marketing: 'Marketing',
      marketingDesc: 'Permiten realizar seguimiento de campanas y personalizar comunicaciones (Brevo).',
      always: 'Siempre activas',
      moreInfo: 'Mas informacion en nuestra <a href="/privacy.html">Politica de Privacidad</a>.',
      settingsLink: 'Configuracion de cookies'
    },
    en: {
      title: 'We use cookies',
      desc: 'We use our own and third-party cookies to analyze site usage and personalize your experience. You can accept all, reject non-essential ones, or customize your choice.',
      accept: 'Accept all',
      reject: 'Reject all',
      customize: 'Customize',
      prefsTitle: 'Cookie preferences',
      save: 'Save preferences',
      essential: 'Essential',
      essentialDesc: 'Required for basic site functionality. Cannot be disabled.',
      analytics: 'Analytics',
      analyticsDesc: 'Help us understand how the site is used (Google Analytics). Data is anonymous.',
      marketing: 'Marketing',
      marketingDesc: 'Allow campaign tracking and personalized communications (Brevo).',
      always: 'Always active',
      moreInfo: 'More information in our <a href="/privacy.html">Privacy Policy</a>.',
      settingsLink: 'Cookie settings'
    }
  };

  /* ---------- Cookie helpers (NOT localStorage) ---------- */
  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax;Secure';
  }
  function getCookie(name) {
    var m = document.cookie.match('(^|;)\\s*' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[2]) : null;
  }

  /* ---------- Consent state ---------- */
  function getConsent() {
    var raw = getCookie('c2g_cookie_consent');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch(e) { return null; }
  }
  function saveConsent(obj) {
    obj.timestamp = new Date().toISOString();
    setCookie('c2g_cookie_consent', JSON.stringify(obj), 365);
    applyConsent(obj);
    hideBanner();
    hidePrefs();
  }

  /* ---------- Apply consent: load/block scripts ---------- */
  function applyConsent(c) {
    if (c.analytics) loadGA4();
    if (c.marketing) enableBrevo();
  }

  /* GA4 — only load when consent given */
  var ga4Loaded = false;
  function loadGA4() {
    if (ga4Loaded) return;
    ga4Loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=G-97MNMCDEG2';
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', 'G-97MNMCDEG2');
    gtag('config', 'G-WMHZQ52NS2');
  }

  /* Brevo — set a flag so Brevo tracking can check */
  function enableBrevo() {
    window.__c2g_brevo_consent = true;
  }

  /* ---------- Detect language ---------- */
  function getLang() {
    var stored = null;
    try { stored = localStorage.getItem('c2g-lang'); } catch(e) {}
    if (stored === 'en' || stored === 'es') return stored;
    return document.documentElement.lang === 'en' ? 'en' : 'es';
  }

  /* ---------- Build DOM ---------- */
  function buildBanner() {
    var lang = getLang();
    var t = T[lang] || T.es;

    /* Overlay */
    var overlay = document.createElement('div');
    overlay.id = 'c2g-cookie-overlay';

    /* Banner */
    var banner = document.createElement('div');
    banner.id = 'c2g-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', t.title);
    banner.innerHTML =
      '<div class="c2g-cookie-inner">' +
        '<div class="c2g-cookie-text">' +
          '<h4>' + t.title + '</h4>' +
          '<p>' + t.desc + ' ' + t.moreInfo + '</p>' +
        '</div>' +
        '<div class="c2g-cookie-btns">' +
          '<button class="c2g-cookie-btn accept" id="c2g-accept">' + t.accept + '</button>' +
          '<button class="c2g-cookie-btn reject" id="c2g-reject">' + t.reject + '</button>' +
          '<button class="c2g-cookie-btn customize" id="c2g-customize">' + t.customize + '</button>' +
        '</div>' +
      '</div>';

    /* Preferences modal */
    var prefs = document.createElement('div');
    prefs.id = 'c2g-cookie-prefs';
    prefs.setAttribute('role', 'dialog');
    prefs.setAttribute('aria-label', t.prefsTitle);
    prefs.innerHTML =
      '<h3>' + t.prefsTitle + '</h3>' +
      '<div class="c2g-pref-cat">' +
        '<div class="c2g-pref-header"><label>' + t.essential + '</label><span class="c2g-badge">' + t.always + '</span></div>' +
        '<p class="c2g-pref-desc">' + t.essentialDesc + '</p>' +
      '</div>' +
      '<div class="c2g-pref-cat">' +
        '<div class="c2g-pref-header"><label for="c2g-tog-analytics">' + t.analytics + '</label>' +
          '<label class="c2g-toggle"><input type="checkbox" id="c2g-tog-analytics"><span class="slider"></span></label>' +
        '</div>' +
        '<p class="c2g-pref-desc">' + t.analyticsDesc + '</p>' +
      '</div>' +
      '<div class="c2g-pref-cat">' +
        '<div class="c2g-pref-header"><label for="c2g-tog-marketing">' + t.marketing + '</label>' +
          '<label class="c2g-toggle"><input type="checkbox" id="c2g-tog-marketing"><span class="slider"></span></label>' +
        '</div>' +
        '<p class="c2g-pref-desc">' + t.marketingDesc + '</p>' +
      '</div>' +
      '<div class="c2g-prefs-btns">' +
        '<button class="c2g-cookie-btn reject" id="c2g-prefs-reject">' + t.reject + '</button>' +
        '<button class="c2g-cookie-btn accept" id="c2g-prefs-save">' + t.save + '</button>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(banner);
    document.body.appendChild(prefs);

    /* Events */
    document.getElementById('c2g-accept').addEventListener('click', function(){
      saveConsent({essential:true, analytics:true, marketing:true});
    });
    document.getElementById('c2g-reject').addEventListener('click', function(){
      saveConsent({essential:true, analytics:false, marketing:false});
    });
    document.getElementById('c2g-customize').addEventListener('click', function(){
      showPrefs();
    });
    overlay.addEventListener('click', function(){
      hidePrefs();
    });
    document.getElementById('c2g-prefs-reject').addEventListener('click', function(){
      saveConsent({essential:true, analytics:false, marketing:false});
    });
    document.getElementById('c2g-prefs-save').addEventListener('click', function(){
      saveConsent({
        essential: true,
        analytics: !!document.getElementById('c2g-tog-analytics').checked,
        marketing: !!document.getElementById('c2g-tog-marketing').checked
      });
    });

    return { banner: banner, overlay: overlay, prefs: prefs };
  }

  var els = null;

  function showBanner() {
    if (!els) els = buildBanner();
    requestAnimationFrame(function(){
      els.banner.classList.add('active');
      els.overlay.classList.add('active');
    });
  }
  function hideBanner() {
    if (!els) return;
    els.banner.classList.remove('active');
    els.overlay.classList.remove('active');
  }
  function showPrefs() {
    if (!els) els = buildBanner();
    var c = getConsent();
    if (c) {
      document.getElementById('c2g-tog-analytics').checked = !!c.analytics;
      document.getElementById('c2g-tog-marketing').checked = !!c.marketing;
    }
    els.prefs.classList.add('active');
    els.overlay.classList.add('active');
    els.banner.classList.remove('active');
  }
  function hidePrefs() {
    if (!els) return;
    els.prefs.classList.remove('active');
    if (!getConsent()) {
      els.overlay.classList.add('active');
      els.banner.classList.add('active');
    } else {
      els.overlay.classList.remove('active');
    }
  }

  /* ---------- Update "Cookie Settings" links language ---------- */
  function updateSettingsLinks() {
    var lang = getLang();
    var t = T[lang] || T.es;
    document.querySelectorAll('.c2g-cookie-settings-link').forEach(function(el){
      el.textContent = t.settingsLink;
    });
  }

  /* ---------- Public: open prefs from footer link ---------- */
  window.c2gOpenCookiePrefs = function(){
    showPrefs();
  };

  /* ---------- Init ---------- */
  function init() {
    /* Inject CSS if not already present */
    if (!document.getElementById('c2g-cookie-css')) {
      var link = document.createElement('link');
      link.id = 'c2g-cookie-css';
      link.rel = 'stylesheet';
      /* Determine path: if we are in /link/, go up one level */
      var base = '/cookie-consent.css';
      link.href = base;
      document.head.appendChild(link);
    }

    var consent = getConsent();
    if (consent) {
      /* Returning visitor — apply saved prefs silently */
      applyConsent(consent);
    } else {
      /* First visit — show banner */
      showBanner();
    }
    updateSettingsLinks();

    /* Watch for language changes (the site toggles lang attribute) */
    var observer = new MutationObserver(function(mutations){
      mutations.forEach(function(m){
        if (m.attributeName === 'lang') {
          updateSettingsLinks();
          /* Rebuild banner/prefs with new language if visible */
          if (els) {
            var wasVisible = els.banner.classList.contains('active');
            var prefsVisible = els.prefs.classList.contains('active');
            els.banner.remove();
            els.overlay.remove();
            els.prefs.remove();
            els = null;
            if (wasVisible) showBanner();
            if (prefsVisible) showPrefs();
          }
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
