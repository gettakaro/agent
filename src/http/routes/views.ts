import { type Response, Router } from "express";
import { parseAgentId } from "../../agents/experiments.js";
import { agentRegistry } from "../../agents/registry.js";
import { ApiKeyService } from "../../auth/api-key.service.js";
import { ConversationService } from "../../conversations/service.js";
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

// Apply auth middleware to all routes
router.use(authMiddleware({ redirect: true }));

// Home - Conversations view
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const conversations = await conversationService.listByUserId(req.user!.id);
  const experiments = getExperimentInfo();
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
    selectedConversation,
    messages,
    user: req.user,
    hasOpenRouter,
  });
});

// Agents list
router.get("/agents", async (req: AuthenticatedRequest, res: Response) => {
  const experiments = getEnhancedExperimentInfo();
  const groupedAgents = groupAgentsByType(experiments);
  const selectedId = req.query.id as string | undefined;
  const hasOpenRouter = await apiKeyService.hasApiKey(req.user!.id, "openrouter");

  // Find selected agent
  const selectedAgent = selectedId ? experiments.find((e) => e.id === selectedId) : null;

  // Fetch recent conversations for selected agent
  let recentConversations: Awaited<ReturnType<typeof conversationService.listByAgent>> = [];
  if (selectedAgent) {
    recentConversations = await conversationService.listByAgent(
      req.user!.id,
      selectedAgent.type,
      selectedAgent.experiment,
      5,
    );
  }

  res.render("agents", {
    title: "Agents",
    experiments,
    groupedAgents,
    selectedAgent,
    recentConversations,
    user: req.user,
    hasOpenRouter,
  });
});

// Redirect old conversation URLs to root
router.get("/conversations/:id", async (req: AuthenticatedRequest, res: Response) => {
  res.redirect(`/?id=${req.params.id}`);
});

// Redirect /conversations to root
router.get("/conversations", async (_req: AuthenticatedRequest, res: Response) => {
  res.redirect("/");
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
