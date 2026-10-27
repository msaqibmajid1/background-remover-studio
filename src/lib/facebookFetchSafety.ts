export function normalizeFetchSafety(interval: number, pages: number) {
  return {
    interval: Number.isFinite(interval) ? Math.max(2, Math.min(300, Math.floor(interval))) : 5,
    pages: Number.isFinite(pages) ? Math.max(1, Math.min(100, Math.floor(pages))) : 10,
  };
}
export async function waitForFetchInterval(seconds: number, stopped: () => boolean) {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    if (stopped()) return false;
    await new Promise(resolve => setTimeout(resolve, Math.min(200, end - Date.now())));
  }
  return !stopped();
}
