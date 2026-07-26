export interface TenantApiKey {
  id: string;
  tenantId: string;
  service: string;
  apiKey: string;
  status: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export enum CallType {
  ASTERISK = "asterisk",
  SIMULATED = "simulated"
}

export enum CallState {
  IDLE = "idle",
  CONNECTING = "connecting",
  ACTIVE = "active",
  DISCONNECTED = "disconnected",
  ERROR = "error"
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt: number;
}

export interface RagDocumentRecord {
  id: string;
  tenantId: string;
  filename: string;
  fileFormat: string;
  fileSizeBytes: number;
  mimeType?: string;
  storagePath: string;
  status: string;
  errorMessage?: string;
  chunkCount: number;
  createdAt: number;
  updatedAt: number;
  aiIdentityId?: string;
}

export interface TenantTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface CallbackRequest {
  id: string;
  tenantId: string;
  callerName: string;
  phoneNumber: string;
  reason: string;
  preferredTime?: string;
  status: "pending" | "completed" | "cancelled";
  createdAt: number;
}

export interface AgentProfile {
  id: string;
  tenantId?: string;
  agentName: string;
  role?: string; // e.g., "Customer Service", "Teknisi", "Sales & Promo"
  extension: string; // e.g. "501", "502"
  pronunciation?: string;
  language?: string;
  dialect?: string;
  gender?: string;
  aiModel?: string;
  personality?: string;
  timezone?: string;
  speakingRate?: string;
  temperature?: number;
  defaultFallbackResponse?: string;
  prebuiltVoice: "Zephyr" | "Puck" | "Charon" | "Kore" | "Fenrir" | "Aoede";
  systemInstruction: string;
  greetingMessage: string;
  agentStartsFirst?: boolean;
  bargeIn?: boolean;
  bargeInSensitivity?: "gemini_only" | "strict" | "moderate" | "high";
  isDefault?: boolean;
}

export interface TenantProfile {
  id: string;
  name: string;
  businessCategory: string;
  description?: string;
  agents: AgentProfile[];
  documents: KnowledgeDoc[];
  tools: TenantTool[];
  callbackRequests: CallbackRequest[];
  
  // Financial & Status
  balance?: number;
  creditLimit?: number;
  billingType?: "prepaid" | "postpaid";
  status?: "active" | "inactive" | "suspended" | "grace_period" | "terminated" | "deleted";
  sessionCount?: number;

  // Legacy compatibility fields
  extension?: string;
  agentName?: string;
  pronunciation?: string;
  language?: string;
  dialect?: string;
  gender?: string;
  aiModel?: string;
  personality?: string;
  timezone?: string;
  speakingRate?: string;
  temperature?: number;
  defaultFallbackResponse?: string;
  prebuiltVoice?: "Zephyr" | "Puck" | "Charon" | "Kore" | "Fenrir" | "Aoede";
  systemInstruction?: string;
  greetingMessage?: string;
  agentStartsFirst?: boolean;
}

export interface CallInfo {
  id: string;
  tenantId?: string;
  tenantName?: string;
  agentId?: string;
  agentName?: string;
  extension?: string;
  callerNumber?: string;
  type: CallType;
  state: CallState;
  startTime: number;
  duration: number;
  uuid?: string;
  remoteAddress?: string;
  userTranscripts: string[];
  aiTranscripts: string[];
}

export interface AiSessionRecord {
  id: string;
  tenantId: string;
  agentId?: string;
  agentName?: string;
  durationSeconds?: number;
  channelId?: string;
  callerNumber?: string;
  sessionState?: any;
  startedAt: string | Date;
  endedAt?: string | Date | null;
  tenantName?: string;
  // Performance Metrics
  status?: "Success" | "Failed" | "Dropped";
  sentiment?: "Positive" | "Neutral" | "Negative";
  latencyMs?: number; // TTFB
  processingLatencyMs?: number;
  transcriptionConfidence?: number;
}

export interface LogItem {
  timestamp: number;
  direction: "in" | "out" | "system";
  source: "Asterisk" | "Gateway" | "Gemini" | "Simulator";
  type: string;
  message: string;
  details?: string;
  tenantId?: string;
}

export interface SystemStatus {
  tcpPort: number;
  wsPort: number;
  activeCallsCount: number;
  geminiConnected: boolean;
  isAsteriskServerRunning: boolean;
  totalTenantsCount: number;
  load?: number[];
  memory?: { total: number, free: number };
  activeAiSessions?: number;
  cpuCount?: number;
}

