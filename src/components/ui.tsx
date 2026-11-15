"use client";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Clipboard,
  LoaderCircle,
  X,
} from "lucide-react";
import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Snapshot } from "@/server/snapshot";
export type S = Snapshot;
export type Purchase = S["purchases"][number];
export type Offer = S["offers"][number];
export const prettyDate = (iso: string, long = false) =>
  new Intl.DateTimeFormat("en-US", {
    year: long ? "numeric" : undefined,
    month: long ? "long" : "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
export function Brand({ href = "/overview" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="FuelLock">
      <span className="brand-mark" aria-hidden="true" />
      Fuel<span className="brand-lock">Lock</span>
    </Link>
  );
}
export function Modal({
  title,
  description,
  trigger,
  children,
  open,
  onOpenChange,
}: {
  title: string;
  description?: string;
  trigger?: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className="modal"
          {...(!description ? { "aria-describedby": undefined } : {})}
        >
          <div className="modal-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              <X size={19} />
            </Dialog.Close>
          </div>
          {description && (
            <Dialog.Description>{description}</Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Tag({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"tag " + tone}>{children}</span>;
}
export function SectionTitle({
  title,
  children,
  sub,
}: {
  title: string;
  children?: ReactNode;
  sub?: string;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {children}
    </div>
  );
}
export function Field({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <label className="field">
      <span id={id}>{name}</span>
      {isValidElement<{ "aria-labelledby"?: string }>(children)
        ? cloneElement(children, { "aria-labelledby": id })
        : children}
    </label>
  );
}
export function Fact({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <div className="fact">
      <span>{name}</span>
      <strong>{children}</strong>
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
export function Copy({
  value,
  label = "Copy",
  link = false,
}: {
  value: string;
  label?: string;
  link?: boolean;
}) {
  const [message, set] = useState("");
  return (
    <span className="copy">
      <button
        type="button"
        className="secondary small"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              link ? new URL(value, window.location.origin).href : value,
            );
            set("Copied");
          } catch {
            set("Select the text to copy.");
          }
        }}
      >
        {message === "Copied" ? <Check size={14} /> : <Clipboard size={14} />}{" "}
        {label}
      </button>
      {message && <small role="status">{message}</small>}
    </span>
  );
}
export function Go({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ChevronRight size={15} />
    </Link>
  );
}
export function More({ href, label }: { href: string; label: string }) {
  return (
    <Link className="secondary small" href={href}>
      {label}
      <ArrowUpRight size={14} />
    </Link>
  );
}
export type Reply = {
  message?: string;
  error?: string;
  purchase?: string;
  invitation?: string;
  quote?: {
    covered: number;
    regular: number;
    fuel: number;
    benefit: number;
    market: number;
    contract: string;
    cap: number;
    pump: number;
    protectedPrice: number;
    kind: string;
  };
};
export function useAction() {
  const [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(""),
    [failed, setFailed] = useState(false);
  const router = useRouter();
  async function send(
    action: string,
    input: Record<string, unknown> | FormData,
  ): Promise<Reply | null> {
    setBusy(true);
    setFeedback("");
    setFailed(false);
    try {
      const file = input instanceof FormData;
      const r = await fetch(file ? "/api/receipts" : "/api/action", {
        method: "POST",
        headers: file ? undefined : { "Content-Type": "application/json" },
        body: file ? input : JSON.stringify({ action, input }),
      });
      const data: Reply = await r.json();
      if (!r.ok) throw new Error(data.error || "Unable to save.");
      setFeedback(data.message ?? "");
      if (action !== "preview") router.refresh();
      return data;
    } catch (e) {
      setFailed(true);
      setFeedback(e instanceof Error ? e.message : "Connection failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  return {
    send,
    busy,
    feedback,
    failed,
    clear: () => setFeedback(""),
    notice: feedback ? (
      <p
        role={failed ? "alert" : "status"}
        className={"notice " + (failed ? "error" : "")}
      >
        {feedback}
      </p>
    ) : null,
  };
}
export function ActionButton({
  action,
  input,
  children,
  secondary = false,
}: {
  action: string;
  input: Record<string, unknown>;
  children: ReactNode;
  secondary?: boolean;
}) {
  const a = useAction();
  return (
    <div>
      <button
        type="button"
        disabled={a.busy}
        className={secondary ? "secondary" : "primary"}
        onClick={() => a.send(action, input)}
      >
        {a.busy && <LoaderCircle size={15} className="spin" />}
        {children}
      </button>
      {a.notice}
    </div>
  );
}
export function ActionForm({
  action,
  children,
  submit = "Save changes",
  data = {},
  onSuccess,
}: {
  action: string;
  children: ReactNode;
  submit?: string;
  data?: Record<string, unknown>;
  onSuccess?: (reply: Reply) => void;
}) {
  const a = useAction();
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const reply = await a.send(action, {
      ...data,
      ...Object.fromEntries(new FormData(e.currentTarget)),
    });
    if (reply) onSuccess?.(reply);
  }
  return (
    <form onSubmit={save} className="form">
      {children}
      <button className="primary" disabled={a.busy}>
        {a.busy ? "Saving…" : submit}
      </button>
      {a.notice}
    </form>
  );
}
