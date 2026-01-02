import { type Request, type Response, Router } from "express";
import { generateOpenAPIDocument } from "../openapi/registry.js";

const router = Router();

router.get("/openapi.json", (_req: Request, res: Response) => {
  res.json(generateOpenAPIDocument());
});

export const openAPIRoutes = router;
