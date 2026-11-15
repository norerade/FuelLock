"use client";
import { useState } from "react";
import { CarFront, Plus, UserRoundPlus } from "lucide-react";
import {
  type S,
  SectionTitle,
  Tag,
  Field,
  ActionForm,
  Modal,
  Copy,
} from "./ui";
export function Household({ s }: { s: S }) {
  const [invite, setInvite] = useState("");
  const owner = s.actor.role === "owner";
  return (
    <div className="stack">
      <section className="panel">
        <SectionTitle
          title={s.family.name}
          sub="Drivers share a dollar budget and eligible contract balances."
        />
        {s.drivers.map((d, i) => (
          <div className="list-line" key={d.id}>
            <span className={"avatar " + (i ? "alt" : "")}>
              {d.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            <div className="grow">
              <b>{d.name}</b>
              <small>
                {d.id === s.actor.driver
                  ? "Current profile"
                  : "Household member"}
              </small>
            </div>
            <Tag tone="gray">{d.role}</Tag>
          </div>
        ))}
        {owner && (
          <Modal
            title="Invite your second driver"
            description="This one-time link opens the same household under the selected driver’s profile. It expires in 24 hours."
            trigger={
              <button className="secondary">
                <UserRoundPlus size={16} />
                Invite driver
              </button>
            }
          >
            <ActionForm
              action="invite"
              submit="Create invitation"
              onSuccess={(r) =>
                setInvite(window.location.origin + r.invitation)
              }
            >
              <Field name="Household driver">
                <select name="driver">
                  {s.drivers
                    .filter((d) => d.role === "driver")
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </Field>
            </ActionForm>
            {invite && (
              <div className="share-box">
                <label>
                  Invitation link
                  <input
                    aria-label="Invitation link"
                    readOnly
                    value={invite}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <Copy value={invite} />
              </div>
            )}
          </Modal>
        )}
      </section>
      <section className="panel">
        <SectionTitle title="Family vehicles">
          {owner && (
            <Modal
              title="Add vehicle"
              trigger={
                <button className="secondary small">
                  <Plus size={15} />
                  Add vehicle
                </button>
              }
            >
              <ActionForm action="car" submit="Save vehicle">
                <Field name="Vehicle name">
                  <input name="name" required maxLength={60} />
                </Field>
                <Field name="Fuel type">
                  <select name="fuel">
                    <option>Gasoline</option>
                    <option>Diesel</option>
                  </select>
                </Field>
                <Field name="Fuel economy (MPG)">
                  <input name="mpg" type="number" min="1" max="150" required />
                </Field>
              </ActionForm>
            </Modal>
          )}
        </SectionTitle>
        {s.cars.map((c) => (
          <div className="list-line" key={c.id}>
            <span className="tile blue">
              <CarFront size={22} />
            </span>
            <div className="grow">
              <b>{c.name}</b>
              <small>{c.fuel}</small>
            </div>
            <strong>{c.mpg} MPG</strong>
          </div>
        ))}
      </section>
    </div>
  );
}
