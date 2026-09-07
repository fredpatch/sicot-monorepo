We are now performing the approved coordinated Git history rewrite for fredpatch/sicot-monorepo.

Preconditions:

repository is public
current main is already sanitized at commit:
d0f981d8522f595aa604bc63f17a97da3650f4a2
the exposed Gmail App Password has been revoked/rotated externally
current HEAD contains no occurrence of the old secret
Safety rules

Do not use the existing working copy.

Work from a fresh clone in a separate directory.

Do not touch the project owner's existing repo directory or unrelated local files.

Do not print the old secret anywhere in terminal output, logs, patch previews, report text, filenames, or commit messages.

Use git filter-repo, not git filter-branch.

Do not force-push until all local verification steps pass.

1. Fresh clone and backup

Clone:

git clone https://github.com/fredpatch/sicot-monorepo.git sicot-history-cleanup
cd sicot-history-cleanup

Verify:

git status
git log -1 --oneline
git remote -v

Create a local safety bundle before rewriting:

git bundle create ../sicot-before-history-rewrite.bundle --all

Verify the bundle:

git bundle verify ../sicot-before-history-rewrite.bundle

This bundle is for local recovery only.

Do not commit or upload the bundle into the repository.

2. Confirm git filter-repo

Check:

git filter-repo --version

If unavailable, stop and report that it must be installed.

Do not substitute another history-rewrite tool.

3. Prepare secret replacement file safely

We need to remove exactly the known exposed Gmail App Password from history without displaying it.

Create a replacement file locally and outside the repository if practical, containing:

<OLD_SECRET>==>REMOVED_EXPOSED_SMTP_CREDENTIAL

Replace <OLD_SECRET> locally with the exact revoked secret value.

Do not echo the secret into visible terminal output.

Prefer creating the file using an editor or another method that does not print the value to the console.

Example filename outside the repo:

../sicot-secret-replacements.txt

Do not commit this file.

4. Rewrite history

Run:

git filter-repo \
--replace-text ../sicot-secret-replacements.txt \
--force

git filter-repo may remove origin as a safety feature. That is expected.

5. Verify locally before restoring remote

Verify repository integrity:

git status
git log --oneline --all --decorate -20
git fsck --full

Verify the revoked secret no longer occurs anywhere in rewritten history using a value-derived search that does not print the value.

Check:

all branches
all tags
every historical commit

The verification result should be only a count / pass-fail result.

Also confirm:

git log --all -- packages/server/.env.example

and inspect the earliest rewritten version of that file to ensure the credential is replaced, without printing or exposing the original secret.

6. Compare functional tip

Confirm the rewritten main tree is functionally identical to the currently sanitized remote main.

Since commit SHAs will all change, compare tree/content rather than SHA identity.

The current files at rewritten main should match sanitized commit d0f981d in content.

No source files should have changed as a result of the rewrite except historical secret substitution.

7. Restore remote only after verification

Add origin again if filter-repo removed it:

git remote add origin https://github.com/fredpatch/sicot-monorepo.git

Fetch remote refs for awareness only:

git remote -v

Do not merge/rebase old remote history back into the rewritten repository.

8. Force-push deliberately

First list rewritten local branches and tags:

git branch -a
git tag

If only main exists and no meaningful tags need preservation, force-push:

git push --force-with-lease origin main

If --force-with-lease cannot work because refs have been intentionally rewritten and the locally known lease is unavailable, stop and report rather than automatically downgrading to --force.

Do not force-push other branches/tags unless they actually contain the exposed history and need rewriting.

If multiple remote branches/tags exist, report them first and handle them deliberately.

9. Post-push verification

After successful push:

git fetch origin
git status
git log -1 --oneline origin/main

Verify again that the secret does not occur in any reachable history from origin/main.

Report the new rewritten main HEAD SHA.

10. GitHub-side verification

Confirm:

old commit 20c1a00 is no longer reachable from main
current .env.example contains placeholders only
no branch/tag still points into old history

If GitHub still exposes old unreachable commit objects by direct SHA URL, note that this can persist temporarily due to GitHub object retention/caches even after history rewrite. Do not treat that alone as a failed rewrite if no branch/tag references it.

11. Existing clone remediation

Anyone with an existing clone must not pull/rebase the rewritten history normally.

Preferred instruction:

re-clone the repository

If re-cloning is not practical, they must explicitly reset to the new remote history after backing up any uncommitted work.

Do not automatically rewrite someone else's local clone.

12. Cleanup

After successful verification, securely delete:

../sicot-secret-replacements.txt

Keep the bundle temporarily until the rewritten remote is confirmed healthy, then delete it as well because it still contains the old secret history.

Final report

Report only:

whether git filter-repo was available
number of refs rewritten
whether local verification found zero occurrences
whether git fsck --full passed
branches/tags that required force-push
push result
new main HEAD SHA
whether old commit 20c1a00 remains reachable from any branch/tag
whether current .env.example is sanitized
whether cleanup files were removed

Do not report the secret value.

Stop after this.

Do not start Phase 11.1.
