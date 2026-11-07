# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: restart-briefing.spec.mjs >> a resumed stale copy cannot autosave after another tab confirms restart
- Location: restart-briefing.spec.mjs:127:1

# Error details

```
Test timeout of 20000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - link "Ironroot Frontier home" [ref=e4] [cursor=pointer]:
        - /url: ./
        - generic [ref=e5]: ♜
        - generic [ref=e6]:
          - text: IRONROOT
          - generic [ref=e7]: F R O N T I E R
      - generic [ref=e8]:
        - generic [ref=e10]: CAMPAIGN
        - generic [ref=e11]: /
        - generic [ref=e12]: ROADSIDE WATCH
      - generic [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: ◆
          - generic [ref=e16]: "420"
          - generic [ref=e17]: +5 /s
        - generic [ref=e18]:
          - generic [ref=e19]: ⚑
          - generic "0 / 70 army capacity" [ref=e20]: "0"
          - generic [ref=e21]: ARMY
        - generic [ref=e22]:
          - generic [ref=e23]: 00:00
          - generic [ref=e24]: TEACHING PAUSE
    - main [ref=e25]:
      - 'generic "Battlefield. Choose a building, then a green build slot to place it once. Hold Shift with a mouse click to keep building. Drag or middle mouse drag to explore. Right-click or Escape cancels placement. Pan left: Left arrow. Pan right: Right arrow. Battle keyboard controls are in Options." [ref=e26]'
      - generic:
        - generic:
          - generic: YOUR CITADEL
          - generic: 100%
        - generic:
          - text: ROADSIDE WATCH
          - generic: CAMPAIGN
        - generic:
          - generic: ENEMY CITADEL
          - generic: 100%
      - status [ref=e27]
      - generic [ref=e28]:
        - button "Resume game" [ref=e29] [cursor=pointer]: ▶
        - button "Change battle speed" [ref=e30] [cursor=pointer]: 1×
        - button "Mute audio" [ref=e31] [cursor=pointer]: ♫
        - button "Open options" [ref=e32] [cursor=pointer]: ⚙
      - generic: DRAG to explore · TAP a building to manage it
      - status: Another tab saved a newer battle. Return to title to resume it; this tab will not overwrite it.
      - generic [ref=e33]:
        - button "Go to your base" [ref=e34] [cursor=pointer]: ⌂
        - generic "Map overview. Tap to move the camera." [ref=e35] [cursor=pointer]
        - button "Follow the frontline" [ref=e36] [cursor=pointer]: ⚔
      - region "Mission objectives":
        - generic: 0/1 targets
        - generic: 03:00 remaining
    - region "Building controls" [ref=e37]:
      - region "Campaign teaching" [ref=e38]:
        - button "Hide hints" [pressed] [ref=e40] [cursor=pointer]
      - generic [ref=e41]:
        - generic [ref=e42]: BUILD YOUR FRONTIER
        - generic [ref=e43]: Choose a building, then place it in your territory.
      - generic [ref=e44]:
        - generic [ref=e45]:
          - 'button "Barracks, 140 gold. Spawns shielded warriors. Absorbs arrows and protects your archers. Keyboard: 1." [ref=e46] [cursor=pointer]':
            - generic [ref=e47]: "1"
            - generic [ref=e55]:
              - heading "Barracks" [level=3] [ref=e56]
              - generic [ref=e57]: Shielded warriors
            - generic [ref=e58]: ◆ 140
          - 'button "Archery range, 175 gold. Spawns fragile ranged archers. Best behind a warrior screen. Keyboard: 2." [ref=e59] [cursor=pointer]':
            - generic [ref=e60]: "2"
            - generic [ref=e69]:
              - heading "Archery" [level=3] [ref=e70]
              - generic [ref=e71]: Ranged support
            - generic [ref=e72]: ◆ 175
        - button "✦ Arrow volley Area damage to troops ◆ 75 25s cooldown" [ref=e73] [cursor=pointer]:
          - generic [ref=e74]: ✦
          - generic [ref=e75]: Arrow volley
          - generic [ref=e76]: Area damage to troops
          - generic [ref=e77]:
            - text: ◆ 75
            - emphasis [ref=e78]: 25s cooldown
  - dialog "Paused" [ref=e80]:
    - banner [ref=e81]:
      - generic [ref=e82]: BATTLE MENU
      - heading "Paused" [level=2] [ref=e83]
      - paragraph [ref=e84]: Campaign · 00:00 · 1× speed
    - generic [ref=e85]:
      - heading "Roadside Watch" [level=3] [ref=e86]
      - paragraph [ref=e87]: Destroy the marked barracks within 3:00, or destroy the enemy citadel.
    - button "Resume battle" [active] [ref=e88] [cursor=pointer]:
      - text: Resume battle
      - generic [aria-hidden] [ref=e89]: →
    - generic [ref=e90]:
      - button "Options Audio, display & saves" [ref=e91] [cursor=pointer]:
        - text: Options
        - generic [ref=e92]: Audio, display & saves
      - button "Open field guide" [ref=e93] [cursor=pointer]:
        - text: Field guide
        - generic [ref=e94]: Units, controls & economy
    - status [ref=e95]: A newer battle is saved in another tab. Return to title to resume it.
    - generic [ref=e96]:
      - button "Save & return to title" [ref=e97] [cursor=pointer]
      - button "Restart mission…" [disabled] [ref=e98]
```
