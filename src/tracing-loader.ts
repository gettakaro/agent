// Side-effect initialization for --loader pattern
// OpenTelemetry setup for system-level tracing (HTTP, DB, Redis)
// LLM tracing is handled by Langfuse SDK (see langfuse-client.ts)

import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

const tracingEnabled = process.env.TRACING_ENABLED === "true";
const serviceName = process.env.TAKARO_SERVICE || "takaro-agent";
const tracingEndpoint = process.env.TRACING_ENDPOINT;

if (tracingEnabled) {
  const spanProcessors = [];

  // Optional: OTLP exporter for system-level traces (e.g., Grafana Tempo, Jaeger)
  if (tracingEndpoint) {
    spanProcessors.push(new SimpleSpanProcessor(new OTLPTraceExporter({ url: tracingEndpoint })));
  }

  const sdk = new NodeSDK({
    // @ts-expect-error - OpenTelemetry version mismatch between packages
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    spanProcessors,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-http": {
          enabled: true,
          ignoreIncomingRequestHook: (req) => {
            const shouldIgnore =
              req.url?.startsWith("/health") || req.url?.startsWith("/static") || req.url?.includes("favicon.ico");
            return shouldIgnore ?? false;
          },
        },
        "@opentelemetry/instrumentation-express": { enabled: true },
        "@opentelemetry/instrumentation-pg": { enabled: true },
        "@opentelemetry/instrumentation-ioredis": { enabled: true },
      }),
    ],
  });

  sdk.start();

  console.log("┌─────────────────────────────────────────┐");
  console.log("│  OpenTelemetry System Tracing          │");
  console.log("├─────────────────────────────────────────┤");
  console.log(`│  Service: ${serviceName.padEnd(29)} │`);
  console.log(`│  OTLP: ${(tracingEndpoint ? "✓ Enabled" : "✗ Disabled").padEnd(32)} │`);
  console.log("└─────────────────────────────────────────┘");

  process.on("SIGTERM", async () => {
    await sdk?.shutdown();
  });
  process.on("SIGINT", async () => {
    await sdk?.shutdown();
  });
}

// Export loader hook (required for --loader pattern)
export async function resolve(
  specifier: string,
  context: unknown,
  nextResolve: (specifier: string, context: unknown) => Promise<unknown>,
) {
  return nextResolve(specifier, context);
}
