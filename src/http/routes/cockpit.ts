import { type Response, Router } from "express";
import { CockpitSessionService, getEventRelay, mockServerManager } from "../../cockpit/index.js";
import { config } from "../../config.js";
import { ConversationService } from "../../conversations/service.js";
import { formatError } from "../../utils/formatError.js";
import { type AuthenticatedRequest, authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { executeCommandSchema, selectPlayerSchema } from "../schemas/cockpit.js";

const router = Router();
const sessionService = new CockpitSessionService();
const conversationService = new ConversationService();

// Apply auth middleware to all cockpit routes
router.use(authMiddleware({ redirect: false }));

// Get or create cockpit session for a conversation
router.get("/sessions/:conversationId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversationId = req.params.conversationId!;

    // Verify conversation exists and belongs to user
    const conversation = await conversationService.get(conversationId);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (conversation.userId !== req.user!.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Get or create session
    const session = await sessionService.getOrCreate(conversationId, req.user!.id);

    res.json({ data: session });
  } catch (error) {
    console.error("Error getting cockpit session:", formatError(error));
    res.status(500).json({ error: "Failed to get cockpit session" });
  }
});

// Start mock server for session
router.post("/sessions/:sessionId/mock-server/start", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.params.sessionId!;

    const session = await sessionService.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.userId !== req.user!.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (!req.takaroClient) {
      res.status(500).json({ error: "Takaro client not available" });
      return;
    }

    // Check if already running
    if (mockServerManager.isRunning(sessionId)) {
      const status = await mockServerManager.getStatus(sessionId);
      res.json({ data: status });
      return;
    }

    // Spin up mock server (one per user)
    const managed = await mockServerManager.spinUp(sessionId, req.user!.id, req.takaroClient);

    res.json({
      data: {
        status: "running",
        gameServerId: managed.gameServerId,
        playerCount: managed.players.length,
      },
    });
  } catch (error) {
    console.error("Error starting mock server:", formatError(error));
    res.status(500).json({ error: `Failed to start mock server: ${formatError(error)}` });
  }
});

// Stop mock server for session
router.post("/sessions/:sessionId/mock-server/stop", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.params.sessionId!;

    const session = await sessionService.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.userId !== req.user!.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await mockServerManager.spinDown(sessionId, req.takaroClient);

    res.json({ data: { status: "stopped" } });
  } catch (error) {
    console.error("Error stopping mock server:", formatError(error));
    res.status(500).json({ error: "Failed to stop mock server" });
  }
});

// Get mock server status
router.get("/sessions/:sessionId/mock-server/status", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.params.sessionId!;

    const session = await sessionService.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.userId !== req.user!.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const status = await mockServerManager.getStatus(sessionId);
    res.json({ data: status });
  } catch (error) {
    console.error("Error getting mock server status:", formatError(error));
    res.status(500).json({ error: "Failed to get mock server status" });
  }
});

// Execute mock server command
router.post(
  "/sessions/:sessionId/mock-server/command",
  validate(executeCommandSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessionId = req.params.sessionId!;
      const { command } = req.body;

      const session = await sessionService.get(sessionId);
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      if (session.userId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const result = await mockServerManager.sendCommand(sessionId, command);
      res.json({ data: { result } });
    } catch (error) {
      console.error("Error executing mock server command:", formatError(error));
      res.status(500).json({ error: `Failed to execute command: ${formatError(error)}` });
    }
  },
);

// Get players for session
router.get("/sessions/:sessionId/players", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.params.sessionId!;

    const session = await sessionService.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.userId !== req.user!.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Try to refresh players from Takaro if client available
    let players = await mockServerManager.getPlayers(sessionId);

    if (req.takaroClient && players.length === 0 && mockServerManager.isRunning(sessionId)) {
      players = await mockServerManager.refreshPlayers(sessionId, req.takaroClient);
    }

    res.json({
      data: {
        players,
        selectedPlayerId: session.selectedPlayerId,
      },
    });
  } catch (error) {
    console.error("Error getting players:", formatError(error));
    res.status(500).json({ error: "Failed to get players" });
  }
});

// Select player for testing
router.post(
  "/sessions/:sessionId/select-player",
  validate(selectPlayerSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessionId = req.params.sessionId!;
      const { playerId } = req.body;

      const session = await sessionService.get(sessionId);
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      if (session.userId !== req.user!.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      await sessionService.updateSelectedPlayer(sessionId, playerId || null);

      res.json({ data: { selectedPlayerId: playerId } });
    } catch (error) {
      console.error("Error selecting player:", formatError(error));
      res.status(500).json({ error: "Failed to select player" });
    }
  },
);

// SSE event stream
router.get("/sessions/:sessionId/events", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.params.sessionId!;

    const session = await sessionService.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.userId !== req.user!.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (!session.mockServerGameServerId) {
      res.status(400).json({ error: "Mock server not running" });
      return;
    }

    // Get auth cookies from request
    const authCookies = req.headers.cookie || "";

    // Get or create event relay for this user
    const relay = getEventRelay(config.takaroApiUrl, authCookies, req.user!.id);

    // Add this response as SSE client (pass takaroClient for historical events)
    await relay.addSSEClient(sessionId, res, session.mockServerGameServerId, req.takaroClient);

    // Keep connection open - the relay handles sending events
    // Connection will be closed when client disconnects
  } catch (error) {
    console.error("Error setting up event stream:", formatError(error));
    res.status(500).json({ error: "Failed to set up event stream" });
  }
});

export { router as cockpitRoutes };
