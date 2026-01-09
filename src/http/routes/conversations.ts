import { type Response, Router } from "express";
import { parseAgentId } from "../../agents/experiments.js";
import { agentRegistry } from "../../agents/registry.js";
import type { IAgent, StreamChunk, ToolContext } from "../../agents/types.js";
import { CockpitSessionService } from "../../cockpit/index.js";
import { config } from "../../config.js";
import { ConversationService } from "../../conversations/service.js";
import { generateTitle } from "../../conversations/title-generator.js";
import { CustomAgentService, createAgentFromCustom } from "../../custom-agents/index.js";
import { formatError, logError } from "../../utils/formatError.js";
import { validateUuidParam } from "../../utils/validateUuid.js";
import { type AuthenticatedRequest, authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createConversationSchema, sendMessageSchema } from "../schemas/conversations.js";

const router = Router();
const conversationService = new ConversationService();
const customAgentService = new CustomAgentService();
const cockpitSessionService = new CockpitSessionService();

// Apply auth middleware to all API routes
router.use(authMiddleware({ redirect: false }));

// List conversations
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversations = await conversationService.listByUserId(req.user!.id);
    res.json({ data: conversations });
  } catch (error) {
    logError("Error listing conversations:", error);
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

// Helper to build context with provider info
async function buildContext(
  req: AuthenticatedRequest,
  conversationId: string,
  agentId: string,
  agentVersion: string,
  state: Record<string, unknown>,
): Promise<ToolContext> {
  // Check if conversation has a cockpit session with active mock server
  const cockpitSession = await cockpitSessionService.getByConversation(conversationId);
  if (cockpitSession?.mockServerGameServerId && cockpitSession.mockServerStatus === "running") {
    // Inject mock server context for easy access by tools
    state.mockServerGameServerId = cockpitSession.mockServerGameServerId;
    if (cockpitSession.selectedPlayerId) {
      state.selectedPlayerId = cockpitSession.selectedPlayerId;
    }
  }

  return {
    conversationId,
    agentId,
    agentVersion,
    state,
    userId: req.user!.id,
    takaroClient: req.takaroClient,
    provider: "openrouter",
    openrouterApiKey: config.openrouterApiKey,
  };
}

// Create conversation
router.post("/", validate(createConversationSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentId, agentVersion } = req.body;

    // Check if this is a custom agent
    if (agentId.startsWith("custom:")) {
      const customId = agentId.replace("custom:", "");
      const customAgent = await customAgentService.get(customId, req.user!.id);

      if (!customAgent) {
        res.status(400).json({ error: `Custom agent not found: ${customId}` });
        return;
      }

      const conversation = await conversationService.create({
        agentId: `custom:${customAgent.id}`,
        agentVersion: "1",
        userId: req.user!.id,
        provider: "openrouter",
      });

      res.json({ data: conversation });
      return;
    }

    // Support compound IDs (module-writer/grok-fast) or separate agentId + agentVersion
    // If agentVersion provided separately, append it to agentId for resolution
    const fullAgentId = agentVersion ? `${agentId}/${agentVersion}` : agentId;

    const resolved = agentRegistry.resolve(fullAgentId);
    if (!resolved) {
      const available = agentRegistry.listAgents().join(", ");
      res.status(400).json({
        error: `Unknown agent: ${fullAgentId}. Available: ${available}`,
      });
      return;
    }

    const { factory, experimentOrVersion } = resolved;

    // Store base agent ID and experiment/version separately
    const conversation = await conversationService.create({
      agentId: factory.agentId,
      agentVersion: experimentOrVersion,
      userId: req.user!.id,
      provider: "openrouter",
    });

    res.json({ data: conversation });
  } catch (error) {
    logError("Error creating conversation:", error);
    const message = error instanceof Error ? error.message : "Failed to create conversation";
    res.status(500).json({ error: message });
  }
});

