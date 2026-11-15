"use client";
import { BalanceCard } from "./balance-card";
import { SpendingChart } from "./spending-chart";
import {
  ArrowRight,
  ChartNoAxesCombined,
  Coins,
  Fuel,
  Radio,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { gallons, perGallon, usd } from "@/server/domain/money";
import { report } from "@/server/domain/report";
import {
  type S,
  SectionTitle,
  Go,
  Fact,
  Modal,
  Field,
  ActionForm,
  prettyDate,
  ActionButton,
} from "./ui";
import { ContractDetail } from "./contracts";
import { ActivityList, RewardTag } from "./activity";
export function BudgetEditor({
  s,
  month,
  trigger,
}: {
  s: S;
  month: string;
  trigger: React.ReactElement;
}) {
  return (
    <Modal
      title="Monthly fuel budget"
      description="Set the shared fuel spending limit for this calendar month."
      trigger={trigger}
    >
      <ActionForm action="budget" data={{ month }} submit="Save budget">
        <Field name="Month">
          <input value={month} readOnly />
        </Field>
        <Field name="Household budget ($)">
          <input
            name="budget"
            inputMode="decimal"
            defaultValue={(report(s, month).budget / 100).toFixed(2)}
            required
          />
        </Field>
      </ActionForm>
    </Modal>
  );
}
export function Overview({ s, month }: { s: S; month: string }) {
  const r = report(s, month);
  const c = s.contracts.find(
    (c) =>
      c.status === "active" &&
      s.offers.find((o) => o.id === c.offer)?.kind === "lock",
  );
  const o = s.offers.find((o) => o.id === c?.offer);
  const protectedVolume = s.contracts
    .filter(
      (c) =>
        c.status === "active" &&
        s.offers.find((o) => o.id === c.offer)?.kind === "lock" &&
        s.offers.find((o) => o.id === c.offer)?.fuel === "Gasoline",
    )
    .reduce((n, c) => n + c.available, 0);
  const metrics = [
    {
      title: "Fuel spending",
      value: usd(r.total),
      detail: "of " + usd(r.budget) + " monthly budget",
      icon: Wallet,
      tone: "mint",
    },
    {
      title: "Protected gallons",
      value: gallons(protectedVolume),
      unit: "gal",
      detail: "Available gasoline protection",
      icon: ShieldCheck,
      tone: "blue",
    },
    {
      title: "Net savings",
      value: usd(r.net),
      detail: "After fees and paid rewards",
      icon: TrendingUp,
      tone: "lilac",
    },
    {
      title: "Cashback paid",
      value: usd(r.paid),
      detail: "From this month’s fill-ups",
      icon: Coins,
      tone: "sand",
    },
  ];
  const percent = Math.round((r.total / r.budget) * 100);
  return (
    <div className="overview-stack">
      <div className="spotlight-grid">
        <BalanceCard
          title="Monthly budget"
          label={
            r.remaining < 0
              ? "Budget remaining · over limit"
              : "Available to spend"
          }
          cents={r.remaining}
        >
          <div className="balance-footnote">
            <span>
              {usd(r.total)} of {usd(r.budget)} used
            </span>
            <div className="balance-track">
              <i style={{ width: Math.min(100, percent) + "%" }} />
            </div>
          </div>
          {s.actor.role === "owner" ? (
            <BudgetEditor
              s={s}
              month={month}
              trigger={
                <button className="card-action">
                  Edit budget <ArrowRight size={14} />
                </button>
              }
            />
          ) : (
            <Go href="/wallet">View wallet</Go>
          )}
        </BalanceCard>
        <section className="fuel-pass">
          <div className="pass-print" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="pass-issuer">
            <span>
              <ShieldCheck size={17} /> Partner Lock
            </span>
            <Radio size={20} aria-hidden="true" />
          </div>
          <div className="pass-main">
            <h2>{o?.name ?? "Fuel protection"}</h2>
            {o ? (
              <>
                <strong>
                  {perGallon(o.cap)}
                  <small> / gal</small>
                </strong>
                <p>{o.grade} · Protected price cap</p>
              </>
            ) : (
              <p>Explore current offers for your household.</p>
            )}
          </div>
          <footer>
            {c && o ? (
              <>
                <span>
                  Valid through <b>{prettyDate(o.ends)}</b>
                </span>
                <ContractDetail
                  s={s}
                  id={c.id}
                  trigger={
                    <button className="pass-action">
                      View contract <ArrowRight size={14} />
                    </button>
                  }
                />
              </>
            ) : (
              <Go href="/protection">Explore offers</Go>
            )}
          </footer>
        </section>
      </div>
      <div className="metric-grid">
        {metrics.map((m) => (
          <article className="metric" key={m.title}>
            <div className="metric-label">
              <span className={"metric-icon " + m.tone}>
                <m.icon size={17} strokeWidth={1.9} />
              </span>
              {m.title}
            </div>
            <strong className={m.value.startsWith("-") ? "negative" : ""}>
              {m.value}
              {m.unit && <small>{m.unit}</small>}
            </strong>
            <p>{m.detail}</p>
          </article>
        ))}
      </div>
      <div className="analysis-grid">
        <SpendingChart s={s} month={month} />
        <section className="panel recent-panel">
          <SectionTitle title="Recent fill-ups">
            <Go href="/activity">View all</Go>
          </SectionTitle>
          <ActivityList s={s} items={r.entries.slice(0, 4)} />
        </section>
      </div>
    </div>
  );
}
export function WalletPage({ s, month }: { s: S; month: string }) {
  const r = report(s, month);
  const rows = s.purchases.filter((p) => p.status === "posted");
  const lifetime = rows.reduce(
    (n, p) => n + (p.rewardStatus === "paid" && !p.rewardGoal ? p.reward : 0),
    0,
  );
  const claimCredit = s.claims
    .filter((c) => c.status === "paid")
    .reduce((n, c) => n + c.amount, 0);
  return (
    <div className="stack">
      <div className="spotlight-grid wallet-spotlight">
        <BalanceCard
          title="Family wallet"
          label="Available rewards"
          cents={lifetime + claimCredit}
        >
          <div className="balance-footnote">
            <span>All-time paid cashback and reimbursements</span>
          </div>
        </BalanceCard>
        <section className="panel">
          <span className="tile blue">
            <ChartNoAxesCombined />
          </span>
          <h3>Net financial result</h3>
          <div className={"big-number " + (r.net < 0 ? "negative" : "")}>
            {usd(r.net)}
          </div>
          <p>For purchases in the selected month</p>
        </section>
      </div>
      <div className="wallet-details">
        <section className="panel">
          <SectionTitle title="Monthly breakdown" />
          <div className="facts">
            <Fact name="Fuel paid at the pump">{usd(r.fuel)}</Fact>
            <Fact name="Prepaid gallons purchased">{usd(r.upfront)}</Fact>
            <Fact name="Protection fees">{usd(r.protectionFees)}</Fact>
            <Fact name="Service fees">{usd(r.serviceFees)}</Fact>
            <Fact name="Protection benefit">{usd(r.benefit)}</Fact>
            <Fact name="Pre-buy price difference">{usd(r.prebuyEffect)}</Fact>
            <Fact name="Paid cashback">{usd(r.paid)}</Fact>
            <Fact name="Paid receipt claims">{usd(r.claims)}</Fact>
            <Fact name="Net result">
              <span className={r.net < 0 ? "negative" : ""}>{usd(r.net)}</span>
            </Fact>
          </div>
        </section>
        <section className="panel">
          <SectionTitle
            title="Cashback ledger"
            sub="Earn 2% of eligible pump payments. The simulated partner confirms and pays each reward."
          />
          {r.entries.length ? (
            r.entries.map((p) => (
              <div className="list-line" key={p.id}>
                <span className="tile small-tile">
                  <Fuel size={17} />
                </span>
                <div className="grow">
                  <b>{s.stations.find((t) => t.id === p.station)?.name}</b>
                  <small>
                    {prettyDate(p.at)} · {usd(p.amount)} fuel
                  </small>
                </div>
                <strong>{usd(p.reward)}</strong>
                <RewardTag status={p.rewardStatus} />
                {s.actor.role === "owner" && p.rewardStatus !== "paid" && (
                  <ActionButton
                    secondary
                    action="reward"
                    input={{ id: p.id, stage: p.rewardStatus }}
                  >
                    {p.rewardStatus === "pending" ? "Confirm" : "Pay reward"}
                  </ActionButton>
                )}
              </div>
            ))
          ) : (
            <p>No cashback entries this month.</p>
          )}
        </section>
      </div>
    </div>
  );
}
