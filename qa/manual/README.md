# Manual QA profile safeguard

`profile-safeguard.html` is a developer-only, explicit retain/restore page. It is not a game feature and must never appear in a published runtime allowlist or service-worker shell.

For an authorized local preview, copy it temporarily to `dist/__qa_frontier_profile.html`, open that URL in the same browser tab, and click **Retain original profile only** before test play. It preserves the exact five save-domain strings in that tab's session storage and a validated portable backup, without creating progress or changing a battle. Keep other active game tabs closed.

After testing, return in the same tab and click **Restore retained original profile**. Observe the byte-verified success message before deleting the temporary `dist` copy. Protocol2 is retained, so an older client must not overwrite the expanded profile. A failed or uncertain restoration keeps the retained original in session storage and displays a stop message; do not blindly retry or report success.

This fixture is not a replacement for testing the game's native file chooser/import workflow. It avoids changing the reviewer's existing save data during ordinary UI play. Do not include real profile contents in source or reports.
