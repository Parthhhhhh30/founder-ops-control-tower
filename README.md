# BACKBONE

**Founder Operations Control System**

This is an independent portfolio prototype. It is not affiliated with Artificial Societies. It does not represent their internal operations. Every person, counterparty, invoice, supplier and document is synthetic.

BACKBONE demonstrates the operational judgment of a Founders Associate: finance administration, collections, hiring, new-starter readiness, contract operations, compliance administration, client logistics and the unglamorous work of keeping an office running. The human is the operator. Software helps organize work and preserve evidence; it does not replace the role.

## The problem and thesis

Messy operational signals compete for limited founder attention. BACKBONE turns them into a trusted queue:

**source → deterministic judgment → next action → owner → audit evidence → human decision where necessary → closure**

The most important output is **NEED FROM FOUNDERS**. Legal, hiring, finance and people owners retain their own decisions. An escalation is not automatically a founder decision.

- **ACT:** operator can progress within an approved policy, budget or workflow.
- **REVIEW:** prepare the work for a named human checker.
- **ESCALATE:** an accountable person must make a material decision.

Every record explains the rule ID, source fields, reason, severity, owner, decision owner, due date, dependency and evidence. There is no opaque priority score. All collection and operational rules are explicitly **demo policy choices**, not accounting standards or legal advice.

## Run locally

Node 24 is pinned in `.nvmrc` (Node 22+ supported). No Supabase project, API key, database, or external service is needed.

```sh
npm ci
npm run dev
```

Use port 3000 in your local development environment. The cloud onboarding UI does not provide a loopback preview; startup is validated internally.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:ui
```

Playwright uses the environment's `/usr/bin/chromium`. On another machine run `npx playwright install chromium` to use Playwright's bundled browser, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to your installed Chromium. Browser tests start the production server, so build first. Test artifacts go to ignored `test-results/`.

The demonstration clock is fixed at **6 October 2026** to keep interview examples reproducible. Operator audit timestamps reflect actual action time in UTC. Actions persist in this browser's localStorage; **Reset demo** restores the seed after confirmation. This is single-browser demo storage, not a shared database. Named approval evidence is recorded but does not authenticate the approver.

## Recruiter demo walkthrough

1. **Command Desk:** inspect the overdue Cedar Works invoice. See REV-14 and its exact source fields. Switch to Need from founders: only the payment-plan and building-access decisions appear. Legal work remains with Legal owner.
2. **Revenue Ops:** inspect invoice ageing and the collection timeline. Prepare and edit a collection draft. Nothing can be sent. Enter synthetic receipt evidence, explicitly confirm manual verification, then record payment. Collection closes and a reconciliation check appears. Record the finance owner's check to resolve it.
3. **People Ops:** Alex Example lacks Interviewer B feedback. Enter receipt evidence and record feedback: the queue becomes a hiring-owner review, without progressing or ranking the candidate. Taylor Example starts with one mandatory security-access gap. Enter human completion evidence and record it in the inspector: Ready is available only once every mandatory check is complete.
4. **Contracts & Compliance:** compare the synthetic NDA's governing law and term to the standard template. Differences escalate to legal with no signing recommendation. Closure requires named Legal owner approval and evidence. RTW follow-up tracks dates and review administration only, never eligibility.
5. **Company Ops:** approved routine supplies are ACT; a new AV supplier is REVIEW; building access disruption is ESCALATE. Inspect event travel, attendees, diet, materials and NDA blockers alongside asset and stock registers.
6. **Weekly Brief:** inspect a deterministic printable memo. Its final section contains only genuine founder decisions, never all unresolved work. Browser Print produces the founder document without navigation chrome.
7. **Forward Look:** compare inclusive 7-day and 14-day horizons. Invoice threshold crossings, incomplete starter checks, interview feedback, renewal, RTW, client and stock risks show the date and rule behind each warning. Clicking a risk opens its source module and inspector.

## Design

The bespoke operations control room uses graphite navigation, warm ivory workspace, safety orange attention, red escalation and restrained teal resolution. The central queue and persistent inspector make judgment inspectable without repeated page navigation. Each module has a useful distinct view: AR ledger, hiring pipeline/checklist, document comparison, logistics/calendar and inventory, editorial memo, and dated risk timeline. Keyboard focus, skip navigation, inert closed mobile navigation, semantic labels, text statuses, reduced motion and responsive layouts are included.

## Architecture and boundaries

Next.js App Router, React, strict TypeScript, custom Tailwind design tokens, Lucide, Zod and date-fns. No separate backend service.

- `src/domain/`: entities, pure deterministic rules, derived queue, founder decisions, memo and forward risks.
- `src/data/`: typed `DataRepository`, `SeedRepository`, validated restore, audited source commands, future authenticated `SupabaseRepository` transport seam.
- `src/providers/`: `DraftingProvider`, deterministic mock and future server transport adapter. Draft outputs are text only; structured mutation outputs are rejected.
- `src/components/`: local operator UI and source inspector.
- `tests/`: Vitest rule, repository and React Testing Library interaction checks.
- `e2e/`: production browser flows, desktop/mobile screenshots and automated WCAG AA checks.

Sensitive source commands require evidence. Manual payment receipt creates reconciliation work. Founder and legal closures require the named accountable owner. Unpaid invoices, candidates and incomplete starters cannot be hidden using generic closure. Queues derive from source state and recorded resolutions; there is no mutable AI judgment field.

AI is optional drafting infrastructure. It may help with communication, history or supplied notes later. It cannot move money, change payment truth/amount/dates, decide collection escalation, approve contracts, determine RTW eligibility, rank or hire candidates, send messages automatically, or make founder decisions. The current provider is entirely deterministic and requires no key.

## What is real and what is mocked

**Real:** working app, rule calculations, filtering/search, inspectable evidence, browser persistence, audited commands, manual payment/reconciliation workflow, checklist gate, feedback tasks, synthetic comparison, printable memo, future-risk derivation and tests.

**Mocked:** all operational data, interviewers and approval identities, contract text/documents, receipt evidence, communication drafts and integrations. No bank, inbox, calendar, HRIS, legal provider, Supabase or model service is connected. No external messages are sent. Browser storage is editable and is not an authorization or compliance control.

## Future deployment

The seeded version can deploy to Vercel as-is using `vercel.json`; no credentials are required at build time. Connecting a Vercel account and authorizing repository deployment are the human actions needed to publish externally. Nothing has been deployed by this build.

A multi-user version requires a Supabase project, authenticated server transport, database migrations, RLS, trusted approval identities and transactional audit records. Live model drafting is separately optional and requires server-only model credentials. See [deployment and adapter guide](docs/DEPLOYMENT.md) for exact integration contracts and required human actions. Never put server credentials in browser code or git.

Product source of truth: [product](docs/PRODUCT_SPEC.md), [UX](docs/UX_SPEC.md), [rules](docs/DECISION_RULES.md), [architecture](docs/ARCHITECTURE.md). Execution and verified results: [.agent/PLANS.md](.agent/PLANS.md), [BUILD_STATUS](docs/BUILD_STATUS.md).
