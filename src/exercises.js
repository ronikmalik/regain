// Device frame conventions. The math assumes the phone is rigidly coupled to the hand with
//   +Y = from wrist toward fingertips (top edge of the phone)
//   +X = thumb side on the RIGHT hand (little-finger side on the left)
//   +Z = out of the palm  (HELD mount: the phone rests in the palm, screen facing the same way as the palm)
// STRAP mount puts the phone on the BACK of the hand, screen facing away from the palm. That mirrors
// Z and X, so the sign of any X- or Z-axis exercise flips (see `mountSign`). Y is unchanged.
// Signs below were derived for the right hand + HELD mount; `handed` exercises flip for the left hand.
// `normal` is a typical healthy range in degrees, used as the recovery target.
// `how` and `cue` are arrays: one short step per line in the UI.

export const MOUNTS = {
  strap: {
    id: 'strap',
    name: 'Strapped',
    tag: 'Recommended',
    short: 'Strapped',
    summary: 'Phone strapped to the back of the hand. No gripping, so finger tension cannot affect the reading.',
    how: [
      'Place the phone screen-up on the back of your hand, top edge toward the fingers.',
      'Secure it with two loops of an elastic band, a velcro strap, or a running armband.',
      'Snug enough that it cannot rock. Fingers relaxed.',
    ],
    countdown: 5,
    pad: false,
  },
  held: {
    id: 'held',
    name: 'Hand-held',
    tag: 'No equipment',
    short: 'Hand-held',
    summary: 'Phone lies flat on four straight fingers. The thumb rests flat across the lower corner of the screen.',
    how: [
      'Hold four fingers straight and together, palm up.',
      'Lay the phone face-up along the fingers, top toward the fingertips.',
      'Rest your thumb flat across the lower corner of the screen, over the pad.',
      'Keep fingers and thumb still. Do not squeeze or press.',
    ],
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
    arm: 'Elbow bent 90° at your side. Forearm level, thumb up, wrist straight.',
    cue: ['Bend the hand toward the palm side (flexion).', 'Return to straight.', 'Bend toward the back of the hand (extension).', 'Each direction counts as one rep.'],
  },
  {
    id: 'wrist-dev', joint: 'Wrist', name: 'Radial / Ulnar deviation',
    axis: [0, 0, 1], sign: -1, handed: true, pos: 'Radial', neg: 'Ulnar', normal: { pos: 20, neg: 35 },
    arm: 'Elbow bent 90° at your side. Forearm level, thumb up, wrist straight.',
    cue: ['Tip the hand up toward the thumb (radial).', 'Return to centre.', 'Tip down toward the little finger (ulnar).', 'Keep the palm facing the same way.'],
  },
  {
    id: 'forearm-rot', joint: 'Forearm', name: 'Pronation / Supination',
    axis: [0, 1, 0], sign: -1, handed: true, pos: 'Pronation', neg: 'Supination', normal: { pos: 75, neg: 80 },
    arm: 'Elbow bent 90° at your side. Thumb straight up, palm facing your body.',
    cue: ['Roll the palm to face the floor (pronation).', 'Return to thumb up.', 'Roll the palm to face the ceiling (supination).', 'Keep the elbow against your side.'],
  },
  {
    id: 'elbow-flex', joint: 'Elbow', name: 'Flexion',
    axis: [1, 0, 0], sign: 1, pos: 'Flexion', neg: null, normal: { pos: 145, neg: 0 },
    arm: 'Arm hanging straight down, palm forward. Phone top points at the floor.',
    cue: ['Bend the elbow, bringing the hand toward the shoulder.', 'Lower all the way back to straight.'],
  },
  {
    id: 'shoulder-flex', joint: 'Shoulder', name: 'Forward raise',
    axis: [1, 0, 0], sign: 1, pos: 'Flexion', neg: null, normal: { pos: 170, neg: 0 },
    arm: 'Arm hanging straight down, palm forward. Phone top points at the floor.',
    cue: ['Keep the elbow straight.', 'Raise the arm forward and up as far as comfortable.', 'Lower slowly.'],
  },
];

export const byId = (id) => EXERCISES.find((e) => e.id === id);