// Get conversation
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validationError = validateUuidParam("conversation ID", req.params.id!);
    if (validationError) {
      res.status(400).json(validationError);
      return;
    }

    const conversation = await conversationService.get(req.params.id!);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Check ownership
    if (conversation.userId !== req.user!.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    res.json({ data: conversation });
  } catch (error) {
    logError("Error getting conversation:", error);
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

// Delete conversation
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validationError = validateUuidParam("conversation ID", req.params.id!);
    if (validationError) {
      res.status(400).json(validationError);
      return;
    }

    const conversation = await conversationService.get(req.params.id!);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Check ownership
    if (conversation.userId !== req.user!.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await conversationService.delete(req.params.id!);
    res.json({ success: true });
  } catch (error) {
    logError("Error deleting conversation:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// Get messages
router.get("/:id/messages", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validationError = validateUuidParam("conversation ID", req.params.id!);
    if (validationError) {
      res.status(400).json(validationError);
      return;
    }

    const conversation = await conversationService.get(req.params.id!);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Check ownership
    if (conversation.userId !== req.user!.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const messages = await conversationService.getMessages(req.params.id!);
    res.json({ data: messages });
  } catch (error) {
    logError("Error getting messages:", error);
    res.status(500).json({ error: "Failed to get messages" });
  }
});

// Send message (SSE streaming response)
router.post("/:id/messages", validate(sendMessageSchema), async (req: AuthenticatedRequest, res: Response) => {
  const conversationId = req.params.id!;
  const { content } = req.body;

  const validationError = validateUuidParam("conversation ID", conversationId);
  if (validationError) {
    res.status(400).json(validationError);
    return;
  }

  let sseStarted = false;

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const conversation = await conversationService.get(conversationId);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Check ownership
    if (conversation.userId !== req.user!.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Resolve agent - either built-in or custom
    let agent: IAgent;

    if (conversation.agentId.startsWith("custom:")) {
      const customId = conversation.agentId.replace("custom:", "");
      const customAgent = await customAgentService.get(customId, req.user!.id);

      if (!customAgent) {
        res.status(500).json({ error: "Custom agent not found" });
        return;
      }

      agent = createAgentFromCustom(customAgent);
    } else {
      const factory = agentRegistry.getFactory(conversation.agentId);
      if (!factory) {
        res.status(500).json({ error: "Agent not found" });
        return;
      }
      agent = factory.createAgent(conversation.agentVersion);
    }

    // Store user message
    await conversationService.addMessage(conversationId, {
      role: "user",
      content,
    });

    // Set up SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    sseStarted = true;

    // Process with agent
    const messages = await conversationService.getMessages(conversationId);
    const context = await buildContext(
      req,
      conversationId,
      conversation.agentId,
      conversation.agentVersion,
      conversation.state || {},
    );

    const onChunk = (chunk: StreamChunk) => {
      sendEvent(chunk.type, chunk);
    };

    const startTime = Date.now();
    const response = await agent.chat(messages, context, onChunk);
    const latencyMs = Date.now() - startTime;

    // Store assistant response
    for (const msg of response.messages) {
      await conversationService.addMessage(conversationId, msg, {
        tokenCount: msg.role === "assistant" ? response.usage.outputTokens : response.usage.inputTokens,
        latencyMs,
      });
    }

    // Update conversation state
    await conversationService.updateState(conversationId, context.state);

    // Generate title for first exchange (fire and forget)
    if (!conversation.title) {
      const userMsg = messages.find((m) => m.role === "user")?.content || "";
      const assistantMsg = response.messages.find((m) => m.role === "assistant")?.content || "";

      if (context.openrouterApiKey) {
        generateTitle(userMsg, assistantMsg, context.openrouterApiKey)
          .then((title) => conversationService.updateTitle(conversationId, title))
          .catch((err) => console.error("Title generation failed:", formatError(err)));
      }
    }

    res.end();
  } catch (error) {
    logError("Error processing message:", error);
    const message = error instanceof Error ? error.message : "Failed to process message";

    if (sseStarted) {
      // Send error through SSE
      sendEvent("error", { error: message });
      res.end();
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// Get conversations by agent
router.get("/by-agent/:agentId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { base, experiment } = parseAgentId(req.params.agentId!);
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 5, 20);

    const conversations = await conversationService.listByAgent(req.user!.id, base, experiment || "default", limit);

    res.json({ data: conversations });
  } catch (error) {
    logError("Error listing conversations by agent:", error);
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

export { router as conversationRoutes };
