import type { Client } from "@takaro/apiclient";
import type { Response } from "express";
import { io, type Socket } from "socket.io-client";
import { getServiceClient, isServiceMode } from "../takaro/client.js";
import { formatError } from "../utils/formatError.js";

export interface TakaroEvent {
  id: string;
  eventName: string;
  gameserverId?: string;
  moduleId?: string;
  playerId?: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

interface SSEClient {
  res: Response;
  gameServerId: string;
  lastHeartbeat: number;
}

// Events we care about for the cockpit
const RELEVANT_EVENTS = [
  "command-executed",
  "hook-executed",
  "cronjob-executed",
  "chat-message",
  "player-connected",
  "player-disconnected",
];

export class EventRelay {
  private socket: Socket | null = null;
  private sseClients = new Map<string, SSEClient>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private connected = false;

  constructor(
    private takaroApiUrl: string,
    private authCookies: string | null, // null in service mode
  ) {}

  connect(): void {
    if (this.socket) {
      console.log("[EventRelay] Already connected");
      return;
    }

    const url = this.takaroApiUrl.replace(/\/$/, "");

    // Build auth headers based on mode (matching how API calls work)
    const extraHeaders: Record<string, string> = {};
    if (isServiceMode()) {
      const serviceClient = getServiceClient();
      if (serviceClient?.token) {
        extraHeaders.Authorization = `Bearer ${serviceClient.token}`;
        console.log("[EventRelay] Using service account Bearer token for Socket.IO auth");
      } else {
        console.error("[EventRelay] Service mode but no token available");
      }
    } else if (this.authCookies) {
      extraHeaders.Cookie = this.authCookies;
      console.log("[EventRelay] Using forwarded cookies for Socket.IO auth");
    }

    console.log(`[EventRelay] Connecting to Takaro Socket.IO at ${url}`);

    this.socket = io(url, {
      extraHeaders,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on("connect", () => {
      console.log(`[EventRelay] Connected to Takaro Socket.IO (id: ${this.socket?.id})`);
      this.connected = true;
    });

    this.socket.on("disconnect", (reason) => {
      console.log(`[EventRelay] Disconnected from Takaro: ${reason}`);
      this.connected = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error(`[EventRelay] Connection error: ${error.message}`, (error as Error & { cause?: unknown }).cause || "");
    });

    // Listen for Takaro events (handles both array and single event formats)
    this.socket.on("event", (data: TakaroEvent | TakaroEvent[]) => {
      const events = Array.isArray(data) ? data : [data];
      for (const event of events) {
        this.handleEvent(event);
      }
    });

    // Room joined confirmation
    this.socket.on("room-joined", (data: { domainId: string }) => {
      console.log(`[EventRelay] Joined room for domain: ${data.domainId}`);
    });

    // Start heartbeat to keep SSE connections alive
    this.startHeartbeat();
  }

  private handleEvent(event: TakaroEvent): void {
    // Filter to relevant events only
    if (!RELEVANT_EVENTS.includes(event.eventName)) {
      return;
    }

    // Relay to matching SSE clients
    this.sseClients.forEach((client, sessionId) => {
      if (event.gameserverId && event.gameserverId === client.gameServerId) {
        this.sendToClient(client.res, "event", event);
      }
    });
  }

  private sendToClient(res: Response, eventType: string, data: unknown): void {
    try {
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Client disconnected
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      this.sseClients.forEach((client, sessionId) => {
        // Send heartbeat every 30 seconds
        if (now - client.lastHeartbeat > 30000) {
          this.sendToClient(client.res, "heartbeat", { time: new Date().toISOString() });
          client.lastHeartbeat = now;
        }
      });
    }, 10000);
  }

  async addSSEClient(sessionId: string, res: Response, gameServerId: string, takaroClient?: Client): Promise<void> {
    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Fetch and send historical events first (last 50)
    if (takaroClient) {
      try {
        const eventsRes = await takaroClient.event.eventControllerSearch({
          filters: { gameserverId: [gameServerId] },
          sortBy: "createdAt",
          sortDirection: "desc",
          limit: 50,
        });

        // Filter to relevant events and send in chronological order (oldest first)
        const relevantEvents = eventsRes.data.data
          .filter((e) => RELEVANT_EVENTS.includes(e.eventName))
          .reverse();

        console.log(`[EventRelay] Sending ${relevantEvents.length} historical events for session ${sessionId}`);

        for (const event of relevantEvents) {
          this.sendToClient(res, "event", event);
        }
      } catch (err) {
        console.error(`[EventRelay] Failed to fetch historical events: ${formatError(err)}`);
      }
    }

    // Store client
    this.sseClients.set(sessionId, {
      res,
      gameServerId,
      lastHeartbeat: Date.now(),
    });

    // Send connection event after historical events
    this.sendToClient(res, "connected", {
      sessionId,
      gameServerId,
      time: new Date().toISOString(),
    });

    console.log(`[EventRelay] SSE client added for session ${sessionId}, gameServer ${gameServerId}`);

    // Handle client disconnect
    res.on("close", () => {
      console.log(`[EventRelay] SSE client disconnected for session ${sessionId}`);
      this.sseClients.delete(sessionId);
    });
  }

  removeSSEClient(sessionId: string): void {
    const client = this.sseClients.get(sessionId);
    if (client) {
      try {
        client.res.end();
      } catch {
        // Already closed
      }
      this.sseClients.delete(sessionId);
    }
  }

  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all SSE clients
    this.sseClients.forEach((client) => {
      try {
        client.res.end();
      } catch {
        // Already closed
      }
    });
    this.sseClients.clear();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connected = false;
    console.log("[EventRelay] Disconnected");
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClientCount(): number {
    return this.sseClients.size;
  }
}

// Factory function to create EventRelay per user (since auth is user-specific)
const relays = new Map<string, EventRelay>();

export function getEventRelay(takaroApiUrl: string, authCookies: string, userId: string): EventRelay {
  const key = userId;
  let relay = relays.get(key);

  if (!relay) {
    // In service mode, we use the service account token instead of cookies
    const cookies = isServiceMode() ? null : authCookies;
    relay = new EventRelay(takaroApiUrl, cookies);
    relay.connect();
    relays.set(key, relay);
  }

  return relay;
}

export function disconnectAllRelays(): void {
  relays.forEach((relay) => relay.disconnect());
  relays.clear();
}
