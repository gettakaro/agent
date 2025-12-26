import type { Client } from "@takaro/apiclient";
import { config } from "../config.js";
import { formatError } from "../utils/formatError.js";
import { CockpitSessionService } from "./session.service.js";

// Mock server instance interface (matches @takaro/mock-gameserver GameServer)
interface MockServerInstance {
  shutdown(): Promise<void>;
  executeConsoleCommand(command: string): Promise<{ rawResult: string }>;
}

interface MockPlayer {
  id: string;
  name: string;
  gameId: string;
  takaroPlayerId?: string;
}

interface ManagedMockServer {
  instance: MockServerInstance;
  gameServerId: string;
  identityToken: string;
  players: MockPlayer[];
  userId: string;
}

// Dynamic import to avoid loading @takaro/mock-gameserver at startup
async function loadMockServerFactory(): Promise<typeof import("@takaro/mock-gameserver")["getMockServer"]> {
  const mod = await import("@takaro/mock-gameserver");
  return mod.getMockServer;
}

export class MockServerManager {
  private servers = new Map<string, ManagedMockServer>();
  private userToSessionId = new Map<string, string>(); // userId -> sessionId
  private sessionService = new CockpitSessionService();

  async spinUp(sessionId: string, userId: string, takaroClient: Client): Promise<ManagedMockServer> {
    // Check if this session already has a server running
    const existing = this.servers.get(sessionId);
    if (existing) {
      return existing;
    }

    // Check if this user already has a server running - if so, transfer it to this session
    const existingSessionId = this.userToSessionId.get(userId);
    if (existingSessionId && this.servers.has(existingSessionId)) {
      const existingServer = this.servers.get(existingSessionId)!;

      // Transfer server from old session to new session
      this.servers.delete(existingSessionId);
      this.servers.set(sessionId, existingServer);
      this.userToSessionId.set(userId, sessionId);

      // Update database - detach from old session, attach to new
      await this.sessionService.updateMockServer(existingSessionId, null, "stopped");
      await this.sessionService.updateMockServer(sessionId, existingServer.gameServerId, "running");

      // Select first player for new session
      if (existingServer.players.length > 0 && existingServer.players[0]?.id) {
        await this.sessionService.updateSelectedPlayer(sessionId, existingServer.players[0].id);
      }

      console.log(`[MockServer] Transferred server from session ${existingSessionId} to ${sessionId}`);
      return existingServer;
    }

    // Update session status to starting
    await this.sessionService.updateMockServer(sessionId, null, "starting");

    try {
      // Load mock server factory dynamically
      const getMockServer = await loadMockServerFactory();

      // Get domain's registration token from /me endpoint
      const meRes = await takaroClient.user.userControllerMe();
      const currentDomainId = meRes.data.data.domain;
      const domain = meRes.data.data.domains.find((d) => d.id === currentDomainId);
      const registrationToken = domain?.serverRegistrationToken;

      if (!registrationToken) {
        throw new Error("No gameserver registration token found. Check domain configuration.");
      }

      // Generate identity based on userId (one server per user, predictable identity)
      const identityToken = `cockpit-${userId}`;
      const serverName = `AI-Cockpit-${userId.slice(0, 8)}`;

      // Derive WebSocket URL from API URL (https://api.x.y -> wss://connect.x.y)
      const wsUrl = config.takaroApiUrl.replace("https://api.", "wss://connect.").replace("http://api.", "ws://connect.");

      // Start mock server
      console.log(`[MockServer] Starting mock server for session ${sessionId} (ws: ${wsUrl})`);
      const instance = await getMockServer({
        ws: { url: wsUrl },
        mockserver: {
          name: serverName,
          registrationToken,
          identityToken,
        },
        simulation: { autoStart: false },
        population: { totalPlayers: 5 },
      });

      // Wait for server to register with Takaro (poll gameservers endpoint)
      let gameServerId: string | null = null;
      for (let i = 0; i < 30; i++) {
        await sleep(1000);
        const serversRes = await takaroClient.gameserver.gameServerControllerSearch({});
        const server = serversRes.data.data.find((s) => s.name === serverName || s.name.includes(identityToken));
        if (server) {
          gameServerId = server.id;
          console.log(`[MockServer] Server registered with gameServerId: ${gameServerId}`);
          break;
        }
      }

      if (!gameServerId) {
        await instance.shutdown();
        throw new Error("Mock server failed to register with Takaro within timeout");
      }

      // Connect all mock players
      console.log("[MockServer] Connecting all mock players...");
      await instance.executeConsoleCommand("connectAll");

      // Wait a bit for players to connect and be registered
      await sleep(2000);

      // Get online players from the game server
      const onlinePlayersRes = await takaroClient.gameserver.gameServerControllerGetPlayers(gameServerId);
      // Type assertion needed as API returns array but types say single object
      const onlinePlayers = (onlinePlayersRes.data.data as unknown as Array<{ name: string; gameId: string; steamId?: string }>);

      const players: MockPlayer[] = [];
      for (const op of onlinePlayers) {
        // Try to find corresponding Takaro player
        const playerSearchRes = await takaroClient.player.playerControllerSearch({
          search: { name: [op.name] },
          limit: 1,
        } as any);
        const takaroPlayer = playerSearchRes.data.data[0];
        players.push({
          id: takaroPlayer?.id || op.gameId,
          name: op.name,
          gameId: op.steamId || op.gameId,
          takaroPlayerId: takaroPlayer?.id,
        });
      }

      console.log(`[MockServer] Found ${players.length} players registered with Takaro`);

      // Update session with gameServerId and select first player
      await this.sessionService.updateMockServer(sessionId, gameServerId, "running");
      if (players.length > 0 && players[0]?.id) {
        await this.sessionService.updateSelectedPlayer(sessionId, players[0].id);
      }

      const managed: ManagedMockServer = {
        instance,
        gameServerId,
        identityToken,
        players,
        userId,
      };

      this.servers.set(sessionId, managed);
      this.userToSessionId.set(userId, sessionId);
      return managed;
    } catch (error) {
      console.error(`[MockServer] Failed to spin up: ${formatError(error)}`);
      await this.sessionService.updateMockServer(sessionId, null, "error");
      throw error;
    }
  }

