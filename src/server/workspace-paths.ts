const workspacePaths = new Set([
  "/overview",
  "/protection",
  "/activity",
  "/wallet",
  "/household",
  "/partner",
  "/trips",
  "/goals",
  "/settings",
  "/reports",
]);

export function isWorkspacePath(path: string) {
  return workspacePaths.has(path);
}

export function loginDestination(next: unknown) {
  return typeof next === "string" && isWorkspacePath(next) ? next : "/overview";
}
