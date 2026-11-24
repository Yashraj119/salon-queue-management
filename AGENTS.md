# AGENTS.md — Salon Queue Management

Build a salon queue application: customers join from their phones, see their position and estimated wait, and get called; receptionists and barbers manage the queue; a TV display shows current and upcoming tokens.

## Read first
- `docs/01-brief.md` — problem, users, must-have features and out-of-scope items.
- `docs/02-screens.md` — all seven screens, layouts and interactions.
- `docs/03-flows-rules.md` — customer flows, queue rules, edge cases and test checklist.

Treat these documents as the product specification. If a requirement is unclear or conflicts with another document, ask before making assumptions. Update the relevant document before implementing an agreed product change.

## Stack and run command
- Use React + Vite + Tailwind CSS.
- Development command: `npm run dev`.
- Choose the simplest reliable storage/synchronisation approach that keeps phone, tablet and TV screens in sync. Explain the choice before implementing it.
- Hosting target: Vercel for the frontend; Render or Railway if a backend is required.
- Keep setup and run instructions in the project README.

## Working rules
1. Build one screen or one feature per task. Do not modify unrelated screens.
2. Read the relevant specification before coding.
3. Theme: charcoal (`#1F2937`) and gold (`#D4A017`), with clean layouts and rounded cards.
4. All visible labels must use the English/Gujarati language files; do not hard-code UI text in screen components.
5. Keep queue rules in one shared place in the code and reuse them across screens.
6. Respect the `Don't build` list in `docs/01-brief.md`. Do not add out-of-scope features.
7. Use realistic dummy data for development and testing.
8. Make phone screens mobile-first, Reception tablet-friendly, and the TV display readable from a distance.
9. Keep important state changes synchronised across screens within 5 seconds.
10. After each task, report the files changed and the steps to test the change.
11. Run the app and test the affected flow after each step. Do not claim a feature works without checking it.
12. Commit to Git after each working step.

## Build sequence
Follow the build plan in the reference guide:
1. Read the documents, summarise the app, list questions and set up the project with routes for all seven screens, theme and language toggle.
2. Build Home and Join Queue.
3. Build My Status and token generation.
4. Build Reception Dashboard and barber-preference-aware Call next.
5. Build Barber View and Waiting Area TV.
6. Build Owner Settings.
7. Implement edge cases, polish Gujarati layouts and run the complete test checklist.
8. Deploy and add the live demo link at the very top of `README.md`.

## Deployment and submission
- Frontend: Vercel.
- Backend, if needed: Render or Railway.
- Check build command, environment variables and production routes before deployment.
- Do not leave localhost URLs in production configuration.
- Put the live demo link at the very top of `README.md`, directly below the title.
- If staff screens require a test PIN, list it immediately below the live link. Never invent or expose a real production credential in documentation.
- Also maintain `prompts.md` with every prompt used, in order, including prompts that did not work.
