// Terms and Privacy / Consumer Health Data Notice. Plain HTML fragments.
// Keep TERMS_VERSION in config.js in step with material changes; users re-consent on sign-in.
import { TERMS_VERSION, OPERATOR } from './config.js';

const who = () => OPERATOR.name || 'the operator of Regain';
const contact = () => (OPERATOR.email ? `<a href="mailto:${OPERATOR.email}">${OPERATOR.email}</a>` : '<em>[contact email to be set in config.js]</em>');
const region = () => OPERATOR.region || '<em>[operator region to be set]</em>';

export function privacyHtml() {
  return `
  <p class="muted">Version ${TERMS_VERSION}. This notice also serves as the Consumer Health Data Privacy Policy required by the Washington My Health My Data Act and similar state laws.</p>

  <h3>Who we are</h3>
  <p>Regain is operated by ${who()}, based in ${region()}. Contact: ${contact()}.</p>

  <h3>The short version</h3>
  <ul>
    <li>Without an account, nothing leaves your phone. All data stays in your browser's local storage.</li>
    <li>With an account, your sets are stored in a database so they survive a phone change. Only you can read them.</li>
    <li>We do not sell data, show ads, run analytics, or share health data with anyone. Ever.</li>
    <li>You can export or delete everything at any time from inside the app.</li>
  </ul>

  <h3>What we collect</h3>
  <p><b>Consumer health data</b> (collected only when you record a set, and stored online only if you sign in):</p>
  <ul>
    <li>Joint angles over time from your phone's motion sensors, per exercise, side and mount.</li>
    <li>Rep counts, hold times, derived metrics (smoothness, symmetry, time to peak, fatigue slope).</li>
    <li>Pain scores you enter (0 to 10).</li>
    <li>Settings: injured side, mount, rep and hold goals.</li>
  </ul>
  <p><b>Account data</b> (only if you sign in): your email address, sign-in timestamps, and a record of the Terms version you accepted and when.</p>
  <p>We do not collect your name, location, contacts, photos, or camera images. We do not access other apps' data.</p>

  <h3>Why we collect it</h3>
  <p>To show you your own progress, to sync it across your devices, and to let you produce a report for your therapist. That is the whole purpose. We do not use health data for advertising, profiling, research, or training models.</p>

  <h3>Consent</h3>
  <p>By creating an account you consent to the collection and storage of the health data listed above for those purposes. You can withdraw consent at any time by deleting your account (below). Using the app without an account does not send us any health data.</p>

  <h3>Where it is stored and who processes it</h3>
  <ul>
    <li><b>Your device</b>: browser local storage. Clearing site data removes it.</li>
    <li><b>Supabase</b> (database and sign-in): stores account and synced data on our behalf under a data processing agreement. Data is encrypted in transit (TLS) and at rest. Access from the app is restricted per user by database row-level security; no one else's account can query your rows.</li>
    <li><b>GitHub Pages</b> (hosting): serves the app files. Like any web host it may log IP addresses and request metadata for security and operations.</li>
  </ul>
  <p>We do not use third-party fonts, analytics, advertising SDKs, or tracking pixels. The app sets no cookies; sign-in state is kept in local storage.</p>

  <h3>Sharing</h3>
  <p>We never share, sell, rent, or disclose your health data to third parties, except to the processors above who act only on our instructions, or if legally compelled. Anything you choose to share (a printed report, a shared summary, a copied export) is under your control.</p>

  <h3>Retention</h3>
  <p>Data is kept until you delete it. Deleting a set removes it from your device and, on the next sync, from the database. Deleting your account removes all your rows and your sign-in record immediately. Backups held by our database provider expire on their normal schedule (currently up to 7 days).</p>

  <h3>Your rights</h3>
  <ul>
    <li><b>Access and export</b>: Progress > Therapist report > Copy JSON gives you every record we hold.</li>
    <li><b>Correction</b>: settings can be changed at any time; recorded sets can be deleted.</li>
    <li><b>Deletion</b>: Account > Delete account and data. This is immediate and cannot be undone.</li>
    <li><b>Withdraw consent</b>: same as deletion; or simply stop using an account.</li>
    <li><b>Complaints</b>: contact us at ${contact()}. If you are in the EU or UK you may also complain to your data protection authority. Washington residents may contact the Washington Attorney General.</li>
  </ul>
  <p>We will not discriminate against you for exercising any right. Requests are honoured within 30 days; most are instant inside the app.</p>

  <h3>Security</h3>
  <p>Sign-in uses one-time email links; we never store passwords. Database access is limited to your own rows by row-level security enforced by the database, not by the app. Transport is encrypted. If a breach of unsecured health data occurs we will notify affected users without unreasonable delay and within 60 days, and notify regulators where required (including under the FTC Health Breach Notification Rule).</p>

  <h3>Children</h3>
  <p>Regain is for adults. Do not create an account if you are under 18. We do not knowingly collect data from children; if you believe we have, contact us and we will delete it.</p>

  <h3>International users</h3>
  <p>Data is stored in the database region chosen for the project (see the app's About section). If you are in the EU, UK or Switzerland, your health data is special-category data and is processed only with your explicit consent given at sign-up, which you can withdraw as described above.</p>

  <h3>Changes</h3>
  <p>If this notice changes materially, the version number changes and you will be asked to accept it again at your next sign-in. Continuing to use an account after that is your acceptance.</p>`;
}

