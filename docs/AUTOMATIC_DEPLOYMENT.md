# Automatic browser-runtime publication

The private source repository is `TsilenT/ironroot-frontier` (repository ID `1447793733`). Its browser-only deployment target is the public `TsilenT/ironroot-frontier-play` repository (ID `1447794727`), branch `main`. Existing GitHub Pages branch deployment continues to serve `https://ironroot.stevets.ai/`. This workflow does not configure Pages, domains, releases, or repository settings.

`dist/` contains publicly readable browser JavaScript, including `app.js` and `campaign.js`, along with HTML, CSS, fonts, and other browser assets. Publication intentionally makes that approved browser source readable; it is not an upload of opaque binaries. Source outside that approved browser runtime remains private.

## Flow

`.github/workflows/test.yml` validates every push, pull request, and manual run with Node 22, `npm test`, `npm run check`, and `npm run check:release`. Its `publish` job requires the test job to succeed and runs only for a push or manual run on the original private repository's `main`. Pull requests, forks, tags, and manual runs on other branches cannot publish.

The publisher checks out exactly the tested commit in a new job, without persisted git credentials. The job has `contents: read` on the private repository. Only its final step receives the separate target publication token. No package install, source build, artifact download, shell command, public checkout, or public script is executed by the publisher. Official `actions/checkout` and `actions/setup-node` are pinned to commit SHAs verified against their official repositories on 2026-11-08.

`scripts/publish-runtime.mjs`:

1. Verifies the GitHub Actions event, source identity, repository IDs, private/public visibility, default branches, and availability.
2. Validates `dist/` against the service-worker `FILES` manifest and its import closure, then adds a flat browser-file allowlist, regular-file/symlink checks, byte limits, and a limited obvious-credential/private-key check.
3. Requires the local runtime's Git blob hashes to match `dist/` at the exact tested source commit. Nothing is read from private docs, tests, QA, git history, or other source directories for publication.
4. Verifies that public main contains only approved runtime paths plus public `README.md`, `CNAME`, and `.nojekyll`. Those three public blobs are reused unchanged. The CNAME must remain `ironroot.stevets.ai` and `.nojekyll` must remain empty.
5. Returns `unchanged` without any POST/PATCH call when the runtime is already public. A documentation-only merge or manual rerun therefore does not create a duplicate public commit or deployment. Changed runtime must use a different literal `ironroot-vX.Y.Z` service-worker cache version.
6. Uploads only changed runtime blobs, constructs the complete public tree, and removes obsolete runtime files. Public commits use a fixed bot identity and generic message; private source commit messages, author identities, and source SHA are not copied.
7. Rechecks source freshness and target state before upload and before updating public main. Updates are non-force and never retried automatically. The final public ref is read back before success is reported.

Publication jobs share one concurrency group and do not cancel a running publication. GitHub does not guarantee FIFO ordering: stale queued jobs return `superseded` when private main no longer equals their tested SHA. A newer main whose tests fail is not published.

## Credential setup and activation

Credential creation and storage require their own explicit action-time approval. This documentation does not create or grant access.

Once approved, create a fine-grained GitHub personal access token with a 90-day expiry, resource owner `TsilenT`, access to **only** `ironroot-frontier-play`, and repository **Contents: read and write**. GitHub's required Metadata read permission is sufficient for repository identity checks. Do not grant access to the private source, Workflows write, administration, organization permissions, or all repositories.

Store that value as the private source repository's Actions secret `IRONROOT_PUBLISH_TOKEN`. Do not put it in code, files, logs, URLs, a workflow input, or the public repository. Do not reuse or widen the source `GITHUB_TOKEN`. The source token is provided by GitHub with `contents: read` and is used only for private source reads.

Submit this workflow, publisher, tests, and this document through a reviewed private pull request. Before merging, verify the tests for the exact PR head. Merging enables publication on subsequent main pushes, including the merge itself. If the runtime remains identical to the already-published v0.24.1 snapshot, that first run should report `unchanged`, not deploy it again.

