# SEC-01 — Security Review Findings

## Status

**Review complete — findings documented, not yet remediated.** Produced by the
`/security-review` skill (senior-security-engineer pass) over the current `master`
codebase (working tree clean — no open branch diff, so the whole backend/frontend
security surface was reviewed rather than a single PR).

This document is the single, authoritative record of the security review. It follows
the numbered-audit convention of the other `spec/` files; each finding carries a stable
`SEC-01-N` sub-ID, severity, and confidence so fixes can cite them (per root
`CLAUDE.md`, "Known issues").

## Scope & method

Reviewed for concrete, exploitable vulnerabilities (>80% confidence) across:

- **Auth / JWT** — `expense-tracker-api/auth.py`, `main.py`.
- **Per-user data isolation** — every handler in `expense-tracker-api/routers/*.py`.
- **Injection** — SQL (ORM usage), path, command, template.
- **Secrets management** — tracked `.env*`, service-role key handling.
- **Frontend** — token handling (`src/services/api.js`, `supabase.js`), XSS sinks.

Excluded by policy (handled elsewhere / out of scope): DoS & rate-limiting, secrets
stored on disk when otherwise secured, dependency CVEs, theoretical race/timing issues.

## Summary

**No HIGH-severity, directly exploitable vulnerabilities were found.** The multi-user
authorization model (AUTH-01) is implemented consistently: every data endpoint depends
on `get_current_user`, and every read/write/delete is scoped by `user_id` (or by an
owner-verified parent), so no cross-user IDOR path was identified. JWTs are verified
correctly (ES256 via JWKS, with `aud`/`iss`/`exp` enforced), all DB access goes through
parameterized SQLAlchemy ORM expressions (no raw/`f-string` SQL), user-supplied
`month_key` path params are regex-constrained, secrets live only in git-ignored `.env`
files, and the React frontend has no `dangerouslySetInnerHTML`/`eval`/`innerHTML` sinks.

The findings below are **MEDIUM / LOW** (transport and defense-in-depth). SEC-01-1 is
the one worth acting on before any internet exposure; it is already acknowledged as an
accepted trade-off for the private LAN in [AUTH-01](AUTH-01-multi-user-authentication.md)
and [DEPLOY-01](DEPLOY-01-production-lan-docker.md).

| ID        | Finding                                             | Severity | Confidence |
|-----------|-----------------------------------------------------|----------|------------|
| SEC-01-1  | Bearer access tokens sent over plaintext HTTP (LAN) | MEDIUM   | 9/10       |
| SEC-01-2  | JWT-validation error echoes exception text to caller| LOW      | 8/10       |
| SEC-01-3  | Session tokens persisted in `localStorage`          | LOW      | 8/10       |
| SEC-01-4  | CORS allows any private-LAN / `*.local` origin      | LOW/Info | 8/10       |

---

## SEC-01-1 — Bearer tokens transmitted over plaintext HTTP: `expense-tracker/src/services/api.js:24`

