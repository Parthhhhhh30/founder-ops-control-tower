# ExecPlan: BACKBONE seeded portfolio build

Goal: complete local product with deterministic judgment, transparent evidence, distinct module views, audit actions and polished responsive UI.

## Completed phases

1. **Product context:** AGENTS.md and product, UX, rules and architecture specifications created before substantial coding.
2. **Seeded app:** Next.js App Router / strict TypeScript, domain entities, pure decision rules, derived queue/memo/risks, validated repository, synthetic seed and text-only drafting provider.
3. **UX and workflows:** seven distinct views, persistent inspector, source evidence/history, local persistence, explicit manual payment/reconciliation, mandatory readiness, feedback receipt, named approvals, print and responsive navigation.
4. **Validation:** frozen install; 33 Vitest/RTL tests; typecheck/lint/build; four browser suites, including automated WCAG checks in every module. No outstanding failing check.
5. **Visual QA:** all desktop module screenshots and mobile Command Desk inspected. Darkened faint labels after contrast audit; restricted closed mobile navigation focus; source selection scrolls to the inspector; red reserved for escalations. Generated and verified synthetic print memo with navigation hidden.
6. **Future seams:** typed asynchronous Supabase transport and live text-only drafting adapter prepared and tested with mocks; Vercel configuration and exact integration prerequisites documented. Seeded mode does not require external accounts.
7. **Environment reuse:** install and startup configuration draft saved; development startup and functional browser interaction validated. The user confirmed environment publication on 6 October 2026.

## Decisions and diagnoses

- Fixed synthetic date 2026-10-06 makes policy boundaries reproducible; audit timestamps use actual UTC.
- Browser localStorage and named demo approvers are portfolio mechanics, not trusted production identity.
- No bank, inbox, calendar, legal service, database or model is connected. Drafts cannot send; candidate decisions remain human.
- npm's default home cache was unavailable, so cloud installation uses writable `/workspace/.npm-cache`.
- Playwright browser download was domain-blocked. Used installed `/usr/bin/chromium` with no network expansion or verification bypass; other machines can use the bundled browser.
- Initial lint component-lifetime error corrected by moving QueueTable outside render. Initial browser locator mismatches corrected to match accessible names; no product assertions were removed.
- Automated contrast audit found faint small labels; corrected foreground colors and reran every module successfully.
- Development loopback HMR required Next.js's documented allowedDevOrigins setting. Set only 127.0.0.1. Disabled supported automatic agentRules generation to preserve concise context docs.

## Handoff

Read docs/BUILD_STATUS.md for verified scope and docs/DEPLOYMENT.md for publication and future live integration contracts. Start with `npm run dev`; all local features operate without credentials. Use the existing isolated checkout; no worktree is needed.

## GitHub delivery

The user explicitly authorized committing all project changes, pushing to main, verifying the remote application/documentation tree, and rerunning the full suite from the committed state. Preserve remote work with a normal fast-forward push; never force-push. Verify the remote commit and tree using a fresh Git fetch into separate temporary metadata. Run the full suite with CI=1 so Playwright starts a fresh production server rather than reusing a development process. Generated dependencies, build outputs, browser artifacts, local credentials and next-env.d.ts remain ignored.

## Final visual refinement

The approved visual system was refined within the user's narrow scope: approximately +1px small typography, concise Command Desk context, compact persistent demo indicator and slightly stronger selected table background. Preserved the existing inspector, founder banner, inline signals, navigation, data, deterministic rules and workflows. Production rendering inspected at 1440/1512/1536px desktop with normal zoom and 390px mobile. Corrected the visual screenshot capture to wait for the rendered page. Full validation passes: typecheck, lint, 33 unit/component tests, production build and four browser suites including automated accessibility checks. BUILD_STATUS and UX_SPEC record the resulting presentation. Commit and push this refinement to main using normal fast-forward delivery.
