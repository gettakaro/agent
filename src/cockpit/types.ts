export type MockServerStatus = "stopped" | "starting" | "running" | "stopping" | "error";

export interface CockpitSession {
  id: string;
  conversationId: string;
  userId: string;
  mockServerGameServerId: string | null;
  mockServerStatus: MockServerStatus;
  selectedPlayerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CockpitSessionCreate {
  conversationId: string;
  userId: string;
}

export interface CockpitSessionUpdate {
  mockServerGameServerId?: string | null;
  mockServerStatus?: MockServerStatus;
  selectedPlayerId?: string | null;
}
