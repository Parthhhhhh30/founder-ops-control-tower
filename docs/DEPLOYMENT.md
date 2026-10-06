# Deployment and future integrations

## Seeded portfolio deployment

The complete seeded app needs only Node and a Vercel-compatible Next.js runtime. `vercel.json` declares Next.js, frozen `npm ci` installation and `npm run build`. Node 24 is the intended runtime. The root route is statically prerendered; browser actions use local demo persistence. Build-time credentials: none.

Human publication steps: create/sign into Vercel; authorize repository access; import this repository after committing/pushing the build; choose the repository root; deploy with the supplied configuration. Local work is not pushed or externally deployed automatically. No application environment variables are required for seeded mode.

## Supabase adapter contract

`SupabaseRepository` implements the same generic `DataRepository<Promise<DemoState>>` contract as the synchronous seed implementation. Supply an authenticated **server-side** `SupabaseTransport` with:

- `load(): Promise<DemoState>` — load only the authenticated user's allowed workspace, include source records, closures and audit events. Returned state is Zod validated.
- `saveCommand(command): Promise<DemoState>` — validate input on the server, independently run the deterministic policy and authorization checks, execute source changes and append audit evidence in one transaction, return the committed state. Never accept a client-provided judgment or priority.

An implementation must use normalized source tables for the domain entities, workspace membership, trusted approval identity, RLS and revision/concurrency checks. An append-only audit table must deny client update/delete. Payment receipt and reconciliation require finance permissions; legal approval requires legal reviewer identity. Checklist completion must require the appropriate human reviewer for sensitive items. Generic closure must never suppress unpaid invoices, candidate decisions or incomplete onboarding. Seed reset is demo-only and not part of the database adapter interface.

Human prerequisites only when enabling this adapter: create Supabase project and configure authentication; supply project URL and publishable browser key if browser auth is used; supply a server-only secret/service-role credential securely to hosting; authorize database migrations/RLS configuration. No raw production keys are needed by the seeded build. The adapter seam is prepared; no live Supabase transport, database schema or authenticated UI is represented as implemented or verified.

## Live drafting adapter contract

`LiveDraftingProvider` accepts a server transport `(DraftInput) => Promise<unknown>`, validates input, then requires a nonempty bounded **string** output. It has no repository mutation methods. The server should call a chosen provider with supplied synthetic context, no tools, no source mutation instructions; enforce authentication/rate limits, avoid retaining sensitive data, and return draft text only. The operator reviews and copies the draft; automatic sending is not supported.

Human prerequisites only when enabling live drafting: select and authorize a model-provider account; add its API credential to server-only hosting secrets; approve the intended data handling. Never use a public `NEXT_PUBLIC_` credential or pass credentials through this interface. No live model integration is implemented or required by V1.

## Before a real operational deployment

A production multi-user product requires trusted identity, authorization, transactional persistence, backup/restore, secure document storage, privacy retention rules, operational monitoring and integration-specific tests. Current demo approval names and localStorage are intentionally portfolio mechanics. External integrations and production administration are separate work; no fictitious credentials or compliance claims are included.
