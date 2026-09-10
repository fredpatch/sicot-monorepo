# Translation Service

Full variable-level detail:
[../operations/configuration-reference.md](../operations/configuration-reference.md#translation---libretranslate--deepl--gemini).
DeepL-toggle detail: same document.

## The call chain

Intended and current call chain: **Node API → `translate-service` →
LibreTranslate** (and, when enabled, `translate-service` → DeepL as a
fallback). The Node API never calls LibreTranslate directly.

- The Node API's translation client
  (`packages/server/src/utils/traduction.ts`) reads **only**
  `TRANSLATE_SERVICE_URL` for every call (`/translate`, `/translate/batch`,
  `/detect`, `/health`).
- `translate-service` (`packages/translate-service/main.py`) reads
  **only** `LIBRETRANSLATE_URL`, for its own separate call onward to
  LibreTranslate.
- Each Docker Compose environment sets `TRANSLATE_SERVICE_URL` on the API
  service, pointing at that environment's `translate-service` Compose
  service name on port 5002 (dev: `translate-service`; staging:
  `translate_staging`; production: `translate`) - see
  [../architecture/runtime-topology.md](../architecture/runtime-topology.md).
  This wiring is checked automatically by
  [`scripts/verify-translation-wiring.mjs`](../../scripts/verify-translation-wiring.mjs)
  in CI (`npm run verify:translation-wiring`), which would fail if a future
  change regressed it (e.g. a compose service rename without updating the
  URL, or `TRANSLATE_SERVICE_URL` being removed from the API service
  again).

If you land on this page with a translation failure, the symptoms below
assume this baseline is correctly wired - they help you find what's
actually broken (a specific container down, a hostname used in the wrong
context, DeepL misconfiguration), not a compose-file regression, which the
CI check would already have caught before merge.

## Symptom: translation requests fail from Docker

### Likely causes
- `translate-service` container down or unhealthy.
- LibreTranslate container down or unhealthy (see the second-hop symptom
  below).
- A local, uncommitted override of `TRANSLATE_SERVICE_URL` pointing
  somewhere wrong.

### Checks
```bash
# Is TRANSLATE_SERVICE_URL actually set as expected inside the api container?
docker compose exec api node -e "console.log(process.env.TRANSLATE_SERVICE_URL ?? '(unset)')"
# expected: http://translate-service:5002 (dev) / http://translate_staging:5002 (staging) / http://translate:5002 (prod)

# Is translate-service itself up and healthy?
docker compose ps translate-service    # dev service name
curl -i http://localhost:5002/health   # dev, host-exposed port
```

### Safe corrective actions
If `TRANSLATE_SERVICE_URL` is unexpectedly unset or wrong, confirm nothing
locally overrides it (a stray `.env` value, a shell export) - the compose
files themselves hardcode the correct value per environment and should not
normally need adjustment. If `translate-service` is down/unhealthy, restart
it (`docker compose restart translate-service`) and check its logs.

### Escalate when
`TRANSLATE_SERVICE_URL` is confirmed correctly set and `translate-service`
reports healthy, and translation still fails - proceed to the next two
symptoms to isolate which hop is actually broken.

---

## Symptom: Node API cannot reach `translate-service` (first hop)

### Likely causes
- `translate-service` container down or unhealthy.
- Wrong hostname for the environment (native `localhost` vs. Docker
  service name - these are genuinely different and neither works in the
  other context; see the last symptom below).
- A local override of `TRANSLATE_SERVICE_URL`.

### Checks
```bash
# Is translate-service healthy from Docker's own perspective?
docker compose ps translate-service

# Call translate-service directly, bypassing the Node API entirely
curl -i http://localhost:5002/health   # dev, host-exposed
```
If this direct call succeeds but calls routed through the Node API fail,
the problem is specifically in how the Node API is configured to reach
`translate-service` (an override, a stale container needing a rebuild) -
not in `translate-service` itself.

### Safe corrective actions
Restart or rebuild the affected container(s)
(`docker compose up --build -d translate-service`); confirm no local
override shadows the compose-provided `TRANSLATE_SERVICE_URL`.

### Escalate when
`translate-service` is confirmed healthy and directly reachable at its own
`/health`, `TRANSLATE_SERVICE_URL` is confirmed correctly set on the `api`
container, and calls through the Node API still fail.

---

## Symptom: `translate-service` cannot reach LibreTranslate (second hop)

### Likely causes
- LibreTranslate container down, still loading its language models (first
  boot can be slow), or unhealthy.
- A local override of `LIBRETRANSLATE_URL` on `translate-service`.

### Checks
```bash
# translate-service's own /health endpoint actively probes LibreTranslate
# and reports the result - this is the fastest way to isolate this hop
curl -s http://localhost:5002/health | grep -i libretranslate

# LibreTranslate directly
curl -i http://localhost:5000/languages   # dev, host-exposed
docker compose ps libretranslate
```
`translate-service`'s `/health` endpoint is a genuine dependency-reachability
check (it calls LibreTranslate's `/languages` internally) - it will tell
you directly whether this specific hop is the problem, without needing to
guess.

### Safe corrective actions
Confirm LibreTranslate's own healthcheck passes before assuming
`translate-service` is misconfigured - a fresh LibreTranslate container can
take a while to become ready (downloading/loading language models into its
volume).

### Escalate when
LibreTranslate is confirmed healthy and directly reachable, and
`translate-service`'s own `/health` still reports it unreachable.

---

## Symptom: distinguishing "API → translate-service" failure from "translate-service → LibreTranslate" failure

Use `translate-service`'s own `/health` endpoint as the single fastest
discriminator:

```bash
curl -s http://localhost:5002/health
```

- If this call **fails to connect at all** → the problem is the first hop
  (Node API/you can't reach `translate-service` itself) - see that symptom
  above.
- If this call **succeeds but reports LibreTranslate as unreachable** in
  its response body → the problem is the second hop - see that symptom
  above.
- If this call **succeeds and reports LibreTranslate reachable**, but
  translation requests routed through the Node API still fail → the
  problem is specifically the Node API's own configuration
  (`TRANSLATE_SERVICE_URL`) - see the "translation requests fail from
  Docker" symptom above.

This ordering avoids guessing which of three services is at fault.

---

## Symptom: optional DeepL fallback path fails

### Likely causes
- `DEEPL_ENABLED` is `false` (default) - this is expected behavior, not a
  failure; DeepL is intentionally off by default.
- `DEEPL_API_KEY` unset while `DEEPL_ENABLED=true` -
  `translate-service/main.py` raises an explicit error in this case rather
  than silently degrading.
- Two independent toggles exist for this feature: the `DEEPL_ENABLED` env
  var (read by `translate-service`) and a separate DB parameter
  `deepl_fallback_actif` (read by the Node server) - changing one does not
  change the other. See
  [../operations/configuration-reference.md](../operations/configuration-reference.md#new-findings-from-this-audit-not-fixed---documentation-only)
  for this as a documented finding, not a bug to chase further here.

### Checks
Confirm both the env var (on `translate-service`) and the DB parameter (via
the Settings/Paramètres screen or `GET /api/parametres`) agree on the
intended state.

### Safe corrective actions
If DeepL fallback is genuinely wanted, both switches need to be set
consistently - setting only one will produce inconsistent behavior between
the two subsystems.

### Escalate when
Both switches are confirmed consistently enabled, `DEEPL_API_KEY` is
confirmed set, and DeepL fallback still fails.

---

## Symptom: `/health` doesn't behave as expected

### Likely causes
Depth mismatch expectations - see
[../operations/monitoring-and-health.md](../operations/monitoring-and-health.md)
for exactly what each service's `/health` endpoint actually checks.
`translate-service`'s `/health` is a real dependency-reachability check
(it calls LibreTranslate); the main API's `/api/health` is **not** - it
never touches translation at all.

### Checks
Confirm which `/health` you're actually calling - `/api/health` (main API,
shallow) vs. `http://<translate-service host>:5002/health`
(translate-service, deep) are answering completely different questions.

### Safe corrective actions
Use `translate-service`'s own `/health` for translation-pipeline diagnosis,
not the main API's.

### Escalate when
Not applicable directly - this is a diagnosis-technique note, not a
failure mode on its own.

---

## Symptom: works natively but not in Docker (or vice versa)

### Likely causes
`localhost` means something different in each context. Native processes
share the host's `localhost`; each Docker container has its own - a
Compose service reaches another only by that other service's **service
name** (e.g. `translate-service`, `libretranslate`), never by `localhost`.
A URL that's correct for native dev is never correct inside a container,
and vice versa. Native dev's default (`http://localhost:5002`, from
`packages/server/.env.example`) only works when `translate-service` is
also run natively/host-exposed at that port - it is never the right value
inside a container.

### Checks
Confirm which context you're actually diagnosing, and whether the
hostname in the relevant URL matches that context's convention (a bare
hostname like `translate-service` for Docker, `localhost` for native).

### Safe corrective actions
Set environment-specific values rather than assuming one URL works
everywhere - each Docker Compose environment already hardcodes the correct
value on the API service; only native/non-Docker dev relies on the
`.env.example` default.

### Escalate when
Not applicable directly - this is foundational context for every symptom
above.
