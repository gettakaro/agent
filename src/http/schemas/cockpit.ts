import { registry, z } from "../openapi/registry.js";

export const executeCommandSchema = registry.register(
  "ExecuteCommand",
  z.object({
    command: z.string().min(1, "command is required").openapi({ description: "Command to execute on mock server" }),
  }),
);

export type ExecuteCommandInput = z.infer<typeof executeCommandSchema>;

export const selectPlayerSchema = registry.register(
  "SelectPlayer",
  z.object({
    playerId: z.string().nullable().optional().openapi({ description: "Player ID to select, or null to deselect" }),
  }),
);

export type SelectPlayerInput = z.infer<typeof selectPlayerSchema>;