- **Severity:** Medium
- **Category:** `sensitive_data_exposure` (transport / session hijacking)
- **Confidence:** 9/10
- **Description:** The frontend attaches the Supabase access token as
  `Authorization: Bearer <token>` on every API call
  ([api.js:24](../expense-tracker/src/services/api.js#L24)), and the app is served over
  plain HTTP on the home LAN (`http://<host-ip>:5173` → backend `:8000`; see
  [DEPLOY-01 "Current state"](DEPLOY-01-production-lan-docker.md)). The token — a bearer
  credential granting full access to that user's data for its ~1h lifetime — travels
  unencrypted over the network.
- **Exploit Scenario:** An attacker on the same Wi-Fi/LAN (e.g. a guest, or via ARP
  spoofing) passively captures the `Authorization` header, replays the bearer token
  against `:8000`, and reads or mutates the victim's expenses, income, debts, and
  account — no password needed until the token expires. Login credentials themselves go
  to Supabase over HTTPS, so only the backend session is exposed, but that is sufficient
  for full data access.
- **Recommendation:** Terminate TLS in front of both services before any exposure beyond
  the trusted LAN (the reverse-proxy/HTTPS path already sketched in
  [DEPLOY-01](DEPLOY-01-production-lan-docker.md)). TLS is already called out as a
  **hard prerequisite for public launch** in
  [AUTH-01 §Security](AUTH-01-multi-user-authentication.md). Accepted as a documented
  trade-off only while strictly on the private LAN.

## SEC-01-2 — JWT validation error leaks exception detail to the caller: `expense-tracker-api/auth.py:95-100`

- **Severity:** Low
- **Category:** `information_disclosure`
- **Confidence:** 8/10
- **Description:** The catch-all branch returns the raw exception string to the client:
  `detail=f"Invalid token: {exc}"`
  ([auth.py:95-100](../expense-tracker-api/auth.py#L95-L100)). The `except` also widens
  to `(jwt.InvalidTokenError, Exception)`, so unexpected internal errors (e.g. JWKS
  fetch/parse failures) are surfaced verbatim in the 401 body rather than being
  distinguished from a genuinely malformed token.
- **Exploit Scenario:** An unauthenticated caller submitting crafted tokens receives
  library-internal error text, aiding fingerprinting of the JWT stack and its
  configuration. Impact is limited (no secret material is exposed), but it is needless
  reconnaissance surface on an unauthenticated endpoint.
- **Recommendation:** Return a generic `detail="Invalid token"` to the client and log the
  specific `exc` server-side. Optionally narrow the `except` so infrastructure errors
  (JWKS unreachable) map to 401/503 with a generic message rather than echoing internals.

## SEC-01-3 — Session tokens persisted in `localStorage`: `expense-tracker/src/services/supabase.js`

- **Severity:** Low
- **Category:** `session_management` (defense-in-depth)
- **Confidence:** 8/10
- **Description:** supabase-js persists the access/refresh tokens in `localStorage` by
  default ("stay logged in", per [AUTH-01](AUTH-01-multi-user-authentication.md)), which
  is readable by any JavaScript running on the origin. No stored/DOM XSS sink was found
  in the current frontend (no `dangerouslySetInnerHTML`, `eval`, or `innerHTML`), so
  this is not presently exploitable — it is a defense-in-depth concern that raises the
  blast radius of any future XSS to full session/refresh-token theft.
- **Exploit Scenario:** If an XSS were introduced later (e.g. a new component rendering
  user-controlled `description`/`display_name` via an unsafe sink), the payload could
  read `localStorage` and exfiltrate the long-lived refresh token, yielding persistent
  account takeover that survives token expiry.
- **Recommendation:** Keep treating any raw-HTML rendering as forbidden (React
  auto-escaping is the control here). Consider a strict CSP and, if session hardening is
  desired, evaluate cookie-based session storage behind the future TLS reverse proxy.

## SEC-01-4 — CORS permits any private-LAN / `*.local` origin on any port: `expense-tracker-api/main.py:92-105`

- **Severity:** Low / Informational
- **Category:** `cors_misconfiguration`
- **Confidence:** 8/10
- **Description:** `allow_origin_regex`
  ([main.py:92-105](../expense-tracker-api/main.py#L92-L105)) accepts `localhost`, all
  RFC-1918 ranges, and any `*.local` host on any port. This is intentional for the
  multi-device LAN setup. Notably it is **not** combined with
  `allow_credentials=True`, and the API authenticates via a bearer token (not cookies),
  so a malicious LAN origin cannot ride an ambient session — CORS is explicitly *not*
  the security boundary here (per [DEPLOY-01](DEPLOY-01-production-lan-docker.md) and
  [AUTH-01](AUTH-01-multi-user-authentication.md)). Flagged only so it is a conscious,
  documented choice rather than drift.
- **Exploit Scenario:** No concrete exploit given bearer-token auth and the absence of
  credentialed CORS: a rogue LAN site still cannot read the victim's token, which lives
  in the victim origin's `localStorage`. Risk would materialize only if the app later
  moved to cookie-based auth without tightening this regex.
- **Recommendation:** Leave as-is for LAN dev, but tighten to an explicit origin
  allow-list as part of the [DEPLOY-01](DEPLOY-01-production-lan-docker.md) production /
  public-domain step, and never pair this broad regex with `allow_credentials=True`.

---

## Explicitly checked and found sound (no finding)

- **Per-user isolation:** every endpoint in `expenses.py`, `savings.py`, `income.py`,
  `debts.py`, `analytics.py`, `categories.py`, `budget.py`, `fixed_expenses.py`,
  `config.py`, `account.py` filters by `user_id` (or an owner-verified parent, e.g.
  `_get_debt_or_404` before touching `debt_payments`). Non-owned IDs return 404. No
  cross-user IDOR path found.
- **JWT verification:** ES256 pinned via `algorithms=["ES256"]` (no `none`/HS
  confusion), signature checked against Supabase JWKS, with `aud="authenticated"`,
  `iss`, and `exp` all enforced ([auth.py:77-88](../expense-tracker-api/auth.py#L77-L88)).
- **SQL injection:** all queries use SQLAlchemy ORM expressions with bound params; no
  raw SQL, string-formatted queries, or `.execute(text(...))` with user input. PG-safe
  `func.substr(func.cast(...))` replaces SQLite-only `LIKE`-on-Date.
- **Path/param validation:** `month_key` path params constrained by
  `^\d{4}-\d{2}$` (SEC-04); IDs are server-generated UUIDs.
- **Admin API call:** `delete_supabase_auth_user` builds its URL from the verified JWT
  `sub` and a service-role key read from env; the key is only ever sent to the
  configured Supabase host and never logged.
- **Secrets:** only `.env.example` files (empty placeholders) are tracked; real `.env`
  files are git-ignored. No hardcoded keys/passwords in source.
- **Frontend XSS:** no `dangerouslySetInnerHTML`, `eval`, `new Function`, or direct
  `innerHTML`; React auto-escaping covers user-controlled text fields.

## References

- Architecture & invariants: [CLAUDE.md](../CLAUDE.md)
- Auth model & isolation guarantees: [AUTH-01](AUTH-01-multi-user-authentication.md)
- TLS / public-exposure path: [DEPLOY-01](DEPLOY-01-production-lan-docker.md)
- Prior audit IDs (SEC-04 path validation, SEC-05 rate limiting): `spec/DONE-10-findings-summary.md`
