import { type Response, Router } from "express";
import { parseAgentId } from "../../agents/experiments.js";
import { agentRegistry } from "../../agents/registry.js";
import type { StreamChunk, ToolContext } from "../../agents/types.js";
import { ApiKeyService } from "../../auth/api-key.service.js";
import { ConversationService } from "../../conversations/service.js";
import { generateTitle } from "../../conversations/title-generator.js";
import { formatError } from "../../utils/formatError.js";
import { type AuthenticatedRequest, authMiddleware } from "../middleware/auth.js";

const router = Router();
const conversationService = new ConversationService();
const apiKeyService = new ApiKeyService();

// Apply auth middleware to all API routes
router.use(authMiddleware({ redirect: false }));

// List conversations
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversations = await conversationService.listByUserId(req.user!.id);
    res.json({ data: conversations });
  } catch (error) {
    console.error("Error listing conversations:", formatError(error));
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
  const apiKey = await apiKeyService.getApiKey(req.user!.id, "openrouter");

  return {
    conversationId,
    agentId,
    agentVersion,
    state,
    userId: req.user!.id,
    takaroClient: req.takaroClient,
    provider: "openrouter",
    openrouterApiKey: apiKey || undefined,
  };
}

// Create conversation
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentId, agentVersion, initialMessage } = req.body;

    if (!agentId) {
      res.status(400).json({ error: "agentId is required" });
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

    // Check user has OpenRouter configured
    const hasOpenRouter = await apiKeyService.hasApiKey(req.user!.id, "openrouter");
    if (!hasOpenRouter) {
      res.status(400).json({
        error: "No API credentials configured. Please add your OpenRouter key in settings.",
        code: "NO_CREDENTIALS",
      });
      return;
    }

    // Store base agent ID and experiment/version separately
    const conversation = await conversationService.create({
      agentId: factory.agentId,
      agentVersion: experimentOrVersion,
      userId: req.user!.id,
      provider: "openrouter",
    });

    // If initial message provided, process it
    if (initialMessage) {
      await conversationService.addMessage(conversation.id, {
        role: "user",
        content: initialMessage,
      });

      // Process with agent (non-streaming for initial message)
      const agent = factory.createAgent(experimentOrVersion);
      const messages = await conversationService.getMessages(conversation.id);
      const context = await buildContext(
        req,
        conversation.id,
        factory.agentId,
        experimentOrVersion,
        conversation.state || {},
      );

      const response = await agent.chat(messages, context);

      // Store assistant response
      for (const msg of response.messages) {
        await conversationService.addMessage(conversation.id, msg, {
          tokenCount: msg.role === "assistant" ? response.usage.outputTokens : response.usage.inputTokens,
          latencyMs: response.latencyMs,
        });
      }

      // Update conversation state
      await conversationService.updateState(conversation.id, context.state);

      // Generate title for first exchange (fire and forget)
      if (context.openrouterApiKey) {
        const assistantMsg = response.messages.find((m) => m.role === "assistant")?.content || "";

        generateTitle(initialMessage, assistantMsg, context.openrouterApiKey)
          .then((title) => conversationService.updateTitle(conversation.id, title))
          .catch((err) => console.error("Title generation failed:", formatError(err)));
      }

      const updatedConversation = await conversationService.get(conversation.id);
      const allMessages = await conversationService.getMessages(conversation.id);

      res.json({
        data: updatedConversation,
        messages: allMessages,
      });
      return;
    }

    res.json({ data: conversation });
  } catch (error) {
    console.error("Error creating conversation:", formatError(error));
    const message = error instanceof Error ? error.message : "Failed to create conversation";
    res.status(500).json({ error: message });
  }
});

// Get conversation
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
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
    console.error("Error getting conversation:", formatError(error));
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

// Delete conversation
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
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
    console.error("Error deleting conversation:", formatError(error));
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// Get messages
router.get("/:id/messages", async (req: AuthenticatedRequest, res: Response) => {
  try {
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
    console.error("Error getting messages:", formatError(error));
    res.status(500).json({ error: "Failed to get messages" });
  }
});

// Send message (SSE streaming response)
router.post("/:id/messages", async (req: AuthenticatedRequest, res: Response) => {
  const conversationId = req.params.id!;
  const { content } = req.body;

  if (!content) {
    res.status(400).json({ error: "content is required" });
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

    const factory = agentRegistry.getFactory(conversation.agentId);
    if (!factory) {
      res.status(500).json({ error: "Agent not found" });
      return;
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
    const agent = factory.createAgent(conversation.agentVersion);
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
    if (!conversation.title && context.openrouterApiKey) {
      const userMsg = messages.find((m) => m.role === "user")?.content || "";
      const assistantMsg = response.messages.find((m) => m.role === "assistant")?.content || "";

      generateTitle(userMsg, assistantMsg, context.openrouterApiKey)
        .then((title) => conversationService.updateTitle(conversationId, title))
        .catch((err) => console.error("Title generation failed:", formatError(err)));
    }

    res.end();
  } catch (error) {
    console.error("Error processing message:", formatError(error));
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
    console.error("Error listing conversations by agent:", formatError(error));
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

export { router as conversationRoutes };
