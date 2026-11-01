export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.GRABWAVE_DISABLE_RELAY === "true") return;
  const { startEventRelay } = await import("@/lib/events/relay");
  startEventRelay();
}
