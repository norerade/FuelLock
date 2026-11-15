import type { ReactNode } from "react";
import { Droplet } from "lucide-react";
import { usd } from "@/server/domain/money";

export function BalanceCard({
  title,
  label,
  cents,
  children,
  artwork = false,
}: {
  title: string;
  label: string;
  cents: number;
  artwork?: boolean;
  children: ReactNode;
}) {
  const amount = usd(cents);
  return (
    <section className={artwork ? "balance-card illustrated" : "balance-card"}>
      {artwork && <div className="token-art" aria-hidden="true" />}
      <header>
        <span className="balance-symbol">
          <Droplet size={17} />
        </span>
        <h2>{title}</h2>
      </header>
      <div className="balance-amount">
        <span>{label}</span>
        <strong
          className={[
            cents < 0 ? "debit" : "",
            amount.length > 8 ? "wide-balance" : "",
          ].join(" ")}
        >
          {amount}
        </strong>
      </div>
      <footer>{children}</footer>
    </section>
  );
}
