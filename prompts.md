# Prompts used

1. Read `AGENTS.md` and all files in `docs/`. Summarise the app in 8 bullets. List anything unclear or contradictory between the docs. Propose a stack using React + Vite + TypeScript + Tailwind, Express, SQLite and Socket.IO, and explain in 3 lines why it keeps phone, tablet and TV in sync. Do not write code. Wait for my OK.
2. Implement Step 1 only. Set up React + Vite + TypeScript + Tailwind, an Express backend, SQLite and Socket.IO. Create a clean modular folder structure, with queue rules in ONE shared module on the backend. Configure concurrent local dev scripts and add a /api/health endpoint. Create empty pages for all 7 screens (/, /join, /status/:id, /reception, /barber/:name, /display, /admin) with the charcoal #1F2937 + gold #D4A017 theme and rounded cards. Add an English/Gujarati language toggle backed by a single translation file, with no hard-coded text. Verify frontend and backend both run on localhost. Do not build screen content yet. List changed files and test commands.
3. UI restyle and cleanup only. Make the whole app feel like a luxury, high-end salon (think a boutique hotel spa, not a SaaS dashboard). Do not change routes or the backend. Do not build screen content yet.

Remove Gujarati:
- Delete the EN/GU language toggle and all Gujarati strings, fonts and logic. The app is English only.
- Keep ONE English strings file (e.g. src/strings.ts) so there is still no hard-coded text in components, and rename or simplify the old translation setup to match. Remove unused i18n dependencies.
- Remove Gujarati columns and fields from any seed data or models (e.g. services only need an English name).

Visual identity:
- Palette (define as Tailwind theme tokens in ONE place): ink black #0E0C0A background, espresso #1A1512 surfaces, ivory #F5EFE4 text, muted taupe #A89F91 secondary text, and a champagne-gold range: #E6C772 (highlight), #D4A017 (primary), #8A6A12 (deep). Use gold sparingly, for buttons, key numbers, thin dividers and active states only.
- Background: subtle warm radial glow at the top and a faint CSS-only noise overlay (under 3% opacity). No flat blues or greys.
- Cards: 24px radius, espresso surface, 1px hairline border in gold at 18% opacity, soft deep shadow, generous padding (at least 24px).
- Primary button: gold gradient (#E6C772 to #D4A017 to #B8860B) with dark text, a soft glow on hover and a slow shimmer on the main call-to-action only.
- Thin gold divider lines with a small diamond or scissors ornament in the centre.

Typography:
- Headings and logo: Cormorant Garamond (or Playfair Display), light to medium weight, slightly wide letter spacing, large sizes.
- Body and UI: Inter. Small uppercase labels with wide tracking (0.15em) for badges and section tags.

Layout:
- Customer pages (/, /join, /status/:id): slim top bar with a gold scissors-and-comb line-icon logo and "Salon Queue" in the heading font. No page tabs. Reserve a sticky bottom action bar on mobile with a blurred dark glass background.
- Staff pages (/reception, /barber/:name, /admin): compact header with the screen name and a small gold "STAFF" badge. Tablet-friendly spacing.
- TV page (/display): full-screen, no header or navigation, a dark canvas with a large gold serif title area.
- Put the 7-page links in a small dev-only "Screens" menu, shown only when import.meta.env.DEV is true.
- Empty page cards: the screen title in the heading font, a one-line subtitle from the strings file and a gold divider.

Motion (subtle, 200 to 400ms, ease-out, respect prefers-reduced-motion):
- Page fade-and-rise on load, gentle card hover lift, button press scale of 0.98. Nothing bouncy or flashy.

Details:
- Use lucide-react line icons at stroke width 1.5.
- All interactive elements at least 44px high with visible gold focus rings.
- Mobile-first, checked at 375px, 768px and 1920px.

List changed files and tell me how to preview each of the 7 pages.
4. what does thee waiting room does why cant i exit it
