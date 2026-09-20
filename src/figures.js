// Inline SVG pictograms of the starting position for each exercise.
// All are drawn for the RIGHT hand; passing hand='left' mirrors every coordinate.
// Colour roles: body = text-3, arm = text, phone = dark with the SCREEN side in accent,
// movement arrows = accent (positive direction) and warn (negative direction).

const W = 300, H = 230;

function helpers(mirror) {
  const X = (x) => (mirror ? W - x : x);
  const anchor = (a) => (!mirror ? a : a === 'start' ? 'end' : a === 'end' ? 'start' : a);
  return {
    X,
    line: (x1, y1, x2, y2, w = 12, color = 'var(--text)', extra = '') =>
      `<line x1="${X(x1)}" y1="${y1}" x2="${X(x2)}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`,
    circle: (cx, cy, r, fill = 'var(--text)', extra = '') => `<circle cx="${X(cx)}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`,
    // phone seen edge-on: a thin bar with the screen side highlighted. dir = which side the screen faces ('left'|'right'|'up'|'down')
    phoneEdge: (x, y, len, vertical, screenSide) => {
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
    phoneBack: (x, y, w, h) => `<rect x="${Math.min(X(x), X(x + w))}" y="${y}" width="${w}" height="${h}" rx="6" fill="#0b1118" stroke="var(--text-2)" stroke-width="2"/>`,
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
  // Wrist flexion / extension — viewed from ABOVE. Forearm points forward (up the page),
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

  // Radial / ulnar deviation — SIDE view. Phone lies along the forearm (we see its back);
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
    s += h.text(150, 215, 'Side view · screen faces your body', 'middle', 'var(--text-3)', 11);
    return s;
  },

  // Pronation / supination — FRONT view. Forearm points at the viewer, so we see the fist with the
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

  // Elbow flexion — SIDE view. Arm hangs straight, palm & screen forward, phone top toward the floor.
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

  // Shoulder forward raise — SIDE view. Whole straight arm swings forward and up.
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

export function figure(exerciseId, hand) {
  const draw = FIGURES[exerciseId];
  if (!draw) return '';
  const h = helpers(hand === 'left');
  return `<svg class="figure" viewBox="0 0 ${W} ${H}" role="img" aria-label="Starting position for the ${hand} hand">${defs}${draw(h)}</svg>`;
}
