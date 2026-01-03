import { z } from "zod";

export const executeCommandSchema = z.object({
  command: z.string().min(1, "command is required"),
});

export type ExecuteCommandInput = z.infer<typeof executeCommandSchema>;

export const selectPlayerSchema = z.object({
  playerId: z.string().nullable().optional(),
});

export type SelectPlayerInput = z.infer<typeof selectPlayerSchema>;
