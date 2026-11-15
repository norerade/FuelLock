"use client";
import { FamilyPlanToggle, useFamilyPlan } from "./family-plan";
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
import { StationCost } from "./station-cost";
import {
  defaultTrip,
  rankStations,
  stationReason,
  paydayEstimate,
} from "@/server/domain/trips";
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
  const includePlan = useFamilyPlan();
  const r = report(s, month, includePlan);
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
      detail: includePlan
        ? "Includes modeled Family plan"
        : "After fees and paid rewards",
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
  const stops = rankStations(
    s,
    defaultTrip.routeId,
    s.cars[0]?.id ?? "",
    defaultTrip.volume,
  );
  const best = stops[0];
  const forecast = paydayEstimate(
    s.now,
    s.family.nextPayday,
    s.family.timeZone,
    s.cars[0]?.mpg ?? 0,
  );
  const days = forecast?.days ?? null;
  return (
    <div className="overview-stack">
      <div className="spotlight-grid">
        <BalanceCard
          artwork={s.actor.role === "owner"}
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
            <p>{stationReason(stops)}</p>
            <Fact name="Planned fill-up">
              {gallons(defaultTrip.volume)} gal · {s.cars[0].name}
            </Fact>
            <Fact name="Estimated net cost">{usd(best.total)}</Fact>
            <StationCost stop={best} />
            {forecast && forecast.days >= 0 && (
              <p>
                <strong>
                  Need until payday ≈ {gallons(forecast.volume)} gal
                </strong>
                <br />
                <small>
                  Demo schedule: weekday commute and school round trips,
                  Saturday errands · {s.cars[0].mpg} MPG.
                </small>
              </p>
            )}
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
  const includePlan = useFamilyPlan();
  const r = report(s, month, includePlan);
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
    ["Family plan · modeled", -r.planFee],
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
          <FamilyPlanToggle />
        </section>
      </div>
      <section className="panel">
        <SectionTitle
          title="Without FuelLock vs with FuelLock"
          sub="Compare the same gallons purchased in the selected month."
        />
        <Fact name="Without FuelLock · at posted pump prices">
          {usd(r.market)}
        </Fact>
        <Fact name="Actually paid at pump">{usd(r.fuel)}</Fact>
        {r.prepaidUsed > 0 && (
          <Fact name="Cost of prepaid gallons used">{usd(r.prepaidUsed)}</Fact>
        )}
        <Fact name="Agreement fees">{usd(r.fees)}</Fact>
        {r.planFee > 0 && (
          <Fact name="Family plan · modeled">{usd(r.planFee)}</Fact>
        )}
        <Fact name="With FuelLock · before rewards">{usd(r.withFuelLock)}</Fact>
        <Fact name="Protection benefit before fees">{usd(r.benefit)}</Fact>
        {r.prebuyEffect !== 0 && (
          <Fact name="Pre-buy price difference">{usd(r.prebuyEffect)}</Fact>
        )}
        <Fact name="Paid cashback">{usd(r.paid)}</Fact>
        {r.claims > 0 && (
          <Fact name="Paid receipt reimbursements">{usd(r.claims)}</Fact>
        )}
        {r.rounding !== 0 && (
          <Fact name="Posted line rounding">{usd(r.rounding)}</Fact>
        )}
        <Fact name="Net savings after fees and paid rewards">
          <strong>{usd(r.net)}</strong>
        </Fact>
        {r.upfront > 0 && (
          <p>
            {usd(r.upfront)} was prepaid this month. Only the cost of gallons
            used enters this comparison.
          </p>
        )}
      </section>
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
                    {prettyDate(p.at, false, s.family.timeZone)} ·{" "}
                    {usd(p.amount)} fuel
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
