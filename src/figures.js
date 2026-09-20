// Inline SVG pictograms of the starting position for each exercise.
// All are drawn for the RIGHT hand; passing hand='left' mirrors every coordinate.
// Colour roles: body = text-3, arm = text, phone = dark with the SCREEN side in accent,
// movement arrows = accent (positive direction) and warn (negative direction).

const W = 300, H = 230;

const FLIP = { left: 'right', right: 'left', up: 'down', down: 'up' };

function helpers(mirror, mount = 'held') {
  const X = (x) => (mirror ? W - x : x);
  const strap = mount === 'strap';
  const anchor = (a) => (!mirror ? a : a === 'start' ? 'end' : a === 'end' ? 'start' : a);
  return {
    X,
    line: (x1, y1, x2, y2, w = 12, color = 'var(--text)', extra = '') =>
      `<line x1="${X(x1)}" y1="${y1}" x2="${X(x2)}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`,
    circle: (cx, cy, r, fill = 'var(--text)', extra = '') => `<circle cx="${X(cx)}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`,
    // phone seen edge-on: a thin bar with the screen side highlighted. dir = which side the screen faces ('left'|'right'|'up'|'down')
    phoneEdge: (x, y, len, vertical, screenSide) => {
      if (strap) screenSide = FLIP[screenSide]; // strapped: screen faces away from the palm
      const t = 9;
      const body = vertical
        ? `<rect x="${X(x) - t / 2}" y="${y}" width="${t}" height="${len}" rx="3" fill="#0b1118" stroke="var(--text-2)" stroke-width="2"/>`
        : `<rect x="${Math.min(X(x), X(x + len))}" y="${y - t / 2}" width="${len}" height="${t}" rx="3" fill="#0b1118" stroke="var(--text-2)" stroke-width="2"/>`;
      let s;
      if (vertical) {
        const sx = X(x) + (mirror ? -1 : 1) * (screenSide === 'right' ? t / 2 : -t / 2);
        s = `<line x1="${sx}" y1="${y + 3}" x2="${sx}" y2="${y + len - 3}" stroke="var(--good)" stroke-width="3" stroke-linecap="round"/>`;
      } else {
        const sy = y + (screenSide === 'down' ? t / 2 : -t / 2);
        s = `<line x1="${Math.min(X(x), X(x + len)) + 3}" y1="${sy}" x2="${Math.max(X(x), X(x + len)) - 3}" y2="${sy}" stroke="var(--good)" stroke-width="3" stroke-linecap="round"/>`;
      }
      return body + s;
    },
    // phone seen face-on (back of the phone): rounded rect along the forearm
    phoneBack: (x, y, w, h) => {
      const bx = Math.min(X(x), X(x + w));
      const body = `<rect x="${bx}" y="${y}" width="${w}" height="${h}" rx="6" fill="#0b1118" stroke="var(--text-2)" stroke-width="2"/>`;
      // strapped: from this side we see the SCREEN, not the back
      return strap ? body + `<rect x="${bx + 5}" y="${y + 4}" width="${w - 10}" height="${h - 8}" rx="3" fill="var(--good)" opacity="0.55"/>` : body;
    },
    // curved arrow from (x1,y1) to (x2,y2); sweep flips automatically when mirrored
    arc: (x1, y1, x2, y2, r, sweep, color = 'var(--accent)') =>
      `<path d="M${X(x1)},${y1} A${r},${r} 0 0 ${mirror ? 1 - sweep : sweep} ${X(x2)},${y2}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" marker-end="url(#ah-${color === 'var(--accent)' ? 'a' : 'w'})"/>`,
    text: (x, y, s, a = 'middle', color = 'var(--text-2)', size = 12) =>
      `<text x="${X(x)}" y="${y}" text-anchor="${anchor(a)}" font-size="${size}" fill="${color}" font-weight="600">${s}</text>`,
    ghost: (x1, y1, x2, y2) =>
      `<line x1="${X(x1)}" y1="${y1}" x2="${X(x2)}" y2="${y2}" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 14" opacity="0.45"/>`,
  };
}

const defs = `<defs>
  <marker id="ah-a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--accent)"/></marker>
  <marker id="ah-w" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--warn)"/></marker>
</defs>`;

