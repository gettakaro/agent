import { registry, z } from "../openapi/registry.js";

export const executeCommandSchema = registry.register(
  "ExecuteCommand",
  z.object({
    command: z.string().min(1, "command is required").openapi({ description: "Command to execute on mock server" }),
  }),
);

export type ExecuteCommandInput = z.infer<typeof executeCommandSchema>;
