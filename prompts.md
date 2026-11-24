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
5. Build only Screen 1 (Home) and Screen 2 (Join Queue) from docs/02-screens.md. Seed SQLite with 6 realistic salon services (Haircut 30 min ₹150, Beard trim 15 min ₹80, Hair spa 45 min ₹400, etc., with English and Gujarati names) and 3 barbers (Ravi, Amit, Imran). Implement name and 10-digit phone validation, multi-select service cards with a maximum of 3, a barber picker with "Any barber (fastest)", and a live summary (total time, price, expected wait) that updates as services are selected. The Home screen shows the open/closed badge, a live waiting card and barber status chips. Mobile-first, with tap targets of at least 44px. Validate again on the backend. Do not build other screens. Test all interactions and list changed files.
6. Check the project is ready for deployment: build command, environment variables, no localhost URLs in the code, and SPA routing so refreshing /status/:id does not 404 on Vercel. Frontend goes on Vercel and the Express + SQLite backend on Render or Railway. Tell me if SQLite needs a persistent disk there. Give step-by-step deploy instructions for my exact setup, then add **Live demo:** <url> as the first line after the title in README.md. Do not change app features.
7. Build the Reception Dashboard at /reception for a 10-inch tablet in landscape, following docs/02-screens.md. Left side: barber cards (current customer, time-left progress bar, Call next). Right side: waiting list in order (token, name, services, preferred barber, waiting time, No-show, Cancel). Top: "+ Add walk-in" opens a quick form (name, phone, services) that joins the same queue at the end. Highlight waits over 60 minutes in amber. Customers who join from phones must appear automatically via Socket.IO. Implement "Call next for barber X" on the backend exactly as in docs/03-flows-rules.md: it picks the earliest customer who chose X or "Any", never gives a customer who chose Ravi to another barber, and never gives a barber a second customer while one is Called or In chair. Add a simple PIN gate for staff screens (test PIN 1234). After building, give me 3 scenarios I can try by hand to prove barber preferences are respected. List changed files.