// Side view: person faces right, we see the arm nearest us. Returns shared body + shoulder/elbow points.
function sideBody(h) {
  return h.circle(70, 38, 17, 'var(--text-3)') +
    `<rect x="${Math.min(h.X(52), h.X(88))}" y="58" width="36" height="112" rx="18" fill="var(--text-3)"/>` +
    // a small nose so the facing direction is obvious
    `<path d="M${h.X(85)},36 l${h.X(93) - h.X(85)},4 l${h.X(85) - h.X(93)},4 z" fill="var(--text-3)"/>`;
}

const FIGURES = {
  // Wrist flexion / extension: viewed from ABOVE. Forearm points forward (up the page),
  // phone edge-on with the screen facing the body midline; the hand swings toward / away from the body.
  'wrist-flex': (h) => {
    let s = '';
    // head + shoulders from above (person faces up the page; their right arm is on the page's right)
    s += `<rect x="${Math.min(h.X(90), h.X(210))}" y="160" width="120" height="26" rx="13" fill="var(--text-3)"/>`;
    s += h.circle(150, 172, 21, 'var(--text-3)');
    s += `<path d="M${h.X(150)},146 l5,7 l-10,0 z" fill="var(--text-3)"/>`; // nose = facing forward
    // elbow sits under the shoulder; forearm forward
    s += h.line(212, 172, 212, 100);
    s += h.circle(212, 92, 10);
    s += h.phoneEdge(212, 40, 62, true, 'left');
    // flexion: top of the phone swings toward the body (left), extension away (right)
    s += h.arc(206, 44, 165, 62, 40, 0);
    s += h.arc(218, 44, 259, 62, 40, 1, 'var(--warn)');
    s += h.text(158, 84, 'Flexion', 'middle', 'var(--accent)');
    s += h.text(262, 84, 'Extension', 'middle', 'var(--warn)');
    s += h.text(150, 215, 'Top view · forearm forward, thumb up', 'middle', 'var(--text-3)', 11);
    return s;
  },

  // Radial / ulnar deviation: SIDE view. Phone lies along the forearm (we see its back);
  // the hand tips the top of the phone up toward the thumb or down toward the little finger.
  'wrist-dev': (h) => {
    let s = sideBody(h);
    s += h.line(70, 72, 70, 128);          // upper arm
    s += h.line(70, 128, 150, 128);        // forearm forward
    s += h.phoneBack(150, 116, 62, 24);    // phone along the fingers, back toward us
    s += h.circle(156, 128, 11);           // hand
    s += h.arc(214, 118, 236, 84, 40, 0);                 // radial: tip up
    s += h.arc(214, 138, 236, 172, 40, 1, 'var(--warn)'); // ulnar: tip down
    s += h.text(252, 76, 'Radial', 'middle', 'var(--accent)');
    s += h.text(252, 188, 'Ulnar', 'middle', 'var(--warn)');
    s += h.text(150, 215, 'Side view · palm faces your body', 'middle', 'var(--text-3)', 11);
    return s;
  },

  // Pronation / supination: FRONT view. Forearm points at the viewer, so we see the fist with the
  // phone edge-on (thumb up, screen toward the body). Roll clockwise = pronation for the right hand.
  'forearm-rot': (h) => {
    let s = '';
    s += h.circle(150, 38, 17, 'var(--text-3)');
    s += `<circle cx="${h.X(144)}" cy="36" r="2" fill="var(--bg)"/><circle cx="${h.X(156)}" cy="36" r="2" fill="var(--bg)"/>`; // eyes = facing us
    s += `<rect x="${Math.min(h.X(118), h.X(182))}" y="58" width="64" height="112" rx="20" fill="var(--text-3)"/>`;
    // right arm is on the viewer's left
    s += h.line(112, 72, 92, 128);         // upper arm angled slightly out
    s += h.circle(92, 132, 18);            // fist coming toward the viewer
    s += h.phoneEdge(92, 100, 64, true, 'right'); // screen faces the body (page-right for the right arm)
    s += h.arc(66, 92, 130, 94, 40, 1);                  // clockwise over the top = pronation
    s += h.arc(130, 172, 66, 172, 40, 1, 'var(--warn)'); // counter-clockwise under = supination
    s += h.text(98, 64, 'Pronation', 'middle', 'var(--accent)');
    s += h.text(98, 202, 'Supination', 'middle', 'var(--warn)');
    s += h.text(150, 218, 'Front view · elbow tucked, forearm pointing at you', 'middle', 'var(--text-3)', 11);
    return s;
  },

  // Elbow flexion: SIDE view. Arm hangs straight, palm & screen forward, phone top toward the floor.
  'elbow-flex': (h) => {
    let s = sideBody(h);
    s += h.ghost(70, 128, 104, 86);        // forearm at full flexion (ghost)
    s += h.line(70, 72, 70, 128);          // upper arm
    s += h.line(70, 128, 70, 170);         // forearm hanging
    s += h.circle(70, 176, 11);            // hand
    s += h.phoneEdge(70, 168, 40, true, 'right'); // screen forward (page-right)
    s += h.arc(96, 168, 118, 92, 60, 0);   // curl up toward the shoulder
    s += h.text(128, 130, 'Flexion', 'start', 'var(--accent)');
    s += h.text(150, 218, 'Side view · palm forward, phone top toward the floor', 'middle', 'var(--text-3)', 11);
    return s;
  },

  // Shoulder forward raise: SIDE view. Whole straight arm swings forward and up.
  'shoulder-flex': (h) => {
    let s = sideBody(h);
    s += h.ghost(70, 72, 178, 72);         // arm raised to horizontal (ghost)
    s += h.line(70, 72, 70, 170);          // straight arm hanging
    s += h.circle(70, 176, 11);
    s += h.phoneEdge(70, 168, 40, true, 'right');
    s += h.arc(96, 170, 170, 92, 90, 0);
    s += h.text(178, 130, 'Raise', 'start', 'var(--accent)');
    s += h.text(150, 218, 'Side view · elbow straight, palm forward', 'middle', 'var(--text-3)', 11);
    return s;
  },
};

