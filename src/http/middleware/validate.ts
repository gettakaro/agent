import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

export function validate<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      res.status(400).json({
        error: "Validation failed",
        details: fieldErrors,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}

export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      res.status(400).json({
        error: "Validation failed",
        details: fieldErrors,
      });
      return;
    }

    req.query = result.data;
    next();
  };
}