After merge, inspect the exact main workflow run. A real changed-runtime publication must also be followed through the existing public Pages branch-build result and the live site; successful Git Data API publication alone does not certify successful Pages delivery. Local mocked tests cannot certify live credential scope, GitHub Actions execution, branch protections, Pages delivery, or browser behavior.

## Failure and recovery

- Missing secret: the publication step fails with its required secret name and performs no writes.
- Expired, revoked, or insufficiently scoped token: HTTP 401/403 is reported without response content. Inspect token expiry, selected repository, and Contents permission. Renew or replace credentials only with the required approval.
- Identical runtime: success with `unchanged`; no public objects or commits are created.
- Newer private main: success with `superseded`; no target ref update occurs. Objects uploaded before the last freshness check can remain unreferenced in the public repository, so every uploaded byte must already be approved public runtime.
- Concurrent public change: the publisher fails rather than overwriting it. Review current public main and rerun the current private main workflow if appropriate. No force-push or automatic rebase occurs.
- Timeout, transport failure, or uncertain update response: do not blindly repeat the write. Inspect public main and the Actions run first. If the intended runtime is already present, a deliberate current-main rerun becomes a no-op.
- Unexpected target file/directory or metadata: publication fails for manual review, preserving the target. For example, a new public `.github` directory is not silently removed or modified. Adding a new target file class requires deliberate policy and code review.
- Rollback: make a reviewed source commit on private main with the intended runtime and a new cache version, then allow normal tests and publication. Rerunning an old source commit cannot roll the live site back.

## Boundaries and residual risks

- Maintainers who can alter private main or its workflow are trusted. A repository Actions secret is available to authorized workflows, and the token grants Contents write across the selected public repository; it is not path-restricted by GitHub. The runtime-only restriction is enforced by this reviewed code, not by token permissions.
- The file allowlist and simple secret-pattern checks are defense in depth, not comprehensive secret scanning or proof that arbitrary JavaScript contains no confidential information. Review all new runtime content before merging. Do not put secrets or unapproved/confidential material into `dist/`.
- Current runtime is flat. New subdirectories, other file extensions, more than 256 files, files larger than 2 MiB, or total runtime larger than 16 MiB require explicit publisher changes. API calls are bounded and have a 20-second timeout; the job has a 10-minute deadline.
- Source and target are different Git repositories. There is no atomic cross-repository transaction: private main can advance in the narrow interval between the final freshness read and public ref update. Serial publication, repeated freshness checks, and non-force target updates prevent older queued jobs from rolling back a newer deployment, but do not promise zero brief publication of a just-superseded source. The newest passing main run publishes afterward.
- Unusual force rewinds of public main by another actor can defeat assumptions of normal forward-only history; do not force-rewrite public main while automatic publication is running. Ordinary concurrent forward changes are rejected by `force: false`.
- Git object upload itself makes those runtime bytes public, even if later freshness checks abort before the branch update. No source text outside the approved browser runtime is included in the upload bodies or commit metadata.
- Existing target Pages branch-build configuration, domain settings, public README, CNAME, and `.nojekyll` are not migrated or rewritten. Pages does not move to the private source repository.

## Local verification

Run `node --test tests/publish-runtime.test.mjs`, `npm test`, `npm run check`, and `npm run check:release`. Publisher tests use in-memory API responses only and never contact GitHub or require a real token. They cover no-op behavior, data-only trees, public metadata preservation, runtime removal, secret redaction, source/target identity, unsafe paths and links, freshness checkpoints, races, no-force writes, changed cache requirements, bounds, and workflow policy.

The script prints its final status as a machine-readable JSON line: `unchanged`, `superseded`, or `published`, with the public commit where applicable. It never prints a token or raw API response body. Treat a nonzero exit as requiring inspection rather than assuming a failed request had no effect.
