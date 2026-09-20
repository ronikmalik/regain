// Device frame conventions. The math assumes the phone is rigidly coupled to the hand with
//   +Y = from wrist toward fingertips (top edge of the phone)
//   +X = thumb side on the RIGHT hand (little-finger side on the left)
//   +Z = out of the palm  (HELD mount: the phone rests in the palm, screen facing the same way as the palm)
// STRAP mount puts the phone on the BACK of the hand, screen facing away from the palm. That mirrors
// Z and X, so the sign of any X- or Z-axis exercise flips (see `mountSign`). Y is unchanged.
// Signs below were derived for the right hand + HELD mount; `handed` exercises flip for the left hand.
// `normal` is a typical healthy range in degrees, used as the recovery target.

export const MOUNTS = {
  strap: {
    id: 'strap',
    name: 'Strapped to back of hand',
    tag: 'Recommended',
    short: 'Strapped',
    summary: 'No gripping at all: the phone sits flat on the back of your hand, held by an elastic band or strap. Fingers stay completely relaxed, so the phone moves exactly with the hand.',
    how: 'Lay the phone screen-up on the back of your hand, top edge toward the fingers, centred over the knuckles-to-wrist area. Secure it with one or two loops of an elastic resistance band, a velcro strap, a running armband slid over the hand, or two thick hair ties: one loop near the top of the phone, one near the bottom. Snug enough that the phone cannot rock, loose enough that fingers still move freely.',
    countdown: 5,
    pad: false,
  },
  held: {
    id: 'held',
    name: 'Hand-held, tray grip',
    tag: 'No equipment',
    short: 'Hand-held',
    summary: 'No gear needed. Your four straight fingers are the tray the phone lies on, and the thumb only pins one corner, so the phone\'s angle is set by the flat fingers rather than by grip pressure.',
    how: 'Hold the four fingers straight and together, palm up. Lay the phone face-up along them so its back rests flat on the fingers, bottom edge near the base of the fingers and the top of the phone pointing toward the fingertips. Pin the lower corner on the thumb side with the tip of your thumb, on the pad. Keep the fingers straight and still for the whole set: do not curl them over the edges, do not squeeze, and do not move the thumb.',
    countdown: 3,
    pad: true,
  },
};

// Multiply an exercise's sign by this for the chosen mount.
export const mountSign = (ex, mount) => (mount === 'strap' && ex.axis[1] === 0 ? -1 : 1);

export const EXERCISES = [
  {
    id: 'wrist-flex', joint: 'Wrist', name: 'Flexion / Extension',
    axis: [1, 0, 0], sign: 1, pos: 'Flexion', neg: 'Extension', normal: { pos: 80, neg: 70 },
    arm: 'Elbow bent to 90° and tucked at your side, forearm level, thumb up, wrist straight.',
    cue: 'Bend the wrist so the fingers move toward the palm side (flexion), return to straight, then bend toward the back-of-hand side (extension). Each direction counts as one rep.',
  },
  {
    id: 'wrist-dev', joint: 'Wrist', name: 'Radial / Ulnar deviation',
    axis: [0, 0, 1], sign: -1, handed: true, pos: 'Radial', neg: 'Ulnar', normal: { pos: 20, neg: 35 },
    arm: 'Elbow bent to 90° and tucked at your side, forearm level, thumb up, wrist straight.',
    cue: 'Keeping the palm facing the same way, tip the hand up toward the thumb side (radial), back to centre, then down toward the little-finger side (ulnar).',
  },
  {
    id: 'forearm-rot', joint: 'Forearm', name: 'Pronation / Supination',
    axis: [0, 1, 0], sign: -1, handed: true, pos: 'Pronation', neg: 'Supination', normal: { pos: 75, neg: 80 },
    arm: 'Elbow bent to 90° and tucked at your side, thumb pointing straight up, palm facing your body.',
    cue: 'Roll the forearm so the palm turns to face the floor (pronation), back to thumb-up, then to face the ceiling (supination). Keep the elbow against your side.',
  },
  {
    id: 'elbow-flex', joint: 'Elbow', name: 'Flexion',
    axis: [1, 0, 0], sign: 1, pos: 'Flexion', neg: null, normal: { pos: 145, neg: 0 },
    arm: 'Stand with the arm hanging straight down, palm facing forward. The top of the phone points at the floor.',
    cue: 'Bend the elbow to bring the hand up toward your shoulder, then lower all the way back to straight.',
  },
  {
    id: 'shoulder-flex', joint: 'Shoulder', name: 'Forward raise',
    axis: [1, 0, 0], sign: 1, pos: 'Flexion', neg: null, normal: { pos: 170, neg: 0 },
    arm: 'Stand with the arm hanging straight down, palm facing forward. The top of the phone points at the floor.',
    cue: 'Keeping the elbow straight, raise the whole arm forward and up as far as is comfortable, then lower slowly.',
  },
];

export const byId = (id) => EXERCISES.find((e) => e.id === id);