  async spinDown(sessionId: string, takaroClient?: Client): Promise<void> {
    const managed = this.servers.get(sessionId);
    if (!managed) {
      // Just update session status
      await this.sessionService.updateMockServer(sessionId, null, "stopped");
      return;
    }

    console.log(`[MockServer] Shutting down server for session ${sessionId}`);
    await this.sessionService.updateMockServer(sessionId, managed.gameServerId, "stopping");

    try {
      // Shutdown mock server instance
      await managed.instance.shutdown();

      // Delete game server from Takaro if client provided
      if (takaroClient && managed.gameServerId) {
        try {
          await takaroClient.gameserver.gameServerControllerRemove(managed.gameServerId);
          console.log(`[MockServer] Deleted game server ${managed.gameServerId} from Takaro`);
        } catch (error) {
          console.warn(`[MockServer] Failed to delete game server: ${formatError(error)}`);
        }
      }
    } finally {
      // Clean up user mapping
      if (managed.userId) {
        this.userToSessionId.delete(managed.userId);
      }
      this.servers.delete(sessionId);
      await this.sessionService.updateMockServer(sessionId, null, "stopped");
    }
  }

  async getStatus(sessionId: string): Promise<{
    status: "stopped" | "starting" | "running" | "stopping" | "error";
    gameServerId: string | null;
    playerCount: number;
  }> {
    const managed = this.servers.get(sessionId);
    const session = await this.sessionService.get(sessionId);

    if (!session) {
      return { status: "stopped", gameServerId: null, playerCount: 0 };
    }

    return {
      status: managed ? "running" : session.mockServerStatus,
      gameServerId: session.mockServerGameServerId,
      playerCount: managed?.players.length || 0,
    };
  }

  async getPlayers(sessionId: string): Promise<MockPlayer[]> {
    const managed = this.servers.get(sessionId);
    return managed?.players || [];
  }

  async sendCommand(sessionId: string, command: string): Promise<string> {
    const managed = this.servers.get(sessionId);
    if (!managed) {
      throw new Error("Mock server not running for this session");
    }

    const result = await managed.instance.executeConsoleCommand(command);
    return result.rawResult;
  }

  async refreshPlayers(sessionId: string, takaroClient: Client): Promise<MockPlayer[]> {
    const managed = this.servers.get(sessionId);
    if (!managed) {
      return [];
    }

    // Use pog (PlayerOnGameserver) search to find players on this game server
    const playersRes = await takaroClient.playerOnGameserver.playerOnGameServerControllerSearch({
      filters: { gameServerId: [managed.gameServerId] },
    });

    managed.players = playersRes.data.data.map((p) => ({
      id: p.playerId,
      name: p.gameId, // POG uses gameId as the in-game identifier
      gameId: p.gameId,
      takaroPlayerId: p.playerId,
    }));

    return managed.players;
  }

  isRunning(sessionId: string): boolean {
    return this.servers.has(sessionId);
  }

  // Cleanup all servers (for graceful shutdown)
  async shutdownAll(): Promise<void> {
    const sessionIds = Array.from(this.servers.keys());
    await Promise.all(sessionIds.map((id) => this.spinDown(id)));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Singleton instance
export const mockServerManager = new MockServerManager();
