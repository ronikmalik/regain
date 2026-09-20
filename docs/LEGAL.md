# Legal and compliance notes

Due diligence for running Regain with accounts and cloud sync. This is a working summary by a
non-lawyer, current as of September 2026. Get a lawyer to review before charging money, marketing
to patients, or working with clinics.

## What the app is, legally

- A consumer self-tracking app that stores **health data**: joint angles, rep counts, hold times,
  derived movement metrics and pain scores, tied to an email address when an account exists.
- Free, no ads, no analytics, no data sales, no third-party SDKs. Hosting on GitHub Pages;
  database and sign-in on Supabase.
- Without an account, no data leaves the device. This matters: most obligations attach only to
  data we actually receive.

## Laws that apply and what we did

| Regime | Applies? | Why | What the build does |
|---|---|---|---|
| **HIPAA** (US) | No, as a consumer app | HIPAA covers providers, insurers, clearinghouses and their business associates. An individual using an app for themselves is not a covered entity. | Nothing required. **Changes if** a clinic uses Regain to receive patient data or you sign a contract with a provider: then you become a business associate and need a BAA, and Supabase's standard plan is not HIPAA-eligible (they offer a HIPAA add-on on paid tiers). |
| **FTC Health Breach Notification Rule** (US) | **Yes** | Applies to "vendors of personal health records" not covered by HIPAA. The 2024 amendments explicitly cover health apps. | Privacy notice commits to notifying users without unreasonable delay and within 60 days of discovering a breach of unsecured data; FTC notification is also required (within 60 days; if 500+ people, at the same time as consumer notice). Encryption in transit and at rest plus RLS reduces what counts as "unsecured". |
| **FTC Act §5** (unfair or deceptive practices) | Yes | Any privacy promise must be true. | Notice says exactly what is collected and by whom; no claims we cannot keep. Do not add analytics or ads without updating it. |
| **Washington My Health My Data Act** | **Yes**, if any WA resident uses it | Consumer health data law with no revenue threshold for the core duties. | Separate, prominently linked "Consumer Health Data Privacy Policy" (our Privacy & health data notice is titled and linked as such), affirmative consent before collection (checkbox at sign-up, version and timestamp stored), rights to access and delete (in-app), no sale, no sharing. Geofencing rules are irrelevant (no location). |
| **Nevada SB 370**, **Connecticut SB 3** (consumer health data) | Likely, for those residents | Similar to WA. | Covered by the same notice, consent and rights. |
| **CCPA/CPRA** (California) | Not currently | Thresholds: >$25M revenue, or 100k+ consumers, or 50%+ revenue from selling data. | Nothing required now. Revisit at scale. |
| **GDPR / UK GDPR** | **Yes**, if EU/UK users sign in | Health data is special-category data (Art. 9). Offering a free app that EU residents can use counts. | Lawful basis: explicit consent (Art. 9(2)(a)) collected at sign-up, withdrawable by deleting the account. Privacy notice covers Art. 13 items (identity, purposes, processors, retention, rights, complaints). Processors: Supabase (DPA available at supabase.com/legal/dpa; sign it in the dashboard) and GitHub (hosting). Data location: pick the Supabase region deliberately; EU users are best served by an EU region. A DPIA is advisable for health data at scale; not required for a personal project. |
| **ePrivacy / cookie rules** | Not triggered | No cookies; sign-in state uses localStorage, which is strictly necessary for the service. No trackers. | No banner needed. Do not add analytics without revisiting. |
| **FDA medical device rules** (US) / **MDR** (EU) | Not triggered, by design | FDA's General Wellness policy and the 21st Century Cures Act exclude software for general fitness and self-monitoring that makes no diagnostic or treatment claims. | Copy avoids diagnosis or treatment claims; "normal range" is described as a population average; every guidance sentence defers to the therapist. **Do not** market it as treating fractures or replacing therapy, or it can become a Class I/II device. |
| **COPPA** (US) / GDPR child consent | Avoided | Health data from children needs parental consent. | Terms and sign-up limit accounts to 18+. |
| **Accessibility** (ADA/Section 508 as applied to websites, EU Accessibility Act 2025 for services) | Good practice; EAA applies to businesses, not personal projects | | SVG charts carry aria-labels and a table view exists for every chart; contrast follows the palette validator. |
| **Open-source licences** | Yes | Fonts and libraries. | Inter and JetBrains Mono: SIL OFL 1.1 (self-hosted, attribution in Terms). supabase-js: MIT. Vite: MIT. |

## Data flows (for the record)

1. Motion samples are computed on the phone. Only saved sets leave the device, only when signed in.
2. Supabase Auth receives the email address and issues a one-time link (PKCE flow). No password exists.
3. `sets` rows: `{id, user_id, exercise_id, ts, data (jsonb), deleted, updated_at}`. `profiles`:
   settings, `terms_version`, `consent_at`.
4. Row Level Security: every policy is `user_id = auth.uid()` for both `USING` and `WITH CHECK`.
   The anon role has no grants on either table. `delete_my_account()` is `SECURITY DEFINER` but
   hard-codes `auth.uid()`, so it can only delete the caller.
5. GitHub Pages serves static files and may log IPs (GitHub's privacy statement governs).

## Retention and deletion

- Sets: until deleted by the user. Deleting locally writes a tombstone that is pushed on next sync.
- Account deletion: immediate, in-app, removes all rows and the auth user.
- Supabase point-in-time backups: retained per plan (7 days on free/Pro by default).

## Operator obligations checklist

- [ ] Fill `OPERATOR` in `src/config.js`: name, contact email, region (used in both legal pages and the About section).
- [ ] Pick the Supabase region deliberately (US East for US users, an EU region if EU users are expected).
- [ ] Accept Supabase's DPA in the dashboard (Organization > Legal documents) if any EU/UK user is expected.
- [ ] Keep a breach response note: who to notify, within 60 days, FTC form at ftc.gov/hbnr.
- [ ] Bump `TERMS_VERSION` whenever the notice or terms change materially; users are re-prompted.
- [ ] Do not add analytics, ads, third-party fonts or SDKs without updating the notice.
- [ ] If a clinic wants to use it: stop and get HIPAA advice (BAA + HIPAA-eligible hosting).
- [ ] If charging money or marketing to patients: have a lawyer review the Terms, notice and device-claim language.

## Things we deliberately avoided

- Google Fonts (IP disclosure to Google; ruled a GDPR violation by LG München I, 2022). Fonts are self-hosted.
- Analytics of any kind.
- Passwords (magic link only) and any secret in the client (the anon key is public by design; RLS is the boundary).
- Storing location, name, or device identifiers.
