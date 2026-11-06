# Short-portrait protected-objective native review

Date: 6 November 2026 UTC. Frozen private next-feature lab, managed localhost preview. No runtime changes or publication.

## Result

**320×480 and 390×500 fail the sampled Winter Stores geometry gate.** The ordinary portrait battlefield reaches only about 200px high: original targets are obscured after Focus, the focus toast falls behind the minimap, and Front intersects the lower tool row. At 320×480 the build deck also clips its price line at the iframe boundary. **320×568 is a usable control sample**, with visible mine models, separated navigation/tools, readable toast and complete build cards. It is not evidence for a 568px minimum or for any untested intermediate height.

Named 100% HP and real **18% HP · Critical** indicators remain readable at all three sizes. Compact Build correctly stays hidden in portrait. The larger sprite/team-mark changes do not resolve the HUD/navigation collisions; no new art change is attributed as their cause.

## Method and freeze

All gameplay used native screenshot-coordinate pointer input in the already-running Chromium window, exact-size responsive iframes, and legitimately available Winter Stores. No DOM evaluation, browser automation framework, synthetic progress, unlocks, storage injection, remote action, browser/server launch, import or chooser work was used. The iframe dimensions are known fixture settings; box measurements below are approximate native screenshot pixels, not computed DOM bounds or physical-device measurements. Window coordinates use a 1212×886 screenshot; iframe content begins near (30,194).

- app: `261e61b19a55b21606f637fb2fa7f68eea31082d6dc112ebd05892029cbf9be4`
- index: `cfff5afdfeb31d771e2bfb0eaa89e67d9be1f444c04c7d9cc4a67b30271ff271`
- CSS: `349ada26081e3ca24267efb8ea4492cd3b135be3ad4ceaf639e95f6ea2f6f102`
- engine: `83d315ba2a25ced0167543896c48c1d9ae0096827767e9bbe28485c5ae1810f5`

The candidate3 engine guard was already rebased before this review. The previous compact-layout review used the same app/index/CSS but an earlier engine. These native observations do not test or approve the engine guard.

## PO-N5 · P2 · Short portrait hides originals and collides with navigation

**Reproduction:** Start Winter Stores through ordinary campaign UI. Select 320×480 or 390×500 in the fixture. Activate North gold mine and then South gold mine. Observe both original sites, target badges, citadel HUD, focus toast, lower tools and minimap. The problem occurs while the dock reports both originals intact at 100% HP, before a loss.

**320×480:** The visible battlefield is about 320×200, window bounds approximately x30–350/y254–454. North is centered near (161,299): the left edge of its model overlaps the Your Citadel panel (about x42–154/y267–305), while the mission label crosses the model's right side. Its upper diamond/health region is visible but cluttered. South is centered near (161,411), beneath the bottom minimap/navigation row (roughly y400–443), so focusing it does not reveal the original model. The focus toast is around x117–264/y386–421 and is covered by that same row. Front occupies about x293–337/y400–443 and intersects the lower Settings tile, about x298–340/y365–409, by approximately 9px vertically. Pause/speed remain visible above, but these are not six fully separated tools.

**390×500:** The field grows in width, not useful height: approximately 390×200, x30–420/y254–454. North remains centered near (161,299), now entirely behind the expanded Your Citadel panel (approximately x42–174/y267–305). The diamond above it remains visible, which does not make the original model inspectable. South remains beneath the minimap, approximately x117–332/y400–443. The focus toast, approximately x152–298/y386–421, is partly covered. Front at approximately x337–381/y400–443 intersects the lower audio/settings row at y365–409.

Both citadel HP percentages remain readable; their panels are the obstruction rather than clipped HP text. Both target buttons retain readable names/health and roughly 44px-plus visible heights. Focus changes the camera normally but cannot overcome these fixed vertical overlaps. No fix or viewport threshold is proposed by this review.

Evidence: `03-320x480-north-focus.png`, `04-320x480-south-focus.png`, `05-390x500-north-focus.png`, `06-390x500-south-focus.png`. The corresponding `*-field-detail.png` images are enlarged crops of the native screenshots, not fresh rendered states.

## PO-N6 · P2 · 320×480 cuts ordinary build prices

At 320×480, the ordinary build deck begins below the 88px objective dock. Visible card tops are around y590, but the iframe ends at y674, cutting the price line and card bottoms. Initial Barracks/Archery/Rally prices are partly clipped, and horizontal scrolling exposes later cards with the same bottom clipping. A vertical scroll attempt in the deck did not reveal the missing lower strip. This is viewport clipping, not a missing card or compact drawer: Compact Build is correctly absent.

At 390×500, the iframe ends at y694 and the sampled card bottoms/prices fit near y690. Horizontal scrolling remains available. At 320×568, both initial and later cards fit, including Sanctum 230, Aerie 250 and fixed Rally 75.

Evidence: `09-320x480-deck-stays-clipped.png`, `10-390x500-build-prices.png`, and the 320×568 control screenshots. This pass did not buy a new building; ordinary paid placement was already covered in the preceding compact-layout retest.

## Control, labels and bounds

At **320×568**, the field is approximately 320×252, x30–350/y254–506. North and South models near (161,321) and (161,444) are both visible after either target Focus. The tool grid ends near y409; the navigation/minimap starts near y451, leaving separation. The focus toast around x117–264/y386–421 is itself fully readable and not behind the minimap. A transient focus toast can cover South's diamond/health region above the model; the mine itself remains visible. This is a residual transient occlusion observation, not a claim that the control view is obstruction-free at every instant.

Header resources/time, both citadel HP percentages, both target names, 100% HP, the progress line and remaining mission time are readable in all three samples. At real battle time **00:42**, both originals reached **18% HP · Critical** through ordinary combat. The battle was paused and the same state was inspected at all three sizes. Both critical labels and bars fit. Paused target buttons appropriately omit active Focus text. The original five-domain profile was retained throughout; no critical state was injected.

Evidence: `07-320x568-north-control.png`, `08-320x568-south-control.png`, `11-390x500-critical.png`, `12-320x480-critical.png`, `13-320x568-critical-control.png`.

One undefended run ended during the first measurements, followed by ordinary Retry. No additional long win/defeat test was needed or claimed. Measurements were paused between sampled critical layouts. Common Ground, full campaign balance, screen-reader output, physical touch/controller hardware and heights below 320px were not tested. Responsive pointer evidence must not be represented as phone-hardware evidence.

## Restoration, cleanup and release

The original local tab was retained throughout. The production tab was observed at its inactive title screen and left unchanged. The safeguard initially verified the retained original five domains. After testing, Verify reported the expected differences. Restore explicitly confirmed **original five save domains restored and byte-verified**, with protocol 2 retained. No raw profile content was recorded.

The local tab was navigated to `about:blank`, closing both fixture views. Only `dist/__qa_clarity_profile.html` and `dist/__qa_clarity_viewport.html` were removed. `node scripts/verify-runtime.mjs` passed **34 runtime files / 697,981 bytes**, and all four listed hashes still matched. Browser/runtime were released without source edits.

Evidence directory: `/workspace/shared/ironroot-clarity-ui-review/short-portrait`. Safeguard evidence is `01-retained.png`, `14-profile-difference.png`, and `15-profile-restored.png`; final integrity evidence is `preflight.txt`. This is local source-dist validation, not publication approval.
