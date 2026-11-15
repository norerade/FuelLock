import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { TestProject } from "vitest/node";
declare module "vitest" {
  export interface ProvidedContext {
    testDirectory: string;
  }
}
export default function setup(project: TestProject) {
  const folder = mkdtempSync(join(tmpdir(), "fuellock-vitest-"));
  project.provide("testDirectory", folder);
  return () =>
    rmSync(folder, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
}
