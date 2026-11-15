"use client";
import { ProtectionScenario } from "./protection-scenario";
import { ClaimList, ReceiptProtection } from "./claims";
import { useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Fuel,
  Check,
  LockKeyhole,
  Ticket,
} from "lucide-react";
import {
  breakEvenSpread,
  fullUsePrice,
  gallons,
  lineCents,
  perGallon,
  usd,
} from "@/server/domain/money";
import {
  type S,
  type Offer,
  type Reply,
  useAction,
  Field,
  Modal,
  SectionTitle,
  Tag,
  Fact,
  Copy,
  ActionButton,
  prettyDate,
  Empty,
} from "./ui";
function Terms({ s, o }: { s: S; o: Offer }) {
  const fees = o.fee + o.service;
  const fullVolumeCost = lineCents(o.volume, o.cap) + fees;
  const spread = breakEvenSpread(fees, o.volume);
  return (
    <div className="facts">
      <Fact name="Provider">{o.partner} · simulated</Fact>
      <Fact name="Fuel">
        {o.fuel} · {o.grade}
      </Fact>
      <Fact name={o.kind === "prebuy" ? "Prepaid price" : "Price cap"}>
        {perGallon(o.cap)}/gal
      </Fact>
      <Fact name="Eligible volume">{gallons(o.volume)} gal</Fact>
      {o.kind === "prebuy" && (
        <Fact name="Prepayment">{usd(lineCents(o.volume, o.cap))}</Fact>
      )}
      <Fact name="Protection fee">{usd(o.fee)}</Fact>
      <Fact name="Service fee">{usd(o.service)}</Fact>
      <Fact name="Total due at activation">
        {usd(o.kind === "prebuy" ? fullVolumeCost : fees)}
      </Fact>
      {o.kind === "lock" && (
        <Fact name="Maximum cost for full eligible volume, including fees">
          {usd(fullVolumeCost)}
        </Fact>
      )}
      {spread !== null && (
        <Fact name="Break-even at full usage">
          {fullUsePrice(o.cap, fees, o.volume)}/gal market price ·{" "}
          {fullUsePrice(0, fees, o.volume)}/gal above{" "}
          {o.kind === "lock" ? "cap" : "prepaid price"}
        </Fact>
      )}
      <Fact name="Accept by">{prettyDate(o.deadline, true)}</Fact>
      <Fact name="Contract term">
        {prettyDate(o.starts, true)} – {prettyDate(o.ends, true)}
      </Fact>
      <Fact name="Eligible drivers">
        {o.scope === "owner" ? "Household owner" : "All household drivers"}
      </Fact>
      <Fact name="Stations">
        {s.stations
          .filter((e) => o.allowed.includes(e.id))
          .map((e) => e.name)
          .join(", ")}
      </Fact>
      {o.kind === "lock" && (
        <details>
          <summary>When does protection pay?</summary>
          <ProtectionScenario
            offer={o}
            available={
              s.contracts.find((c) => c.offer === o.id && c.status === "active")
                ?.available
            }
          />
        </details>
      )}
      <p className="terms">{o.terms}</p>
      <small>
        Terms v{o.version} · {o.source}
      </small>
    </div>
  );
}
export function ContractDetail({
  s,
  id,
  trigger,
}: {
  s: S;
  id: string;
  trigger: React.ReactElement;
}) {
  const c = s.contracts.find((c) => c.id === id)!;
  const o = s.offers.find((o) => o.id === c.offer)!;
  return (
    <Modal
      title={o.name}
      description={o.partner + " · Simulated partner agreement"}
      trigger={trigger}
    >
      <div className="contract-code">
        <div>
          <small>REDEMPTION CODE</small>
          <strong>
            {c.status === "active"
              ? c.code
              : c.status === "requested"
                ? "Awaiting activation"
                : "Contract closed"}
          </strong>
        </div>
        {c.status === "active" && <Copy value={c.code} />}
      </div>
      <div className="balance-strip">
        {(["available", "reserved", "used"] as const).map((k) => (
          <div key={k}>
            <small>{k}</small>
            <b>{gallons(c[k])} gal</b>
          </div>
        ))}
      </div>
      <Terms s={s} o={o} />
      {c.status === "active" && s.actor.role === "owner" && (
        <details>
          <summary>Close agreement</summary>
          <p>
            Eligible gallons can no longer be redeemed once closed. Posted fees
            and prepayments are non-refundable.
          </p>
          <ActionButton action="closeContract" secondary input={{ id: c.id }}>
            Confirm closure
          </ActionButton>
        </details>
      )}
      {c.status === "requested" && s.actor.role === "owner" && (
        <ActionButton action="withdraw" input={{ id: c.id }} secondary>
          Withdraw request
        </ActionButton>
      )}
    </Modal>
  );
}
export function Protection({ s }: { s: S }) {
  const [tab, setTab] = useState("My contracts");
  const owner = s.actor.role === "owner";
  return (
    <>
      <div className="tabs">
        {["My contracts", "Offer catalog", "Receipt protection"].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Receipt protection" ? (
        <ReceiptProtection s={s} />
      ) : tab === "My contracts" ? (
        <div className="card-grid contract-grid">
          {s.contracts.map((c) => {
            const o = s.offers.find((o) => o.id === c.offer)!;
            return (
              <article
                className={
                  "panel offer agreement " +
                  (o.kind === "prebuy" ? "prepaid" : "")
                }
                key={c.id}
              >
                <div className="row">
                  <span className="tile">
                    <ShieldCheck />
                  </span>
                  <Tag tone={c.status === "active" ? "green" : "amber"}>
                    {c.status}
                  </Tag>
                </div>
                <small>{o.partner} · Simulated</small>
                <h2>{o.name}</h2>
                <p>
                  {o.grade} · through {prettyDate(o.ends)}
                </p>
                <div className="big-number">
                  {gallons(c.available)}{" "}
                  <small>
                    {c.status === "active"
                      ? "gal available"
                      : c.status === "requested"
                        ? "gal requested"
                        : "gal unused"}
                  </small>
                </div>
                <progress value={c.available} max={o.volume} />
                <ContractDetail
                  s={s}
                  id={c.id}
                  trigger={
                    <button className="secondary">
                      Contract details <ArrowRight size={15} />
                    </button>
                  }
                />
              </article>
            );
          })}
          {!s.contracts.length && (
            <Empty>Open the catalog to request fuel protection.</Empty>
          )}
        </div>
      ) : (
        <div className="card-grid contract-grid">
          {s.offers
            .filter((o) => o.status === "published")
            .map((o) => {
              const c = s.contracts.find((c) => c.offer === o.id);
              return (
                <article className="panel offer" key={o.id}>
                  <div className="row">
                    <span className="tile">
                      {o.kind === "lock" ? <LockKeyhole /> : <Fuel />}
                    </span>
                    <Tag tone="gray">
                      {o.kind === "lock" ? "Partner Lock" : "Pre-buy"}
                    </Tag>
                  </div>
                  <small>{o.partner} · Simulated</small>
                  <h2>{o.name}</h2>
                  <p>
                    {o.grade} · {gallons(o.volume)} gallons
                  </p>
                  <div className="big-number">
                    {perGallon(o.cap)} <small>/gal</small>
                  </div>
                  <p>
                    {o.kind === "lock"
                      ? usd(o.fee + o.service) + " in fees"
                      : usd(lineCents(o.volume, o.cap)) + " prepaid"}
                  </p>
                  <p>
                    ≈{fullUsePrice(o.cap, o.fee + o.service, o.volume)}/gal with
                    fees at full use
                  </p>
                  <Modal
                    title={o.name}
                    trigger={
                      <button className="secondary">
                        <Ticket size={16} />
                        Choose
                      </button>
                    }
                  >
                    <Terms s={s} o={o} />
                    {c ? (
                      <Tag>
                        <Check size={13} />
                        {c.status}
                      </Tag>
                    ) : owner ? (
                      <ActionButton action="request" input={{ id: o.id }}>
                        Request {o.kind === "lock" ? "protection" : "pre-buy"}
                      </ActionButton>
                    ) : (
                      <p>Ask the household owner to request this offer.</p>
                    )}
                  </Modal>
                </article>
              );
            })}
        </div>
      )}
    </>
  );
}
export function Partner({ s }: { s: S }) {
  return (
    <div className="stack">
      <section className="panel">
        <SectionTitle
          title="Partner confirmations"
          sub="Simulated station operator · Requests must be accepted before redemption."
        />
        {s.contracts.some((c) => c.status === "requested") ? (
          s.contracts
            .filter((c) => c.status === "requested")
            .map((c) => (
              <div className="list-line" key={c.id}>
                <strong>{s.offers.find((o) => o.id === c.offer)?.name}</strong>
                <ActionButton action="activate" input={{ id: c.id }}>
                  Activate contract
                </ActionButton>
              </div>
            ))
        ) : (
          <p className="inline-muted">No requests awaiting activation.</p>
        )}
      </section>
      <Redemption s={s} />
      <ClaimList s={s} partner />
    </div>
  );
}

