<p align="center">
  <img src="docs/fuellock-logo.png" width="720" alt="FuelLock" />
</p>

# FuelLock

FuelLock helps U.S. families plan their gas spending. Two drivers share one fuel budget and one pool of gallons covered by a price cap at participating stations.

**[Open the live demo](https://fuellock.vercel.app/)** · [Walk through a fill-up](#five-minute-demo) · [Run locally](#run-locally)

Select **Try demo** to open a private sample household. No account, card or API key is required. The calculator on the landing page also works before sign-in.

## Why fuel?

Two working adults can choose where to fill up. Changing the commute or skipping the school run is harder. On November 5, 2026, U.S. regular gasoline averaged $4.10 per gallon, about $1.02 more than a year earlier. A week later the average was about $3.91. For a family planning through payday, the question is how much fuel a fixed budget will buy. [AAA, November 5](https://gasprices.aaa.com/national-average-falls-12-cents-in-one-week/) · [AAA, November 12](https://gasprices.aaa.com/for-the-first-time-since-july-national-average-drops-below-4/)

## What a price cap buys

In the demo, a partner offers **80 gallons at a cap of $3.299/gal**, with **$4 in total agreement fees**. On eligible gallons the family pays the lower of the posted price and the cap. Both drivers draw from the same balance. Any extra gallons are billed at the posted price.

| One 12-gallon fill at a posted price of $4.199/gal | Amount |
| --- | ---: |
| At the posted price | $50.39 |
| At the protected price | $39.59 |
| Saved at the pump | **$10.80** |
| Benefit after the entire $4 agreement fee | **$6.80** |

The fee is charged once per agreement. If every eligible fill is below the cap, the family pays the posted price and ends the agreement **$4 behind** before cashback or the optional subscription. With all 80 gallons used at a single price, the fee breaks even at **$3.349/gal**.

## Before and after a fill-up

- **Before leaving**, the family compares eligible stations on its route. FuelLock shows the estimated pump payment, the cost of the detour, expected cashback and the gallons that would remain.
- **At the station**, the simulated operator previews the protected and uncovered gallons. After confirmation both drivers see the updated balance. An invitation opens the same household in a second browser.
- **At month-end**, the wallet compares posted-price spending with actual demo pump payments, fees and paid rewards. It can include the modeled Family subscription. Monthly results can be negative.

## Business model and proposed pilot

The proposed **Family** plan costs **$6.99 per household per month**. The demo charges **$0**. Each optional protection offer shows its protection fee and service fee before acceptance. FuelLock's proposed revenue comes from the Family subscription and the service fee on activation. The target monthly contribution is $4 per paying family, assuming variable costs of at most $2.99. These are pilot hypotheses.

Under the proposed agreement, the station or fuel operator honors the cap for an agreed volume and term. In return, the operator has a reason for both household drivers to return. A first pilot would recruit one network in one neighborhood and measure repeat visits, the cost of honoring the cap, family savings after fees and willingness to subscribe.

**Demo scope.** Budgets, shared balances, transactions, receipts and reports work in the web app. Station prices, partners, cashback and payouts are simulated. Charging a subscription and honoring a price at a real pump require commercial agreements and live integrations.

## Five-minute demo

1. In **Overview**, select **View contract**. Note the cap, allowed stations, shared balance and redemption code.
2. In **Drivers & vehicles**, create an invitation. Open it in another browser profile and accept as the second driver. Leave that overview open.
3. In **Partner console**, enter the existing gasoline contract code. Select Pineway Fuel, Gasoline and Regular 87, enter **40** gallons and a **4.199** pump price. Preview the split, then confirm. A fresh demo covers 33.8 gallons and bills 6.2 at the pump price. The second driver sees the update.
4. Open the new purchase in **Fill-up activity**. Attach a receipt, then cancel the purchase. The shared gallons return and its reward and savings entries reverse.
5. Open **Fuel protection → Offer catalog**, request a diesel lock or prepaid gallons, then activate the request in **Partner console**. The agreement now has a usable code. A Pre-buy redemption draws on the prepaid gallons first.
6. For a receipt claim, add a new self-paid Regular 87 fill-up at Pineway Fuel for **12.125** gallons at **4.249** and attach a PNG, JPEG or PDF. Submit it under **Fuel protection → Receipt protection**. Approve and then pay it in **Partner console**. The simulated reimbursement is **$4.80**.
7. Compare **Trips & stations** for the commute and the school run. Change a **Savings goals** rule, inspect **Family wallet**, and try a different pump price in **Reports**.

## Workspace guide

| Screen | Working actions |
| --- | --- |
| Overview | Select a budget period, edit the limit, open a contract, record a fill-up, inspect daily or cumulative spending |
| Fuel protection | Review versioned terms, request an offer, inspect remaining gallons and codes, withdraw a pending request, close an agreement, submit a receipt claim |
| Partner console | Activate, preview, redeem, approve or reject a claim and mark its reimbursement paid |
| Fill-up activity | Filter by driver or status, import a manually entered bank record, upload or download evidence and reverse a purchase |
| Family wallet | Reconcile fuel, prepaid purchases, protection and service fees, financial benefit, rewards and paid claims |
| Trips & stations | Rank eligible stations by estimated pump payment plus the cost of the round-trip detour for the selected vehicle |
| Savings goals | Create targets, allocate future round-ups, direct newly paid cashback to a goal |
| Drivers & vehicles / Settings | Invite a second driver, add vehicles, edit names and the default monthly budget, inspect the pilot tariff |
| Reports | Review computed monthly results, change hypothetical gallons and prices, optionally generate AI-selected highlights |

## Run locally

Use Node.js 22.12 or newer and npm. From the repository root run:

```sh
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Open [the landing page](http://localhost:3000) and select **Try demo** to create a private, seeded household for that browser. The dashboard is at `/overview`. Opening a workspace page without a valid session takes you to `/login` and returns you to the requested page after demo sign-in. A second browser joins the same household through a one-time driver invitation. No API keys are needed for the core product.

For a production build:

```sh
npm run build
npm start
```

The default database is `file:data/fuellock.db`. For an existing Turso database, set the server environment variables from `.env.example`, apply the migrations, and start the Next.js Node server. The file-backed configuration requires a persistent writable disk. Keep credentials out of client code and source control.

## Money and accounting

All posted amounts are integer cents. Prices are integer microdollars per US gallon and volume is integer milligallons. Decimal strings are parsed directly into integers. Products use BigInt and each final monetary line is rounded half up to cents. Formatting uses en-US conventions.

For a Partner Lock, let `q = min(purchased volume, available eligible volume)`. The fuel line is `q × min(pump price, cap) + uncovered volume × pump price`. The protection benefit is `q × max(0, pump price − cap)`. Each line is calculated before rounding. Fees have separate lines.

Pre-buy charges the prepaid quantity once at partner activation. Only gallons above the remaining balance incur a pump payment. The realized price difference on consumed prepaid gallons may be negative.

- **Budget spending** includes pump payments, prepayments and agreement fees for the period.
- **Net financial result** includes the lock benefit, realized pre-buy difference, paid cashback and paid claims, less protection and service fees.
- **Wallet balance** includes all-time paid cashback available to the wallet plus paid claims. Cashback allocated to a goal stays in that goal.
- **Round-ups** are simulated savings contributions. They do not increase fuel expense or protection benefit.
- The optional Family toggle models one month of subscription cost. The wallet and agreement calculator use the same setting.
- Reports assign realized rewards and claims to their purchase month. Fees and prepaid purchases belong to their activation month. Reversals remove the original purchase from posted totals.

## Transaction and evidence model

`src/server/domain/purchases.ts` validates the driver, station, fuel, grade, agreement term and status. A single libSQL write transaction checks the previewed protected quantity, conditionally moves gallons from available to reserved, records or reconciles one purchase, moves the reservation to used, and records the request key. A database trigger enforces the total agreement volume. Accepted pricing and eligibility terms are immutable.

A retry with the same key and payload returns the original purchase ID. A conflicting reuse of a key fails. A stale preview requires a fresh confirmation. Cancellation is idempotent and reverses the effects of the original fill-up. SSE broadcasts committed changes to other connected household members. Focus refresh and a 30-second refresh cover reconnections and multiple server instances.

`src/server/domain/receipts.ts` deduplicates file bytes by SHA-256. The purchase fingerprint uses household scope, driver, station, UTC purchase minute, fuel and grade, exact volume and exact pump price. Another source with these fields links to the same purchase. A driver can also attach a receipt directly to an existing fill-up. Files are limited to 3 MB and served through a session-checked attachment route.

Receipt protection is a separate pay-first program with actual-receipt terms. A posted, unprotected purchase needs eligible evidence. The server computes the claim amount. The partner simulator advances it from pending to confirmed to paid, or rejects it. A cancellation reverses a related claim. The offer acceptance deadline and active agreement dates have distinct checks.

## Architecture

One Next.js App Router application serves the English interface and API. React, Tailwind CSS, Radix Dialog and Recharts provide the UI. Drizzle reads typed household snapshots. The same libSQL driver executes explicit write transactions against local SQLite or Turso. Zod validates action and upload inputs. Vitest runs unit and integration tests.

- `src/app` — pages, session entry and invitation routes, mutation endpoints, receipts and update stream
- `src/components` — desktop and responsive workspace, partner console, forms, charts and landing-page components
- `src/server/domain` — integer money, redemption, receipts, claims, reporting, planning and savings rules
- `src/server/providers` — simulated partner terms, route inputs, demo fixtures and optional model adapter
- `src/server/db` and `migrations` — typed schema, connections, ordered transactional SQL migrations
- `tests` and `scripts/smoke.mjs` — domain and database coverage plus a two-browser, two-viewport product walkthrough

## Verification

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint |
| `npm test` | Integer rounding, transactions, races, idempotency, rollback, evidence, offers, pre-buy, rewards, claims, permissions and demo reset |
| `npm run db:migrate` | Apply pending versioned migrations |
| `npm run db:seed` | Create the canonical sample household if missing |
| `npm run db:reset` | Restore demo-marked households and preserve active browser sessions by driver role. Households with `demo=0` are retained |
| `npm run test:e2e` | Run the 1440 px and 390 px walkthrough against an already running server |
| `npm run test:calculator` | Check early input in iPhone WebKit while the chart is loading. Install the Playwright WebKit browser before running this test. |
| `npm run test:routes` | Check session cookies and redirect counts on a running server using the same `FUELLOCK_TEST_URL` |

For the browser walkthrough, set `FUELLOCK_TEST_URL` to the running origin. The script defaults to `http://127.0.0.1:3040`. Set `BROWSER_EXECUTABLE` if Chromium, Chrome or Edge is installed outside the detected paths. Set `FUELLOCK_SCREENSHOTS` to an output directory to save both overview screenshots. Each run creates independent demo households. The second driver uses a separate browser context.

## Assumptions

- New browser profiles receive isolated demo data for a two-driver US household. The owner can enter simulated partner mode. The invited driver has a scoped session. Browser sessions expire after 30 days and a one-time invite expires after 24 hours.
- Shared fuel contracts and receipts are visible within the household. Owner-only offers restrict redemption to the owner. Operator actions, household settings and payout transitions also require the owner role in this demo.
- The budget calendar uses UTC months. Purchase entry accepts the driver's local date and time and stores UTC. Transaction details display the household’s configured time zone.
- Each agreement has one redemption balance and one fuel grade. A station transaction uses one agreement. Closing it keeps previously posted fees or prepayments. Expiration is derived from the agreement end date when reading and checked again when redeeming.
- The station catalog, prices, corridors and detour distances are simulated inputs. Recommendations recompute from the selected vehicle, volume, eligibility and current household balances. The ranking optimizes estimated cash due now and detour fuel. An earlier prepayment is already reflected in the budget.
- Bank records are entered manually and the simulated partner reviews receipt evidence. The matching rule treats identical purchases within a minute as one event. All financial entries are simulated.

## Optional AI reports

With an existing Ollama server, set `OLLAMA_URL` and `OLLAMA_MODEL` on the server. Optional `OLLAMA_TOKEN` supports an authenticated gateway. Restart the application to enable **Generate AI highlights** in Reports. Only aggregate, precomputed facts are sent. The model ranks their IDs through a structured response. FuelLock validates those IDs and renders the exact financial statements. The model cannot change prices, balances or claims.

The ordinary monthly report, chart and scenario calculator work without an inference service. The optional adapter has protocol tests for allowed and invented facts. Live inference and a hosted Turso connection require existing services and were not part of the local verification.

## Roadmap

Production partners would need independent operator identities, a merchant receipt reference shared across bank and station feeds, attested station pricing, and audited settlement integrations. The current pilot uses one simulated tariff and curated routes. Live maps, OCR, bank connections, account recovery and paid subscription billing are future integrations.
