import { type Response, Router } from "express";
import { getAvailableTools, isValidToolName } from "../../agents/tools/registry.js";
import { CustomAgentService } from "../../custom-agents/service.js";
import { knowledgeRegistry } from "../../knowledge/registry.js";
import { formatError } from "../../utils/formatError.js";
import { type AuthenticatedRequest, authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createCustomAgentSchema, updateCustomAgentSchema } from "../schemas/custom-agents.js";

const router = Router();
const customAgentService = new CustomAgentService();

router.use(authMiddleware({ redirect: false }));

// List available tools for selection
router.get("/tools", (_req: AuthenticatedRequest, res: Response) => {
  const tools = getAvailableTools();
  res.json({ data: tools });
});

// List available models
router.get("/models", (_req: AuthenticatedRequest, res: Response) => {
  const models = [
    { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast", provider: "xAI" },
    { id: "openai/gpt-4.1-nano", name: "GPT-4.1 Nano", provider: "OpenAI" },
    { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic" },
    { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", provider: "Anthropic" },
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google" },
  ];
  res.json({ data: models });
});

// List available knowledge bases
router.get("/knowledge-bases", (_req: AuthenticatedRequest, res: Response) => {
  const kbTypes = knowledgeRegistry.listKnowledgeBaseTypes();
  const kbs = kbTypes.map((id) => {
    const factory = knowledgeRegistry.getFactory(id);
    const kb = factory?.createKnowledgeBase(factory.getDefaultVersion());
    return {
      id,
      name: kb?.name || id,
      description: kb?.description || "",
    };
  });
  res.json({ data: kbs });
});

// List user's custom agents
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agents = await customAgentService.listByUser(req.user!.id);
    res.json({ data: agents });
  } catch (error) {
    console.error("Error listing custom agents:", formatError(error));
    res.status(500).json({ error: "Failed to list custom agents" });
  }
});

// Get single custom agent
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agent = await customAgentService.get(req.params.id!, req.user!.id);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json({ data: agent });
  } catch (error) {
    console.error("Error getting custom agent:", formatError(error));
    res.status(500).json({ error: "Failed to get custom agent" });
  }
});

// Create custom agent
router.post("/", validate(createCustomAgentSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, systemPrompt, tools, knowledgeBases, model, temperature, maxTokens } = req.body;

    // Validate tool names against registry
    const invalidTools = tools.filter((t: string) => !isValidToolName(t));
    if (invalidTools.length > 0) {
      res.status(400).json({ error: `Invalid tools: ${invalidTools.join(", ")}` });
      return;
    }

    // Validate KB IDs against registry
    const kbs = knowledgeBases || [];
    const invalidKbs = kbs.filter((k: string) => !knowledgeRegistry.getFactory(k));
    if (invalidKbs.length > 0) {
      res.status(400).json({ error: `Invalid knowledge bases: ${invalidKbs.join(", ")}` });
      return;
    }

    const agent = await customAgentService.create(req.user!.id, {
      name,
      description,
      systemPrompt,
      tools,
      knowledgeBases: kbs,
      model,
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 8192,
    });

    res.status(201).json({ data: agent });
  } catch (error) {
    console.error("Error creating custom agent:", formatError(error));
    const message = error instanceof Error ? error.message : "Failed to create custom agent";
    if (message.includes("unique") || message.includes("duplicate")) {
      res.status(409).json({ error: "An agent with this name already exists" });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// Update custom agent
router.put("/:id", validate(updateCustomAgentSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, systemPrompt, tools, knowledgeBases, model, temperature, maxTokens } = req.body;

    // Validate tool names against registry if provided
    if (tools !== undefined) {
      const invalidTools = tools.filter((t: string) => !isValidToolName(t));
      if (invalidTools.length > 0) {
        res.status(400).json({ error: `Invalid tools: ${invalidTools.join(", ")}` });
        return;
      }
    }

    // Validate KB IDs against registry if provided
    if (knowledgeBases !== undefined) {
      const invalidKbs = knowledgeBases.filter((k: string) => !knowledgeRegistry.getFactory(k));
      if (invalidKbs.length > 0) {
        res.status(400).json({ error: `Invalid knowledge bases: ${invalidKbs.join(", ")}` });
        return;
      }
    }

    const agent = await customAgentService.update(req.params.id!, req.user!.id, {
      name,
      description,
      systemPrompt,
      tools,
      knowledgeBases,
      model,
      temperature,
      maxTokens,
    });

    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    res.json({ data: agent });
  } catch (error) {
    console.error("Error updating custom agent:", formatError(error));
    res.status(500).json({ error: "Failed to update custom agent" });
  }
});

// Delete custom agent
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await customAgentService.delete(req.params.id!, req.user!.id);
    if (!deleted) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting custom agent:", formatError(error));
    res.status(500).json({ error: "Failed to delete custom agent" });
  }
});

export { router as customAgentRoutes };