function Redemption({ s }: { s: S }) {
  const defaultContract = s.contracts.find((c) => c.status === "active");
  const offer = s.offers.find((o) => o.id === defaultContract?.offer);
  const [code, setCode] = useState(defaultContract?.code ?? "");
  const [fuel, setFuel] = useState(offer?.fuel ?? "Gasoline");
  const [q, setQ] = useState<Reply["quote"]>();
  const [key, setKey] = useState("");
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const a = useAction();
  return (
    <section className="panel form-panel">
      <SectionTitle
        title="Redeem a fill-up"
        sub="Preview the protected and pump-price portions before posting."
      />
      <form
        className="form"
        onChange={() => {
          setQ(undefined);
          a.clear();
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.currentTarget));
          const r = await a.send("preview", data);
          if (r?.quote) {
            setQ(r.quote);
            setPayload(data);
            setKey(crypto.randomUUID());
          }
        }}
      >
        <fieldset className="form-grid" disabled={a.busy}>
          <Field name="Contract code">
            <input
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </Field>
          <Field name="Driver">
            <select name="driver">
              {s.drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field name="Station">
            <select name="station" defaultValue={offer?.allowed[0]}>
              {s.stations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field name="Fuel type">
            <select
              name="fuel"
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
            >
              <option>Gasoline</option>
              <option>Diesel</option>
            </select>
          </Field>
          <Field name="Grade">
            <select name="grade" key={fuel}>
              <option>
                {fuel === "Gasoline" ? "Regular 87" : "Ultra-low sulfur"}
              </option>
            </select>
          </Field>
          <Field name="Gallons">
            <input
              name="volume"
              placeholder="12.500"
              inputMode="decimal"
              required
            />
          </Field>
          <Field name="Pump price ($/gal)">
            <input
              name="pump"
              placeholder="3.899"
              inputMode="decimal"
              required
            />
          </Field>
        </fieldset>
        <button className="secondary" disabled={a.busy}>
          Preview fill-up <ArrowRight size={15} />
        </button>
      </form>
      {q && (
        <div className="quote-box">
          <h3>Purchase preview</h3>
          <Fact
            name={q.kind === "prebuy" ? "Prepaid gallons" : "Protected gallons"}
          >
            {gallons(q.covered)} gal × {perGallon(q.protectedPrice)}/gal
          </Fact>
          <Fact name="At pump price">
            {gallons(q.regular)} gal × {perGallon(q.pump)}/gal
          </Fact>
          <Fact name="Protection benefit">{usd(q.benefit)}</Fact>
          <Fact name="Due at pump">{usd(q.fuel)}</Fact>
          <button
            className="primary"
            disabled={a.busy}
            onClick={async () => {
              const r = await a.send("redeem", {
                ...payload,
                key,
                expected: q.covered,
              });
              if (r) setQ(undefined);
            }}
          >
            Confirm fill-up
          </button>
        </div>
      )}
      {a.notice}
    </section>
  );
}
