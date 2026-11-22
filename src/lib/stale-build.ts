const STALE = [
  /ChunkLoadError/i,
  /Loading chunk [\w-]+ failed/i,
  /Failed to load chunk/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
];

const KEY = "stale-build-reloaded";

export function isStaleBuild(error: unknown): boolean {
  const e = error as { name?: unknown; message?: unknown } | null;
  const text = `${String(e?.name ?? "")} ${String(e?.message ?? error)}`;
  return STALE.some((pattern) => pattern.test(text));
}

export function recoverFromStaleBuild(
  error: unknown,
  store: Pick<Storage, "getItem" | "setItem">,
  reload: () => void,
): boolean {
  if (!isStaleBuild(error) || store.getItem(KEY)) return false;
  store.setItem(KEY, "1");
  reload();
  return true;
}
