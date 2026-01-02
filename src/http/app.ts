import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { config } from "../config.js";
import { formatError } from "../utils/formatError.js";
import agentRoutes from "./routes/agents.js";
import authRoutes from "./routes/auth.js";
import { cockpitRoutes } from "./routes/cockpit.js";
import { conversationRoutes } from "./routes/conversations.js";
import { customAgentRoutes } from "./routes/custom-agents.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { openAPIRoutes } from "./routes/openapi.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(): Express {
  const app = express();

  // Check if client build exists (production only)
  const clientPath = path.join(__dirname, "../client");
  const clientExists = fs.existsSync(clientPath);

  // Serve React static files only if client build exists
  if (clientExists) {
    app.use(express.static(clientPath));
  }

  // CORS configuration
  app.use(
    cors({
      credentials: true,
      origin: (origin, callback) => {
        // Allow requests with no origin (same-origin, curl, etc)
        if (!origin) return callback(null, true);
        // Allow if in whitelist or no whitelist configured
        if (config.corsOrigins.length === 0 || config.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        console.warn(`Origin ${origin} not allowed by CORS`);
        callback(new Error("Not allowed by CORS"));
      },
    }),
  );
  app.use(cookieParser());
  app.use(express.json());

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // API routes
  app.use("/auth", authRoutes);
  app.use("/api/agents", agentRoutes);
  app.use("/api/conversations", conversationRoutes);
  app.use("/api/custom-agents", customAgentRoutes);
  app.use("/api/knowledge-bases", knowledgeRoutes);
  app.use("/api/cockpit", cockpitRoutes);
  app.use("/api", openAPIRoutes);

  // SPA fallback - serve index.html for non-API routes (production only)
  if (clientExists) {
    app.get("*", (req: Request, res: Response, next: NextFunction) => {
      // Skip API and auth routes (they should 404 normally)
      if (req.path.startsWith("/api") || req.path.startsWith("/auth") || req.path === "/health") {
        return next();
      }
      res.sendFile(path.join(clientPath, "index.html"));
    });
  }

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", formatError(err));
    res.status(500).json({
      error: err.message || "Internal server error",
    });
  });

  return app;
}
