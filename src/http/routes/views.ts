import { type Response, Router } from "express";
import { parseAgentId } from "../../agents/experiments.js";
import { agentRegistry } from "../../agents/registry.js";
import { getAvailableTools } from "../../agents/tools/registry.js";
import { ApiKeyService } from "../../auth/api-key.service.js";
import { CockpitSessionService } from "../../cockpit/index.js";
import { ConversationService } from "../../conversations/service.js";
import { type CustomAgent, CustomAgentService } from "../../custom-agents/index.js";
import { getDocumentCount, getLastCommitSha, getLastSyncTime, knowledgeRegistry } from "../../knowledge/index.js";
import { type AuthenticatedRequest, authMiddleware } from "../middleware/auth.js";

// Types for enhanced agent info
interface ToolInfo {
  name: string;
  description: string;
}

interface AgentExperimentInfo {
  id: string;
  type: string;
  experiment: string;
  model: string;
  description: string;
  temperature?: number;
  maxTokens?: number;
  systemPromptPreview: string;
  systemPromptFull: string;
  tools: ToolInfo[];
  knowledgeBases: string[];
  toolCount: number;
}

interface GroupedAgents {
  type: string;
  experiments: AgentExperimentInfo[];
}

// Helper to get basic experiment info for templates (used by chat page)
function getExperimentInfo() {
  return agentRegistry.listAgents().map((compoundId) => {
    const { base, experiment } = parseAgentId(compoundId);
    const resolved = agentRegistry.resolve(compoundId);
    const model = resolved?.factory.createAgent(resolved.experimentOrVersion).config.model;
    return {
      id: compoundId,
      type: base,
      experiment: experiment || "default",
      model: model || "unknown",
    };
  });
}

// Helper to detect KB usage from experiment name
function detectKnowledgeBases(experiment: string): string[] {
  if (experiment === "with-docs") {
    return ["takaro-docs"];
  }
  return [];
}

// Helper to find agents using a knowledge base
function getAgentsUsingKnowledgeBase(kbId: string): string[] {
  const agents: string[] = [];
  for (const agentId of agentRegistry.listAgents()) {
    const { experiment } = parseAgentId(agentId);
    // Currently: "with-docs" experiment uses "takaro-docs"
    if (kbId === "takaro-docs" && experiment === "with-docs") {
      agents.push(agentId);
    }
  }
  return agents;
}

// Types for knowledge base info
interface KnowledgeBaseInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  documentCount: number;
  lastCommitSha: string | null;
  lastSyncedAt: string | null;
  refreshSchedule: string | null;
  source: string | null;
  extensions: string[];
  chunkSize: number;
  chunkOverlap: number;
}

// Helper to get enhanced experiment info for agents page
function getEnhancedExperimentInfo(): AgentExperimentInfo[] {
  return agentRegistry.listAgents().map((compoundId) => {
    const { base, experiment } = parseAgentId(compoundId);
    const resolved = agentRegistry.resolve(compoundId);
    const agent = resolved?.factory.createAgent(resolved.experimentOrVersion);
    const config = agent?.config;

    const systemPrompt = config?.systemPrompt || "";
    const expName = experiment || "default";

    return {
      id: compoundId,
      type: base,
      experiment: expName,
      model: config?.model || "unknown",
      description: config?.description || "No description available",
      temperature: config?.temperature,
      maxTokens: config?.maxTokens,
      systemPromptPreview: systemPrompt.substring(0, 500) + (systemPrompt.length > 500 ? "..." : ""),
      systemPromptFull: systemPrompt,
      tools: (config?.tools || []).map((t) => ({
        name: t.name,
        description: t.description,
      })),
      knowledgeBases: detectKnowledgeBases(expName),
      toolCount: config?.tools?.length || 0,
    };
  });
}

// Group experiments by agent type
function groupAgentsByType(experiments: AgentExperimentInfo[]): GroupedAgents[] {
  const groups = new Map<string, AgentExperimentInfo[]>();

  for (const exp of experiments) {
    const existing = groups.get(exp.type) || [];
    existing.push(exp);
    groups.set(exp.type, existing);
  }

  return Array.from(groups.entries()).map(([type, experiments]) => ({
    type,
    experiments,
  }));
}

