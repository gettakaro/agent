import { type Response, Router } from "express";
import { type AuthenticatedRequest, authMiddleware } from "../middleware/auth.js";

const router = Router();

// Get current user info
router.get("/me", authMiddleware({ redirect: false }), async (req: AuthenticatedRequest, res: Response) => {
  res.json({ data: req.user });
});

export default router;
