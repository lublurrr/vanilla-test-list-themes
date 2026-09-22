/* ==========================================================================
   Vanilla Case List — Seasonal theme engine
   --------------------------------------------------------------------------
   Picks a theme for the time of year, lets the visitor override it, and keeps
   that choice for next time. The visual work all lives in themes.css; this
   file only decides which theme id is on <html data-theme="…">.

   Load it from <head> WITHOUT defer so the attribute is set before the first
   paint — otherwise the classic palette flashes before the season kicks in.

   Resolution order, highest first:
     1. ?theme=<id> in the URL      (one-off preview, not remembered)
     2. the visitor's saved choice  (localStorage, unless it is "auto")
     3. today's date                (the windows in the THEMES table)
     4. "classic"

   To add a season: add an entry here and a matching :root[data-theme="<id>"]
   block in themes.css. Nothing else in the site needs to know about it.
   ========================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'vcl-seasonal-theme';
  var AUTO = 'auto';

  /* Date windows are "MM-DD" and inclusive on both ends. A window whose end
     falls before its start wraps around New Year's Eve. */
  var THEMES = [
    {
      id: 'classic',
      label: 'Classic Vanilla',
      glyph: '⚖️',
      blurb: 'The courtroom cream the list has always worn.',
      windows: [],
      fx: []
    },
    {
      id: 'newyear',
      label: 'New Year',
      glyph: '✨',
      blurb: 'Midnight navy and gold confetti.',
      windows: [['12-28', '01-06']],
      fx: ['✨', '🎊', '🥂']
    },
    {
      id: 'valentines',
      label: "Valentine's",
      glyph: '❤️',
      blurb: 'Rose paper, plum ink.',
      windows: [['02-07', '02-16']],
      fx: ['💖', '💕']
    },
    {
      id: 'easter',
      label: 'Easter',
      glyph: '🐰',
      blurb: 'Pastel spring and painted eggs.',
      windows: [['03-20', '04-21']],
      fx: ['🥚', '🐣', '🌷']
    },
    {
      id: 'summer',
      label: 'Summer',
      glyph: '☀️',
      blurb: 'Sun-bleached sand and sea.',
      windows: [['06-15', '08-31']],
      fx: ['☀️', '🌊', '🐚']
    },
    {
      id: 'autumn',
      label: 'Autumn',
      glyph: '🍂',
      blurb: 'Amber, rust and falling leaves.',
      windows: [['09-15', '09-30'], ['11-03', '11-30']],
      fx: ['🍁', '🍂']
    },
    {
      id: 'halloween',
      label: 'Halloween',
      glyph: '🎃',
      blurb: 'Pumpkin on a bruised-purple night.',
      windows: [['10-01', '11-02']],
      fx: ['🎃', '🦇', '👻']
    },
    {
      id: 'christmas',
      label: 'Christmas',
      glyph: '🎄',
      blurb: 'Holly red, pine green, gold trim.',
      windows: [['12-01', '12-27']],
      fx: ['❄️', '🎄', '🎁']
    }
  ];

  var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function byId(id) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === id) return THEMES[i];
    }
    return null;
  }

  /* "MM-DD" as a day-of-year ordinal on a fixed non-leap calendar. Only ever
     compared against other ordinals from the same helper, so the leap day
     landing on the same ordinal as Mar 1 is harmless. */
  function ordinal(mmdd) {
    var parts = String(mmdd).split('-');
    return parseInt(parts[0], 10) * 100 + parseInt(parts[1], 10);
  }

  function todayOrdinal(date) {
    return (date.getMonth() + 1) * 100 + date.getDate();
  }

  function inWindow(today, window) {
    var start = ordinal(window[0]);
    var end = ordinal(window[1]);
    if (start <= end) return today >= start && today <= end;
    /* Wraps past New Year: Dec 28 – Jan 6 is two ranges in one. */
    return today >= start || today <= end;
  }

  function windowSpan(window) {
    var start = ordinal(window[0]);
    var end = ordinal(window[1]);
    return start <= end ? end - start : (1231 - start) + end;
  }

  /* The season for a given day. When windows overlap, the tighter one wins,
     so a one-week holiday beats a three-month season. */
  function themeForDate(date) {
    var today = todayOrdinal(date);
    var best = null;
    var bestSpan = Infinity;

    for (var i = 0; i < THEMES.length; i++) {
      var theme = THEMES[i];
      for (var w = 0; w < theme.windows.length; w++) {
        if (!inWindow(today, theme.windows[w])) continue;
        var span = windowSpan(theme.windows[w]);
        if (span < bestSpan) {
          best = theme;
          bestSpan = span;
        }
      }
    }

    return best || byId('classic');
  }

  /* localStorage is unavailable in some privacy modes; a lost preference is
     not worth breaking the page over. */
  function readStored() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }
  }

  function writeStored(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (err) {
      /* ignore */
    }
  }

  function readUrlTheme() {
    var match = /[?&]theme=([^&#]+)/.exec(window.location.search);
    return match ? decodeURIComponent(match[1]) : null;
  }

  var state = {
    /* The stored preference: a theme id, or AUTO to follow the calendar. */
    preference: AUTO,
    /* The theme actually on screen. */
    active: byId('classic'),
    /* A ?theme= preview overrides the preference without replacing it. */
    previewed: false
  };

  function resolve() {
    var urlTheme = readUrlTheme();
    if (urlTheme && byId(urlTheme)) {
      state.previewed = true;
      return byId(urlTheme);
    }

    var stored = readStored();
    state.preference = stored && (stored === AUTO || byId(stored)) ? stored : AUTO;

    if (state.preference !== AUTO) return byId(state.preference);
    return themeForDate(new Date());
  }

  function apply(theme) {
    state.active = theme;
    document.documentElement.setAttribute('data-theme', theme.id);
    document.documentElement.setAttribute('data-theme-source',
      state.previewed ? 'url' : (state.preference === AUTO ? 'season' : 'manual'));
  }

  /* -- decoration ---------------------------------------------------------- */

  function prefersReducedMotion() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function renderOrnament() {
    var header = document.querySelector('.site-header .header-inner');
    if (!header) return;

    var mark = header.querySelector('.season-mark');
    if (!state.active.windows.length && state.active.id === 'classic') {
      if (mark) mark.remove();
      return;
    }

    if (!mark) {
      mark = document.createElement('p');
      mark.className = 'season-mark';
      mark.setAttribute('aria-hidden', 'true');
      header.appendChild(mark);
    }
    mark.textContent = state.active.glyph + ' ' + state.active.glyph + ' ' + state.active.glyph;
  }

  function renderFx() {
    var existing = document.querySelector('.season-fx');
    if (existing) existing.remove();

    var glyphs = state.active.fx;
    if (!glyphs || !glyphs.length || prefersReducedMotion()) return;

    var layer = document.createElement('div');
    layer.className = 'season-fx';
    layer.setAttribute('aria-hidden', 'true');

    for (var i = 0; i < 14; i++) {
      var piece = document.createElement('span');
      piece.textContent = glyphs[i % glyphs.length];
      piece.style.left = Math.round((i / 14) * 100 + (Math.random() * 6 - 3)) + '%';
      piece.style.setProperty('--drift', (Math.random() * 10 - 5).toFixed(1) + 'vw');
      piece.style.setProperty('--spin', Math.round(Math.random() * 540 - 270) + 'deg');
      piece.style.animationDuration = (11 + Math.random() * 12).toFixed(1) + 's';
      piece.style.animationDelay = (-Math.random() * 20).toFixed(1) + 's';
      piece.style.fontSize = (1.1 + Math.random() * 0.9).toFixed(2) + 'rem';
      layer.appendChild(piece);
    }

    document.body.appendChild(layer);
  }

  /* -- picker -------------------------------------------------------------- */

  function describeWindows(theme) {
    if (!theme.windows.length) return 'all year';
    return theme.windows.map(function (window) {
      return label(window[0]) + '–' + label(window[1]);
    }).join(', ');
  }

  function label(mmdd) {
    var parts = mmdd.split('-');
    return MONTH_NAMES[parseInt(parts[0], 10) - 1] + ' ' + parseInt(parts[1], 10);
  }

  function renderSwitcher() {
    var existing = document.querySelector('.theme-switcher');
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.className = 'theme-switcher';

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'theme-switcher__toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-haspopup', 'true');
    toggle.innerHTML = '<span aria-hidden="true">' + state.active.glyph + '</span>' +
      '<span>Theme: ' + state.active.label + '</span>';

    var panel = document.createElement('div');
    panel.className = 'theme-switcher__panel';
    panel.hidden = true;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Seasonal theme');

    var title = document.createElement('p');
    title.className = 'theme-switcher__title';
    title.textContent = 'Seasonal theme';
    panel.appendChild(title);

    var hint = document.createElement('p');
    hint.className = 'theme-switcher__hint';
    hint.textContent = state.previewed
      ? 'Previewing a theme from the link you followed. Pick one below to keep it.'
      : 'Leave it on Automatic and the site dresses itself for the time of year.';
    panel.appendChild(hint);

    var options = [{
      id: AUTO,
      label: 'Automatic',
      glyph: '📅',
      windowText: 'follows the date'
    }].concat(THEMES.map(function (theme) {
      return {
        id: theme.id,
        label: theme.label,
        glyph: theme.glyph,
        windowText: describeWindows(theme)
      };
    }));

    options.forEach(function (option) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'theme-switcher__option';
      button.setAttribute('aria-current',
        (!state.previewed && option.id === state.preference) ? 'true' : 'false');
      button.innerHTML = '<span aria-hidden="true">' + option.glyph + '</span>' +
        '<span>' + option.label + '</span>' +
        '<span class="theme-switcher__option-window">' + option.windowText + '</span>';
      button.addEventListener('click', function () {
        setTheme(option.id);
        closePanel();
      });
      panel.appendChild(button);
    });

    function openPanel() {
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', onOutsideClick, true);
      document.addEventListener('keydown', onEscape);
    }

    function closePanel() {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onOutsideClick, true);
      document.removeEventListener('keydown', onEscape);
    }

    function onOutsideClick(event) {
      if (!wrap.contains(event.target)) closePanel();
    }

    function onEscape(event) {
      if (event.key === 'Escape') {
        closePanel();
        toggle.focus();
      }
    }

    toggle.addEventListener('click', function () {
      if (panel.hidden) openPanel();
      else closePanel();
    });

    wrap.appendChild(panel);
    wrap.appendChild(toggle);
    document.body.appendChild(wrap);
  }

  /* -- public surface ------------------------------------------------------ */

  function setTheme(id) {
    if (id !== AUTO && !byId(id)) return;

    state.previewed = false;
    state.preference = id;
    writeStored(id);
    apply(id === AUTO ? themeForDate(new Date()) : byId(id));

    if (document.body) {
      renderOrnament();
      renderFx();
      renderSwitcher();
    }
  }

  apply(resolve());

  function init() {
    renderOrnament();
    renderFx();
    renderSwitcher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.VCLThemes = {
    list: function () { return THEMES.slice(); },
    active: function () { return state.active.id; },
    preference: function () { return state.preference; },
    forDate: function (date) { return themeForDate(date).id; },
    set: setTheme
  };
}());
