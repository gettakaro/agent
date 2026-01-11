import type { ToolDefinition } from "../../types.js";
// Command tools
import { addCommand } from "./command/addCommand.js";
import { deleteCommand } from "./command/deleteCommand.js";
import { getCommand } from "./command/getCommand.js";
import { searchCommands } from "./command/searchCommands.js";
import { triggerCommand } from "./command/triggerCommand.js";
import { updateCommand } from "./command/updateCommand.js";
// CronJob tools
import { addCronJob } from "./cronjob/addCronJob.js";
import { deleteCronJob } from "./cronjob/deleteCronJob.js";
import { getCronJob } from "./cronjob/getCronJob.js";
import { searchCronJobs } from "./cronjob/searchCronJobs.js";
import { triggerCronJob } from "./cronjob/triggerCronJob.js";
import { updateCronJob } from "./cronjob/updateCronJob.js";
import { getSettings } from "./debug/getSettings.js";
// Debug tools
import { searchEvents } from "./debug/searchEvents.js";
import { searchPlayers } from "./debug/searchPlayers.js";
// Function tools
import { addFunction } from "./function/addFunction.js";
import { deleteFunction } from "./function/deleteFunction.js";
import { getFunction } from "./function/getFunction.js";
import { searchFunctions } from "./function/searchFunctions.js";
import { updateFunction } from "./function/updateFunction.js";
import { getGameServer } from "./gameserver/getGameServer.js";
// GameServer tools
import { getGameServers } from "./gameserver/getGameServers.js";
import { getOnlinePlayers } from "./gameserver/getOnlinePlayers.js";
// Hook tools
import { addHook } from "./hook/addHook.js";
import { deleteHook } from "./hook/deleteHook.js";
import { getHook } from "./hook/getHook.js";
import { searchHooks } from "./hook/searchHooks.js";
import { triggerHook } from "./hook/triggerHook.js";
import { updateHook } from "./hook/updateHook.js";
// Module tools
import { checkModuleExists } from "./module/checkModuleExists.js";
import { createModule } from "./module/createModule.js";
import { deleteModule } from "./module/deleteModule.js";
import { getModule } from "./module/getModule.js";
import { installModule } from "./module/installModule.js";
import { listModuleDefinitions } from "./module/listModuleDefinitions.js";
import { uninstallModule } from "./module/uninstallModule.js";
import { updateModule } from "./module/updateModule.js";

export const moduleWriterTools: ToolDefinition[] = [
  // Module management
  checkModuleExists,
  listModuleDefinitions,
  createModule,
  updateModule,
  deleteModule,
  getModule,
  installModule,
  uninstallModule,

  // Commands
  addCommand,
  updateCommand,
  deleteCommand,
  getCommand,
  searchCommands,
  triggerCommand,

  // Hooks
  addHook,
  updateHook,
  deleteHook,
  getHook,
  searchHooks,
  triggerHook,

  // CronJobs
  addCronJob,
  updateCronJob,
  deleteCronJob,
  getCronJob,
  searchCronJobs,
  triggerCronJob,

  // Functions
  addFunction,
  updateFunction,
  deleteFunction,
  getFunction,
  searchFunctions,

  // GameServer
  getGameServers,
  getGameServer,
  getOnlinePlayers,

  // Debug
  searchEvents,
  getSettings,
  searchPlayers,
];
