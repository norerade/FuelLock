# FuelLock repository instructions

Keep the application web-only. Use integer cents, microdollars and milligallons for financial calculations. Preserve per-household authorization, transactional volume reservation and the distinction between Partner Lock, Pre-buy and receipt reimbursement.

Use English for the interface, en-US display conventions and server-only environment variables. Run the relevant tests, lint, typecheck and production build after changing the application. Keep demo operations simulated. Leave changes uncommitted unless the user explicitly authorizes a commit.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
