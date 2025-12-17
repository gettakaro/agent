import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const addCommand: ToolDefinition = {
  name: "addCommand",
  description:
    "Add a chat command to the current module version. Requires createModule to be called first. The command is immediately persisted to Takaro.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Internal command name (used as identifier)",
      },
      trigger: {
        type: "string",
        description: "What players type to execute the command (without the /)",
      },
      function: {
        type: "string",
        description:
          "JavaScript code that executes when the command is triggered. Has access to takaro, data, and TakaroUserError from @takaro/helpers.",
      },
      helpText: {
        type: "string",
        description: "Description shown when players use /help",
      },
      arguments: {
        type: "array",
        description: "Command arguments that players can provide",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Argument name",
            },
            type: {
              type: "string",
              enum: ["string", "number", "boolean", "player"],
              description: "Argument type",
            },
            helpText: {
              type: "string",
              description: "Description of the argument",
            },
            position: {
              type: "number",
              description: "Position of the argument (0-indexed)",
            },
            defaultValue: {
              type: "string",
              description: "Default value if not provided",
            },
          },
          required: ["name", "type", "position"],
        },
      },
    },
    required: ["name", "trigger", "function"],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const versionId = context.state.versionId as string | undefined;
    if (!versionId) {
      return {
        success: false,
        output: null,
        error: "No module version found. Call createModule first.",
      };
    }

    const name = args.name as string;
    const trigger = args.trigger as string;
    const functionCode = args.function as string;
    const helpText = args.helpText as string | undefined;
    const commandArguments = args.arguments as
      | Array<{
          name: string;
          type: string;
          helpText?: string;
          position: number;
          defaultValue?: string;
        }>
      | undefined;

    const response = await context.takaroClient.command.commandControllerCreate({
      name,
      trigger,
      versionId,
      function: functionCode,
      helpText,
      arguments: commandArguments,
    });

    const commandId = response.data.data.id;

    return {
      success: true,
      output: {
        commandId,
        name,
        trigger,
        message: `Command "/${trigger}" added successfully`,
      },
    };
  },
};
