import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

/**
 * Express middleware that validates request body against a Zod schema.
 * Returns 400 with validation details if validation fails.
 */
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

    // Replace body with parsed data (applies transformations)
    req.body = result.data;
    next();
  };
}
