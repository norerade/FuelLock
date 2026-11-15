"use client";
import { FileText } from "lucide-react";
import {
  type S,
  SectionTitle,
  ActionButton,
  Fact,
  Tag,
  Go,
  prettyDate,
  Empty,
} from "./ui";
import { gallons, perGallon, usd } from "@/server/domain/money";
import {
  receiptBenefit,
  receiptProgram as program,
} from "@/server/providers/receipt-program";
export function ReceiptProtection({ s }: { s: S }) {
  const eligible = s.purchases.flatMap((p) => {
    if (
      (s.actor.role !== "owner" && p.driver !== s.actor.driver) ||
      s.claims.some((c) => c.purchase === p.id)
    )
      return [];
    const station = s.stations.find((st) => st.id === p.station)!.name;
    const benefit = receiptBenefit(
      p,
      station,
      s.receipts.some((r) => r.purchase === p.id),
      s.now,
    );
    return benefit ? [{ p, station, benefit }] : [];
  });
  return (
    <div className="stack">
      <section className="panel">
        <SectionTitle
          title="Receipt protection"
          sub="Pay at the pump and submit an eligible receipt to the simulated partner."
        >
          <span className="tile">
            <FileText size={19} />
          </span>
        </SectionTitle>
        <p className="terms">
          For {program.grade.toLowerCase()} gasoline at{" "}
          {program.stations.join(" or ")}, the pilot reimburses the pump price
          above {perGallon(program.cap)}/gal, up to{" "}
          {perGallon(program.maxSpread)}/gal on the first{" "}
          {gallons(program.maxVolume)} gallons. Submit within {program.days}{" "}
          days. Partner Lock and Pre-buy redemptions are excluded.
        </p>
        <div className="facts">
          <Fact name="Enrollment">Included in the family pilot</Fact>
          <Fact name="Terms">{program.version} · Simulated</Fact>
        </div>
      </section>
      <section className="panel">
        <SectionTitle title="Eligible receipts">
          <Go href="/activity">Fill-up activity</Go>
        </SectionTitle>
        {eligible.length ? (
          eligible.map(({ p, station, benefit }) => (
            <div key={p.id} className="list-line">
              <div className="grow">
                <b>{station}</b>
                <small>
                  {prettyDate(p.at)} · {gallons(p.volume)} gal
                </small>
              </div>
              <b>{usd(benefit)}</b>
              <ActionButton action="claim" input={{ id: p.id }}>
                Submit claim
              </ActionButton>
            </div>
          ))
        ) : (
          <Empty>
            Attach a receipt to a qualifying self-paid fill-up to submit a
            claim.
          </Empty>
        )}
      </section>
      <ClaimList s={s} />
    </div>
  );
}

export function ClaimList({ s, partner = false }: { s: S; partner?: boolean }) {
  const list = partner
    ? s.claims.filter((c) => c.status === "pending" || c.status === "confirmed")
    : s.claims;
  return (
    <section className="panel">
      <SectionTitle
        title={partner ? "Receipt claim decisions" : "Claim history"}
      />
      {!list.length && (
        <Empty>
          {partner
            ? "No receipt claims awaiting a decision."
            : "No claims submitted yet."}
        </Empty>
      )}
      {list.map((c) => {
        const p = s.purchases.find((p) => p.id === c.purchase)!;
        return (
          <article className="claim-row" key={c.id}>
            <div className="list-line">
              <div className="grow">
                <b>{s.stations.find((st) => st.id === p.station)?.name}</b>
                <small>
                  {prettyDate(p.at)} · {c.version}
                </small>
              </div>
              <strong>{usd(c.amount)}</strong>
              <Tag
                tone={
                  c.status === "pending"
                    ? "amber"
                    : c.status === "paid"
                      ? "green"
                      : "gray"
                }
              >
                {c.status}
              </Tag>
            </div>
            {partner && (
              <>
                <div className="claim-actions">
                  {s.receipts
                    .filter((r) => r.purchase === p.id)
                    .map((r) => (
                      <a
                        key={r.id}
                        href={"/api/receipts/" + r.id}
                        className="text-link"
                      >
                        <FileText size={14} />
                        {r.name}
                      </a>
                    ))}
                </div>
                <div className="claim-actions">
                  {(c.status === "pending"
                    ? ["confirmed", "rejected"]
                    : ["paid"]
                  ).map((next) => (
                    <ActionButton
                      key={next}
                      action="claimDecision"
                      secondary={next === "rejected"}
                      input={{ id: c.id, next }}
                    >
                      {next === "confirmed"
                        ? "Approve claim"
                        : next === "rejected"
                          ? "Reject claim"
                          : "Pay claim"}
                    </ActionButton>
                  ))}
                </div>
              </>
            )}
          </article>
        );
      })}
    </section>
  );
}
