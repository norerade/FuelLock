import { z } from "zod";
import { decimal } from "./money";
const positiveDecimal = (places: number, maximum: number) =>
  z
    .string()
    .max(24)
    .transform((value, ctx) => {
      try {
        const n = decimal(value, places);
        if (n <= 0 || n > maximum) throw new Error();
        return n;
      } catch {
        ctx.addIssue({
          code: "custom",
          message:
            "Enter a positive amount within the allowed precision and range.",
        });
        return z.NEVER;
      }
    });
export const dollars = positiveDecimal(2, 10_000_000);
export const qty = positiveDecimal(3, 250_000);
export const price = positiveDecimal(6, 25_000_000);
export const fuelType = z.enum(["Gasoline", "Diesel"]);
export const label = z.string().trim().min(2).max(60);
export const saleInput = z.object({
  code: z.string().trim().toUpperCase().min(4).max(32),
  driver: z.string().min(1),
  station: z.string().min(1),
  fuel: fuelType,
  grade: z.enum(["Regular 87", "Ultra-low sulfur"]),
  volume: qty,
  pump: price,
});
export type Sale = z.output<typeof saleInput>;
export class Problem extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
export function requireThat(
  test: unknown,
  message: string,
  status = 400,
): asserts test {
  if (!test) throw new Problem(message, status);
}
