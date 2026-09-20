// Every exercise uses the same grip: the phone held in the palm the way you'd read it.
// That fixes the device frame relative to the hand:
//   +Y = from wrist toward fingertips (top edge of the phone)
//   +Z = out of the palm (the screen faces the same way the palm faces)
//   +X = thumb side on the RIGHT hand, little-finger side on the LEFT hand
// Signs below were derived for the right hand; `handed` exercises flip for the left.
// `normal` is a typical healthy range in degrees, used as the recovery target.
export const GRIP = 'Hold the phone in the hand you are rehabbing, exactly the way you would hold it to read it: resting in your palm, screen toward you, top edge pointing away from your wrist. Keep the grip relaxed and do not change it during the set.';

export const EXERCISES = [
  {
    id: 'wrist-flex', joint: 'Wrist', name: 'Flexion / Extension',
    axis: [1, 0, 0], sign: 1, pos: 'Flexion', neg: 'Extension', normal: { pos: 80, neg: 70 },
    arm: 'Elbow bent to 90° and tucked at your side, forearm level, thumb up, wrist straight.',
    cue: 'Bend the wrist so the screen tilts toward you (flexion), return to straight, then tilt it away from you (extension). Each direction counts as one rep.',
  },
  {
    id: 'wrist-dev', joint: 'Wrist', name: 'Radial / Ulnar deviation',
    axis: [0, 0, 1], sign: -1, handed: true, pos: 'Radial', neg: 'Ulnar', normal: { pos: 20, neg: 35 },
    arm: 'Elbow bent to 90° and tucked at your side, forearm level, thumb up, wrist straight.',
    cue: 'Keeping the screen facing the same way, tip the top of the phone toward your thumb (radial), back to center, then toward your little finger (ulnar).',
  },
  {
    id: 'forearm-rot', joint: 'Forearm', name: 'Pronation / Supination',
    axis: [0, 1, 0], sign: -1, handed: true, pos: 'Pronation', neg: 'Supination', normal: { pos: 75, neg: 80 },
    arm: 'Elbow bent to 90° and tucked at your side, thumb pointing straight up so the screen faces your body.',
    cue: 'Roll the forearm so the screen turns to face the floor (pronation), back to thumb-up, then to face the ceiling (supination). Keep the elbow against your side.',
  },
  {
    id: 'elbow-flex', joint: 'Elbow', name: 'Flexion',
    axis: [1, 0, 0], sign: 1, pos: 'Flexion', neg: null, normal: { pos: 145, neg: 0 },
    arm: 'Stand with the arm hanging straight down, palm and screen facing forward. The top of the phone will point at the floor.',
    cue: 'Bend the elbow to bring the phone up toward your shoulder, then lower all the way back to straight.',
  },
  {
    id: 'shoulder-flex', joint: 'Shoulder', name: 'Forward raise',
    axis: [1, 0, 0], sign: 1, pos: 'Flexion', neg: null, normal: { pos: 170, neg: 0 },
    arm: 'Stand with the arm hanging straight down, palm and screen facing forward. The top of the phone will point at the floor.',
    cue: 'Keeping the elbow straight, raise the whole arm forward and up as far as is comfortable, then lower slowly.',
  },
];

export const byId = (id) => EXERCISES.find((e) => e.id === id);
