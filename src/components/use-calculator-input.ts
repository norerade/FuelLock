"use client";
import { useCallback, useState, type FormEvent } from "react";

export function useCalculatorInput(initialValue: string) {
  const [value, setValue] = useState(initialValue);
  const readInitialInput = useCallback((input: HTMLInputElement | null) => {
    // The browser may already have accepted an edit to the server-rendered field.
    if (input) setValue(input.value);
  }, []);

  return [
    value,
    {
      inputMode: "decimal",
      defaultValue: value,
      ref: readInitialInput,
      onInput: (event: FormEvent<HTMLInputElement>) =>
        setValue(event.currentTarget.value),
    },
  ] as const;
}
