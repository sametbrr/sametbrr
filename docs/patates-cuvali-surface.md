# Pato

Mode: Operate. This is a precisely specified companion timer based on the researched reference flow, within the existing portfolio; no concept tournament is needed.

## Direction contract

THESIS: A single quiet stage for a potato companion, a readable timer and one primary next action. Breaks advance its journey to the field.

OWN-WORLD: Inherit Geist, accessible controls and restrained spacing from the portfolio. The tool inherits the portfolio’s existing light/dark theme tokens and persisted theme preference. The original clay potato supplies the only illustrated focal point. No changes to the portfolio's global theme.

STORY: Choose a session count, start working, get up for a break and carry the potato home. Settings explain optional phone and notification features honestly.

FIRST VIEWPORT: Slim brand/back navigation; compact centered stage with speech, character, countdown and main action; journey and inline daily totals below; frequently used controls sit beside the timer on desktop and above it on mobile. The native settings modal retains detailed Session, Sound & movement and Phone controls.

FORM: Reference-pinned companion stage. seed: none (unavailable). Code-first because this is an app screen. Character imagery is a shipping asset, not a page comp.

FINISH: Review evidence lives in `.impeccable/review`; [the finish verdict](../.impeccable/review/verdict.md) is `ship` after the disconnect-recovery and stale-scheduler fixes. The current approved request makes Pato match the main site background/theme and reduces scrolling to reach settings. The theme/settings review found no material defect and required no recapture. The incumbent `DESIGN.md` remains the portfolio contract; Pato now inherits that system rather than defining a separate palette. Every shipping raster must retain its provenance record. This verdict does not establish deployment or real-device Web Push delivery.

## Implemented surface contract

These rules describe `/pato`, `/en/pato` and its compact window. `src/components/patates/patates.module.css` maps local aliases to existing global tokens; it does not redefine the site palette. The shared `ThemeToggle` reads the root theme through `useTheme` and saves an explicit choice with the site's existing storage key. The site starts light until a user chooses a theme; Pato respects that saved choice across site navigation and reloads.

| Role | Implemented token | Application |
|---|---|---|
| Page/stage | `--paper: var(--color-void)` | Existing light `#f6f6f2` / dark `#050505` background |
| Ink | `--ink: var(--color-fg)` | Text |
| Supporting copy | `--muted: var(--color-fg-muted)` | Labels and hints |
| Separators | `--line: var(--color-line)`; `--color-line-strong` | Dividers and stronger borders |
| Settings surface | `--color-surface-1` | Native dialog, light `#ffffff` / dark `#0d0d0d` |
| Controls | `--color-surface-2` / `--color-surface-3` | Resting / hover fill |
| Primary | `--color-primary`, `--color-on-primary`, `--color-primary-hover` | Main action and selected tab |
| Focus/journey | `--color-ghost` | Keyboard outline, progress and reached stops |
| Warning/reset | `--color-danger` | Overtime timer and reset action |

Geist Sans remains inherited. The title is 32px (28px at ≤600px), and the tabular timer is 76px (68px on mobile, 64px for short desktop viewports). The original clay potato remains the illustrated focal point; artwork and provenance are unchanged. Surfaces remain restrained, with separators; the primary action retains 12px corners and keyboard outlines use 2px with a 4px offset.

The main column is capped at 920px and the header at 1040px. Daily totals form an inline strip on desktop and wrap below the stage at ≤600px. Quick settings are always visible: focus duration, break duration, session count, auto continue, sound choice and quiet hour. They occupy a 270px rail beside the stage above 760px; at ≤760px they form a compact panel above the timer, with three duration/count fields on one row. The toolbar modal remains available for long breaks, demo mode, idle detection, pairing, notifications and reset. Quick and modal controls share the same state; session controls lock during an active session, while sound and quiet hour remain usable. The native dialog is at most 640px wide, constrained to the viewport with `max-height: calc(100dvh - 40px)` and internal overflow when content requires it. Session steppers use two columns on desktop and one on mobile. Three tabs separate Session, Sound & movement and Phone controls; reset and status feedback stay inside the modal.

The compact window is requested at 360×540 with a 60px timer and smaller character, only when Document Picture-in-Picture is supported. It receives the shared styles and initial root theme; `useTheme` synchronizes subsequent theme changes. This wiring is source-verified; actual native PiP opening remains unavailable in the test environment.

## Behavior and accessibility

- The main action follows idle → focus → user-started break → next focus or completed journey. Expired focus remains visible as a positive overtime timer in the shared danger color; it never silently starts a walking break. A seated break is a separate action and does not add walking time. Durations lock during an active session; reset preserves daily totals.
- Character poses communicate sitting, walking, sprouting and arrival. Walking uses a one-second loop; taps trigger a 600ms wiggle. `prefers-reduced-motion: reduce` disables animations and transitions in both main and compact stages. Timer digits remain readable text, with a timer role; speech and status messages use polite announcements.
- Space invokes the relevant timer action outside interactive controls and open settings/story; Escape closes those panels and returns focus to the settings trigger. Settings use native `dialog.showModal()`, lock background scrolling while open and restore it on close. Tabs expose tablist/tab/tabpanel semantics with arrow, Home and End navigation; Escape closes the modal and returns focus to the settings trigger. Sound is a separate persisted preference and does not depend on reduced motion.
- Pairing and notifications remain optional. Server capability controls their availability. Disconnect returns to local timing even for a missing room or failed cancellation; failed server cancellation is queued for retry on mount, reconnect and every 30 seconds, with an explicit warning about old reminders. A subscription test is not evidence of remote delivery.

Operational requirements, retry/delivery limits and real-device checks are recorded in [patates-cuvali-deployment.md](patates-cuvali-deployment.md).

## Documentation boundary

No root design-system regeneration is needed for this isolated extension. In particular, `.impeccable/design.json` is the sidecar of a regenerated root `DESIGN.md`, not a required new global artifact for a locally scoped app. Preserve both incumbent system files and keep tool-specific rules here.

The incumbent `DESIGN.md` predates the current portable format: it uses numbered Turkish sections and has no machine-readable YAML token frontmatter. That pre-existing format drift is outside this extension and has not been repaired. The original visual review remains historical evidence. The later theme/settings pass inspected five supplied captures and source; its focused browser checks are recorded separately in [pato-tarayici-testleri.md](pato-tarayici-testleri.md), without claiming the full earlier functional matrix was rerun.

## Pofi parity additions

A first-visit intro dialog (story, session stepper, estimated total) reuses the settings dialog surface at 440px. The primary button stays enabled during breaks with a quieter surface style until the break ends. A one-time notification prompt card sits under the actions. New character motion: breathe (sit), stretch (desk break), hop (phase change), flip (five taps); all disabled under reduced motion. The potato desaturates gradually while overdue before the rooted and stone looks.

## Site-aligned layout (supersedes the modal and quick-settings notes above)

Pato now uses the arcade game page frame: shared `SiteNav`, `container-site`, back link, label + `text-h2` title, then the timer card. Settings are no longer a modal or a separate quick panel; they are one in-page accordion table (Session, Sound & movement, Phone & notifications) beside the timer above 900px and below it otherwise. Each closed row shows its current value; one row is open at a time, Session by default on wide screens. Today's totals sit under the table. Below, a two-column block mirrors game pages: an always-open "How it works" description and the "More games" list. The first-visit intro remains the only dialog.
