import Link from "next/link";
import { BalanceCard } from "@/components/balance-card";
import { LandingCalculator } from "@/components/landing-calculator";
import { familyPlanCents, usd } from "@/server/domain/money";
import { ArrowRight, ShieldCheck, Wallet, UsersRound } from "lucide-react";
import { Brand } from "@/components/ui";
import DemoLogin from "@/components/demo-login";
export default function Welcome() {
  return (
    <main className="landing">
      <nav>
        <Brand href="/" />
        <Link className="secondary" href="/login" prefetch={false}>
          Open workspace <ArrowRight size={15} />
        </Link>
      </nav>
      <section className="landing-hero">
        <div>
          <span className="hero-label">
            <i />
            FAMILY FUEL PLANNING
          </span>
          <h1>
            Your next mile,
            <br />
            already planned.
          </h1>
          <p>
            Plan your family’s fuel budget, protect eligible fuel purchases, and
            make every fill-up work toward your goals.
          </p>
          <DemoLogin />
        </div>
      </section>
      <div className="landing-features">
        {[
          {
            icon: ShieldCheck,
            t: "Protect a price",
            p: "Choose a partner’s cap and covered gallons. Pay the lower eligible price when you fill up.",
          },
          {
            icon: UsersRound,
            t: "Share the tank",
            p: "Two drivers use one household balance. Both can see the gallons left after every purchase.",
          },
          {
            icon: Wallet,
            t: "See your actual net result",
            p: "Review pump payments, protection fees and paid cashback together in your family wallet.",
          },
        ].map((f) => (
          <section key={f.t}>
            <f.icon />
            <h2>{f.t}</h2>
            <p>{f.p}</p>
          </section>
        ))}
      </div>
      <div className="landing-product">
        <section className="panel">
          <h2>Pricing</h2>
          <p className="plan-price">
            Family {usd(familyPlanCents)}
            <small> / month</small>
          </p>
          <p>
            $0 during the demo. Partner protection is optional. Each offer sets
            its own price cap, volume, fees and term.
          </p>
        </section>
        <section className="landing-preview">
          <h2>Overview preview</h2>
          <BalanceCard
            title="Monthly budget"
            label="Available to spend"
            cents={13960}
          >
            <div className="balance-footnote">
              <span>Sample household · $180.40 of $320.00 used</span>
              <span>$176.40 at pump + $4.00 fees</span>
            </div>
          </BalanceCard>
        </section>
        <LandingCalculator />
        <section className="panel landing-disclosure">
          <h2>What’s real / what’s simulated</h2>
          <p>
            <strong>Working software.</strong> Shared budgets, recorded
            purchases and calculations persist in your demo household.
          </p>
          <p>
            <strong>Simulated partners.</strong> Station prices, routes,
            protection agreements and receipt decisions are demo data.
          </p>
          <p>
            <strong>Simulated money.</strong> Cashback and savings transfers
            stay in the demo. No subscription or bank charge is collected.
          </p>
        </section>
      </div>
      <footer>FuelLock · Simulated partners and payments</footer>
    </main>
  );
}
