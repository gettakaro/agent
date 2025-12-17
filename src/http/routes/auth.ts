import { type Response, Router } from "express";
import { ApiKeyService } from "../../auth/api-key.service.js";
import { type AuthenticatedRequest, authMiddleware } from "../middleware/auth.js";

const router = Router();
const apiKeyService = new ApiKeyService();

// Save OpenRouter API key
router.post("/openrouter", authMiddleware({ redirect: false }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== "string") {
      res.status(400).json({ error: "apiKey is required" });
      return;
    }

    await apiKeyService.saveApiKey(req.user!.id, "openrouter", apiKey);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to save OpenRouter key:", error);
    res.status(500).json({ error: "Failed to save API key" });
  }
});

// Delete OpenRouter API key
router.delete("/openrouter", authMiddleware({ redirect: false }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await apiKeyService.deleteApiKey(req.user!.id, "openrouter");
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete OpenRouter key:", error);
    res.status(500).json({ error: "Failed to delete API key" });
  }
});

// Check provider connection status
router.get("/status", authMiddleware({ redirect: false }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const hasOpenRouter = await apiKeyService.hasApiKey(req.user!.id, "openrouter");

    res.json({
      providers: {
        openrouter: { connected: hasOpenRouter },
      },
      hasAnyProvider: hasOpenRouter,
    });
  } catch (error) {
    console.error("Failed to check auth status:", error);
    res.status(500).json({ error: "Failed to check auth status" });
  }
});

export default router;
