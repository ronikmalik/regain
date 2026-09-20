import { fromDeviceEuler, fromAxisAngle, fromGravity, mul } from './quat.js';

// Every source emits quaternions via onSample(q) at whatever rate it has.
// Sources: PhoneSource (DeviceOrientation), SimSource (slider for desktop dev),
// WatchSource (Sensor Logger -> relay -> WebSocket).

export class PhoneSource {
  constructor() { this.onSample = null; this._handler = null; }

  static isSupported() { return typeof DeviceOrientationEvent !== 'undefined'; }

  // Must be called from a user gesture (tap) on iOS 13+.
  async start() {
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== 'granted') throw new Error('Motion permission denied. Enable it in Settings > Safari > Motion & Orientation Access.');
    }
    this._handler = (e) => {
      if (e.alpha == null && e.beta == null) return;
      this.onSample?.(fromDeviceEuler(e.alpha, e.beta, e.gamma));
    };
    window.addEventListener('deviceorientation', this._handler, true);
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('No motion data received. Open this page on a phone over HTTPS.')), 3000);
      const once = () => { clearTimeout(t); window.removeEventListener('deviceorientation', once, true); resolve(); };
      window.addEventListener('deviceorientation', once, true);
    });
  }

  stop() {
    if (this._handler) window.removeEventListener('deviceorientation', this._handler, true);
    this._handler = null;
  }
}

// Desktop dev: a slider (or arrow keys) drives rotation about the exercise axis.
export class SimSource {
  constructor(axis) { this.axis = axis; this.onSample = null; this._el = null; this._base = fromDeviceEuler(0, 0, 0); }
  static isSupported() { return true; }
  async start() {
    const wrap = document.createElement('div');
    wrap.className = 'sim';
    wrap.innerHTML = '<label>Sim angle <output>0</output>&deg;</label><input type="range" min="-150" max="150" value="0" step="1">';
    document.body.appendChild(wrap);
    this._el = wrap;
    const input = wrap.querySelector('input'), out = wrap.querySelector('output');
    const emit = () => { out.value = input.value; this.onSample?.(mul(this._base, fromAxisAngle(this.axis, Number(input.value)))); };
    input.addEventListener('input', emit);
    this._key = (e) => {
      if (e.key.startsWith('Arrow')) e.preventDefault();
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { input.value = Number(input.value) + 5; emit(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { input.value = Number(input.value) - 5; emit(); }
    };
    window.addEventListener('keydown', this._key);
    this._timer = setInterval(emit, 33); // stream like a real sensor so smoothing/reps behave the same
  }
  stop() { this._el?.remove(); window.removeEventListener('keydown', this._key); clearInterval(this._timer); }
}

// Apple Watch via Sensor Logger's HTTP push -> relay/server.mjs -> WebSocket.
export class WatchSource {
  constructor(url) { this.url = url; this.onSample = null; this._ws = null; }
  static isSupported() { return 'WebSocket' in window; }
  async start() {
    this._ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this._ws.onopen = resolve;
      this._ws.onerror = () => reject(new Error('Could not connect to relay at ' + this.url + '. Run "npm run relay".'));
    });
    this._ws.onmessage = (ev) => {
      const s = JSON.parse(ev.data);
      if (s.quaternionW != null) {
        this.onSample?.({ w: s.quaternionW, x: s.quaternionX, y: s.quaternionY, z: s.quaternionZ });
      } else if (s.gravityX != null) {
        this.onSample?.(fromGravity(s.gravityX, s.gravityY, s.gravityZ));
      }
    };
  }
  stop() { this._ws?.close(); this._ws = null; }
}
