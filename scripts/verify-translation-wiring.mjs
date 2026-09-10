#!/usr/bin/env node
// Verifies that each Docker Compose environment wires the Node API's
// translation client to the correct place.
//
// Regression this guards against (Phase 12.1): the Node API reads
// TRANSLATE_SERVICE_URL (packages/server/src/utils/traduction.ts) to reach
// translate-service, which in turn reads LIBRETRANSLATE_URL to reach
// LibreTranslate. Before Phase 12.1, none of the three compose files set
// TRANSLATE_SERVICE_URL on the API service - they set LIBRETRANSLATE_URL
// there instead, a variable the Node API never reads. This script re-checks
// that invariant directly against each compose file's own resolved
// configuration, not against a copy of the values.
//
// Uses `docker compose ... config --format json` (Docker Compose v2, JSON
// output) as the sole source of truth - no YAML parser dependency, no
// hand-parsing of compose files. Does not read or assert on any variable
// other than TRANSLATE_SERVICE_URL/LIBRETRANSLATE_URL - other environment
// values (secrets included) are never inspected or printed.

import { execFileSync } from 'node:child_process';

/** @type {{
 *   file: string,
 *   apiService: string,
 *   translateService: string,
 *   expectedTranslateServiceUrl: string,
 * }[]} */
const ENVIRONMENTS = [
  {
    file: 'docker-compose.yml',
    apiService: 'api',
    translateService: 'translate-service',
    expectedTranslateServiceUrl: 'http://translate-service:5002',
  },
  {
    file: 'docker-compose.staging.yml',
    apiService: 'api_staging',
    translateService: 'translate_staging',
    expectedTranslateServiceUrl: 'http://translate_staging:5002',
  },
  {
    file: 'docker-compose.prod.yml',
    apiService: 'api',
    translateService: 'translate',
    expectedTranslateServiceUrl: 'http://translate:5002',
  },
];

/** @param {string} file */
function resolveComposeConfig(file) {
  let stdout;
  try {
    stdout = execFileSync('docker', ['compose', '-f', file, 'config', '--format', 'json'], {
      encoding: 'utf8',
      // Compose emits "variable not set, defaulting to blank" warnings on
      // stderr when no .env/.env.staging/.env.prod file is present (e.g. in
      // CI, where none of those secrets exist). That's expected and does
      // not affect the two variables this script checks, both of which are
      // hardcoded literals in the compose files, not interpolated from an
      // env file - so stderr is intentionally discarded here, not surfaced.
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (err) {
    console.error(`[verify-translation-wiring] FAILED to resolve ${file} via ` +
      `"docker compose -f ${file} config --format json". Is Docker installed ` +
      `and running? Underlying error:\n${err.message}`);
    process.exitCode = 1;
    return null;
  }

  try {
    return JSON.parse(stdout);
  } catch (err) {
    console.error(`[verify-translation-wiring] FAILED to parse JSON output for ${file}: ${err.message}`);
    process.exitCode = 1;
    return null;
  }
}

/**
 * @param {string} file
 * @param {string} serviceName
 * @param {Record<string, unknown>} config
 */
function getServiceEnv(file, serviceName, config) {
  const service = config?.services?.[serviceName];
  if (!service) {
    console.error(
      `[verify-translation-wiring] FAILED ${file}: expected service "${serviceName}" ` +
        `not found in resolved config. Known services: ${Object.keys(config?.services ?? {}).join(', ')}`
    );
    process.exitCode = 1;
    return null;
  }
  // Compose's JSON config output normalizes `environment:` to a plain
  // object ({ KEY: "value", ... }), regardless of whether the source YAML
  // used a list or map form.
  return service.environment ?? {};
}

let failures = 0;

for (const env of ENVIRONMENTS) {
  const config = resolveComposeConfig(env.file);
  if (!config) {
    failures++;
    continue;
  }

  const apiEnv = getServiceEnv(env.file, env.apiService, config);
  const translateEnv = getServiceEnv(env.file, env.translateService, config);
  if (!apiEnv || !translateEnv) {
    failures++;
    continue;
  }

  let envOk = true;

  // 1. API service must have TRANSLATE_SERVICE_URL, pointing at the
  //    correct translate-service Compose service name, on port 5002.
  const actualTranslateServiceUrl = apiEnv.TRANSLATE_SERVICE_URL;
  if (actualTranslateServiceUrl !== env.expectedTranslateServiceUrl) {
    console.error(
      `[verify-translation-wiring] FAILED ${env.file}: service "${env.apiService}" ` +
        `TRANSLATE_SERVICE_URL is ${JSON.stringify(actualTranslateServiceUrl ?? null)}, ` +
        `expected ${JSON.stringify(env.expectedTranslateServiceUrl)}.`
    );
    envOk = false;
  }

  // 2. API service must NOT have LIBRETRANSLATE_URL - it's never read by
  //    the Node API (only translate-service reads it) and its presence
  //    there is exactly the historical defect this script guards against.
  if ('LIBRETRANSLATE_URL' in apiEnv) {
    console.error(
      `[verify-translation-wiring] FAILED ${env.file}: service "${env.apiService}" ` +
        `still defines LIBRETRANSLATE_URL, which the Node API never reads - remove it ` +
        `(this is the Phase 12.1 regression this script exists to catch).`
    );
    envOk = false;
  }

  // 3. The translate-service itself must still have LIBRETRANSLATE_URL -
  //    it legitimately needs it to reach LibreTranslate. This is not a
  //    defect check; it's a sanity check that nothing accidentally removed
  //    the variable from the service that actually needs it.
  if (!('LIBRETRANSLATE_URL' in translateEnv)) {
    console.error(
      `[verify-translation-wiring] FAILED ${env.file}: service "${env.translateService}" ` +
        `is missing LIBRETRANSLATE_URL, which it needs to reach LibreTranslate.`
    );
    envOk = false;
  }

  if (envOk) {
    console.log(`[verify-translation-wiring] OK ${env.file}: ${env.apiService} -> ${env.expectedTranslateServiceUrl} -> ${env.translateService} -> LibreTranslate`);
  } else {
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n[verify-translation-wiring] ${failures} environment(s) failed.`);
  process.exit(1);
}

console.log('\n[verify-translation-wiring] All environments correctly wired.');
