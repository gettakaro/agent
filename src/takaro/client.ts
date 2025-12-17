import { Client } from "@takaro/apiclient";
import { config } from "../config.js";
import { formatError } from "../utils/formatError.js";

let serviceClient: Client | null = null;

export async function initServiceClient(): Promise<void> {
  if (!config.takaroUsername || !config.takaroPassword) {
    console.log("No Takaro credentials configured, using cookie-based auth");
    return;
  }

  serviceClient = new Client({
    url: config.takaroApiUrl,
    auth: {
      username: config.takaroUsername,
      password: config.takaroPassword,
    },
  });

  try {
    await serviceClient.login();
    console.log("Logged into Takaro API as service account");
  } catch (err) {
    console.error("Takaro login failed:", formatError(err));
    throw new Error("Failed to authenticate with Takaro API");
  }
}

export function getServiceClient(): Client | null {
  return serviceClient;
}

export function isServiceMode(): boolean {
  return serviceClient !== null;
}

export function createUserClient(cookieHeader: string): Client {
  const client = new Client({
    url: config.takaroApiUrl,
    auth: {},
  });
  client.setHeader("Cookie", cookieHeader);
  return client;
}
