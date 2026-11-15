import { identity } from "@/server/session";
import { events } from "@/server/events";
export async function GET(request: Request) {
  const a = await identity();
  if (!a) return new Response(null, { status: 401 });
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));
      const update = () =>
        controller.enqueue(encoder.encode("data: refresh\n\n"));
      const heartbeat = setInterval(
        () => controller.enqueue(encoder.encode(": keepalive\n\n")),
        15000,
      );
      events.on(a.family, update);
      let done = false;
      cleanup = () => {
        if (done) return;
        done = true;
        clearInterval(heartbeat);
        events.off(a.family, update);
        request.signal.removeEventListener("abort", abort);
      };
      function abort() {
        cleanup();
        try {
          controller.close();
        } catch {}
      }
      request.signal.addEventListener("abort", abort, { once: true });
      if (request.signal.aborted) abort();
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