const router = Router();
const conversationService = new ConversationService();
const apiKeyService = new ApiKeyService();
const customAgentService = new CustomAgentService();
const cockpitSessionService = new CockpitSessionService();

// Available models for custom agents
const availableModels = [
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast", provider: "xAI" },
  { id: "openai/gpt-4.1-nano", name: "GPT-4.1 Nano", provider: "OpenAI" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", provider: "Anthropic" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google" },
];

// Apply auth middleware to all routes
router.use(authMiddleware({ redirect: true }));

// Redirect root to /conversations
router.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  res.redirect("/conversations");
});

// Helper to get available knowledge bases for custom agent editor
function getAvailableKnowledgeBases() {
  return knowledgeRegistry.listKnowledgeBaseTypes().map((id) => {
    const factory = knowledgeRegistry.getFactory(id);
    const kb = factory?.createKnowledgeBase(factory.getDefaultVersion());
    return {
      id,
      name: kb?.name || id,
      description: kb?.description || "",
    };
  });
}

// Agents list
router.get("/agents", async (req: AuthenticatedRequest, res: Response) => {
  const experiments = getEnhancedExperimentInfo();
  const groupedAgents = groupAgentsByType(experiments);
  const customAgents = await customAgentService.listByUser(req.user!.id);
  const availableTools = getAvailableTools();
  const availableKbs = getAvailableKnowledgeBases();
  const selectedId = req.query.id as string | undefined;
  const tab = (req.query.tab as string) || "builtin";
  const editMode = req.query.edit === "true";
  const hasOpenRouter = await apiKeyService.hasApiKey(req.user!.id, "openrouter");

  // Find selected agent (built-in or custom)
  let selectedAgent: AgentExperimentInfo | null = null;
  let selectedCustomAgent: CustomAgent | null = null;
  let recentConversations: Awaited<ReturnType<typeof conversationService.listByAgent>> = [];

  if (selectedId) {
    if (selectedId.startsWith("custom:")) {
      const customId = selectedId.replace("custom:", "");
      selectedCustomAgent = customAgents.find((a) => a.id === customId) || null;
      if (selectedCustomAgent) {
        recentConversations = await conversationService.listByAgent(
          req.user!.id,
          `custom:${selectedCustomAgent.id}`,
          "1",
          5,
        );
      }
    } else {
      selectedAgent = experiments.find((e) => e.id === selectedId) || null;
      if (selectedAgent) {
        recentConversations = await conversationService.listByAgent(
          req.user!.id,
          selectedAgent.type,
          selectedAgent.experiment,
          5,
        );
      }
    }
  }

  res.render("agents", {
    title: "Agents",
    experiments,
    groupedAgents,
    customAgents,
    availableTools,
    availableModels,
    availableKbs,
    selectedAgent,
    selectedCustomAgent,
    recentConversations,
    tab,
    editMode,
    user: req.user,
    hasOpenRouter,
  });
});

// Conversations view (canonical URL)
router.get("/conversations", async (req: AuthenticatedRequest, res: Response) => {
  const conversations = await conversationService.listByUserId(req.user!.id);
  const experiments = getExperimentInfo();
  const customAgents = await customAgentService.listByUser(req.user!.id);
  const selectedId = req.query.id as string | undefined;
  const hasOpenRouter = await apiKeyService.hasApiKey(req.user!.id, "openrouter");

  let selectedConversation = null;
  let messages: Awaited<ReturnType<typeof conversationService.getMessages>> = [];

  if (selectedId) {
    selectedConversation = await conversationService.get(selectedId);
    if (selectedConversation && selectedConversation.userId === req.user!.id) {
      messages = await conversationService.getMessages(selectedId);
    } else {
      selectedConversation = null;
    }
  }

  res.render("chat", {
    title: selectedConversation ? `Chat - ${selectedConversation.agentId}` : "Conversations",
    conversations,
    experiments,
    customAgents,
    selectedConversation,
    messages,
    user: req.user,
    hasOpenRouter,
  });
});

