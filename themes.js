/* ==========================================================================
   Vanilla Case List — Seasonal theme engine
   --------------------------------------------------------------------------
   Picks a theme for the time of year, lets the visitor override it, and keeps
   that choice for next time. The palettes live in themes.css; this file owns
   the theme id on <html data-theme="…"> and the season's drawn ornaments.

   Load it from <head> WITHOUT defer so the attribute is set before the first
   paint — otherwise the classic palette flashes before the season kicks in.

   Resolution order, highest first:
     1. ?theme=<id> in the URL      (one-off preview, not remembered)
     2. the visitor's saved choice  (localStorage, unless it is "auto")
     3. today's date                (the windows in the THEMES table)
     4. "classic"

   Every ornament is drawn as SVG on a 24×24 grid and inherits its colour from
   the palette, so a season's marks always match its paper. No emoji: they
   render differently on every platform and never match the site's line work.
   The illustrated horizon behind the masthead lives in scenes.js.
   ========================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'vcl-seasonal-theme';
  var AUTO = 'auto';

  /* Shared attribute sets, so every mark shares one weight and one join. */
  var LINE = 'fill="none" stroke="currentColor" stroke-width="1.5" ' +
    'stroke-linecap="round" stroke-linejoin="round"';
  var SOLID = 'fill="currentColor"';

  /* -- the drawn marks ----------------------------------------------------- */
  /* Each is inner markup for a 24×24 viewBox. `emblem` is the header crest and
     the picker's icon; `fall` are the shapes that drift down the page and tile
     the background wash. */

  var MARK = {
    scales:
      '<circle cx="12" cy="4.3" r="1.3" ' + LINE + '/>' +
      '<path d="M12 5.6v13.2M8.4 18.8h7.2M4 8h16" ' + LINE + '/>' +
      '<path d="M4 8l-2.3 4.7a2.5 2.5 0 005 0zM20 8l-2.3 4.7a2.5 2.5 0 005 0z" ' + LINE + '/>',

    burst:
      '<circle cx="12" cy="12" r="2.3" ' + LINE + '/>' +
      '<path d="M12 3v4.2M12 16.8V21M3 12h4.2M16.8 12H21' +
      'M5.6 5.6l3 3M15.4 15.4l3 3M18.4 5.6l-3 3M8.6 15.4l-3 3" ' + LINE + '/>',

    confetti:
      '<rect x="6.5" y="9" width="11" height="6" rx="1.5" ' + SOLID + '/>',

    streamer:
      '<path d="M3 15c3-5 5 3 8-2s5 3 8-2" ' + LINE + '/>',

    star:
      '<path ' + SOLID + ' d="M12 3.4l2.2 5.2 5.7.5-4.3 3.7 1.3 5.5L12 15.4l-4.9 2.9 1.3-5.5' +
      '-4.3-3.7 5.7-.5L12 3.4z"/>',

    heart:
      '<path ' + SOLID + ' d="M12 20.3c-.35 0-.66-.13-.9-.36C7.06 16.1 4 13.3 4 9.9' +
      'A4.75 4.75 0 018.7 5c1.3 0 2.5.55 3.3 1.45A4.4 4.4 0 0115.3 5 4.75 4.75 0 0120 9.9' +
      'c0 3.4-3.06 6.2-7.1 10.04-.24.23-.55.36-.9.36z"/>',

    petal:
      '<path ' + SOLID + ' d="M12 3c3.6 2.6 5.5 5.7 5.5 9A5.5 5.5 0 0112 17.5' +
      'A5.5 5.5 0 016.5 12c0-3.3 1.9-6.4 5.5-9z"/>',

    egg:
      '<path d="M12 3.2c3.1 0 5.6 4.3 5.6 8.3s-2.5 9.3-5.6 9.3-5.6-5.3-5.6-9.3S8.9 3.2 12 3.2z" '
      + LINE + '/>' +
      '<path d="M6.9 10.4c1.2.9 2.3.9 3.5 0s2.3-.9 3.5 0 2.2.9 3.2 0" ' + LINE + '/>' +
      '<path d="M6.6 14.6c1.3.9 2.3.9 3.5 0s2.3-.9 3.5 0 2.2.9 3.3 0" ' + LINE + '/>',

    tulip:
      '<path d="M12 21v-7.5" ' + LINE + '/>' +
      '<path d="M12 13.5c-3.2 0-5.3-2.2-5.3-5.4 2 0 3.3.7 4.1 1.8C11.3 7.3 12 5.2 12 3.4' +
      'c0 1.8.7 3.9 1.2 6.5.8-1.1 2.1-1.8 4.1-1.8 0 3.2-2.1 5.4-5.3 5.4z" ' + LINE + '/>',

    blossom:
      '<g ' + SOLID + '><circle cx="12" cy="7.4" r="2.9"/><circle cx="16.6" cy="11.9" r="2.9"/>' +
      '<circle cx="12" cy="16.4" r="2.9"/><circle cx="7.4" cy="11.9" r="2.9"/></g>' +
      '<circle cx="12" cy="11.9" r="1.5" fill="none" stroke="currentColor" stroke-width="1.2"/>',

    sun:
      '<circle cx="12" cy="9.6" r="3.5" ' + LINE + '/>' +
      '<path d="M12 2.4v1.8M12 15v1.7M4.4 9.6h1.8M17.8 9.6h1.8' +
      'M6.7 4.3l1.3 1.3M16 13.6l1.3 1.3M17.3 4.3L16 5.6M8 13.6l-1.3 1.3" ' + LINE + '/>' +
      '<path d="M2.6 19.5c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" ' + LINE + '/>',

    wave:
      '<path d="M2 10c2.5 0 2.5-2.6 5-2.6S9.5 10 12 10s2.5-2.6 5-2.6S19.5 10 22 10" ' + LINE + '/>' +
      '<path d="M2 16c2.5 0 2.5-2.6 5-2.6S9.5 16 12 16s2.5-2.6 5-2.6S19.5 16 22 16" ' + LINE + '/>',

    shell:
      '<path d="M12 20.4c-4.4 0-8-3.8-8-8.6C4 7.5 7.6 4 12 4s8 3.5 8 7.8c0 4.8-3.6 8.6-8 8.6z" '
      + LINE + '/>' +
      '<path d="M12 20.4V4M8.4 19.3l1.8-14.6M15.6 19.3l-1.8-14.6" ' + LINE + '/>',

    maple:
      /* Five bold lobes, no micro-serrations: the fine teeth of a botanical
         maple disappear below about 40px, and the mark is drawn at 20–36. */
      '<path ' + SOLID + ' d="M12 2 13.6 6.4 17.6 4.6 16.8 9 21.6 8.6 18.6 12.4 22 15.2 ' +
      '16.4 15 13.2 17.6 12.9 22 11.1 22 10.8 17.6 7.6 15 2 15.2 5.4 12.4 2.4 8.6 7.2 9 ' +
      '6.4 4.6 10.4 6.4Z"/>',

    leaf:
      '<path ' + SOLID + ' d="M20 4c0 8.2-4.7 13.2-11 13.2-1.3 0-2.5-.2-3.6-.6C6.6 8.8 12.3 4 20 4z"/>' +
      '<path d="M18.2 5.8L4.6 19.4" ' + LINE + '/>',

    acorn:
      '<path ' + SOLID + ' d="M12 21.2c-3.2 0-5.7-2.7-5.7-6.3 0-2.6 2.1-4.9 5.7-4.9s5.7 2.3 5.7 4.9' +
      'c0 3.6-2.5 6.3-5.7 6.3z"/>' +
      '<rect x="5.4" y="7.9" width="13.2" height="2.4" rx="1.2" ' + SOLID + '/>' +
      '<path d="M12 7.9V5.2" ' + LINE + '/>',

    bat:
      '<path ' + SOLID + ' d="M1.8 8.2c1.9.2 3 1.3 3.5 2.7.5-2 1.7-3.1 3.1-3.1.6 0 1.1.2 1.5.5' +
      'L12 6.1l2.1 2.2c.4-.3.9-.5 1.5-.5 1.4 0 2.6 1.1 3.1 3.1.5-1.4 1.6-2.5 3.5-2.7' +
      '-.9 1.4-1 3.2-.9 4.9-1.7-.2-3.2.4-4.2 1.5-.9 1-1.5 2.1-1.9 3.3-.7-1.6-1.6-2.6-3.2-2.6' +
      's-2.5 1-3.2 2.6c-.4-1.2-1-2.3-1.9-3.3-1-1.1-2.5-1.7-4.2-1.5.1-1.7 0-3.5-.9-4.9z"/>',

    moon:
      '<path ' + SOLID + ' d="M20.2 14.8A8.7 8.7 0 019.2 3.8a8.7 8.7 0 1011 11z"/>',

    pumpkin:
      '<path ' + SOLID + ' d="M8.6 7.2c.9 0 1.7.3 2.3.9.4-.4.8-.6 1.1-.6s.7.2 1.1.6c.6-.6 1.4-.9 2.3-.9' +
      '2.6 0 4.6 2.8 4.6 6.4S18 20 15.4 20c-.9 0-1.7-.3-2.3-.9-.4.4-.8.6-1.1.6s-.7-.2-1.1-.6' +
      'c-.6.6-1.4.9-2.3.9C6 20 4 17.2 4 13.6s2-6.4 4.6-6.4z"/>' +
      '<path d="M12 7.2V4" ' + LINE + '/>',

    snowflake:
      '<path d="M12 2.4v19.2M3.7 7.2l16.6 9.6M20.3 7.2L3.7 16.8" ' + LINE + '/>' +
      '<path d="M12 6.6L9.6 4.2M12 6.6l2.4-2.4M12 17.4l-2.4 2.4M12 17.4l2.4 2.4" ' + LINE + '/>' +
      '<path d="M7.3 9.3L4 8.4M7.3 9.3l-.9-3.3M16.7 14.7l3.3.9M16.7 14.7l.9 3.3" ' + LINE + '/>' +
      '<path d="M7.3 14.7L4 15.6M7.3 14.7l-.9 3.3M16.7 9.3l3.3-.9M16.7 9.3l.9-3.3" ' + LINE + '/>',

    fir:
      '<path ' + SOLID + ' d="M12 2.6l3.3 5.1h-1.9l3.1 4.6h-2.1l3.5 5.1h-5.1V21h-1.6v-3.6H6.1' +
      'l3.5-5.1H7.5l3.1-4.6H8.7L12 2.6z"/>',

    bauble:
      '<circle cx="12" cy="14.3" r="5.7" ' + SOLID + '/>' +
      '<rect x="10.6" y="6.9" width="2.8" height="2.4" rx=".6" ' + SOLID + '/>' +
      '<path d="M12 6.9V3.9" ' + LINE + '/>',

    calendar:
      '<rect x="3.6" y="5.2" width="16.8" height="15.2" rx="2" ' + LINE + '/>' +
      '<path d="M8 3.2v4M16 3.2v4M3.6 10.2h16.8" ' + LINE + '/>'
  };

  /* Date windows are "MM-DD" and inclusive on both ends. A window whose end
     falls before its start wraps around New Year's Eve. */
  var THEMES = [
    {
      id: 'classic',
      label: 'Classic Vanilla',
      blurb: 'The courtroom cream the list has always worn.',
      windows: [],
      emblem: MARK.scales,
      fall: [],
      tints: ['--gold']
    },
    {
      id: 'newyear',
      label: 'New Year',
      blurb: 'Midnight navy, gold sparks over the rooftops.',
      windows: [['12-28', '01-06']],
      emblem: MARK.burst,
      fall: [MARK.star, MARK.confetti, MARK.streamer, MARK.burst],
      tints: ['--gold-light', '--blue-light', '--horizon-accent']
    },
    {
      id: 'valentines',
      label: "Valentine's",
      blurb: 'Rose paper, plum ink, a letter half-written.',
      windows: [['02-07', '02-16']],
      emblem: MARK.heart,
      fall: [MARK.heart, MARK.petal],
      tints: ['--paper', '--gold-light', '--blue-light']
    },
    {
      id: 'easter',
      label: 'Easter',
      blurb: 'Pastel spring, painted shells, first blossom.',
      windows: [['03-20', '04-21']],
      emblem: MARK.egg,
      fall: [MARK.egg, MARK.tulip, MARK.blossom],
      tints: ['--red', '--green', '--blue']
    },
    {
      id: 'summer',
      label: 'Summer',
      blurb: 'Sun-bleached sand, a long tide, salt in the air.',
      windows: [['06-15', '08-31']],
      emblem: MARK.sun,
      fall: [MARK.sun, MARK.wave, MARK.shell],
      tints: ['--paper', '--gold-light', '--red']
    },
    {
      id: 'autumn',
      label: 'Autumn',
      blurb: 'Amber and rust, the year turning over.',
      windows: [['09-15', '09-30'], ['11-03', '11-30']],
      emblem: MARK.maple,
      fall: [MARK.maple, MARK.leaf, MARK.acorn],
      tints: ['--gold-light', '--gold', '--green-light']
    },
    {
      id: 'halloween',
      label: 'Halloween',
      blurb: 'Pumpkin light on a bruised-purple night.',
      windows: [['10-01', '11-02']],
      emblem: MARK.bat,
      fall: [MARK.bat, MARK.moon, MARK.pumpkin],
      tints: ['--gold', '--gold-light', '--blue-light']
    },
    {
      id: 'christmas',
      label: 'Christmas',
      blurb: 'Holly red, deep pine, gold on the trim.',
      windows: [['12-01', '12-27']],
      emblem: MARK.snowflake,
      fall: [MARK.snowflake, MARK.fir, MARK.bauble],
      tints: ['--paper', '--gold-light', '--red']
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

  /* `themed` scopes an icon to a theme id, so its marks resolve against that
     season's accent rather than the page's current one. */
  function svgMarkup(inner, className, viewBox, themed) {
    return '<svg class="' + className + '" viewBox="' + (viewBox || '0 0 24 24') + '"' +
      (themed ? ' data-theme="' + themed + '"' : '') +
      ' aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  /* -- when ---------------------------------------------------------------- */

  /* "MM-DD" as an ordinal on a fixed non-leap calendar. Only ever compared
     against other ordinals from this helper, so the leap day sharing an
     ordinal with Mar 1 is harmless. */
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

  /* The season for a given day. When windows overlap the tighter one wins, so
     a one-week holiday beats a three-month season. */
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

  /* -- preference ---------------------------------------------------------- */

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

  /* -- ornaments ----------------------------------------------------------- */

  function prefersReducedMotion() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* The crest under the masthead: a drawn rule with the season's emblem set
     into the middle of it. */
  function renderCrest() {
    var header = document.querySelector('.site-header .header-inner');
    if (!header) return;

    var old = header.querySelector('.season-crest');
    if (old) old.remove();

    if (!state.active.windows.length) return;

    /* 300×40 board: rules out to the edges, a dot either side of the gap, and
       the 24-unit emblem scaled 1.5× and centred on 150. */
    var markup = '<g class="season-crest__rule">' +
      '<path d="M12 20h96"/><path d="M192 20h96"/>' +
      '<circle cx="116" cy="20" r="3"/><circle cx="184" cy="20" r="3"/>' +
      '</g>' +
      '<g transform="translate(132 2) scale(1.5)">' + state.active.emblem + '</g>';

    header.insertAdjacentHTML('beforeend',
      svgMarkup(markup, 'season-crest', '0 0 300 40'));
  }

  /* The backdrop behind the whole page: the season's own colour and weave
     (--scene in themes.css), with a sparse tile of its marks washed over it.
     A fixed layer rather than a body background, because a fixed background
     is ignored on iOS and the scene would smear down the full page height. */
  function renderBackdrop() {
    var old = document.querySelector('.season-backdrop');
    if (old) old.remove();

    var marks = state.active.fall;
    if (!marks.length) return;

    /* x, y, scale, rotation — scattered by hand so the tile reads as strewn
       rather than gridded. */
    var spots = [
      [16, 24, 0.85, -14], [96, 48, 0.62, 24], [52, 100, 0.74, 9],
      [126, 122, 0.55, -32], [8, 132, 0.6, 36], [146, 20, 0.5, 15]
    ];

    var cells = spots.map(function (spot, i) {
      return '<g transform="translate(' + spot[0] + ' ' + spot[1] + ') rotate(' +
        spot[3] + ') scale(' + spot[2] + ')">' + marks[i % marks.length] + '</g>';
    }).join('');

    var layer = document.createElement('div');
    layer.className = 'season-backdrop';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<svg aria-hidden="true" focusable="false">' +
      '<defs><pattern id="season-tile" width="168" height="168" ' +
      'patternUnits="userSpaceOnUse">' + cells + '</pattern></defs>' +
      '<rect width="100%" height="100%" fill="url(#season-tile)"/></svg>';

    document.body.insertBefore(layer, document.body.firstChild);
  }

  /* The illustrated scene behind the masthead, drawn by scenes.js at the
     header's real size. A ResizeObserver redraws it whenever that size
     changes: the logo loading, a font swapping in, a window resize. The
     archive and library heroes keep their own identity and get no scene. */
  var sceneDrawn = { id: '', w: 0, h: 0 };
  var sceneObserver = null;

  function renderScene(force) {
    var header = document.querySelector(
      '.site-header:not(.page-hero-archive):not(.page-hero-resources)');
    if (!header) return;

    var id = state.active.id;
    var w = header.clientWidth;
    var h = header.clientHeight;
    if (!force && id === sceneDrawn.id &&
      Math.abs(w - sceneDrawn.w) < 2 && Math.abs(h - sceneDrawn.h) < 2) return;
    sceneDrawn = { id: id, w: w, h: h };

    var old = header.querySelector('.season-scene');
    if (old) old.remove();

    if (window.VCLScenes && window.VCLScenes.has(id)) {
      var logo = header.querySelector('.site-logo');
      var clear = (logo ? logo.getBoundingClientRect().width / 2 : Math.min(w * 0.3, 250)) + 24;
      header.insertAdjacentHTML('afterbegin', window.VCLScenes.draw(id, w, h, clear));
    }

    if (!sceneObserver && window.ResizeObserver) {
      var queued = false;
      sceneObserver = new ResizeObserver(function () {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(function () {
          queued = false;
          renderScene(false);
        });
      });
      sceneObserver.observe(header);
    }
  }

  /* The marks that drift down the page. */
  function renderDrift() {
    var old = document.querySelector('.season-fx');
    if (old) old.remove();

    var marks = state.active.fall;
    if (!marks.length || prefersReducedMotion()) return;

    var tints = state.active.tints;
    var layer = document.createElement('div');
    layer.className = 'season-fx';
    layer.setAttribute('aria-hidden', 'true');

    for (var i = 0; i < 16; i++) {
      var piece = document.createElement('span');
      var size = (18 + Math.random() * 16).toFixed(0);

      piece.innerHTML = svgMarkup(marks[i % marks.length], 'season-fx__mark');
      piece.style.left = Math.round((i / 16) * 100 + (Math.random() * 6 - 3)) + '%';
      piece.style.width = size + 'px';
      piece.style.height = size + 'px';
      piece.style.color = 'var(' + tints[i % tints.length] + ')';
      piece.style.opacity = (0.35 + Math.random() * 0.35).toFixed(2);
      piece.style.setProperty('--drift', (Math.random() * 10 - 5).toFixed(1) + 'vw');
      piece.style.setProperty('--spin', Math.round(Math.random() * 540 - 270) + 'deg');
      piece.style.animationDuration = (13 + Math.random() * 14).toFixed(1) + 's';
      piece.style.animationDelay = (-Math.random() * 24).toFixed(1) + 's';
      layer.appendChild(piece);
    }

    document.body.appendChild(layer);
  }

  /* -- picker -------------------------------------------------------------- */

  function describeWindows(theme) {
    if (!theme.windows.length) return 'all year';
    return theme.windows.map(describeWindow).join(', ');
  }

  /* A window inside one month collapses to "Sep 15–30". Autumn's two windows
     spelled out in full overflow the picker; collapsed, they fit. */
  function describeWindow(window) {
    var from = window[0].split('-');
    var to = window[1].split('-');
    var fromMonth = MONTH_NAMES[parseInt(from[0], 10) - 1];
    var toMonth = MONTH_NAMES[parseInt(to[0], 10) - 1];
    var fromDay = parseInt(from[1], 10);
    var toDay = parseInt(to[1], 10);

    return fromMonth === toMonth
      ? fromMonth + ' ' + fromDay + '–' + toDay
      : fromMonth + ' ' + fromDay + '–' + toMonth + ' ' + toDay;
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
    toggle.innerHTML = svgMarkup(state.active.emblem, 'theme-switcher__icon') +
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
      emblem: MARK.calendar,
      windowText: 'follows the date'
    }].concat(THEMES.map(function (theme) {
      return {
        id: theme.id,
        label: theme.label,
        emblem: theme.emblem,
        windowText: describeWindows(theme)
      };
    }));

    options.forEach(function (option) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'theme-switcher__option';
      button.setAttribute('aria-current',
        (!state.previewed && option.id === state.preference) ? 'true' : 'false');
      button.innerHTML =
        svgMarkup(option.emblem, 'theme-switcher__icon', null,
          option.id === AUTO ? null : option.id) +
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

  function dress() {
    renderCrest();
    renderBackdrop();
    renderScene(true);
    renderDrift();
    renderSwitcher();
  }

  function setTheme(id) {
    if (id !== AUTO && !byId(id)) return;

    state.previewed = false;
    state.preference = id;
    writeStored(id);
    apply(id === AUTO ? themeForDate(new Date()) : byId(id));

    if (document.body) dress();
  }

  apply(resolve());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dress);
  } else {
    dress();
  }

  window.VCLThemes = {
    list: function () { return THEMES.slice(); },
    active: function () { return state.active.id; },
    preference: function () { return state.preference; },
    forDate: function (date) { return themeForDate(date).id; },
    markup: svgMarkup,
    describeWindows: describeWindows,
    /* For scenes.js, which draws with the same marks and asks for a redraw
       once it has loaded. */
    marks: MARK,
    redraw: function () {
      if (document.body) renderScene(true);
    },
    set: setTheme
  };
}());