export function termsHtml() {
  return `
  <p class="muted">Version ${TERMS_VERSION}.</p>

  <h3>What Regain is</h3>
  <p>Regain is a self-tracking aid. It uses your phone's motion sensors to estimate joint angles, count repetitions and time holds, and it charts those numbers over time. It is provided by ${who()} (contact ${contact()}).</p>

  <h3>Not medical advice</h3>
  <p>Regain does not diagnose, treat, cure or prevent any condition, and it is not a medical device. The angles it reports are estimates that depend on how the phone is mounted and on your phone's sensors. "Normal range" values are population averages, not targets prescribed for you. The sentences the app generates about your trend are generic and automated. Follow the plan given by your clinician or physical therapist; if the app and your clinician disagree, your clinician is right. Stop any exercise that causes sharp pain and seek medical advice for any concern.</p>

  <h3>Your responsibilities</h3>
  <ul>
    <li>Use the app only as a supplement to care from a qualified professional.</li>
    <li>Mount or hold the phone as instructed. A loose phone gives wrong numbers.</li>
    <li>Keep your sign-in email secure; anyone with access to it can access your account.</li>
    <li>Do not use the app for anyone else's data without their consent, and not for children.</li>
  </ul>

  <h3>Accounts</h3>
  <p>An account is optional. Sign-in is by one-time email link. You may delete your account at any time inside the app. We may suspend or delete accounts that abuse the service or the database, and we may discontinue the service with reasonable notice, during which you can export your data.</p>

  <h3>Your data</h3>
  <p>You own your data. Our handling of it is described in the Privacy and Consumer Health Data Notice, which forms part of these terms.</p>

  <h3>No warranty</h3>
  <p>The app is provided "as is" and "as available", free of charge, without warranty of any kind, express or implied, including fitness for a particular purpose, accuracy, or uninterrupted availability. Sensor accuracy varies by device.</p>

  <h3>Limitation of liability</h3>
  <p>To the fullest extent permitted by law, ${who()} is not liable for any indirect, incidental, special or consequential damages, or for any injury, loss or cost arising from use of or reliance on the app, including reliance on any angle, count, score or generated sentence. Where liability cannot be excluded, it is limited to the amount you paid for the app, which is nothing. Nothing in these terms limits liability that cannot be limited by law.</p>

  <h3>Intellectual property</h3>
  <p>The app's code and design belong to ${who()} or its licensors. Fonts are used under the SIL Open Font License. You may use the app for personal, non-commercial purposes.</p>

  <h3>Governing law</h3>
  <p>These terms are governed by the laws of ${region()}, without regard to conflict-of-law rules, and disputes will be brought in the courts there, except where your local consumer law gives you rights that cannot be overridden.</p>

  <h3>Changes</h3>
  <p>If these terms change materially, the version changes and account holders are asked to accept the new version at their next sign-in.</p>`;
}
