import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { config } from "../config.js";
import { formatError } from "../utils/formatError.js";
import authRoutes from "./routes/auth.js";
import { conversationRoutes } from "./routes/conversations.js";
import { customAgentRoutes } from "./routes/custom-agents.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { viewRoutes } from "./routes/views.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(): Express {
  const app = express();

  // View engine setup
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "../views"));

  // Static files
  app.use("/public", express.static(path.join(__dirname, "../public")));

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

  // View routes (HTML pages)
  app.use("/", viewRoutes);

  // API routes
  app.use("/auth", authRoutes);
  app.use("/api/conversations", conversationRoutes);
  app.use("/api/custom-agents", customAgentRoutes);
  app.use("/api/knowledge-bases", knowledgeRoutes);

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", formatError(err));
    res.status(500).json({
      error: err.message || "Internal server error",
    });
  });

  return app;
}
