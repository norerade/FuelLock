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
import { defaultTrip, rankStations } from "@/server/domain/trips";
import {
  decimalText,
  halfUp,
  gallons,
  perGallon,
  usd,
} from "@/server/domain/money";
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
            defaultValue={decimalText(report(s, month).budget, 2)}
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
      title: "Spent incl. fees",
      value: usd(r.total),
      detail:
        usd(r.fuel) +
        " at pump + " +
        usd(r.fees) +
        " fees" +
        (r.upfront ? " + " + usd(r.upfront) + " prepaid" : ""),
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
  const percent = r.budget
    ? halfUp(BigInt(r.total) * 100n, BigInt(r.budget))
    : 0;
  const best = rankStations(
    s,
    defaultTrip.routeId,
    s.cars[0]?.id ?? "",
    defaultTrip.volume,
  )[0];
  const days = s.family.nextPayday
    ? (Date.parse(s.family.nextPayday) - Date.parse(s.now.slice(0, 10))) /
      86400000
    : null;
  return (
    <div className="overview-stack">
      <div className="spotlight-grid">
        <BalanceCard
          artwork
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
            <span>
              {days === null
                ? "Next payday not set"
                : days < 0
                  ? "Payday date has passed"
                  : days === 0
                    ? "Payday today"
                    : days + (days === 1 ? " day" : " days") + " until payday"}
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
      <section className="panel">
        <SectionTitle title="Next best fill-up">
          <Go href="/trips">Open Trips</Go>
        </SectionTitle>
        {best ? (
          <>
            <h3>{best.station.name}</h3>
            <Fact name="Planned fill-up">
              {gallons(defaultTrip.volume)} gal · {s.cars[0].name}
            </Fact>
            <Fact name="Estimated total incl. detour">{usd(best.total)}</Fact>
            <Fact name="Protected gallons after this stop">
              {gallons(best.protectedAfter)} gal
            </Fact>
          </>
        ) : (
          <p>No eligible stop for the current trip.</p>
        )}
      </section>
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
  const rewardTotal = (stage: "pending" | "confirmed" | "paid") =>
    rows.reduce(
      (sum, p) => sum + (p.rewardStatus === stage ? p.reward : 0),
      0,
    ) +
    s.claims.reduce((sum, c) => sum + (c.status === stage ? c.amount : 0), 0);
  const breakdown: [string, number][] = [
    ["Fuel paid at the pump", r.fuel],
    ["Prepaid gallons purchased", r.upfront],
    ["Protection fees", r.protectionFees],
    ["Service fees", r.serviceFees],
    ["Protection benefit", r.benefit],
    ["Pre-buy price difference", r.prebuyEffect],
    ["Paid cashback", r.paid],
    ["Paid receipt claims", r.claims],
  ];
  return (
    <div className="stack">
      <div className="spotlight-grid wallet-spotlight">
        <BalanceCard
          title="Lifetime rewards"
          label="Paid"
          cents={rewardTotal("paid")}
        >
          <div className="balance-kpi">
            <strong>{usd(rewardTotal("pending"))}</strong>
            <span>Pending</span>
          </div>
          <div className="balance-kpi">
            <strong>{usd(rewardTotal("confirmed"))}</strong>
            <span>Confirmed</span>
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
            {breakdown
              .filter(([, amount]) => amount !== 0)
              .map(([label, amount]) => (
                <Fact key={label} name={label}>
                  {usd(amount)}
                </Fact>
              ))}
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
