# Design QA — PawRise public landing page

## Comparison target

- Source visual truth: original reference supplied during the design pass (not retained in this repository)
- Implementation: `http://127.0.0.1:5001/` (application pages remain available under `/app.html`)
- Implementation screenshot: `landing-desktop.png`
- Combined comparison: `landing-comparison.png`
- Additional scroll evidence: `landing-why-section.png`, `landing-features-section.png`
- State: public landing page, top of page; no authentication

## Viewport and normalization

- Source pixels: 1245 × 832.
- Browser implementation pixels / CSS viewport: 1265 × 712 at device scale factor 1.
- Density normalization: none required; both artifacts were compared at natural 1× pixels in a single side-by-side canvas.
- The source screenshot has a taller aspect ratio and omits the full navigation context. The implementation intentionally uses a one-viewport hero at the active in-app-browser ratio, then continues into scrollable content as requested.

## Full-view comparison evidence

The combined comparison confirms the target composition is retained: dominant two-line serif headline, small supporting content at the upper left and right, three aligned pet images anchored to a three-panel lower stage, and a centered primary action. PawRise-specific care and record previews replace the source's ecommerce content. The warm milk-white, coral, sage, and charcoal visual system matches the existing product rather than the source mint/green store palette.

## Focused region evidence

A separate crop was not required because the header, headline, side previews, pets, panel copy, icons, and CTA remain legible at natural resolution in the full-view comparison. The first two below-the-fold sections were also captured separately to verify the scrollable continuation and product-specific content hierarchy.

## Required fidelity surfaces

- Fonts and typography: DM Serif Display recreates the editorial hero hierarchy; Inter is used for navigation and UI copy. Weights, line height, and two-line wrapping remain balanced at the captured desktop viewport.
- Spacing and layout rhythm: the header, side previews, centered title, and bottom pet stage reproduce the source's spatial structure. Below-the-fold sections use wider editorial spacing so content is not compressed into the hero.
- Colors and visual tokens: PawRise milk white, cream, coral, sage, charcoal, and beige line colors are consistently applied.
- Image quality and asset fidelity: the supplied source pet assets are used directly from the prompt's external URLs; no CSS drawings, placeholder shapes, emoji, or custom SVG substitutes are used. Lucide React provides UI icons.
- Copy and content: all content is English and limited to real PawRise capabilities: Care Planner, Medical Records, Memories, and pet profiles. Ecommerce, ratings, delivery, social metrics, and unsupported email claims were removed.
- Responsiveness and accessibility: semantic navigation, headings, links, visible focusable CTAs, alt text, reduced-motion handling, and mobile stacking CSS are included. Mobile styling was syntax-checked but not separately browser-captured.

## Findings

- No actionable P0, P1, or P2 findings remain.
- [P3] A dedicated mobile visual capture remains a useful follow-up because the in-app browser was only available at the desktop/tablet viewport during this pass.

## Comparison history

1. Initial browser pass found a P1 hierarchy issue: the first headline line wrapped too widely and the center pet obscured the copy. The headline was rewritten as two intentional lines, hero proportions were changed to one viewport, and pet sizing/positioning was reduced.
2. The second browser pass found a P2 asset-composition issue: background panels were being drawn behind image assets that already contained their own lower panels, creating nested rectangles. The redundant panel backgrounds and offsets were removed and the provided pet assets were allowed to define the stage.
3. Final pass: the revised top-of-page capture was compared directly with the source in `landing-comparison.png`. No actionable P0/P1/P2 mismatch remained.

## Primary interactions tested

- “Why PawRise” navigation scrolls to the problem section.
- “Features” anchor opens the scrollable feature section.
- “Get started” routes directly to signup at `/app.html?mode=signup`; “Log in” routes to `/app.html?mode=login`.
- Browser console checked in a clean tab: zero errors.

## Implementation checklist

- [x] Keep the public landing page isolated from the existing app.
- [x] Match the supplied hero composition.
- [x] Replace store content with PawRise-specific content.
- [x] Continue below the hero with problem, features, process, CTA, and footer sections.
- [x] Connect primary CTAs to the existing application.
- [x] Validate JSX/CSS syntax and browser console.
- [x] Compare source and implementation in one combined visual.

final result: passed
