import { type Response, Router } from "express";
import { parseAgentId } from "../../agents/experiments.js";
import { agentRegistry } from "../../agents/registry.js";
import { CustomAgentService } from "../../custom-agents/index.js";
import { type AuthenticatedRequest, authMiddleware } from "../middleware/auth.js";

const router = Router();
const customAgentService = new CustomAgentService();

router.use(authMiddleware({ redirect: false }));

// List all agents (builtin + custom)
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get builtin agents from registry
    const builtinAgents = agentRegistry.listAgents().map((compoundId) => {
      const { base, experiment } = parseAgentId(compoundId);
      const resolved = agentRegistry.resolve(compoundId);
      const agent = resolved?.factory.createAgent(resolved.experimentOrVersion);
      const config = agent?.config;

      return {
        id: compoundId,
        name: base.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        type: base,
        experiment: experiment || "default",
        model: config?.model || "unknown",
        description: config?.description || "No description available",
      };
    });

    // Get custom agents
    const customAgents = await customAgentService.listByUser(req.user!.id);

    res.json({
      data: {
        builtin: builtinAgents,
        custom: customAgents,
      },
    });
  } catch (err) {
    console.error("Failed to list agents:", err);
    res.status(500).json({ error: "Failed to list agents" });
  }
});

export default router;
