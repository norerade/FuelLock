"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity as ActivityIcon,
  CalendarDays,
  ChevronRight,
  ChevronDown,
  Ellipsis,
  ChartColumn,
  House,
  LayoutDashboard,
  Menu,
  PanelTop,
  Settings2,
  Route,
  Target,
  ShieldCheck,
  Store,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { Brand, type S } from "./ui";
import { Overview, WalletPage } from "./overview";
import { Protection, Partner } from "./contracts";
import { Activity, AddFill } from "./activity";
import { Trips, Goals, Settings } from "./planning";
import { Reports } from "./reports";
import { Household } from "./household";
const groups = [
  {
    label: "WORKSPACE",
    items: [
      { path: "overview", name: "Overview", icon: LayoutDashboard },
      { path: "protection", name: "Fuel protection", icon: ShieldCheck },
      { path: "activity", name: "Fill-up activity", icon: ActivityIcon },
      { path: "wallet", name: "Family wallet", icon: Wallet },
      { path: "reports", name: "Reports", icon: ChartColumn },
    ],
  },
  {
    label: "HOUSEHOLD",
    items: [
      { path: "trips", name: "Trips & stations", icon: Route },
      { path: "goals", name: "Savings goals", icon: Target },
      { path: "household", name: "Drivers & vehicles", icon: UsersRound },
      { path: "settings", name: "Settings", icon: Settings2 },
    ],
  },
  {
    label: "PARTNER TOOLS",
    items: [{ path: "partner", name: "Partner console", icon: Store }],
  },
];
const titles: Record<string, [string, string]> = {
  reports: [
    "Fuel reports",
    "Understand the monthly result and model your next fill-up.",
  ],
  trips: [
    "Trips & stations",
    "Find the lowest-cost eligible stop on your route.",
  ],
  goals: [
    "Savings goals",
    "Put fill-up round-ups and cashback toward family goals.",
  ],
  settings: ["Settings", "Manage your household preferences and pilot plan."],
  overview: [
    "Fuel overview",
    "Your household’s fuel spending, protection, and savings.",
  ],
  protection: [
    "Fuel protection",
    "Manage your agreements and explore partner offers.",
  ],
  activity: [
    "Fill-up activity",
    "Review purchases, link receipts, and track every gallon.",
  ],
  wallet: [
    "Family wallet",
    "Follow your rewards and see what fuel protection actually saved.",
  ],
  household: [
    "Drivers & vehicles",
    "Manage the people and cars that share your fuel budget.",
  ],
  partner: [
    "Partner console",
    "Confirm agreements and redeem household fuel codes.",
  ],
};
export default function Workspace({ s, section }: { s: S; section: string }) {
  const [open, setOpen] = useState(false),
    [month, setMonth] = useState(s.now.slice(0, 7));
  const router = useRouter();
  useEffect(() => {
    const refresh = () => router.refresh();
    const source = new EventSource("/api/updates");
    source.onmessage = refresh;
    window.addEventListener("focus", refresh);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30000);
    return () => {
      source.close();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  const driver = s.drivers.find((d) => d.id === s.actor.driver)!;
  const otherPersona = s.drivers.find(
    (d) => d.role === (s.actor.role === "owner" ? "driver" : "owner"),
  );
  const title = titles[section];
  const current = groups
    .flatMap((g) => g.items)
    .find((i) => i.path === section)?.name;
  const months = [
    ...new Set([
      s.now.slice(0, 7),
      ...s.periods.map((p) => p.month),
      ...s.purchases.map((p) => p.at.slice(0, 7)),
    ]),
  ]
    .sort()
    .reverse();
  return (
    <div className="shell">
      {open && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={"sidebar " + (open ? "is-open" : "")}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="mobile-only icon-button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <Link
          href="/household"
          className="household-block"
          onClick={() => setOpen(false)}
        >
          <span className="home-tile">
            <House size={19} />
          </span>
          <div>
            <strong>{s.family.name}</strong>
            <small>Family workspace</small>
          </div>
          <ChevronRight size={14} className="household-chevron" />
        </Link>
        <nav aria-label="Main navigation">
          {groups
            .filter(
              (g) => s.actor.role === "owner" || g.label !== "PARTNER TOOLS",
            )
            .map((g) => (
              <div className="nav-group" key={g.label}>
                <span>{g.label}</span>
                {g.items.map((i) => (
                  <Link
                    key={i.path}
                    aria-current={section === i.path ? "page" : undefined}
                    className={section === i.path ? "active" : ""}
                    href={"/" + i.path}
                    onClick={() => setOpen(false)}
                  >
                    <i.icon size={18} />
                    {i.name}
                  </Link>
                ))}
              </div>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/welcome">
            <PanelTop size={16} />
            About FuelLock
            <ChevronRight size={14} />
          </Link>
          {s.actor.canSwitchPersona && otherPersona && (
            <form
              method="post"
              action="/api/demo/persona"
              className="persona-form"
            >
              <input
                type="hidden"
                name="driver"
                value={otherPersona.role === "owner" ? "" : otherPersona.id}
              />
              <button className="secondary small" type="submit">
                View as {otherPersona.name.split(" ")[0]}
              </button>
            </form>
          )}
          <div className="profile">
            <span className="avatar">
              {driver.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            <div>
              <strong>{driver.name}</strong>
              <small>Household {driver.role}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span className="desktop-crumb">Workspace</span>
            <span className="mobile-brand">
              <Brand />
            </span>
            <ChevronRight size={13} />
            <b>{current}</b>
          </div>
          <div className="demo-indicator">
            <i aria-hidden="true" />
            Demo workspace
          </div>
        </header>
        <main className="main">
          <div className="page-title">
            <div>
              <h1>{title[0]}</h1>
              <p>{title[1]}</p>
            </div>
            <div className="title-actions">
              {(section === "overview" ||
                section === "wallet" ||
                section === "reports") && (
                <label className="month-picker">
                  <CalendarDays size={15} />
                  <select
                    aria-label="Reporting month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    {months.map((m) => (
                      <option key={m} value={m}>
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          year: "numeric",
                          timeZone: "UTC",
                        }).format(new Date(m + "-01T12:00:00Z"))}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} />
                </label>
              )}
              {(section === "overview" || section === "activity") && (
                <AddFill s={s} />
              )}
            </div>
          </div>
          {section === "overview" ? (
            <Overview s={s} month={month} />
          ) : section === "protection" ? (
            <Protection s={s} />
          ) : section === "activity" ? (
            <Activity s={s} />
          ) : section === "wallet" ? (
            <WalletPage s={s} month={month} />
          ) : section === "household" ? (
            <Household s={s} />
          ) : section === "reports" ? (
            <Reports s={s} month={month} />
          ) : section === "trips" ? (
            <Trips s={s} />
          ) : section === "goals" ? (
            <Goals s={s} />
          ) : section === "settings" ? (
            <Settings s={s} />
          ) : (
            <Partner s={s} />
          )}
        </main>
        <nav className="mobile-dock" aria-label="Quick navigation">
          {groups[0].items
            .filter((item) => item.path !== "protection")
            .map((item) => (
              <Link
                key={item.path}
                href={"/" + item.path}
                aria-current={item.path === section ? "page" : undefined}
              >
                <item.icon size={19} />
                <span>
                  {item.path === "activity"
                    ? "Activity"
                    : item.path === "wallet"
                      ? "Wallet"
                      : item.name}
                </span>
              </Link>
            ))}
          <button
            className={
              ["overview", "activity", "wallet", "reports"].includes(section)
                ? undefined
                : "more-current"
            }
            aria-label="More pages"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Ellipsis size={19} />
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
