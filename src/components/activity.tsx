"use client";
import { Trees, Navigation2, MapPin } from "lucide-react";
import { useState } from "react";
import {
  ArrowRight,
  FileText,
  Fuel,
  Plus,
  ReceiptText,
  Upload,
} from "lucide-react";
import { gallons, perGallon, usd } from "@/server/domain/money";
import {
  type S,
  type Purchase,
  SectionTitle,
  Modal,
  Fact,
  Field,
  Tag,
  ActionButton,
  Empty,
  prettyDate,
  useAction,
} from "./ui";
function EvidenceForm({ s, p }: { s: S; p?: Purchase }) {
  const a = useAction();
  const [source, setSource] = useState("Receipt"),
    [fuel, setFuel] = useState("Gasoline");
  const localNow = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        if (!p) form.set("at", new Date(String(form.get("at"))).toISOString());
        await a.send("evidence", form);
      }}
    >
      {p ? (
        <input type="hidden" name="purchase" value={p.id} />
      ) : (
        <>
          <Field name="Record source">
            <select
              name="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option>Receipt</option>
              <option>Bank record</option>
            </select>
          </Field>
          <div className="form-grid">
            <Field name="Driver">
              <select name="driver" defaultValue={s.actor.driver}>
                {s.drivers
                  .filter(
                    (d) => s.actor.role === "owner" || s.actor.driver === d.id,
                  )
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field name="Station">
              <select name="station">
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
                  {fuel === "Diesel" ? "Ultra-low sulfur" : "Regular 87"}
                </option>
              </select>
            </Field>
            <Field name="Gallons">
              <input
                name="volume"
                placeholder="10.500"
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
          </div>
          <Field name="Purchase date and time">
            <input
              type="datetime-local"
              name="at"
              defaultValue={localNow()}
              required
            />
          </Field>
        </>
      )}
      {(p || source === "Receipt") && (
        <Field name="Receipt file (PDF, PNG or JPEG · up to 3 MB)">
          <input
            name="file"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            required
          />
        </Field>
      )}
      <button className="primary" disabled={a.busy}>
        <Upload size={16} />
        {p ? "Attach receipt" : "Save fill-up"}
      </button>
      {a.notice}
    </form>
  );
}
export function AddFill({ s }: { s: S }) {
  return (
    <Modal
      title="Add a fill-up"
      description="Record a receipt or enter a bank record. Matching records share one purchase."
      trigger={
        <button className="primary">
          <Plus size={17} />
          Add fill-up
        </button>
      }
    >
      <EvidenceForm s={s} />
    </Modal>
  );
}
export function PurchaseDetail({
  s,
  p,
  trigger,
}: {
  s: S;
  p: Purchase;
  trigger: React.ReactElement;
}) {
  return (
    <Modal
      title="Fill-up details"
      description={
        s.stations.find((t) => t.id === p.station)?.name +
        " · " +
        prettyDate(p.at, true)
      }
      trigger={trigger}
    >
      <div className="facts">
        <Fact name="Driver">
          {s.drivers.find((d) => d.id === p.driver)?.name}
        </Fact>
        <Fact name="Recorded at">
          {new Date(p.at).toLocaleString("en-US", { timeZone: "UTC" })} UTC
        </Fact>
        <Fact name="Fuel">
          {p.grade} · {gallons(p.volume)} gal
        </Fact>
        <Fact name="Pump price">{perGallon(p.pump)}/gal</Fact>
        <Fact name="Protected / prepaid volume">{gallons(p.covered)} gal</Fact>
        <Fact name="Uncovered volume">{gallons(p.volume - p.covered)} gal</Fact>
        <Fact name="Fuel paid">{usd(p.amount)}</Fact>
        <Fact name="Protection benefit">{usd(p.benefit)}</Fact>
        <Fact name="Cashback">
          {usd(p.reward)} · {p.rewardStatus}
        </Fact>
        <Fact name="Source">{p.source}</Fact>
        <Fact name="Status">{p.status}</Fact>
      </div>
      {s.receipts
        .filter((r) => r.purchase === p.id)
        .map((r) => (
          <a className="text-link" key={r.id} href={"/api/receipts/" + r.id}>
            <FileText size={15} />
            {r.name}
          </a>
        ))}
      {p.status === "posted" &&
        (s.actor.role === "owner" || s.actor.driver === p.driver) && (
          <details>
            <summary>Attach a receipt</summary>
            <EvidenceForm s={s} p={p} />
          </details>
        )}
      {p.status === "posted" && s.actor.role === "owner" && (
        <details>
          <summary>Cancel this fill-up</summary>
          <p>
            Restore its eligible gallons and reverse its cashback and savings
            entries.
          </p>
          <ActionButton action="cancel" input={{ id: p.id }} secondary>
            Confirm cancellation
          </ActionButton>
        </details>
      )}
    </Modal>
  );
}
function StationIcon({ name }: { name?: string }) {
  const design =
    name === "Pineway Fuel"
      ? { icon: Trees, tone: "pine" }
      : name === "Northline Station"
        ? { icon: Navigation2, tone: "north" }
        : name === "Cedar Point"
          ? { icon: MapPin, tone: "cedar" }
          : { icon: Fuel, tone: "" };
  return (
    <span className={"station-icon " + design.tone}>
      <design.icon size={19} />
    </span>
  );
}
export function ActivityList({ s, items }: { s: S; items: Purchase[] }) {
  if (!items.length) return <Empty>No fill-ups match this view.</Empty>;
  return (
    <div className="activity-list">
      {items.map((p) => (
        <PurchaseDetail
          key={p.id}
          s={s}
          p={p}
          trigger={
            <button className="activity-row">
              <StationIcon
                name={s.stations.find((st) => st.id === p.station)?.name}
              />
              <span className="activity-name">
                <b>{s.stations.find((t) => t.id === p.station)?.name}</b>
                <small>
                  {prettyDate(p.at)} ·{" "}
                  {s.drivers.find((d) => d.id === p.driver)?.name}
                </small>
              </span>
              <span className="activity-grade">{p.grade}</span>
              <span className="activity-qty">{gallons(p.volume)} gal</span>
              <span className="activity-money">
                <b>{usd(p.amount)}</b>
                <small>
                  {p.status === "cancelled"
                    ? "Cancelled"
                    : p.contract
                      ? "Partner redemption"
                      : "Standard fill-up"}
                </small>
              </span>
              <ArrowRight size={15} />
            </button>
          }
        />
      ))}
    </div>
  );
}
export function Activity({ s }: { s: S }) {
  const [filter, set] = useState("All drivers"),
    [status, setStatus] = useState("All statuses");
  return (
    <section className="panel">
      <SectionTitle title="Fill-up history">
        <ReceiptText size={19} />
      </SectionTitle>
      <div className="filters">
        <select
          aria-label="Filter by driver"
          value={filter}
          onChange={(e) => set(e.target.value)}
        >
          <option>All drivers</option>
          {s.drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>All statuses</option>
          <option>posted</option>
          <option>cancelled</option>
        </select>
      </div>
      <ActivityList
        s={s}
        items={s.purchases.filter(
          (p) =>
            (filter === "All drivers" || p.driver === filter) &&
            (status === "All statuses" || p.status === status),
        )}
      />
    </section>
  );
}
export function RewardTag({ status }: { status: string }) {
  return (
    <Tag
      tone={
        status === "paid" ? "green" : status === "pending" ? "amber" : "gray"
      }
    >
      {status}
    </Tag>
  );
}