export function figure(exerciseId, hand, mount = 'held') {
  const draw = FIGURES[exerciseId];
  if (!draw) return '';
  const h = helpers(hand === 'left', mount);
  return `<svg class="figure" viewBox="0 0 ${W} ${H}" role="img" aria-label="Starting position for the ${hand} hand">${defs}${draw(h)}</svg>`;
}

// ---------- how to mount the phone ----------
const MOUNT_FIGS = {
  // Back of the hand, fingers up, phone strapped screen-up with two elastic loops.
  strap: (h) => {
    let g = '';
    const skin = 'var(--text-3)';
    g += `<rect x="${Math.min(h.X(122), h.X(178))}" y="176" width="56" height="34" rx="14" fill="${skin}"/>`; // forearm
    g += `<rect x="${Math.min(h.X(100), h.X(200))}" y="88" width="100" height="96" rx="26" fill="${skin}"/>`; // back of hand
    for (const [x, hgt] of [[104, 58], [128, 70], [152, 66], [176, 50]]) {                      // fingers
      g += `<rect x="${Math.min(h.X(x), h.X(x + 20))}" y="${94 - hgt}" width="20" height="${hgt + 10}" rx="10" fill="${skin}"/>`;
    }
    g += h.line(104, 140, 66, 104, 22, skin) + h.line(66, 104, 52, 84, 18, skin);              // thumb (left side of a right hand seen from the back)
    // phone, screen up, top toward the fingers
    g += `<rect x="${Math.min(h.X(124), h.X(176))}" y="86" width="52" height="102" rx="8" fill="#0b1118" stroke="var(--text-2)" stroke-width="2"/>`;
    g += `<rect x="${Math.min(h.X(129), h.X(171))}" y="92" width="42" height="90" rx="4" fill="var(--good)" opacity="0.5"/>`;
    g += `<path d="M${h.X(138)},140 a12,12 0 0 1 24,0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`; // gauge glyph on screen
    // two elastic loops across phone + hand
    for (const y of [98, 166]) {
      g += `<rect x="${Math.min(h.X(94), h.X(206))}" y="${y}" width="112" height="14" rx="4" fill="var(--accent)" opacity="0.9"/>`;
      g += `<rect x="${Math.min(h.X(94), h.X(206))}" y="${y + 4}" width="112" height="2" fill="#fff" opacity="0.35"/>`;
    }
    g += h.text(214, 108, 'elastic band', 'start', 'var(--accent)', 10) + h.text(214, 176, 'or velcro', 'start', 'var(--accent)', 10);
    g += h.text(150, 224, 'Back of hand · screen up · fingers relaxed', 'middle', 'var(--text-3)', 11);
    return g;
  },
  // Tray grip. Main view: screen toward us, the four straight fingers drawn x-ray style behind the
  // phone pointing up from the bottom, thumb tip pinning the lower corner. Inset: edge view of the
  // phone lying flat on the fingers.
  held: (h) => {
    let g = '';
    const skin = 'var(--text-3)';
    const px = 66, pw = 80, py = 22, ph = 160; // phone box
    g += `<rect x="${Math.min(h.X(px + 6), h.X(px + pw - 6))}" y="${py + ph - 4}" width="${pw - 12}" height="26" rx="13" fill="${skin}"/>`; // palm / wrist below
    g += `<rect x="${Math.min(h.X(px), h.X(px + pw))}" y="${py}" width="${pw}" height="${ph}" rx="12" fill="#0b1118" stroke="var(--text-2)" stroke-width="2"/>`;
    g += `<rect x="${Math.min(h.X(px + 6), h.X(px + pw - 6))}" y="${py + 8}" width="${pw - 12}" height="${ph - 16}" rx="7" fill="var(--good)" opacity="0.22"/>`;
    // fingers behind the phone (x-ray), from the bottom edge up
    for (const [x, top] of [[px + 8, 66], [px + 27, 52], [px + 46, 58], [px + 65, 80]]) {
      g += `<rect x="${Math.min(h.X(x), h.X(x + 15))}" y="${top}" width="15" height="${py + ph - 6 - top}" rx="7.5" fill="${skin}" opacity="0.4" stroke="${skin}" stroke-width="1.5" stroke-dasharray="3 3"/>`;
    }
    // corner pad zone + thumb pinning it
    const cx = px + pw - 6, cy = py + ph - 8;
    g += `<path d="M${h.X(cx)},${cy} L${h.X(cx)},${cy - 60} A60,60 0 0 ${h.X(1) > h.X(0) ? 0 : 1} ${h.X(cx - 60)},${cy} Z" fill="var(--accent)" opacity="0.35" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3"/>`;
    g += h.line(px + pw + 30, py + ph + 4, px + pw - 14, py + ph - 22, 19, skin) + h.line(px + pw - 14, py + ph - 22, px + pw - 40, py + ph - 44, 16, skin);
    g += h.text(px + pw / 2, 214, 'fingers straight behind the phone', 'middle', 'var(--text-2)', 10);
    // inset: edge view, fingers horizontal, phone lying on them, thumb pressing the far corner from above
    const ix = 196, iy = 120;
    g += h.text(ix + 42, 70, 'Side view', 'middle', 'var(--text-3)', 10);
    g += h.line(ix - 4, iy + 12, ix + 88, iy + 12, 16, skin);                                          // fingers, pointing to the top of the phone
    g += `<rect x="${Math.min(h.X(ix), h.X(ix + 84))}" y="${iy - 1}" width="84" height="9" rx="3" fill="#0b1118" stroke="var(--text-2)" stroke-width="2"/>`; // phone lying flat
    g += `<line x1="${Math.min(h.X(ix + 3), h.X(ix + 81))}" y1="${iy - 1}" x2="${Math.max(h.X(ix + 3), h.X(ix + 81))}" y2="${iy - 1}" stroke="var(--good)" stroke-width="3" stroke-linecap="round"/>`; // screen up
    g += h.line(ix - 16, iy + 10, ix - 4, iy - 8, 12, skin) + h.line(ix - 4, iy - 8, ix + 34, iy - 8, 12, skin); // thumb wraps round the bottom edge and lies flat along the screen
    g += h.text(ix + 42, iy + 40, 'flat on the fingers', 'middle', 'var(--text-2)', 10);
    g += h.text(ix + 42, iy + 54, 'thumb flat on the screen', 'middle', 'var(--text-2)', 10);
    g += h.text(150, 228, 'Straight fingers · thumb flat across the corner pad', 'middle', 'var(--text-3)', 11);
    return g;
  },
};

export function mountFigure(mount, hand) {
  const draw = MOUNT_FIGS[mount];
  if (!draw) return '';
  const h = helpers(hand === 'left');
  return `<svg class="figure" viewBox="0 0 ${W} ${H}" role="img" aria-label="How to mount the phone: ${mount}">${defs}${draw(h)}</svg>`;
}
