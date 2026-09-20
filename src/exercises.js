// Axis is in the device frame: X = right edge, Y = top edge, Z = out of the screen.
// Positive twist about +X tilts the top edge up (extension when the top points at the fingers).
// `normal` is a typical healthy ROM in degrees, used as the recovery target.
// `handed` exercises flip sign for the left hand.
export const EXERCISES = [
  {
    id: 'wrist-flex', joint: 'Wrist', name: 'Flexion / Extension',
    axis: [1, 0, 0], sign: 1, pos: 'Extension', neg: 'Flexion', normal: { pos: 70, neg: 80 },
    setup: 'Rest your forearm flat on a table, palm down, with your hand hanging off the edge. Hold or strap the phone flat on the back of your hand, screen up, top of the phone pointing toward your fingers. Keep the hand level, then tap Calibrate.',
    cue: 'Slowly bend the hand up (extension), back to level, then down (flexion). Each direction counts as one rep.',
  },
  {
    id: 'wrist-dev', joint: 'Wrist', name: 'Radial / Ulnar deviation',
    axis: [0, 0, 1], sign: 1, handed: true, pos: 'Radial', neg: 'Ulnar', normal: { pos: 20, neg: 35 },
    setup: 'Rest your forearm flat on a table, palm down, hand flat. Hold or strap the phone flat on the back of your hand, screen up, top pointing toward your fingers. Tap Calibrate with the hand straight.',
    cue: 'Keeping the hand flat, swing it toward the thumb side (radial) and then the little-finger side (ulnar).',
  },
  {
    id: 'forearm-rot', joint: 'Forearm', name: 'Pronation / Supination',
    axis: [0, 1, 0], sign: 1, handed: true, pos: 'Pronation', neg: 'Supination', normal: { pos: 75, neg: 80 },
    setup: 'Sit with your elbow bent 90 degrees and tucked at your side. Hold the phone like a remote pointing forward, thumb on top, screen facing inward. Tap Calibrate with the thumb pointing straight up.',
    cue: 'Rotate the forearm so the palm turns down (pronation), back to thumb-up, then palm up (supination). Keep the elbow tucked.',
  },
  {
    id: 'elbow-flex', joint: 'Elbow', name: 'Flexion',
    axis: [1, 0, 0], sign: -1, pos: 'Flexion', neg: null, normal: { pos: 145, neg: 0 },
    setup: 'Stand or sit with the arm hanging straight down, palm facing forward. Hold the phone in your hand with the top of the phone pointing down toward the floor, screen facing forward. Tap Calibrate with the arm straight.',
    cue: 'Bend the elbow to bring the hand toward the shoulder, then lower it all the way back to straight.',
  },
  {
    id: 'shoulder-flex', joint: 'Shoulder', name: 'Forward raise',
    axis: [1, 0, 0], sign: -1, pos: 'Flexion', neg: null, normal: { pos: 170, neg: 0 },
    setup: 'Stand with the arm hanging straight at your side, thumb forward. Hold the phone with the top pointing down toward the floor, screen facing forward. Tap Calibrate with the arm relaxed.',
    cue: 'Keeping the elbow straight, raise the arm forward and up as far as comfortable, then lower slowly.',
  },
];

export const byId = (id) => EXERCISES.find((e) => e.id === id);