// Redirect old /conversations/:id URLs to canonical format
router.get("/conversations/:id", async (req: AuthenticatedRequest, res: Response) => {
  res.redirect(`/conversations?id=${req.params.id}`);
});

// New conversation form
router.get("/new", async (req: AuthenticatedRequest, res: Response) => {
  const experiments = getExperimentInfo();
  const hasOpenRouter = await apiKeyService.hasApiKey(req.user!.id, "openrouter");

  res.render("new", {
    title: "New Conversation",
    experiments,
    user: req.user,
    hasOpenRouter,
  });
});

// Settings page
router.get("/settings", async (req: AuthenticatedRequest, res: Response) => {
  const hasOpenRouter = await apiKeyService.hasApiKey(req.user!.id, "openrouter");

  res.render("settings", {
    title: "Settings",
    providers: {
      openrouter: { connected: hasOpenRouter },
    },
    user: req.user,
    hasOpenRouter,
  });
});

// Cockpit - Module Writer with mock server and event stream
router.get("/cockpit/:conversationId", async (req: AuthenticatedRequest, res: Response) => {
  const conversationId = req.params.conversationId!;
  const hasOpenRouter = await apiKeyService.hasApiKey(req.user!.id, "openrouter");

  // Verify conversation exists and belongs to user
  const conversation = await conversationService.get(conversationId);
  if (!conversation) {
    return res.redirect("/conversations");
  }

  if (conversation.userId !== req.user!.id) {
    return res.redirect("/conversations");
  }

  // Get or create cockpit session
  const session = await cockpitSessionService.getOrCreate(conversationId, req.user!.id);

  // Get messages for the conversation
  const messages = await conversationService.getMessages(conversationId);

  res.render("cockpit", {
    title: "Module Writer Cockpit",
    conversation,
    session,
    messages,
    user: req.user,
    hasOpenRouter,
  });
});

// Knowledge bases page
router.get("/knowledge", async (req: AuthenticatedRequest, res: Response) => {
  const kbIds = knowledgeRegistry.listKnowledgeBaseTypes();
  const hasOpenRouter = await apiKeyService.hasApiKey(req.user!.id, "openrouter");
  const knowledgeBases: KnowledgeBaseInfo[] = (
    await Promise.all(
      kbIds.map(async (kbId) => {
        const factory = knowledgeRegistry.getFactory(kbId);
        if (!factory) return null;

        const version = factory.getDefaultVersion();
        const kb = factory.createKnowledgeBase(version);
        const ingestionConfig = factory.getIngestionConfig?.();
        const [documentCount, lastCommitSha, lastSyncedAt] = await Promise.all([
          getDocumentCount(kbId, version),
          getLastCommitSha(kbId),
          getLastSyncTime(kbId),
        ]);

        return {
          id: kbId,
          name: kb.name,
          description: kb.description,
          version,
          documentCount,
          lastCommitSha: lastCommitSha || null,
          lastSyncedAt: lastSyncedAt?.toISOString() || null,
          refreshSchedule: ingestionConfig?.refreshSchedule || null,
          source: ingestionConfig?.source || null,
          extensions: ingestionConfig?.extensions || [],
          chunkSize: ingestionConfig?.chunkSize || 1000,
          chunkOverlap: ingestionConfig?.chunkOverlap || 200,
        };
      }),
    )
  ).filter((kb): kb is KnowledgeBaseInfo => kb !== null);

  const selectedId = req.query.id as string | undefined;
  const selectedKb = selectedId ? knowledgeBases.find((kb) => kb.id === selectedId) : null;

  let agentUsage: string[] = [];
  if (selectedKb) {
    agentUsage = getAgentsUsingKnowledgeBase(selectedKb.id);
  }

  res.render("knowledge", {
    title: "Knowledge Bases",
    knowledgeBases,
    selectedKb,
    agentUsage,
    user: req.user,
    hasOpenRouter,
  });
});

export { router as viewRoutes };
