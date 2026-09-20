// Minimal quaternion helpers. Quaternions are {w, x, y, z}, device -> world.
const D2R = Math.PI / 180;

// W3C DeviceOrientation euler (alpha=Z, beta=X, gamma=Y, intrinsic ZXY) -> quaternion.
export function fromDeviceEuler(alpha, beta, gamma) {
  const x = (beta || 0) * D2R, y = (gamma || 0) * D2R, z = (alpha || 0) * D2R;
  const cX = Math.cos(x / 2), cY = Math.cos(y / 2), cZ = Math.cos(z / 2);
  const sX = Math.sin(x / 2), sY = Math.sin(y / 2), sZ = Math.sin(z / 2);
  return {
    w: cX * cY * cZ - sX * sY * sZ,
    x: sX * cY * cZ - cX * sY * sZ,
    y: cX * sY * cZ + sX * cY * sZ,
    z: cX * cY * sZ + sX * sY * cZ,
  };
}

export function fromAxisAngle([ax, ay, az], deg) {
  const h = deg * D2R / 2, s = Math.sin(h);
  return { w: Math.cos(h), x: ax * s, y: ay * s, z: az * s };
}

export function conj(q) { return { w: q.w, x: -q.x, y: -q.y, z: -q.z }; }

export function mul(a, b) {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

// Rotation of `q` relative to reference `q0`, expressed in the reference's body frame.
export function relative(q0, q) { return mul(conj(q0), q); }

// Swing-twist decomposition: signed angle (deg, -180..180) of `q` about body axis `axis`.
export function twistDeg(q, [ax, ay, az]) {
  const s = q.w < 0 ? -1 : 1; // keep w >= 0 so the angle lands in (-180, 180]
  const dot = (q.x * ax + q.y * ay + q.z * az) * s;
  return 2 * Math.atan2(dot, q.w * s) / D2R;
}

// Tilt-only quaternion from a gravity vector in the device frame (no heading).
export function fromGravity(gx, gy, gz) {
  const n = Math.hypot(gx, gy, gz) || 1;
  gx /= n; gy /= n; gz /= n;
  // rotation taking device "up" (0,0,1) to the measured gravity direction
  const w = 1 + gz, x = -gy, y = gx; // cross((0,0,1), g) = (-gy, gx, 0)
  const m = Math.hypot(w, x, y) || 1;
  return { w: w / m, x: x / m, y: y / m, z: 0 };
}
