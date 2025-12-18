import { moduleWriterTools } from "../module-writer/tools/index.js";
import { playerModeratorTools } from "../player-moderator/tools/index.js";
import type { ToolDefinition } from "../types.js";

export interface ToolMetadata {
  name: string;
  description: string;
  category: string;
}

// Deduplicate tools (some are shared between agents)
const allTools = new Map<string, ToolDefinition>();

// Register module-writer tools
for (const tool of moduleWriterTools) {
  allTools.set(tool.name, tool);
}

// Register player-moderator tools (some overlap with module-writer)
for (const tool of playerModeratorTools) {
  allTools.set(tool.name, tool);
}

// Define categories for each tool
const toolCategories: Record<string, string> = {
  // Module tools
  createModule: "Module",
  updateModule: "Module",
  deleteModule: "Module",
  getModule: "Module",
  listModuleDefinitions: "Module",
  installModule: "Module",
  uninstallModule: "Module",

  // Command tools
  addCommand: "Command",
  updateCommand: "Command",
  deleteCommand: "Command",
  getCommand: "Command",
  searchCommands: "Command",
  triggerCommand: "Command",

  // Hook tools
  addHook: "Hook",
  updateHook: "Hook",
  deleteHook: "Hook",
  getHook: "Hook",
  searchHooks: "Hook",
  triggerHook: "Hook",

  // CronJob tools
  addCronJob: "CronJob",
  updateCronJob: "CronJob",
  deleteCronJob: "CronJob",
  getCronJob: "CronJob",
  searchCronJobs: "CronJob",
  triggerCronJob: "CronJob",

  // Function tools
  addFunction: "Function",
  updateFunction: "Function",
  deleteFunction: "Function",
  getFunction: "Function",
  searchFunctions: "Function",

  // GameServer tools
  getGameServers: "GameServer",
  getGameServer: "GameServer",
  getOnlinePlayers: "GameServer",

  // Debug/query tools
  searchEvents: "Debug",
  getSettings: "Debug",

  // Player tools
  searchPlayers: "Player",
  getPlayer: "Player",

  // Ban tools
  createBan: "Ban",
  removeBan: "Ban",
  searchBans: "Ban",
  getBan: "Ban",

  // Role tools
  searchRoles: "Role",
  assignRole: "Role",
  removeRole: "Role",
};

export function getAvailableTools(): ToolMetadata[] {
  return Array.from(allTools.entries()).map(([name, tool]) => ({
    name,
    description: tool.description,
    category: toolCategories[name] || "Other",
  }));
}

export function getToolsByNames(names: string[]): ToolDefinition[] {
  return names.map((name) => allTools.get(name)).filter((t): t is ToolDefinition => t !== undefined);
}

export function isValidToolName(name: string): boolean {
  return allTools.has(name);
}

export function getAllToolNames(): string[] {
  return Array.from(allTools.keys());
}
