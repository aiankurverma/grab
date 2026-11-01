import { getJobView } from "@/lib/jobs/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_MS = 1_000;
const HEARTBEAT_TICKS = 15;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const encoder = new TextEncoder();
  let closed = false;
  let busy = false;
  let ticks = 0;
  let lastBody = "";
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (text: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          cleanup();
        }
      };
      const send = (data: unknown) => enqueue(`data: ${JSON.stringify(data)}\n\n`);
      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        request.signal.removeEventListener("abort", cleanup);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", cleanup, { once: true });
      enqueue(": connected\n\n");

      const tick = async () => {
        if (closed || busy) return;
        busy = true;
        try {
          const job = await getJobView(id);
          if (!job) {
            send({ error: "not_found" });
            cleanup();
            return;
          }
          const body = JSON.stringify(job);
          if (body !== lastBody) {
            lastBody = body;
            send(job);
          } else if (ticks % HEARTBEAT_TICKS === 0) {
            enqueue(": heartbeat\n\n");
          }
          ticks += 1;
          if (job.terminal) cleanup();
        } catch (error) {
          console.warn("[jobs/stream] poll failed:", error);
        } finally {
          busy = false;
        }
      };

      await tick();
      if (!closed) timer = setInterval(tick, POLL_MS);
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
