import { EventEmitter } from "node:events";
const globalEvents = globalThis as typeof globalThis & {
  fuelEvents?: EventEmitter;
};
export const events = (globalEvents.fuelEvents ??= new EventEmitter());
events.setMaxListeners(0);
