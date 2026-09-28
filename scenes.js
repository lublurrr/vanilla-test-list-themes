/* ==========================================================================
   Vanilla Case List — Seasonal scenes
   --------------------------------------------------------------------------
   The illustrated horizon behind the masthead: a skyline for New Year,
   rolling hills for Easter, the tide for Summer, a graveyard hill for
   Halloween, and so on. themes.js decides when to draw one; this file only
   knows how.

   Every scene is drawn procedurally at the header's real pixel size, rather
   than scaled from a fixed canvas: a skyline stretched from 1600 units down to
   a phone either crops away everything interesting or squashes it. Drawn to
   size, the art always fills the width and always steps aside for the logo.

   Colours come from the --horizon-* tokens in themes.css, and the shapes are
   seeded per season, so a scene is the same on every visit and every reload.
   ========================================================================== */

(function () {
  'use strict';

  if (!window.VCLThemes) return;

  var MARK = window.VCLThemes.marks;
  var TAU = Math.PI * 2;

  /* -- tools --------------------------------------------------------------- */

  /* mulberry32: small, fast, and the same sequence for the same seed. */
  function seeded(text) {
    var seed = 0;
    for (var i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) | 0;
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function n(value) {
    return Math.round(value * 10) / 10;
  }

  function fill(token, opacity) {
    return ' style="fill:var(' + token + ')' + (opacity != null ? ';opacity:' + opacity : '') + '"';
  }

  function stroke(token, width, opacity) {
    return ' style="fill:none;stroke:var(' + token + ');stroke-width:' + n(width) +
      ';stroke-linecap:round;stroke-linejoin:round' +
      (opacity != null ? ';opacity:' + opacity : '') + '"';
  }

  /* One of the 24×24 marks from themes.js, centred on (x, y) at `size` px. */
  function mark(inner, x, y, size, angle, token, opacity) {
    return '<g transform="translate(' + n(x) + ' ' + n(y) + ') rotate(' + n(angle || 0) +
      ') scale(' + (size / 24).toFixed(3) + ') translate(-12 -12)" style="color:var(' + token +
      ')' + (opacity != null ? ';opacity:' + opacity : '') + '">' + inner + '</g>';
  }

  /* True when x falls in the column the logo, credits and crest occupy. */
  function inCentre(ctx, x, margin) {
    return Math.abs(x - ctx.w / 2) < ctx.clear + (margin || 0);
  }

  /* A rolling ridge `base` px tall with `amp` px of swell. It calms down
     towards the middle so the crest and credits always sit on open sky. */
  function ridge(ctx, base, amp, waves, phase) {
    function top(x) {
      var t = x / ctx.w * TAU;
      var swell = 0.6 * Math.sin(t * waves + phase) + 0.4 * Math.sin(t * waves * 2.7 + phase * 1.9);
      var d = Math.abs(x - ctx.w / 2) / Math.max(ctx.clear, 1);
      var calm = d < 1 ? 0.6 + 0.4 * d * d : 1;
      return ctx.h - (base + amp * swell) * calm;
    }

    var steps = Math.max(24, Math.round(ctx.w / 18));
    var d = 'M0 ' + ctx.h;
    for (var i = 0; i <= steps; i++) {
      var x = i / steps * ctx.w;
      d += 'L' + n(x) + ' ' + n(top(x));
    }
    d += 'L' + n(ctx.w) + ' ' + ctx.h + 'Z';

    return {
      top: top,
      draw: function (token) { return '<path d="' + d + '"' + fill(token) + '/>'; }
    };
  }

  /* A sine swell for the sea, with an optional line of foam along its crest. */
  function swell(ctx, base, amp, length, phase, token, foam) {
    var line = '';
    for (var x = 0; x <= ctx.w + 8; x += 8) {
      var y = ctx.h - base - amp * Math.sin(x / length * TAU + phase);
      line += (x ? 'L' : 'M') + n(x) + ' ' + n(y);
    }
    var body = '<path d="' + line + 'L' + n(ctx.w + 8) + ' ' + ctx.h + 'L0 ' + ctx.h + 'Z"' +
      fill(token) + '/>';
    return body + (foam ? '<path d="' + line + '"' + stroke('--horizon-light', 1.6 * ctx.u + 0.6, 0.65) + '/>' : '');
  }

  /* -- New Year: fireworks over a lit skyline ------------------------------ */

  function firework(cx, cy, radius, token, rand) {
    var rays = 18;
    var d = '';
    var sparks = '';
    for (var i = 0; i < rays; i++) {
      var a = i / rays * TAU + rand() * 0.14;
      var inner = radius * 0.24;
      var outer = radius * (0.74 + rand() * 0.26);
      d += 'M' + n(cx + Math.cos(a) * inner) + ' ' + n(cy + Math.sin(a) * inner) +
        'L' + n(cx + Math.cos(a) * outer) + ' ' + n(cy + Math.sin(a) * outer);
      sparks += '<circle cx="' + n(cx + Math.cos(a) * (outer + radius * 0.1)) + '" cy="' +
        n(cy + Math.sin(a) * (outer + radius * 0.1)) + '" r="' + n(Math.max(1, radius * 0.03)) + '"/>';
    }
    return '<g style="color:var(' + token + ');opacity:.85">' +
      '<path d="' + d + '" style="fill:none;stroke:currentColor;stroke-width:' +
      n(Math.max(1, radius * 0.032)) + ';stroke-linecap:round"/>' +
      '<g style="fill:currentColor">' + sparks + '</g></g>';
  }

  function skyline(ctx, tallest, shortest, token, lit) {
    var rand = ctx.rand;
    var out = '';
    var x = -6;
    while (x < ctx.w + 6) {
      var width = (24 + rand() * 50) * Math.max(ctx.u, 0.4);
      var centre = inCentre(ctx, x + width / 2);
      var height = shortest + rand() * (tallest - shortest);
      if (centre) height *= 0.42;
      var top = ctx.h - height;

      out += '<rect x="' + n(x) + '" y="' + n(top) + '" width="' + n(width + 0.6) +
        '" height="' + n(height) + '"' + fill(token) + '/>';

      /* The odd spire or stepped roof, never over the logo's column. */
      if (!centre && rand() < 0.22) {
        out += '<rect x="' + n(x + width / 2 - 1.5 * ctx.u) + '" y="' + n(top - 16 * ctx.u) +
          '" width="' + n(3 * ctx.u + 0.5) + '" height="' + n(16 * ctx.u) + '"' + fill(token) + '/>';
      } else if (!centre && rand() < 0.3) {
        out += '<rect x="' + n(x + width * 0.2) + '" y="' + n(top - 9 * ctx.u) + '" width="' +
          n(width * 0.6) + '" height="' + n(9 * ctx.u + 0.5) + '"' + fill(token) + '/>';
      }

      if (lit && ctx.u > 0.5) {
        for (var wy = top + 7 * ctx.u; wy < ctx.h - 8 * ctx.u; wy += 12 * ctx.u) {
          for (var wx = x + 5 * ctx.u; wx < x + width - 8 * ctx.u; wx += 9 * ctx.u) {
            if (rand() < 0.27) {
              out += '<rect x="' + n(wx) + '" y="' + n(wy) + '" width="' + n(4 * ctx.u) +
                '" height="' + n(6 * ctx.u) + '"' + fill('--horizon-light', 0.9) + '/>';
            }
          }
        }
      }

      x += width + rand() * 5 - 1;
    }
    return out;
  }

  function newyear(ctx) {
    var out = '';
    var colours = ['--horizon-light', '--horizon-accent', '--blue-light'];
    [[0.11, 0.24, 74], [0.89, 0.2, 88], [0.24, 0.1, 38], [0.78, 0.44, 48],
      [0.05, 0.52, 32], [0.96, 0.56, 36], [0.33, 0.4, 28]].forEach(function (b, i) {
      var x = b[0] * ctx.w;
      var radius = b[2] * ctx.u;
      if (inCentre(ctx, x, radius)) return;
      out += firework(x, b[1] * ctx.h, radius, colours[i % colours.length], ctx.rand);
    });
    out += skyline(ctx, ctx.hz * 0.78, ctx.hz * 0.38, '--horizon-far', false);
    out += skyline(ctx, ctx.hz, ctx.hz * 0.26, '--horizon-near', true);
    return out;
  }

  /* -- Valentine's: heart garlands over a lace edge ------------------------ */

  function garland(ctx, x0, x1, sag) {
    if (x1 - x0 < 70 * ctx.u) return '';
    var cx = (x0 + x1) / 2;
    var cy = sag * 2;
    var out = '<path d="M' + n(x0) + ' 0Q' + n(cx) + ' ' + n(cy) + ' ' + n(x1) + ' 0"' +
      stroke('--horizon-near', 1.5 * ctx.u + 0.5, 0.9) + '/>';
    var count = Math.max(3, Math.round((x1 - x0) / (54 * ctx.u)));
    for (var i = 1; i < count; i++) {
      var t = i / count;
      var x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      var y = 2 * (1 - t) * t * cy;
      var drop = 8 * ctx.u;
      out += '<path d="M' + n(x) + ' ' + n(y) + 'V' + n(y + drop) + '"' +
        stroke('--horizon-near', ctx.u + 0.4, 0.9) + '/>';
      out += mark(MARK.heart, x, y + drop + 8 * ctx.u, 20 * ctx.u, 0,
        i % 2 ? '--horizon-accent' : '--horizon-light');
    }
    return out;
  }

  function valentines(ctx) {
    var out = '';
    [[0.09, 0.3, 50, -12], [0.2, 0.6, 26, 10], [0.91, 0.28, 58, 14], [0.8, 0.58, 30, -8],
      [0.96, 0.66, 20, 6], [0.04, 0.72, 24, -4]].forEach(function (s) {
      var x = s[0] * ctx.w;
      if (inCentre(ctx, x, s[2] * ctx.u)) return;
      out += mark(MARK.heart, x, s[1] * ctx.h, s[2] * ctx.u, s[3], '--horizon-light', 0.5);
    });

    out += garland(ctx, -10, ctx.w / 2 - ctx.clear - 12, ctx.h * 0.2);
    out += garland(ctx, ctx.w / 2 + ctx.clear + 12, ctx.w + 10, ctx.h * 0.2);

    /* The lace: a scalloped band, an eyelet in every scallop, a row of pricks. */
    var depth = ctx.hz * 0.4;
    var top = ctx.h - depth;
    var r = Math.max(6, 17 * ctx.u);
    out += '<rect x="0" y="' + n(top) + '" width="' + n(ctx.w) + '" height="' + n(depth) + '"' +
      fill('--horizon-near') + '/>';
    for (var x = 0; x < ctx.w + r * 2; x += r * 2) {
      out += '<circle cx="' + n(x) + '" cy="' + n(top) + '" r="' + n(r) + '"' + fill('--horizon-near') + '/>';
      out += '<circle cx="' + n(x) + '" cy="' + n(top - r * 0.3) + '" r="' + n(r * 0.3) + '"' +
        fill('--horizon-far') + '/>';
    }
    for (var px = r / 2; px < ctx.w; px += r) {
      out += '<circle cx="' + n(px) + '" cy="' + n(top + depth * 0.42) + '" r="' +
        n(Math.max(1.1, r * 0.12)) + '"' + fill('--horizon-far', 0.8) + '/>';
    }
    out += '<rect x="0" y="' + n(top + depth * 0.7) + '" width="' + n(ctx.w) + '" height="' +
      n(Math.max(1, 1.4 * ctx.u)) + '"' + fill('--horizon-far', 0.5) + '/>';
    return out;
  }

  /* -- Easter: painted eggs on spring hills -------------------------------- */

  function cloud(x, y, s) {
    return '<g' + fill('--horizon-light', 0.92) + '>' +
      '<circle cx="' + n(x - 22 * s) + '" cy="' + n(y + 4 * s) + '" r="' + n(17 * s) + '"/>' +
      '<circle cx="' + n(x) + '" cy="' + n(y - 7 * s) + '" r="' + n(25 * s) + '"/>' +
      '<circle cx="' + n(x + 25 * s) + '" cy="' + n(y + 3 * s) + '" r="' + n(19 * s) + '"/>' +
      '<rect x="' + n(x - 38 * s) + '" y="' + n(y + 4 * s) + '" width="' + n(80 * s) +
      '" height="' + n(17 * s) + '" rx="' + n(8 * s) + '"/></g>';
  }

  function tulip(ctx, x, y, height, token) {
    var head = y - height * 0.72;
    var hw = height * 0.2;
    return '<path d="M' + n(x) + ' ' + n(y) + 'V' + n(head) + '"' + stroke('--green', 1.5 * ctx.u + 0.4) + '/>' +
      '<path d="M' + n(x - hw) + ' ' + n(head) +
      'Q' + n(x - hw * 1.1) + ' ' + n(head - hw * 1.8) + ' ' + n(x - hw * 0.4) + ' ' + n(head - hw * 1.5) +
      'L' + n(x) + ' ' + n(head - hw * 0.8) +
      'L' + n(x + hw * 0.4) + ' ' + n(head - hw * 1.5) +
      'Q' + n(x + hw * 1.1) + ' ' + n(head - hw * 1.8) + ' ' + n(x + hw) + ' ' + n(head) +
      'Q' + n(x) + ' ' + n(head + hw) + ' ' + n(x - hw) + ' ' + n(head) + 'Z"' + fill(token) + '/>';
  }

  function egg(ctx, cx, base, height, token) {
    var rx = height * 0.38;
    var cy = base - height * 0.44;
    var top = height * 0.56;
    var bottom = height * 0.44;
    var zig = '';
    var teeth = 6;
    for (var i = 0; i <= teeth; i++) {
      var zx = cx - rx * 0.96 + i / teeth * rx * 1.92;
      zig += (i ? 'L' : 'M') + n(zx) + ' ' + n(cy + (i % 2 ? height * 0.07 : -height * 0.07));
    }
    return '<path d="M' + n(cx - rx) + ' ' + n(cy) + 'A' + n(rx) + ' ' + n(top) + ' 0 0 1 ' +
      n(cx + rx) + ' ' + n(cy) + 'A' + n(rx) + ' ' + n(bottom) + ' 0 0 1 ' + n(cx - rx) + ' ' +
      n(cy) + 'Z"' + fill(token) + '/>' +
      '<path d="' + zig + '"' + stroke('--horizon-light', Math.max(1.2, height * 0.06)) + '/>' +
      /* A second, straight band above the zigzag. Dots here, the first try,
         sat over the zigzag like two eyes over a grin. */
      '<path d="M' + n(cx - rx * 0.78) + ' ' + n(cy - height * 0.24) + 'L' + n(cx + rx * 0.78) + ' ' +
      n(cy - height * 0.24) + '"' + stroke('--horizon-light', Math.max(1, height * 0.045), 0.85) + '/>';
  }

  function easter(ctx) {
    var out = '';
    [[0.11, 0.22, 1.1], [0.87, 0.16, 1.3], [0.95, 0.46, 0.8], [0.2, 0.5, 0.75]].forEach(function (c) {
      var x = c[0] * ctx.w;
      if (inCentre(ctx, x, 50 * c[2] * ctx.u)) return;
      out += cloud(x, c[1] * ctx.h, c[2] * ctx.u);
    });

    var far = ridge(ctx, ctx.hz * 0.62, ctx.hz * 0.14, 1.4, 0.4);
    var mid = ridge(ctx, ctx.hz * 0.42, ctx.hz * 0.1, 2.1, 1.3);
    var near = ridge(ctx, ctx.hz * 0.2, ctx.hz * 0.06, 3, 2.2);
    out += far.draw('--horizon-far') + mid.draw('--horizon-mid');

    var petals = ['--red', '--horizon-accent', '--gold-light', '--blue-light'];
    var rand = ctx.rand;
    for (var x = 12 * ctx.u; x < ctx.w; x += (26 + rand() * 26) * ctx.u) {
      if (inCentre(ctx, x, 10)) continue;
      out += tulip(ctx, x, mid.top(x) + 6 * ctx.u, (24 + rand() * 12) * ctx.u,
        petals[Math.floor(rand() * petals.length)]);
    }

    out += near.draw('--horizon-near');

    var shells = ['--horizon-accent', '--red', '--blue-light', '--gold-light'];
    [0.07, 0.22, 0.78, 0.93].forEach(function (p, i) {
      var ex = p * ctx.w;
      if (inCentre(ctx, ex, 20 * ctx.u)) return;
      out += egg(ctx, ex, near.top(ex) + 3 * ctx.u, 34 * ctx.u, shells[i]);
    });
    return out;
  }

  /* -- Summer: gulls, a sail, and the tide -------------------------------- */

  function summer(ctx) {
    var out = '';
    [[0.09, 0.2, 1], [0.15, 0.3, 0.7], [0.84, 0.16, 1.1], [0.9, 0.26, 0.8], [0.77, 0.34, 0.6]].forEach(function (g) {
      var x = g[0] * ctx.w;
      var y = g[1] * ctx.h;
      var s = g[2] * 1.3 * ctx.u;
      if (inCentre(ctx, x, 20)) return;
      out += '<path d="M' + n(x - 12 * s) + ' ' + n(y) + 'Q' + n(x - 6 * s) + ' ' + n(y - 7 * s) + ' ' +
        n(x) + ' ' + n(y) + 'Q' + n(x + 6 * s) + ' ' + n(y - 7 * s) + ' ' + n(x + 12 * s) + ' ' + n(y) + '"' +
        stroke('--horizon-near', 2 * s + 0.3, 0.8) + '/>';
    });

    var farBase = ctx.hz * 0.62;
    out += swell(ctx, farBase, 3 * ctx.u, 60 * ctx.u + 20, 0, '--horizon-far', false);

    /* A sail on the far water, on whichever side has room. */
    var bx = ctx.w * 0.82;
    if (ctx.u > 0.4 && !inCentre(ctx, bx, 30 * ctx.u)) {
      var s = ctx.u;
      var by = ctx.h - farBase;
      out += '<path d="M' + n(bx - 18 * s) + ' ' + n(by) + 'H' + n(bx + 18 * s) + 'L' + n(bx + 12 * s) +
        ' ' + n(by + 7 * s) + 'H' + n(bx - 12 * s) + 'Z"' + fill('--horizon-near') + '/>' +
        '<path d="M' + n(bx) + ' ' + n(by) + 'V' + n(by - 36 * s) + '"' + stroke('--horizon-near', 1.6 * s) + '/>' +
        '<path d="M' + n(bx + 1.5 * s) + ' ' + n(by - 34 * s) + 'V' + n(by - 3 * s) + 'H' + n(bx + 17 * s) +
        'Z"' + fill('--horizon-light') + '/>' +
        '<path d="M' + n(bx - 1.5 * s) + ' ' + n(by - 27 * s) + 'V' + n(by - 3 * s) + 'H' + n(bx - 13 * s) +
        'Z"' + fill('--horizon-accent') + '/>';
    }

    out += swell(ctx, ctx.hz * 0.42, 5 * ctx.u, 110 * ctx.u + 30, 1.2, '--horizon-mid', true);
    out += swell(ctx, ctx.hz * 0.2, 4 * ctx.u, 70 * ctx.u + 20, 2.6, '--horizon-near', true);
    return out;
  }

  /* -- Autumn: a line of turning trees on the hill ------------------------- */

  function autumn(ctx) {
    var out = '';
    var leafTints = ['--horizon-accent', '--gold-light', '--red'];
    [[0.08, 0.22, 36, -20], [0.17, 0.52, 22, 30], [0.9, 0.18, 42, 15], [0.82, 0.48, 26, -35],
      [0.96, 0.64, 20, 10]].forEach(function (l, i) {
      var x = l[0] * ctx.w;
      if (inCentre(ctx, x, l[2] * ctx.u)) return;
      out += mark(MARK.maple, x, l[1] * ctx.h, l[2] * ctx.u, l[3], leafTints[i % leafTints.length], 0.6);
    });

    var far = ridge(ctx, ctx.hz * 0.58, ctx.hz * 0.14, 1.2, 0.8);
    out += far.draw('--horizon-far');

    var crowns = ['--red', '--gold', '--gold-light', '--green', '--horizon-accent'];
    var rand = ctx.rand;
    for (var x = 8 * ctx.u; x < ctx.w; x += (20 + rand() * 20) * ctx.u) {
      if (inCentre(ctx, x, 14 * ctx.u)) continue;
      var height = ctx.hz * (0.4 + rand() * 0.32);
      var base = far.top(x) + 3;
      var crown = crowns[Math.floor(rand() * crowns.length)];
      out += '<rect x="' + n(x - height * 0.045) + '" y="' + n(base - height * 0.5) + '" width="' +
        n(height * 0.09) + '" height="' + n(height * 0.5) + '"' + fill('--horizon-near') + '/>' +
        '<circle cx="' + n(x) + '" cy="' + n(base - height * 0.66) + '" r="' + n(height * 0.3) + '"' +
        fill(crown) + '/>' +
        '<circle cx="' + n(x + height * 0.15) + '" cy="' + n(base - height * 0.5) + '" r="' +
        n(height * 0.2) + '"' + fill(crown, 0.85) + '/>';
    }

    out += ridge(ctx, ctx.hz * 0.36, ctx.hz * 0.08, 2.3, 2).draw('--horizon-mid');
    out += ridge(ctx, ctx.hz * 0.16, ctx.hz * 0.05, 3.4, 0.5).draw('--horizon-near');
    return out;
  }

  /* -- Halloween: a bare tree, a leaning graveyard, bats across the moon --- */

  function branch(ctx, x, y, length, angle, width, depth) {
    var x2 = x + Math.cos(angle) * length;
    var y2 = y - Math.sin(angle) * length;
    var out = '<path d="M' + n(x) + ' ' + n(y) + 'L' + n(x2) + ' ' + n(y2) + '"' +
      stroke('--horizon-near', Math.max(0.7, width)) + '/>';
    if (depth > 0) {
      var rand = ctx.rand;
      out += branch(ctx, x2, y2, length * (0.66 + rand() * 0.1), angle + 0.32 + rand() * 0.28,
        width * 0.66, depth - 1);
      out += branch(ctx, x2, y2, length * (0.64 + rand() * 0.1), angle - 0.3 - rand() * 0.3,
        width * 0.66, depth - 1);
      if (rand() < 0.3) {
        out += branch(ctx, x2, y2, length * 0.5, angle + (rand() - 0.5) * 0.4, width * 0.55, depth - 2);
      }
    }
    return out;
  }

  function halloween(ctx) {
    var out = '';
    [[0.34, 0.14, 40, -12], [0.66, 0.1, 30, 10], [0.13, 0.3, 54, -6], [0.87, 0.22, 60, 8],
      [0.76, 0.52, 30, -14], [0.07, 0.58, 26, 6], [0.94, 0.64, 24, 12]].forEach(function (b) {
      var x = b[0] * ctx.w;
      if (inCentre(ctx, x, b[2] * ctx.u * 0.4)) return;
      out += mark(MARK.bat, x, b[1] * ctx.h, b[2] * ctx.u, b[3], '--horizon-near', 0.92);
    });

    var far = ridge(ctx, ctx.hz * 0.55, ctx.hz * 0.16, 0.9, 0.3);
    var near = ridge(ctx, ctx.hz * 0.3, ctx.hz * 0.12, 1.3, 2.1);
    out += far.draw('--horizon-far') + near.draw('--horizon-near');

    /* The bare tree, on the left, clear of the logo. */
    var tx = ctx.w / 2 - ctx.clear - 90 * ctx.u;
    if (tx > 30 * ctx.u) {
      var trunk = Math.min(ctx.h * 0.17, 78 * ctx.u);
      out += branch(ctx, tx, near.top(tx) + 4, trunk, Math.PI / 2 + 0.06, trunk * 0.13, 6);
    }

    /* A leaning graveyard, on the right. */
    var gx = ctx.w / 2 + ctx.clear + 34 * ctx.u;
    for (var i = 0; i < 5 && gx < ctx.w - 10; i++) {
      var sw = (18 + ctx.rand() * 8) * ctx.u;
      var sh = (24 + ctx.rand() * 16) * ctx.u;
      var base = near.top(gx) + 4;
      var lean = (ctx.rand() - 0.5) * 12;
      if (i === 2) {
        out += '<g transform="rotate(' + n(lean) + ' ' + n(gx) + ' ' + n(base) + ')"' + fill('--horizon-near') + '>' +
          '<rect x="' + n(gx - sw * 0.14) + '" y="' + n(base - sh * 1.2) + '" width="' + n(sw * 0.28) +
          '" height="' + n(sh * 1.2) + '"/><rect x="' + n(gx - sw * 0.5) + '" y="' + n(base - sh * 0.9) +
          '" width="' + n(sw) + '" height="' + n(sw * 0.26) + '"/></g>';
      } else {
        out += '<path transform="rotate(' + n(lean) + ' ' + n(gx) + ' ' + n(base) + ')" d="M' +
          n(gx - sw / 2) + ' ' + n(base) + 'V' + n(base - sh + sw / 2) + 'A' + n(sw / 2) + ' ' + n(sw / 2) +
          ' 0 0 1 ' + n(gx + sw / 2) + ' ' + n(base - sh + sw / 2) + 'V' + n(base) + 'Z"' +
          fill('--horizon-near') + '/>';
      }
      if (i === 1 || i === 3) {
        out += mark(MARK.pumpkin, gx + sw * 0.9, base - 8 * ctx.u, 20 * ctx.u, 0, '--horizon-light');
      }
      gx += (40 + ctx.rand() * 18) * ctx.u;
    }
    if (tx > 30 * ctx.u) {
      out += mark(MARK.pumpkin, tx + 34 * ctx.u, near.top(tx + 34 * ctx.u) - 6 * ctx.u, 22 * ctx.u, 0,
        '--horizon-light');
    }
    return out;
  }

  /* -- Christmas: snowy pines and a lit cabin ------------------------------ */

  function pine(x, y, height) {
    var h = height;
    return '<path d="M' + n(x) + ' ' + n(y - h) +
      'L' + n(x + h * 0.2) + ' ' + n(y - h * 0.62) + 'L' + n(x + h * 0.12) + ' ' + n(y - h * 0.62) +
      'L' + n(x + h * 0.28) + ' ' + n(y - h * 0.3) + 'L' + n(x + h * 0.16) + ' ' + n(y - h * 0.3) +
      'L' + n(x + h * 0.34) + ' ' + n(y) + 'L' + n(x - h * 0.34) + ' ' + n(y) +
      'L' + n(x - h * 0.16) + ' ' + n(y - h * 0.3) + 'L' + n(x - h * 0.28) + ' ' + n(y - h * 0.3) +
      'L' + n(x - h * 0.12) + ' ' + n(y - h * 0.62) + 'L' + n(x - h * 0.2) + ' ' + n(y - h * 0.62) + 'Z"' +
      fill('--horizon-mid') + '/>' +
      '<path d="M' + n(x) + ' ' + n(y - h) + 'L' + n(x + h * 0.1) + ' ' + n(y - h * 0.8) +
      'L' + n(x - h * 0.1) + ' ' + n(y - h * 0.8) + 'Z"' + fill('--horizon-near') + '/>';
  }

  function christmas(ctx) {
    var out = '';
    [[0.1, 0.16, 20], [0.22, 0.38, 12], [0.88, 0.12, 24], [0.8, 0.42, 14], [0.95, 0.3, 11],
      [0.05, 0.46, 12]].forEach(function (s) {
      var x = s[0] * ctx.w;
      if (inCentre(ctx, x, s[2] * ctx.u)) return;
      out += mark(MARK.star, x, s[1] * ctx.h, s[2] * ctx.u, 0, '--horizon-light', 0.9);
    });

    var far = ridge(ctx, ctx.hz * 0.6, ctx.hz * 0.12, 1.1, 1.2);
    out += far.draw('--horizon-far');

    var rand = ctx.rand;
    for (var x = 6 * ctx.u; x < ctx.w; x += (14 + rand() * 18) * ctx.u) {
      if (inCentre(ctx, x, 12 * ctx.u)) continue;
      out += pine(x, far.top(x) + 4, ctx.hz * (0.36 + rand() * 0.42));
    }

    var near = ridge(ctx, ctx.hz * 0.3, ctx.hz * 0.07, 2.6, 0.2);
    out += near.draw('--horizon-near');

    /* A cabin with its light on, on the right. */
    var cx = ctx.w / 2 + ctx.clear + 70 * ctx.u;
    if (ctx.u > 0.4 && cx < ctx.w - 40 * ctx.u) {
      var s = ctx.u;
      var base = near.top(cx) + 5 * s;
      out += '<rect x="' + n(cx + 14 * s) + '" y="' + n(base - 50 * s) + '" width="' + n(8 * s) +
        '" height="' + n(16 * s) + '"' + fill('--horizon-accent') + '/>' +
        '<rect x="' + n(cx - 30 * s) + '" y="' + n(base - 34 * s) + '" width="' + n(60 * s) +
        '" height="' + n(34 * s) + '"' + fill('--horizon-accent') + '/>' +
        '<path d="M' + n(cx - 38 * s) + ' ' + n(base - 32 * s) + 'L' + n(cx) + ' ' + n(base - 58 * s) +
        'L' + n(cx + 38 * s) + ' ' + n(base - 32 * s) + 'Z"' + fill('--horizon-near') + '/>' +
        '<rect x="' + n(cx - 20 * s) + '" y="' + n(base - 25 * s) + '" width="' + n(14 * s) +
        '" height="' + n(12 * s) + '"' + fill('--horizon-light') + '/>' +
        '<rect x="' + n(cx + 6 * s) + '" y="' + n(base - 22 * s) + '" width="' + n(11 * s) +
        '" height="' + n(22 * s) + '"' + fill('--horizon-mid') + '/>';
    }
    return out;
  }

  /* -- public -------------------------------------------------------------- */

  var SCENES = {
    newyear: newyear,
    valentines: valentines,
    easter: easter,
    summer: summer,
    autumn: autumn,
    halloween: halloween,
    christmas: christmas
  };

  /* The whole scene as one SVG, drawn at w×h px. `clear` is the half-width of
     the centre column to keep open for the logo. */
  function draw(id, w, h, clear) {
    var scene = SCENES[id];
    if (!scene || w < 40 || h < 40) return '';

    var ctx = {
      w: w,
      h: h,
      clear: clear,
      /* The horizon's height, and a unit that scales every mark with it. */
      hz: Math.max(30, Math.min(128, h * 0.24)),
      u: Math.max(0.28, Math.min(1.15, h / 460)),
      rand: seeded(id)
    };

    return '<svg class="season-scene" viewBox="0 0 ' + n(w) + ' ' + n(h) +
      '" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">' +
      scene(ctx) + '</svg>';
  }

  window.VCLScenes = {
    has: function (id) { return !!SCENES[id]; },
    draw: draw
  };

  window.VCLThemes.redraw();
}());
