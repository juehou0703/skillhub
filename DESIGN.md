# Design System — SkillHub

## Product Context
- **What this is:** A marketplace where domain experts upload Claude skills and developers invoke them via MCP
- **Who it's for:** Developers using Claude Code/Cowork — technical, efficiency-focused, quality-conscious
- **Space/industry:** AI developer tools, skill/plugin marketplaces
- **Project type:** Web app (marketplace + dashboard)

## Aesthetic Direction
- **Direction:** Warm utilitarian — inspired by Anthropic/Claude's design language
- **Decoration level:** Intentional — warm cream backgrounds, subtle depth through shadows
- **Mood:** Intelligent, warm, trustworthy. The visual warmth of Claude meets the functional clarity of a developer tool. Cream backgrounds, terracotta accents, refined typography.
- **Reference sites:** claude.ai, anthropic.com, console.anthropic.com

## Typography
- **Display/Hero:** Outfit — geometric sans similar to Anthropic's Styrene, warm and wide with personality. Free via Google Fonts.
- **Body/UI:** Outfit — single-family system for consistency, excellent at all sizes (300-700 weight range)
- **Data/Tables:** Outfit with `font-variant-numeric: tabular-nums` — aligned numbers in usage tables
- **Code:** JetBrains Mono — clean, purpose-built for code, pairs well with geometric sans
- **Loading:** Outfit via Google Fonts (`https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap`), JetBrains Mono via Google Fonts (`https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap`)
- **Scale:**
  - Hero: 56px / 700 weight / -1.5px tracking
  - Page title: 24px / 600 weight / -0.5px tracking
  - Section heading: 18px / 600 weight
  - Card title: 15px / 600 weight
  - Body: 15px / 400 weight / 1.6 line-height
  - UI label: 13px / 500 weight
  - Caption/badge: 11-12px / mono / uppercase / 0.5-1.5px tracking

## Color
- **Approach:** Restrained — warm terracotta accent + cream neutrals, inspired by Claude/Anthropic palette
- **Primary:** `#d97757` (Claude terracotta/orange) — warm, distinctive, conveys approachability
- **Primary hover:** `#c4613f` (darker terracotta)
- **Primary subtle:** `#fdf0eb` (warm peach tint) — backgrounds for selected/active states
- **Neutrals (warm cream):**
  - Background: `#faf9f5` (Anthropic cream)
  - Surface: `#ffffff` (white cards/elevated elements)
  - Surface raised: `#ffffff`
  - Border: `#e8e6dc` (warm light gray, Anthropic style)
  - Border strong: `#d5d3c8` (warm medium gray)
  - Text: `#141413` (Anthropic near-black, warm)
  - Text secondary: `#6b6861` (warm gray) — AA compliant at all sizes
  - Text muted: `#b0aea5` (Anthropic mid gray) — decorative labels only, not for content
- **Semantic:**
  - Success: `#5a9a6e` / subtle: `#f0f7f2` (muted green, warmer than standard)
  - Warning: `#c49032` / subtle: `#fdf6e8` (warm amber)
  - Error: `#c9503e` / subtle: `#fdf0ed` (warm red, not harsh)
  - Info: `#6a9bcc` (Anthropic blue) / subtle: `#edf4fa`
- **Dark mode strategy:** Background `#141413`, surface `#1e1d1b`, border `#3a3835`, primary stays `#d97757`, text `#faf9f5`

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)
- **Page padding:** 24px
- **Card padding:** 20-24px
- **Max content width:** 1100px

## Layout
- **Approach:** Grid-disciplined — strict columns, predictable alignment
- **Grid:** Auto-fill with `minmax(300px, 1fr)` for skill cards, `minmax(260px, 1fr)` for compact grids
- **Max content width:** 1100px
- **Border radius:**
  - sm: 4px (badges, small elements)
  - md: 8px (buttons, inputs, cards)
  - lg: 12px (modals, balance card, page sections)
  - full: 9999px (pills, status badges)

## Motion
- **Approach:** Minimal-functional — transitions that aid comprehension only
- **Easing:** enter: `cubic-bezier(0.16, 1, 0.3, 1)` / exit: `cubic-bezier(0.7, 0, 0.84, 0)`
- **Duration:** micro: 50ms / short: 150ms / medium: 250ms
- **Usage:** Card hover lift (1px translateY + shadow), button color transitions, input focus border. No bounce, no spring, no decorative animations.

## Shadows
- **sm:** `0 1px 2px rgba(0,0,0,0.04)` — default resting state
- **md:** `0 2px 8px rgba(0,0,0,0.06)` — hover/raised state
- **lg:** `0 4px 16px rgba(0,0,0,0.08)` — modals, dropdowns

## Category Colors
Badges use subtle background + colored text (not solid color pills), warm-shifted to match cream palette:
- Developer Tools: `bg: #eef0f5` / `text: #4a5a8a`
- Writing: `bg: #fdf0eb` / `text: #ae5630`
- Analysis: `bg: #fdf6e8` / `text: #8a6d2a`
- Creative: `bg: #f3f0f7` / `text: #6e5a8a`
- Business: `bg: #fdf0ed` / `text: #a84a3a`
- Education: `bg: #edf5f3` / `text: #3a7a6a`
- Data: `bg: #fdf5ee` / `text: #8a5a30`
- Coding: `bg: #eef5f0` / `text: #4a7a5a`

## Component Patterns
- **Skill cards:** Left-aligned content, category badge (subtle bg) + price top row, model tag (mono) bottom-left, invoke button bottom-right
- **Balance card:** Gradient primary→primary-hover, white text, mono label uppercase
- **Usage table:** Mono font for numbers with tabular-nums, status badges with semantic colors
- **Modals:** 600px max-width, 12px radius, focus trap, Escape to close
- **Empty states:** Warm message + CTA button, centered, no illustrations in MVP
- **Navbar:** 48px height, brand left (Outfit 600), links right, bottom tab bar on mobile (<640px)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-23 | Initial design system created | Created by /design-consultation for developer-facing AI skill marketplace |
| 2026-03-23 | Outfit for all text | Geometric sans similar to Anthropic's Styrene, warm character, free via Google Fonts |
| 2026-03-23 | Warm cream neutrals | Matches Claude/Anthropic palette — cream backgrounds, warm grays |
| 2026-03-23 | Terracotta primary `#d97757` | Claude's signature orange — distinctive, warm, builds on platform association |
| 2026-03-23 | Warm-shifted semantic colors | Success/warning/error tones shifted warmer to match cream palette |
| 2026-03-23 | Subtle category badges over solid pills | Reduced visual noise; text color carries meaning, bg provides grouping |
| 2026-03-23 | Minimal-functional motion only | Developer audience expects speed; decorative animation feels unserious |
