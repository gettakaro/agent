import type { Client } from "@takaro/apiclient";
import type { NextFunction, Request, Response } from "express";
import { config } from "../../config.js";
import { createUserClient, getServiceClient, isServiceMode } from "../../takaro/client.js";
import { formatError } from "../../utils/formatError.js";

export interface TakaroUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TakaroUser;
  takaroClient?: Client;
}

function isApiRoute(req: Request): boolean {
  return req.path.startsWith("/api/");
}

export function authMiddleware(options: { redirect?: boolean } = {}) {
  const shouldRedirect = options.redirect ?? true;

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Skip if user already set (e.g., by test middleware)
    if (req.user && req.takaroClient) {
      return next();
    }

    // Service account mode (dev/testing with username/password)
    if (isServiceMode()) {
      const client = getServiceClient()!;
      try {
        const me = await client.user.userControllerMe();
        const user = me.data.data.user;
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
        };
        req.takaroClient = client;
        return next();
      } catch (error) {
        console.error("Service account auth failed:", formatError(error));
        return res.status(500).json({ error: "Service account auth failed" });
      }
    }

    // Cookie-based auth (production)
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      if (shouldRedirect && !isApiRoute(req)) {
        return res.redirect(config.takaroLoginUrl);
      }
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const client = createUserClient(cookieHeader);
      const me = await client.user.userControllerMe();
      const user = me.data.data.user;
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
      };
      req.takaroClient = client;
      next();
    } catch (error) {
      console.error("Cookie auth failed:", formatError(error));
      if (shouldRedirect && !isApiRoute(req)) {
        return res.redirect(config.takaroLoginUrl);
      }
      return res.status(401).json({ error: "Not authenticated" });
    }
  };
}
