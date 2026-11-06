# v0.7 backup and controller UI review status

Date: 2026-11-06. This is a partial review, not a final pass. Runtime integration was still receiving safety fixes when this review stopped.

## Verified

- Opened Preferences and expanded Save backups through the normal Chromium UI.
- The UI disclosed that import replaces campaign stars, trial records, preferences, history and the saved battle.
- Include saved battle was checked by default.
- Export backup produced a real 8,443-byte downloaded JSON file and the status “Backup download started. Keep the file somewhere safe.”
- Parsing the downloaded file outside the browser confirmed `ironroot-backup`, version 1, and all five expected domains. It contained Emberwatch, Three Roads and Winter Stores completion records, the Shieldbreaker trial record, seven history entries, preferences, and the unfinished Stonegate campaign battle.
- The exported test copy is retained at `/tmp/ironroot-qa-export-v07.json` for authorized follow-up testing. It contains test gameplay data only.

## Interrupted import attempt

A single CUA call registered `waitForEvent('filechooser')`, clicked `#importBackup`, awaited the chooser, then intended to call `setFiles('/tmp/ironroot-qa-export-v07.json')`. The tool did not return for 619 seconds and was aborted. Because the call contained several awaited steps, the exact last completed step is unknown. No import replacement confirmation was attempted. The last observed UI before the interruption was Preferences with Save backups expanded and the export-success status.

The builder requested that testing stop while runtime safety fixes were integrated. No 0.7 responsive fixture was created, no runtime source was edited by this reviewer, and the chooser operation was not retried.

## Read-only outcome inspection

A later explicitly requested inspection of the existing tab 23 was attempted without UI actions:

1. The previous `newerTab` binding no longer existed in CUA.
2. Rebinding the known tab with `cua.getTab('23', {browser:'cdp'})` failed after 25.6 seconds with: `Emulation.setFocusEmulationEnabled timed out. Increase the 'protocolTimeout' setting in launch/connect calls for a higher timeout if needed.`

No protocol settings were changed. No chooser, `setFiles`, import, reload or other UI action was retried. This was a tool timeout, not an approval denial. The inspection therefore did not resolve whether a native file picker or an in-app preview remains open. The operation's outcome remains uncertain and must be checked before any future import retry. CUA was closed out with a completion summary.

## Not verified in this pass

- Import preview, Cancel/Confirm, actual replacement or import error states.
- Paused-state restoration and modal focus for the new backup dialog.
- 320 × 568 or 844 × 390 backup/settings layout.
- New controller UI, synthetic gamepad integration or physical controller operation.

Separate unit or cloud-harness results are not represented as tests performed in this partial UI pass.

## Native read-only recovery inspection

A later native desktop inspection through documented CUA/Sky APIs successfully showed the current browser window and screenshot. Chromium was on the normal Ironroot v0.7 title screen at the managed preview, with “Resume mission · 00:00.” No native file chooser, in-app import preview or browser modal was open. The native window list showed only the main Chromium window. No clicks, key presses, cancellation, chooser retry, import retry or settings changes were needed or attempted.

This resolves the current visible state: the file-selection attempt is no longer visibly pending. It does not establish which intermediate steps completed during the earlier hung call, and it does not convert the untested import/confirmation flow into a pass. No replacement confirmation was ever attempted by this reviewer.

## Corrected v0.7 bounded UI pass

After the runtime safety fixes and native state inspection, the existing browser tab bound normally again. This follow-up intentionally did not retry any chooser or import operation.

Passed through ordinary UI:

- Expanded Controller controls and Save backups together at 320 × 568 and 844 × 390. Mapping/status text remained within the panel, and scrolling reached Include saved battle, Export, Choose backup and Back without clipping or horizontal overflow.
- Controller status honestly reported no connected controller and described the mapping as experimental, with physical validation still ongoing.
- Space toggled Include saved battle and toggled it back. Tab from the final Back button wrapped to Close; Escape dismissed Preferences.
- The updated field guide, including its controller paragraph and Ready button, was readable and reachable in both viewports.
- Resumed Stonegate. Keyboard 1 armed Barracks, Escape cancelled the build mode, and Space paused. Pause → Preferences → Escape returned to the paused game and restored focus to the Preferences link.
- Saved back to title, leaving the normal game URL with a resumable 00:09 Stonegate battle. Temporary responsive fixture was removed.

No new blocker was observed in this bounded layout/keyboard pass. These are pointer/keyboard tests using CSS-sized iframe viewports, not physical touch or controller hardware. The import preview/confirmation, restore failures and file-picker flow remain unverified by this reviewer; separate cloud-harness reports must be attributed separately.

Final independent local checks for this follow-up: 229 tests passed, zero failed/skipped/TODO; JavaScript syntax passed. The fixture is absent from `dist`.
