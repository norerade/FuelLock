import Link from "next/link";
import { ArrowRight, ShieldCheck, Wallet, UsersRound } from "lucide-react";
import { Brand } from "@/components/ui";
export default function Welcome() {
  return (
    <main className="landing">
      <nav>
        <Brand />
        <Link className="secondary" href="/">
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
          <Link className="primary" href="/">
            Explore the demo <ArrowRight size={16} />
          </Link>
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
            t: "See your real savings",
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
      <footer>FuelLock · Simulated partners and payments</footer>
    </main>
  );
}
