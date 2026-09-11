#!/usr/bin/env node
// Static regression guard (Phase 12.3B, item 3 of the review correction):
// confirms packages/server/Dockerfile's pinned PostgreSQL client package
// major version matches the PostgreSQL server major version declared for
// every environment (docker-compose.yml / .staging.yml / .prod.yml).
//
// Why this exists: an unpinned `apk add postgresql-client` on Alpine tracks
// whatever major is currently latest in Alpine's package index (18.x as of
// Phase 12.3B), independent of what PostgreSQL major the compose files
// actually declare (16). A pg_dump 18.x -> psql 16 restore fails outright
// (a GUC introduced in PostgreSQL 17, `transaction_timeout`, appears in the
// dump and PostgreSQL 16 rejects it) - this was found and fixed by pinning
// the Dockerfile to `postgresql16-client`. This script is the smallest
// deterministic check that a future, unrelated Dockerfile edit can't
// silently reintroduce that mismatch - it does not build any image or
// touch Docker at all, it only reads text files.
//
// Deliberately static (no `docker build`, no image inspection): matches the
// existing verify-translation-wiring.mjs pattern in this repo, keeps this
// check fast enough for the everyday `verify` CI job, and a version pin
// mismatch is a text-level fact (a package name string vs an image tag
// string), not something that requires actually running anything to detect.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const DOCKERFILE = path.join(REPO_ROOT, 'packages', 'server', 'Dockerfile');
const COMPOSE_FILES = ['docker-compose.yml', 'docker-compose.staging.yml', 'docker-compose.prod.yml'];

let failures = 0;

function fail(message) {
  console.error(`[verify-backup-client-version] FAILED: ${message}`);
  failures += 1;
}

// ── PostgreSQL client major(s) pinned in the Dockerfile ────────────────────
const dockerfileSource = fs.readFileSync(DOCKERFILE, 'utf8');
const clientPinRegex = /postgresql(\d+)-client\b/g;
const clientMajors = new Set();
let match;
while ((match = clientPinRegex.exec(dockerfileSource)) !== null) {
  clientMajors.add(match[1]);
}

if (clientMajors.size === 0) {
  fail(
    `${path.relative(REPO_ROOT, DOCKERFILE)} does not pin a versioned "postgresql<N>-client" ` +
      `package (e.g. "postgresql16-client"). An unversioned "postgresql-client" meta-package tracks ` +
      "Alpine's latest available major, independent of the production PostgreSQL server's major - see " +
      'docs/operations/restore-drill.md#postgresql-clientserver-version-contract.'
  );
} else if (clientMajors.size > 1) {
  fail(
    `${path.relative(REPO_ROOT, DOCKERFILE)} pins inconsistent PostgreSQL client majors across its ` +
      `stages: ${[...clientMajors].sort().join(', ')}. All stages must pin the same major.`
  );
}

const dockerfileClientMajor = clientMajors.size === 1 ? [...clientMajors][0] : null;

// ── PostgreSQL server major declared per environment ────────────────────────
for (const file of COMPOSE_FILES) {
  const fullPath = path.join(REPO_ROOT, file);
  if (!fs.existsSync(fullPath)) {
    fail(`${file} not found.`);
    continue;
  }
  const source = fs.readFileSync(fullPath, 'utf8');
  // Matches "image: postgres:16" (optionally quoted) on the postgres service
  // line - intentionally simple text matching (no YAML parser dependency),
  // consistent with the rest of this repo's verify:* scripts.
  const serviceMatch = source.match(/image:\s*["']?postgres:(\d+)["']?/);
  if (!serviceMatch) {
    fail(`${file}: could not find a "postgres:<major>" image tag for the PostgreSQL service.`);
    continue;
  }
  const serverMajor = serviceMatch[1];

  if (dockerfileClientMajor === null) {
    // Already reported above - avoid a redundant/misleading second failure.
    continue;
  }
  if (serverMajor !== dockerfileClientMajor) {
    fail(
      `${file} declares PostgreSQL server major ${serverMajor}, but ` +
        `${path.relative(REPO_ROOT, DOCKERFILE)} pins client major ${dockerfileClientMajor}. ` +
        'A restore produced by this client against this server would fail - see ' +
        'docs/operations/restore-drill.md#postgresql-clientserver-version-contract.'
    );
  } else {
    console.log(`[verify-backup-client-version] OK ${file}: server major ${serverMajor} == client major ${dockerfileClientMajor}`);
  }
}

if (failures > 0) {
  console.error(`\n[verify-backup-client-version] ${failures} check(s) failed.`);
  process.exit(1);
}

console.log('\n[verify-backup-client-version] PostgreSQL client/server major version contract holds everywhere.');
