import type { ReactNode } from "react";
import { Droplet } from "lucide-react";
import { usd } from "@/server/domain/money";

export function BalanceCard({
  title,
  label,
  cents,
  children,
}: {
  title: string;
  label: string;
  cents: number;
  children: ReactNode;
}) {
  const amount = usd(cents);
  return (
    <section className="balance-card">
      <div className="balance-rings" aria-hidden="true" />
      <div className="token-art" aria-hidden="true" />
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
