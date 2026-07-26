import express from "express";
import http from "http";
import net from "net";
import path from "path";
import fs from "fs";
import os from "os";
import multer from "multer";
import dotenv from "dotenv";
import { WebSocket, WebSocketServer } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { CallState, CallType, CallInfo, LogItem, SystemStatus, TenantProfile, AgentProfile, KnowledgeDoc, CallbackRequest } from "./src/types";
import {
  initTenantsStore,
  getAllTenants,
  getTenantById,
  getAgentById,
  getTenantAndAgentByExtension,
  getTenantAndAgentBySipHeaders,
  getTenantAndAgent,
  saveOrUpdateTenant,
  saveOrUpdateAgent,
  deleteAgent,
  deleteTenant,
  addTenantCallbackRequest,
  updateCallbackStatus,
  compileSystemInstruction,
  getTenantApiKeyRecord,
  getEffectiveTenantApiKey,
  getEffectiveTenantApiKeySync,
  saveOrUpdateTenantApiKey,
  deleteTenantApiKey,
  saveRagDocument,
  getTenantRagDocuments
} from "./server/tenantsStore";
import {
  dbGetAllAiIdentities,
  dbGetAiIdentitiesByTenant,
  dbUpsertAiIdentity,
  dbDeleteAiIdentity,
  dbCreateAiSession,
  dbEndAiSession,
  dbGetSessionsByTenant,
  dbGetAllAiSessions,
  dbCreateRagDocument,
  dbGetRagDocumentsByTenant,
  dbUpdateRagDocumentStatus,
  dbCreateAiToolCall,
  dbUpdateAiToolCallResult,
  dbGetToolCallsByTenant,
  dbGetAllVoiceProfiles,
  dbCreateVoiceProfile,
  dbUpdateVoiceProfile,
  dbDeleteVoiceProfile
} from "./src/db/repository.ts";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const HTTP_PORT = process.env.HTTP_PORT;
const TCP_PORT = process.env.TCP_PORT; // Asterisk AudioSocket TCP Port

// Multer setup for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize multi-tenant store
(async () => {
  await initTenantsStore();
})();

// Active calls & SIP sessions state
const activeCalls = new Map<string, CallInfo & { socket?: net.Socket; ws?: WebSocket; geminiSession?: any }>();
const systemLogs: LogItem[] = [];

interface SipCallSession {
  sessionId: string;
  apiKey?: string;
  tenantId: string;
  agentId: string;
  callerNumber?: string;
  createdAt: number;
}
const activeSipSessions = new Map<string, SipCallSession>();

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini client successfully initialized.");
  } else {
    console.warn("GEMINI_API_KEY environment variable is not defined. Gemini features will be disabled.");
  }
} catch (err) {
  console.error("Failed to initialize Gemini client:", err);
}

// Global logger helper
function addLog(direction: "in" | "out" | "system", source: "Asterisk" | "Gateway" | "Gemini" | "Simulator", type: string, message: string, details?: string, tenantId?: string) {
  const logItem: LogItem = {
    timestamp: Date.now(),
    direction,
    source,
    type,
    message,
    details,
    tenantId
  };
  systemLogs.push(logItem);
  if (systemLogs.length > 500) {
    systemLogs.shift();
  }
  
  // Broadcast log to all dashboard clients
  broadcastToDashboard({
    event: "log_added",
    log: logItem
  });
}

// Resampling utility for PCM 16-bit little endian
function resamplePCM(input: Buffer, fromSampleRate: number, toSampleRate: number): Buffer {
  if (fromSampleRate === toSampleRate) {
    return input;
  }
  
  const numSamples = input.length / 2;
  const ratio = fromSampleRate / toSampleRate;
  const newNumSamples = Math.round(numSamples / ratio);
  const output = Buffer.alloc(newNumSamples * 2);
  
  for (let i = 0; i < newNumSamples; i++) {
    const inputIndex = i * ratio;
    const indexLow = Math.floor(inputIndex);
    const indexHigh = Math.min(numSamples - 1, indexLow + 1);
    const weight = inputIndex - indexLow;
    
    // Safety check for boundary
    if (indexLow * 2 + 1 >= input.length) continue;
    
    const sampleLow = input.readInt16LE(indexLow * 2);
    const sampleHigh = input.readInt16LE(indexHigh * 2);
    
    const interpolatedSample = Math.round(sampleLow * (1 - weight) + sampleHigh * weight);
    
    if (i * 2 + 1 < output.length) {
      output.writeInt16LE(interpolatedSample, i * 2);
    }
  }
  
  return output;
}

// Packetization helper for AudioSocket
function makeAudioSocketPacket(type: number, payload: Buffer): Buffer {
  const header = Buffer.alloc(3);
  header.writeUInt8(type, 0);
  header.writeUInt16BE(payload.length, 1);
  return Buffer.concat([header, payload]);
}

// Active calls getter for HTTP API
function getCleanActiveCalls(): CallInfo[] {
  return Array.from(activeCalls.values()).map(c => ({
    id: c.id,
    tenantId: c.tenantId,
    tenantName: c.tenantName,
    agentId: c.agentId,
    agentName: c.agentName,
    extension: c.extension,
    callerNumber: c.callerNumber || c.remoteAddress || "Web Simulator",
    type: c.type,
    state: c.state,
    startTime: c.startTime,
    duration: Math.floor((Date.now() - c.startTime) / 1000),
    uuid: c.uuid,
    remoteAddress: c.remoteAddress,
    userTranscripts: c.userTranscripts,
    aiTranscripts: c.aiTranscripts
  }));
}

// Helper to construct Gemini Live session tools for a tenant
function buildTenantToolsConfig(tenant: TenantProfile): any[] {
  const toolsConfig: any[] = [];
  const enabledTools = (tenant.tools || []).filter(t => t.enabled);

  const functionDeclarations: any[] = [];

  if (enabledTools.some(t => t.id === "request_callback")) {
    functionDeclarations.push({
      name: "request_callback",
      description: "Catat permintaan telepon kembali (callback), pendaftaran konsul, atau janji temu dari pemanggil.",
      parameters: {
        type: "OBJECT",
        properties: {
          callerName: { type: "STRING", description: "Nama lengkap pemanggil atau pelanggan" },
          phoneNumber: { type: "STRING", description: "Nomor WhatsApp atau telepon yang aktif" },
          reason: { type: "STRING", description: "Topik atau alasan permintaan callback" },
          preferredTime: { type: "STRING", description: "Waktu atau jam yang diharapkan untuk dihubungi" }
        },
        required: ["callerName", "phoneNumber", "reason"]
      }
    });
  }

  if (enabledTools.some(t => t.id === "check_order_status")) {
    functionDeclarations.push({
      name: "check_order_status",
      description: "Cek status pesanan, tiket laporan, atau pendaftaran.",
      parameters: {
        type: "OBJECT",
        properties: {
          orderId: { type: "STRING", description: "Nomor resi, ID pesanan, atau nomor tiket" }
        },
        required: ["orderId"]
      }
    });
  }

  if (functionDeclarations.length > 0) {
    toolsConfig.push({ functionDeclarations });
  }

  return toolsConfig;
}

// ----------------------------------------------------
// Asterisk AudioSocket TCP Server
// ----------------------------------------------------
const tcpServer = net.createServer((socket) => {
  const callId = `ast_${Math.random().toString(36).substring(2, 9)}`;
  const remoteAddr = `${socket.remoteAddress}:${socket.remotePort}`;
  
  // Default to first tenant / default agent
  const allTenants = getAllTenants();
  const defaultResolved = getTenantAndAgent(allTenants[0]?.id || "");
  let selectedTenant = defaultResolved?.tenant || allTenants[0];
  let selectedAgent = defaultResolved?.agent || selectedTenant?.agents[0];

  console.log(`Asterisk connection received from ${remoteAddr}`);
  addLog("in", "Asterisk", "TCP_CONNECT", `Incoming Asterisk connection from ${remoteAddr}`, `Call ID: ${callId}`, selectedTenant?.id);

  const callerNum = remoteAddr || "Asterisk Channel";

  const callInfo: CallInfo & { socket: net.Socket; geminiSession?: any } = {
    id: callId,
    tenantId: selectedTenant?.id,
    tenantName: selectedTenant?.name,
    agentId: selectedAgent?.id,
    agentName: selectedAgent?.agentName,
    extension: selectedAgent?.extension,
    callerNumber: callerNum,
    type: CallType.ASTERISK,
    state: CallState.CONNECTING,
    startTime: Date.now(),
    duration: 0,
    remoteAddress: remoteAddr,
    userTranscripts: [],
    aiTranscripts: [],
    socket: socket
  };
  
  activeCalls.set(callId, callInfo);
  broadcastToDashboard({ event: "call_updated", calls: getCleanActiveCalls() });

  if (selectedTenant?.id) {
    dbCreateAiSession({
      id: callId,
      tenantId: selectedTenant.id,
      agentId: selectedAgent?.id,
      agentName: selectedAgent?.agentName,
      channelId: callId,
      callerNumber: callerNum,
      sessionState: { agentId: selectedAgent?.id, agentName: selectedAgent?.agentName, extension: selectedAgent?.extension, type: CallType.ASTERISK, state: CallState.CONNECTING }
    }).catch(err => console.error("Error creating AiSession for Asterisk call:", err));
  }

  let buffer = Buffer.alloc(0);
  let geminiConnected = false;
  let asteriskSampleRate = 8000; // Asterisk default AudioSocket sample rate

  // Connect to Gemini Live API with Tenant & Agent Context & Tools
  let sessionPromise: Promise<any> | null = null;
  
  // Resolve effective API key for tenant (TenantApiKey table/store fallback to .env)
  const effectiveKey = getEffectiveTenantApiKeySync(selectedTenant?.id, "gemini");
  let activeAiClient = ai;
  if (effectiveKey && effectiveKey !== process.env.GEMINI_API_KEY) {
    try {
      activeAiClient = new GoogleGenAI({
        apiKey: effectiveKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
    } catch (e) {
      console.error("Error instantiating tenant GoogleGenAI client:", e);
    }
  }

  if (activeAiClient && selectedTenant && selectedAgent) {
    const compiledSystemInstruction = compileSystemInstruction(selectedTenant, selectedAgent);
    const tenantTools = buildTenantToolsConfig(selectedTenant);

    addLog("system", "Gateway", "GEMINI_INIT", `Connecting to Gemini Live API for Asterisk call ${callId} (Agent: ${selectedAgent.agentName} | Tenant: ${selectedTenant.name})...`, undefined, selectedTenant.id);
    
    sessionPromise = activeAiClient.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedAgent.prebuiltVoice || "Zephyr" } },
        },
        systemInstruction: compiledSystemInstruction,
        tools: tenantTools.length > 0 ? tenantTools : undefined
      },
      callbacks: {
        onmessage: (message) => {
          // Handle Gemini audio response
          const audioBase64 = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioBase64) {
            const rawAudio24k = Buffer.from(audioBase64, "base64");
            const resampledAudio = resamplePCM(rawAudio24k, 24000, asteriskSampleRate);
            
            const packet = makeAudioSocketPacket(0x01, resampledAudio);
            if (!socket.destroyed) {
              socket.write(packet);
            }
          }
          
          // Handle text transcription (model speaking)
          const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
          if (text) {
            callInfo.aiTranscripts.push(text);
            addLog("out", "Gemini", "TRANSCRIPT", `${selectedAgent.agentName}: ${text}`, `Call: ${callId}`, selectedTenant.id);
            broadcastToDashboard({ event: "call_updated", calls: getCleanActiveCalls() });
          }

          // Handle Tool Calling from Gemini
          const toolCall = (message as any).toolCall;
          if (toolCall) {
            for (const call of toolCall.functionCalls) {
              if (call.name === "request_callback") {
                const args = call.args as any;
                const cbData: CallbackRequest = {
                  id: `cb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  tenantId: selectedTenant.id,
                  callerName: args.callerName || "Pemanggil Asterisk",
                  phoneNumber: args.phoneNumber || "08123456789",
                  reason: args.reason || `Permintaan callback via ${selectedAgent.agentName}`,
                  preferredTime: args.preferredTime || "Segera",
                  status: "pending",
                  createdAt: Date.now()
                };
                addTenantCallbackRequest(selectedTenant.id, cbData);

                addLog("system", "Gemini", "TOOL_EXEC", `[CALLBACK STORED] Saved callback for tenant '${selectedTenant.name}': ${cbData.callerName} (${cbData.phoneNumber})`, `Reason: ${cbData.reason}`, selectedTenant.id);

                if (callInfo.geminiSession) {
                  callInfo.geminiSession.sendToolResponse({
                    functionResponses: [{
                      name: call.name,
                      id: call.id,
                      response: { output: { success: true, message: `Permintaan callback untuk ${cbData.callerName} berhasil disimpan oleh ${selectedAgent.agentName}.` } }
                    }]
                  });
                }
                broadcastToDashboard({ event: "tenant_updated" });
              } else if (call.name === "check_order_status") {
                const args = call.args as any;
                if (callInfo.geminiSession) {
                  callInfo.geminiSession.sendToolResponse({
                    functionResponses: [{
                      name: call.name,
                      id: call.id,
                      response: { output: { status: "Dalam Pengiriman", detail: `Pesanan/Tiket ${args.orderId} sedang dalam penanganan tim ${selectedTenant.name}.` } }
                    }]
                  });
                }
                addLog("system", "Gemini", "TOOL_EXEC", `[TOOL EXECUTED] Checked status for ID ${args.orderId}`, `Call: ${callId}`, selectedTenant.id);
              }
            }
          }

          // Handle interruption
          if (message.serverContent?.interrupted && selectedAgent.bargeIn !== false) {
            addLog("system", "Gemini", "INTERRUPTED", `Caller interrupted ${selectedAgent.agentName} speaking`, `Call: ${callId}`, selectedTenant.id);
          }
        },
        onclose: () => {
          addLog("system", "Gemini", "DISCONNECT", `Gemini closed connection for Asterisk call ${callId}`, undefined, selectedTenant.id);
          cleanupCall();
        },
        onerror: (err) => {
          addLog("system", "Gemini", "ERROR", `Gemini error for Asterisk call ${callId}: ${err.message}`, undefined, selectedTenant.id);
          cleanupCall();
        }
      }
    }).then(session => {
      geminiConnected = true;
      callInfo.state = CallState.ACTIVE;
      callInfo.geminiSession = session;
      addLog("system", "Gateway", "GEMINI_ACTIVE", `Gemini Live active for Agent '${selectedAgent.agentName}' (${selectedTenant.name})`, undefined, selectedTenant.id);

      if (selectedAgent.agentStartsFirst !== false) {
        session.sendClientContent({
          turns: [{
            role: "user",
            parts: [{ text: `[SISTEM]: Panggilan terhubung. Sapa pemanggil sekarang dengan sapaan awal Anda.` }]
          }],
          turnComplete: true
        });
      }

      broadcastToDashboard({ event: "call_updated", calls: getCleanActiveCalls() });
      return session;
    }).catch(err => {
      addLog("system", "Gateway", "GEMINI_ERROR", `Failed to connect Gemini Live for Asterisk call ${callId}: ${err.message}`, undefined, selectedTenant.id);
      cleanupCall();
      return null;
    });
  } else {
    addLog("system", "Gateway", "GEMINI_DISABLED", "Gemini is disabled (no API Key). Call will proceed with echo test mode.", undefined, selectedTenant?.id);
    callInfo.state = CallState.ACTIVE;
    broadcastToDashboard({ event: "call_updated", calls: getCleanActiveCalls() });
  }

  // Handle incoming data from Asterisk
  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    
    while (buffer.length >= 3) {
      const type = buffer.readUInt8(0);
      const length = buffer.readUInt16BE(1);
      
      if (buffer.length < 3 + length) {
        break;
      }
      
      const payload = buffer.subarray(3, 3 + length);
      buffer = buffer.subarray(3 + length);
      
      handlePacket(type, payload);
    }
  });

  function handlePacket(type: number, payload: Buffer) {
    if (type === 0x10) {
      // UUID / SIP Session Packet
      const rawUtf8 = payload.toString("utf-8").trim();
      const rawHex = payload.toString("hex");
      callInfo.uuid = rawUtf8 || rawHex;

      let matched: { tenant: TenantProfile; agent: AgentProfile } | undefined;

      // 1. Check if UUID matches an active registered SIP session token
      const registeredSip = activeSipSessions.get(rawUtf8) || activeSipSessions.get(rawHex);
      if (registeredSip) {
        matched = getTenantAndAgentBySipHeaders(registeredSip.apiKey, registeredSip.tenantId, registeredSip.agentId);
      }

      // 2. Match composite header string e.g. "apiKey:tenantId:agentId" or "tenantId:agentId"
      if (!matched) {
        matched = getTenantAndAgentBySipHeaders(rawUtf8, rawUtf8);
      }

      // 3. Fallback to extension string matching
      if (!matched) {
        matched = getTenantAndAgentByExtension(rawUtf8) || getTenantAndAgentByExtension(rawHex);
      }

      if (matched) {
        selectedTenant = matched.tenant;
        selectedAgent = matched.agent;
        callInfo.tenantId = matched.tenant.id;
        callInfo.tenantName = matched.tenant.name;
        callInfo.agentId = matched.agent.id;
        callInfo.agentName = matched.agent.agentName;
        callInfo.extension = matched.agent.extension;
        addLog("in", "Asterisk", "SIP_HEADER_ROUTE", `Routed Call via SIP Headers to Agent '${matched.agent.agentName}' (${matched.tenant.name} ID: ${matched.tenant.id})`, `Call: ${callId}`, matched.tenant.id);
      } else {
        addLog("in", "Asterisk", "UUID", `Received Call UUID / Identifier: ${rawUtf8 || rawHex}`, `Call: ${callId}`, selectedTenant?.id);
      }

      broadcastToDashboard({ event: "call_updated", calls: getCleanActiveCalls() });
    } 
    else if (type === 0x01) {
      // Audio packet
      if (payload.length > 0) {
        if (!ai) {
          const packet = makeAudioSocketPacket(0x01, payload);
          socket.write(packet);
          return;
        }

        if (geminiConnected && callInfo.geminiSession) {
          const resampledInput = resamplePCM(payload, asteriskSampleRate, 16000);
          const base64Audio = resampledInput.toString("base64");
          
          callInfo.geminiSession.sendRealtimeInput({
            audio: {
              data: base64Audio,
              mimeType: "audio/pcm;rate=16000"
            }
          });
        }
      }
    } 
    else if (type === 0x02) {
      addLog("in", "Asterisk", "HANGUP", `Asterisk requested Hangup`, `Call: ${callId}`, selectedTenant?.id);
      cleanupCall();
    } 
    else if (type === 0x03) {
      addLog("in", "Asterisk", "ERROR", `Asterisk reported socket error`, `Call: ${callId}`, selectedTenant?.id);
      cleanupCall();
    }
  }

  function cleanupCall() {
    if (callInfo.state === CallState.DISCONNECTED) return;
    
    callInfo.state = CallState.DISCONNECTED;
    broadcastToDashboard({ event: "call_updated", calls: getCleanActiveCalls() });

    dbEndAiSession(callId, {
      agentId: callInfo.agentId,
      agentName: callInfo.agentName,
      extension: callInfo.extension,
      type: callInfo.type,
      state: "disconnected",
      duration: Math.floor((Date.now() - callInfo.startTime) / 1000)
    }).catch(err => console.error("Error ending AiSession for Asterisk call:", err));
    
    if (callInfo.geminiSession) {
      try {
        callInfo.geminiSession.close();
      } catch (e) {}
    }
    
    if (!socket.destroyed) {
      try {
        socket.write(makeAudioSocketPacket(0x02, Buffer.alloc(0)));
      } catch (e) {}
      socket.destroy();
    }
    
    setTimeout(() => {
      activeCalls.delete(callId);
      broadcastToDashboard({ event: "call_updated", calls: getCleanActiveCalls() });
    }, 5000);
  }

  socket.on("close", () => {
    addLog("system", "Asterisk", "CLOSED", `Asterisk socket connection closed`, `Call: ${callId}`, selectedTenant?.id);
    cleanupCall();
  });

  socket.on("error", (err) => {
    addLog("system", "Asterisk", "ERROR", `Asterisk socket error: ${err.message}`, `Call: ${callId}`, selectedTenant?.id);
    cleanupCall();
  });
});

tcpServer.on("error", (err) => {
  console.error("AudioSocket TCP Server error:", err);
});

tcpServer.listen(TCP_PORT, "0.0.0.0", () => {
  console.log(`AudioSocket TCP Server listening on port ${TCP_PORT}`);
});

// ----------------------------------------------------
// WebSocket Server for Web-based Simulator & Dashboard
// ----------------------------------------------------
const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
  
  if (pathname === "/api/ws" || pathname.startsWith("/ws")) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

const dashboardClients = new Set<WebSocket>();

function broadcastToDashboard(data: any) {
  const msg = JSON.stringify(data);
  dashboardClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on("connection", (ws, req) => {
  const urlParams = new URL(req.url || "", `http://${req.headers.host}`).searchParams;
  const isDashboard = urlParams.get("role") === "dashboard";

  // Extract SIP Headers or Query Params
  const apiKey = (req.headers["x-api-key"] as string) || urlParams.get("apiKey") || urlParams.get("x-api-key") || undefined;
  const tenantId = (req.headers["x-tenant-id"] as string) || urlParams.get("tenantId") || urlParams.get("x-tenant-id") || urlParams.get("tenant_id") || undefined;
  const agentId = (req.headers["x-agent-id"] as string) || urlParams.get("agentId") || urlParams.get("x-agent-id") || urlParams.get("agent_id") || undefined;

  if (isDashboard) {
    dashboardClients.add(ws);
    ws.send(JSON.stringify({
      event: "init",
      status: getSystemStatus(),
      calls: getCleanActiveCalls(),
      logs: systemLogs,
      tenants: getAllTenants()
    }));
    
    ws.on("close", () => {
      dashboardClients.delete(ws);
    });
    return;
  }

  // Call simulator or WebSocket SIP client
  const callId = `sim_${Math.random().toString(36).substring(2, 9)}`;
  const resolved = getTenantAndAgentBySipHeaders(apiKey, tenantId, agentId) || 
                   getTenantAndAgent(tenantId || "", agentId || "") || 
                   getTenantAndAgent(getAllTenants()[0]?.id || "");
  const tenant = resolved.tenant;
  const agent = resolved.agent;

  console.log(`Web Simulator connected: ${callId} for Tenant '${tenant.name}' - Agent '${agent.agentName}' (Ext ${agent.extension})`);
  addLog("in", "Simulator", "SIM_CONNECT", `Incoming call simulation for Agent '${agent.agentName}' (${tenant.name} Ext ${agent.extension})`, `Call ID: ${callId}`, tenant.id);

  const simCallerNum = (req.headers["x-caller-number"] as string) || 
                       urlParams.get("callerNumber") || 
                       urlParams.get("caller_number") || 
                       `+62 812-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

  const callInfo: CallInfo & { ws: WebSocket; geminiSession?: any } = {
    id: callId,
    tenantId: tenant.id,
    tenantName: tenant.name,
    agentId: agent.id,
    agentName: agent.agentName,
    extension: agent.extension,
    callerNumber: simCallerNum,
    type: CallType.SIMULATED,
    state: CallState.CONNECTING,
    startTime: Date.now(),
    duration: 0,
    remoteAddress: "Web Browser",
    userTranscripts: [],
    aiTranscripts: [],
    ws: ws
  };

  activeCalls.set(callId, callInfo);
  broadcastToDashboard({ event: "call_updated", calls: getCleanActiveCalls() });

  dbCreateAiSession({
    id: callId,
    tenantId: tenant.id,
    agentId: agent.id,
    agentName: agent.agentName,
    channelId: callId,
    callerNumber: simCallerNum,
    sessionState: { agentId: agent.id, agentName: agent.agentName, extension: agent.extension, type: CallType.SIMULATED, state: CallState.CONNECTING }
  }).catch(err => console.error("Error creating AiSession for Simulator call:", err));

  let geminiConnected = false;
  let sessionPromise: Promise<any> | null = null;

  // Resolve effective API key for tenant (TenantApiKey table/store fallback to .env)
  const effectiveKey = getEffectiveTenantApiKeySync(tenant?.id, "gemini");
  let activeAiClient = ai;
  if (effectiveKey && effectiveKey !== process.env.GEMINI_API_KEY) {
    try {
      activeAiClient = new GoogleGenAI({
        apiKey: effectiveKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
    } catch (e) {
      console.error("Error instantiating simulator tenant GoogleGenAI client:", e);
    }
  }

  if (activeAiClient) {
    const compiledSystemInstruction = compileSystemInstruction(tenant, agent);
    const tenantTools = buildTenantToolsConfig(tenant);

    addLog("system", "Gateway", "GEMINI_INIT", `Connecting Gemini Live for simulator ${callId} (Agent: ${agent.agentName} | Tenant: ${tenant.name})...`, undefined, tenant.id);
    
    sessionPromise = activeAiClient.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: agent.prebuiltVoice || "Zephyr" } },
        },
        systemInstruction: compiledSystemInstruction,
        tools: tenantTools.length > 0 ? tenantTools : undefined
      },
      callbacks: {
        onmessage: (message) => {
          // Receive audio from Gemini
          const audioBase64 = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioBase64) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ event: "audio", data: audioBase64 }));
            }
          }

          // Handle transcription (model speaking)
          const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
          if (text) {
            callInfo.aiTranscripts.push(text);
            addLog("out", "Gemini", "TRANSCRIPT", `${agent.agentName}: ${text}`, `Call: ${callId}`, tenant.id);
            broadcastToDashboard({ event: "call_updated", calls: getCleanActiveCalls() });
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ event: "ai_transcript", text }));
            }
          }

          // Handle user's transcribed audio
          const userText = (message.serverContent as any)?.userTurn?.parts?.[0]?.text;
          if (userText) {
            callInfo.userTranscripts.push(userText);
            addLog("in", "Simulator", "TRANSCRIPT", `User: ${userText}`, `Call: ${callId}`, tenant.id);
            broadcastToDashboard({ event: "call_updated", calls: getCleanActiveCalls() });
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ event: "user_transcript", text: userText }));
            }
          }

          // Handle Tool Calling from Gemini
          const toolCall = (message as any).toolCall;
          if (toolCall) {
            for (const call of toolCall.functionCalls) {
              if (call.name === "request_callback") {
                const args = call.args as any;
                const cbData: CallbackRequest = {
                  id: `cb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  tenantId: tenant.id,
                  callerName: args.callerName || "Pemanggil Web",
                  phoneNumber: args.phoneNumber || "08123456789",
                  reason: args.reason || `Permintaan callback via ${agent.agentName}`,
                  preferredTime: args.preferredTime || "Segera",
                  status: "pending",
                  createdAt: Date.now()
                };
                addTenantCallbackRequest(tenant.id, cbData);

                addLog("system", "Gemini", "TOOL_EXEC", `[CALLBACK RECORDED] Saved callback for tenant '${tenant.name}': ${cbData.callerName} (${cbData.phoneNumber})`, `Reason: ${cbData.reason}`, tenant.id);

                if (callInfo.geminiSession) {
                  callInfo.geminiSession.sendToolResponse({
                    functionResponses: [{
                      name: call.name,
                      id: call.id,
                      response: { output: { success: true, message: `Permintaan callback atas nama ${cbData.callerName} berhasil disimpan. Petugas kami akan segera menghubungi di nomor ${cbData.phoneNumber}.` } }
                    }]
                  });
                }

                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    event: "callback_created",
                    callback: cbData
                  }));
                }

                broadcastToDashboard({ event: "tenant_updated" });
              } else if (call.name === "check_order_status") {
                const args = call.args as any;
                if (callInfo.geminiSession) {
                  callInfo.geminiSession.sendToolResponse({
                    functionResponses: [{
                      name: call.name,
                      id: call.id,
                      response: { output: { status: "Proses Pengiriman", detail: `Pesanan/Tiket ${args.orderId} telah dikonfirmasi dan sedang ditangani oleh tim operasional ${tenant.name}.` } }
                    }]
                  });
                }
                addLog("system", "Gemini", "TOOL_EXEC", `[TOOL EXECUTED] Checked order/ticket ID ${args.orderId}`, `Call: ${callId}`, tenant.id);
              }
            }
          }

          if (message.serverContent?.interrupted && agent.bargeIn !== false) {
            addLog("system", "Gemini", "INTERRUPTED", `User interrupted ${agent.agentName} speaking`, `Call: ${callId}`, tenant.id);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ event: "interrupted" }));
            }
          }
        },
        onclose: () => {
          addLog("system", "Gemini", "DISCONNECT", `Gemini session closed for simulator ${callId}`, undefined, tenant.id);
          cleanupSimCall();
        },
        onerror: (err) => {
          addLog("system", "Gemini", "ERROR", `Gemini error for simulator ${callId}: ${err.message}`, undefined, tenant.id);
          cleanupSimCall();
        }
      }
    }).then(session => {
      geminiConnected = true;
      callInfo.state = CallState.ACTIVE;
      callInfo.geminiSession = session;
      addLog("system", "Gateway", "GEMINI_ACTIVE", `Gemini Live active for simulator (Agent: ${agent.agentName} | Tenant: ${tenant.name})`, undefined, tenant.id);

      if (agent.agentStartsFirst !== false) {
        session.sendClientContent({
          turns: [{
            role: "user",
            parts: [{ text: `[SISTEM]: Panggilan terhubung. Sapa pemanggil sekarang dengan sapaan awal Anda.` }]
          }],
          turnComplete: true
        });
      }

      broadcastToDashboard({ event: "call_updated", calls: getCleanActiveCalls() });
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: "connected", tenant, agent }));
      }
      return session;
    }).catch(err => {
      addLog("system", "Gateway", "GEMINI_ERROR", `Failed to connect Gemini Live for simulator ${callId}: ${err.message}`, undefined, tenant.id);
      cleanupSimCall();
      return null;
    });
  } else {
    addLog("system", "Gateway", "GEMINI_DISABLED", "Gemini disabled (no API Key). Simulator running in echo test mode.", undefined, tenant.id);
    callInfo.state = CallState.ACTIVE;
    broadcastToDashboard({ event: "call_updated", calls: getCleanActiveCalls() });
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: "connected", echoMode: true, tenant, agent }));
    }
  }

  // Handle incoming messages from simulator browser client
  ws.on("message", (message) => {
    try {
      const msg = JSON.parse(message.toString());
      
      if (msg.event === "audio" && msg.data) {
        if (!ai) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: "audio", data: msg.data }));
          }
          return;
        }

        if (geminiConnected && callInfo.geminiSession) {
          callInfo.geminiSession.sendRealtimeInput({
            audio: {
              data: msg.data,
              mimeType: "audio/pcm;rate=16000"
            }
          });
        }
      }
      
      if (msg.event === "hangup") {
        addLog("in", "Simulator", "HANGUP", `Simulator user hung up`, `Call: ${callId}`, tenant.id);
        cleanupSimCall();
      }
    } catch (e) {
      console.error("Failed to parse simulator WebSocket message:", e);
    }
  });

  function cleanupSimCall() {
    if (callInfo.state === CallState.DISCONNECTED) return;
    
    callInfo.state = CallState.DISCONNECTED;
    broadcastToDashboard({ event: "call_updated", calls: getCleanActiveCalls() });

    dbEndAiSession(callId, {
      agentId: agent.id,
      agentName: agent.agentName,
      extension: agent.extension,
      type: CallType.SIMULATED,
      state: "disconnected",
      duration: Math.floor((Date.now() - callInfo.startTime) / 1000)
    }).catch(err => console.error("Error ending AiSession for Simulator call:", err));
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: "disconnected" }));
      ws.close();
    }
    
    if (callInfo.geminiSession) {
      try {
        callInfo.geminiSession.close();
      } catch (e) {}
    }
    
    addLog("system", "Simulator", "CLOSED", `Simulated call ended for Tenant '${tenant.name}'`, `Call: ${callId}`, tenant.id);
    
    setTimeout(() => {
      activeCalls.delete(callId);
      broadcastToDashboard({ event: "call_updated", calls: getCleanActiveCalls() });
    }, 5000);
  }

  ws.on("close", () => {
    cleanupSimCall();
  });

  ws.on("error", (err) => {
    addLog("system", "Simulator", "ERROR", `Simulator connection error: ${err.message}`, `Call: ${callId}`, tenant.id);
    cleanupSimCall();
  });
});

function getSystemStatus(): SystemStatus & { load: number[], memory: { total: number, free: number }, activeAiSessions: number } {
  return {
    tcpPort: TCP_PORT,
    wsPort: HTTP_PORT,
    activeCallsCount: Array.from(activeCalls.values()).filter(c => c.state === CallState.ACTIVE).length,
    geminiConnected: ai !== null,
    isAsteriskServerRunning: tcpServer.listening,
    totalTenantsCount: getAllTenants().length,
    load: os.loadavg(),
    memory: {
      total: os.totalmem(),
      free: os.freemem()
    },
    cpuCount: os.cpus().length,
    activeAiSessions: Array.from(activeCalls.values()).filter(c => c.state === CallState.ACTIVE).length // Assuming active calls = active sessions for now, or I can query DB
  };
}

// ----------------------------------------------------
// Express API Routes
// ----------------------------------------------------
app.use(express.json());

app.get("/api/status", (req, res) => {
  res.json(getSystemStatus());
});

app.get("/api/calls", (req, res) => {
  res.json(getCleanActiveCalls());
});

app.get("/api/logs", (req, res) => {
  res.json(systemLogs.slice(-100));
});

// TENANT MANAGEMENT APIs
app.get("/api/tenants", (req, res) => {
  res.json(getAllTenants());
});

app.get("/api/tenants/:id", (req, res) => {
  const tenant = getTenantById(req.params.id);
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }
  res.json(tenant);
});

app.post("/api/tenants", async (req, res) => {
  const tenantData: TenantProfile = req.body;
  if (!tenantData.id || !tenantData.name) {
    return res.status(400).json({ error: "Missing required tenant fields (id, name)" });
  }
  
  if (!tenantData.documents) tenantData.documents = [];
  if (!tenantData.tools) tenantData.tools = [];
  if (!tenantData.callbackRequests) tenantData.callbackRequests = [];

  const saved = await saveOrUpdateTenant(tenantData);
  broadcastToDashboard({ event: "tenant_updated" });
  addLog("system", "Gateway", "TENANT_SAVE", `Saved/Updated Tenant '${saved.name}' (${saved.id})`);
  res.json(saved);
});

app.delete("/api/tenants/:id", async (req, res) => {
  const success = await deleteTenant(req.params.id);
  if (success) {
    broadcastToDashboard({ event: "tenant_updated" });
    addLog("system", "Gateway", "TENANT_DELETE", `Deleted Tenant ID '${req.params.id}'`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Tenant not found" });
  }
});

// AGENT MANAGEMENT APIs (Multi-Agent per Tenant)
app.get("/api/tenants/:tenantId/agents", (req, res) => {
  const tenant = getTenantById(req.params.tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });
  res.json(tenant.agents || []);
});

app.post("/api/tenants/:tenantId/agents", async (req, res) => {
  const { tenantId } = req.params;
  const agentData = req.body;
  if (!agentData.agentName || !agentData.extension) {
    return res.status(400).json({ error: "agentName and extension are required" });
  }

  const result = await saveOrUpdateAgent(tenantId, agentData);
  if (result) {
    broadcastToDashboard({ event: "tenant_updated" });
    addLog("system", "Gateway", "AGENT_SAVE", `Saved Agent '${result.agent.agentName}' (Ext ${result.agent.extension}) for Tenant '${result.tenant.name}'`, undefined, tenantId);
    res.json(result);
  } else {
    res.status(404).json({ error: "Tenant not found" });
  }
});

app.delete("/api/tenants/:tenantId/agents/:agentId", async (req, res) => {
  const { tenantId, agentId } = req.params;
  const success = await deleteAgent(tenantId, agentId);
  if (success) {
    broadcastToDashboard({ event: "tenant_updated" });
    addLog("system", "Gateway", "AGENT_DELETE", `Deleted Agent ID '${agentId}' from Tenant '${tenantId}'`, undefined, tenantId);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Cannot delete agent (tenant not found or agent is the last remaining agent)" });
  }
});

// RAG DOCUMENT MANAGEMENT APIs
app.post("/api/tenants/:id/documents", async (req, res) => {
  const tenant = getTenantById(req.params.id);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const { title, category, content, id } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  const docId = id || `doc_${Date.now()}`;
  const existingIndex = tenant.documents.findIndex(d => d.id === docId);

  const docItem: KnowledgeDoc = {
    id: docId,
    title,
    category: category || "Umum",
    content,
    updatedAt: Date.now()
  };

  if (existingIndex >= 0) {
    tenant.documents[existingIndex] = docItem;
  } else {
    tenant.documents.push(docItem);
  }

  await saveOrUpdateTenant(tenant);
  broadcastToDashboard({ event: "tenant_updated" });
  addLog("system", "Gateway", "RAG_DOC_SAVE", `Updated Knowledge Doc '${docItem.title}' for Tenant '${tenant.name}'`, undefined, tenant.id);
  res.json(docItem);
});

app.delete("/api/tenants/:id/documents/:docId", async (req, res) => {
  const tenant = getTenantById(req.params.id);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  tenant.documents = tenant.documents.filter(d => d.id !== req.params.docId);
  await saveOrUpdateTenant(tenant);
  broadcastToDashboard({ event: "tenant_updated" });
  addLog("system", "Gateway", "RAG_DOC_DELETE", `Deleted Knowledge Doc '${req.params.docId}' for Tenant '${tenant.name}'`, undefined, tenant.id);
  res.json({ success: true });
});

// CALLBACK REQUEST MANAGEMENT APIs
app.post("/api/tenants/:id/callbacks", async (req, res) => {
  const { callerName, phoneNumber, reason, preferredTime } = req.body;
  const cbData: CallbackRequest = {
    id: `cb_${Date.now()}`,
    tenantId: req.params.id,
    callerName: callerName || "Pemanggil",
    phoneNumber: phoneNumber || "-",
    reason: reason || "Manual callback entry",
    preferredTime: preferredTime || "Segera",
    status: "pending",
    createdAt: Date.now()
  };

  const result = await addTenantCallbackRequest(req.params.id, cbData);
  if (result) {
    broadcastToDashboard({ event: "tenant_updated" });
    res.json(result);
  } else {
    res.status(404).json({ error: "Tenant not found" });
  }
});

app.patch("/api/tenants/:id/callbacks/:cbId", async (req, res) => {
  const { status } = req.body;
  const success = await updateCallbackStatus(req.params.id, req.params.cbId, status);
  if (success) {
    broadcastToDashboard({ event: "tenant_updated" });
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Callback or tenant not found" });
  }
});

// ----------------------------------------------------
// POSTGRESQL DB MODEL APIS (AiIdentity, AiSession, RagDocument, AiToolCall)
// ----------------------------------------------------
// AiIdentity APIs
app.get("/api/db/ai-identities", async (req, res) => {
  try {
    const tenantId = req.query.tenantId as string;
    if (tenantId) {
      const data = await dbGetAiIdentitiesByTenant(tenantId);
      return res.json(data);
    }
    const data = await dbGetAllAiIdentities();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/db/ai-identities", async (req, res) => {
  try {
    const result = await dbUpsertAiIdentity(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/db/ai-identities/:id", async (req, res) => {
  try {
    const success = await dbDeleteAiIdentity(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// WIDGET SCRIPT SERVING ENDPOINT (CORS Enabled)
app.get("/widget.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache");
  const widgetPath = path.join(process.cwd(), "public", "widget.js");
  if (fs.existsSync(widgetPath)) {
    res.sendFile(widgetPath);
  } else {
    res.status(404).send("// Widget script not found");
  }
});

// FORCE TERMINATE CALL SESSION API
function forceTerminateCall(callId: string): boolean {
  const callInfo = activeCalls.get(callId);
  if (!callInfo) return false;

  callInfo.state = CallState.DISCONNECTED;
  
  dbEndAiSession(callId, {
    agentId: callInfo.agentId,
    agentName: callInfo.agentName,
    extension: callInfo.extension,
    type: callInfo.type,
    state: "force_terminated",
    duration: Math.floor((Date.now() - callInfo.startTime) / 1000)
  }).catch(err => console.error("Error ending AiSession on force terminate:", err));

  if (callInfo.geminiSession) {
    try { callInfo.geminiSession.close(); } catch (e) {}
  }

  // Socket (Asterisk)
  if ((callInfo as any).socket && !(callInfo as any).socket.destroyed) {
    try {
      (callInfo as any).socket.write(makeAudioSocketPacket(0x02, Buffer.alloc(0)));
    } catch (e) {}
    try { (callInfo as any).socket.destroy(); } catch (e) {}
  }

  // WebSocket (Simulator / Widget)
  if ((callInfo as any).ws) {
    try {
      (callInfo as any).ws.send(JSON.stringify({ event: "disconnected", reason: "force_terminated" }));
    } catch (e) {}
    try {
      (callInfo as any).ws.close();
    } catch (e) {}
  }

  activeCalls.delete(callId);
  broadcastToDashboard({ event: "call_updated", calls: getCleanActiveCalls() });
  addLog("system", "Gateway", "FORCE_TERMINATE", `Force terminated call session ID '${callId}'`, undefined, callInfo.tenantId);
  return true;
}

app.post("/api/calls/:id/terminate", (req, res) => {
  const success = forceTerminateCall(req.params.id);
  if (success) {
    res.json({ success: true, message: `Session ${req.params.id} terminated` });
  } else {
    res.status(404).json({ error: "Active call session not found" });
  }
});

app.delete("/api/calls/:id", (req, res) => {
  const success = forceTerminateCall(req.params.id);
  if (success) {
    res.json({ success: true, message: `Session ${req.params.id} terminated` });
  } else {
    res.status(404).json({ error: "Active call session not found" });
  }
});

// AiSession APIs
app.get("/api/db/ai-sessions", async (req, res) => {
  try {
    const tenantId = req.query.tenantId as string;
    if (tenantId) {
      const data = await dbGetSessionsByTenant(tenantId);
      return res.json(data);
    }
    const data = await dbGetAllAiSessions();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/db/ai-sessions/tenant/:tenantId", async (req, res) => {
  try {
    const data = await dbGetSessionsByTenant(req.params.tenantId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/db/ai-sessions", async (req, res) => {
  try {
    const result = await dbCreateAiSession(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/db/ai-sessions/:id/end", async (req, res) => {
  try {
    const result = await dbEndAiSession(req.params.id, req.body.sessionState);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// RagDocument APIs
app.get("/api/db/rag-documents/tenant/:tenantId", async (req, res) => {
  try {
    const data = await dbGetRagDocumentsByTenant(req.params.tenantId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/db/rag-documents", async (req, res) => {
  try {
    const { tenantId, filename, fileFormat, fileSizeBytes, mimeType, storagePath, status, errorMessage, chunkCount, aiIdentityId } = req.body;
    const result = await dbCreateRagDocument({
      tenantId,
      filename,
      fileFormat,
      fileSizeBytes: fileSizeBytes ? BigInt(fileSizeBytes) : 0n,
      mimeType,
      storagePath,
      status,
      errorMessage,
      chunkCount,
      aiIdentityId
    });
    // Return with serializable fields
    res.json({ ...result, fileSizeBytes: result.fileSizeBytes.toString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/db/rag-documents/:id/status", async (req, res) => {
  try {
    const { status, errorMessage, chunkCount } = req.body;
    const result = await dbUpdateRagDocumentStatus(req.params.id, status, errorMessage, chunkCount);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AiToolCall APIs
app.get("/api/db/ai-tool-calls/tenant/:tenantId", async (req, res) => {
  try {
    const data = await dbGetToolCallsByTenant(req.params.tenantId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/db/ai-tool-calls", async (req, res) => {
  try {
    const result = await dbCreateAiToolCall(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/db/ai-tool-calls/:id/result", async (req, res) => {
  try {
    const { result, status } = req.body;
    const resItem = await dbUpdateAiToolCallResult(req.params.id, result, status);
    res.json(resItem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/reports/cost-per-agent", async (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId || typeof tenantId !== "string") {
    return res.status(400).json({ error: "tenantId query parameter is required" });
  }

  try {
    const sessions = await dbGetSessionsByTenant(tenantId);
    
    // Aggregation map: agentId -> { agentName, totalDurationSeconds, sessionCount, estimatedCost }
    const report: Record<string, { agentName: string, totalDuration: number, sessionCount: number, estimatedCost: number }> = {};

    sessions.forEach(session => {
      const sessionState = session.sessionState as any;
      // Get agent from direct columns OR sessionState
      const agentId = session.agentId || sessionState?.agentId || "unknown_agent";
      const agentName = (session.sessionState as any)?.agentName || sessionState?.agentName || "Unknown Agent";
      
      let duration = 0;
      if (session.endedAt && session.startedAt) {
        duration = Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000);
      } else if (sessionState?.duration) {
        duration = sessionState.duration;
      }

      if (!report[agentId]) {
        report[agentId] = {
          agentName,
          totalDuration: 0,
          sessionCount: 0,
          estimatedCost: 0
        };
      }

      report[agentId].totalDuration += duration;
      report[agentId].sessionCount += 1;
      // Estimated cost: $0.02 per minute
      report[agentId].estimatedCost += (duration / 60) * 0.02;
    });

    res.json(Object.values(report));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/reports/agent-performance", async (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId || typeof tenantId !== "string") return res.status(400).json({ error: "tenantId required" });
  try {
    const sessions = await dbGetSessionsByTenant(tenantId);
    const report: Record<string, any> = {};
    sessions.forEach(s => {
      const state = s.sessionState as any;
      const agentId = s.agentId || state?.agentId || "unknown";
      if (!report[agentId]) report[agentId] = { agentName: (s.sessionState as any)?.agentName || state?.agentName || "Unknown", calls: 0, success: 0, sentimentScore: 0, totalDuration: 0 };
      report[agentId].calls++;
      if (state?.status === "Success" || s.endedAt) report[agentId].success++;
      const sentimentMap = { Positive: 1, Neutral: 0, Negative: -1 };
      report[agentId].sentimentScore += sentimentMap[state?.sentiment as keyof typeof sentimentMap] || 0;
      if (s.endedAt && s.startedAt) report[agentId].totalDuration += Math.floor((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000);
    });
    res.json(Object.values(report).map(r => ({ ...r, avgDuration: r.calls ? r.totalDuration / r.calls : 0, successRate: r.calls ? (r.success / r.calls) * 100 : 0 })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reports/sentiment-analysis", async (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId || typeof tenantId !== "string") return res.status(400).json({ error: "tenantId required" });
  try {
    const sessions = await dbGetSessionsByTenant(tenantId);
    const summary = { Positive: 0, Neutral: 0, Negative: 0, Unknown: 0 };
    sessions.forEach(s => {
      const sentiment = (s.sessionState as any)?.sentiment || "Unknown";
      if (summary.hasOwnProperty(sentiment)) summary[sentiment as keyof typeof summary]++;
      else summary.Unknown++;
    });
    res.json(summary);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reports/peak-hours", async (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId || typeof tenantId !== "string") return res.status(400).json({ error: "tenantId required" });
  try {
    const sessions = await dbGetSessionsByTenant(tenantId);
    const hours = Array(24).fill(0);
    sessions.forEach(s => {
      const hour = new Date(s.startedAt).getHours();
      hours[hour]++;
    });
    res.json(hours.map((count, hour) => ({ hour, count })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reports/task-completion", async (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId || typeof tenantId !== "string") return res.status(400).json({ error: "tenantId required" });
  try {
    const toolCalls = await dbGetToolCallsByTenant(tenantId);
    const report: Record<string, { toolName: string, total: number, completed: number, failed: number }> = {};
    toolCalls.forEach(tc => {
      if (!report[tc.toolName]) report[tc.toolName] = { toolName: tc.toolName, total: 0, completed: 0, failed: 0 };
      report[tc.toolName].total++;
      if (tc.status === "completed") report[tc.toolName].completed++;
      else if (tc.status === "failed" || tc.status === "error") report[tc.toolName].failed++;
    });
    res.json(Object.values(report));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reports/quality-metrics", async (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId || typeof tenantId !== "string") return res.status(400).json({ error: "tenantId required" });
  try {
    const sessions = await dbGetSessionsByTenant(tenantId);
    let totalLatency = 0, totalConfidence = 0, latencyCount = 0, confidenceCount = 0;
    sessions.forEach(s => {
      const state = s.sessionState as any;
      if (state?.latencyMs) { totalLatency += state.latencyMs; latencyCount++; }
      if (state?.transcriptionConfidence) { totalConfidence += state.transcriptionConfidence; confidenceCount++; }
    });
    res.json({ avgLatencyMs: latencyCount ? totalLatency / latencyCount : 0, avgConfidence: confidenceCount ? totalConfidence / confidenceCount : 0 });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reports/usage-summary", async (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId || typeof tenantId !== "string") return res.status(400).json({ error: "tenantId required" });
  try {
    const sessions = await dbGetSessionsByTenant(tenantId);
    const report: Record<string, { month: string, callCount: number, totalMinutes: number }> = {};
    sessions.forEach(s => {
      const date = new Date(s.startedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!report[monthKey]) report[monthKey] = { month: monthKey, callCount: 0, totalMinutes: 0 };
      report[monthKey].callCount++;
      if (s.endedAt && s.startedAt) report[monthKey].totalMinutes += (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000;
    });
    res.json(Object.values(report).sort((a, b) => b.month.localeCompare(a.month)));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reports/top-active-tenants", async (req, res) => {
  try {
    const tenants = getAllTenants();
    const result = await Promise.all(tenants.map(async (t) => {
      const sessions = await dbGetSessionsByTenant(t.id);
      return {
        id: t.id,
        name: t.name,
        balance: t.balance || 0,
        billingType: t.billingType || "prepaid",
        sessionCount: sessions.length
      };
    }));
    
    // Sort by sessionCount descending and take top 5
    const topTenants = result.sort((a, b) => b.sessionCount - a.sessionCount).slice(0, 5);
    res.json(topTenants);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// RAG DOCUMENT UPLOADS
app.post("/api/tenants/:tenantId/documents", upload.single("file"), async (req, res) => {
  const { tenantId } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const doc = await saveRagDocument(tenantId, {
      filename: file.originalname,
      fileFormat: path.extname(file.originalname).replace(".", ""),
      fileSizeBytes: file.size,
      mimeType: file.mimetype,
      storagePath: file.path,
      status: "completed", // For now we mark as completed, in real RAG we'd trigger a background process
    });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/tenants/:tenantId/documents", async (req, res) => {
  const { tenantId } = req.params;
  try {
    const docs = await getTenantRagDocuments(tenantId);
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// VOICE PROFILES & TTS PREVIEW
app.get("/api/voice-profiles", async (req, res) => {
  try {
    const profiles = await dbGetAllVoiceProfiles();
    res.json(profiles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/voice-profiles", async (req, res) => {
  try {
    const profile = await dbCreateVoiceProfile(req.body);
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tts/preview", async (req, res) => {
  const { text, voice, language } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const aiClient = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const response = await aiClient.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || "Zephyr" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audio: base64Audio });
    } else {
      res.status(500).json({ error: "Failed to generate audio" });
    }
  } catch (err: any) {
    console.error("TTS Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// CHATBOT API FOR TENANT & AGENT
app.post(["/api/tenants/:id/chat", "/api/tenants/:id/agents/:agentId/chat"], async (req, res) => {
  const tenantId = req.params.id;
  const requestedAgentId = req.params.agentId || req.query.agentId || req.body.agentId;

  const resolved = getTenantAndAgent(tenantId, requestedAgentId ? String(requestedAgentId) : undefined);
  if (!resolved) {
    return res.status(404).json({ error: "Tenant or Agent not found" });
  }

  const { tenant, agent } = resolved;
  const { message, history } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message string is required" });
  }

  const systemInstruction = compileSystemInstruction(tenant, agent);
  
  // Resolve model identifier
  let modelName = "gemini-2.5-flash";
  const modelChoice = agent.aiModel || tenant.aiModel || "";
  if (modelChoice) {
    const mLower = modelChoice.toLowerCase();
    if (mLower.includes("2.5 pro") || mLower.includes("2.5-pro")) {
      modelName = "gemini-2.5-pro";
    } else if (mLower.includes("1.5-pro")) {
      modelName = "gemini-1.5-pro";
    } else if (mLower.includes("1.5-flash")) {
      modelName = "gemini-1.5-flash";
    }
  }

  addLog("in", "Gateway", "CHAT_REQ", `Chat request for Agent '${agent.agentName}' (${tenant.name}): "${message.substring(0, 50)}"`, undefined, tenant.id);

  // Resolve effective Gemini API Key for this tenant (Table TenantApiKey -> fallback to .env)
  const effectiveKey = await getEffectiveTenantApiKey(tenant.id, "gemini");
  let activeAiClient = ai;
  if (effectiveKey && effectiveKey !== process.env.GEMINI_API_KEY) {
    try {
      activeAiClient = new GoogleGenAI({
        apiKey: effectiveKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
    } catch (e) {
      console.error("Error instantiating chatbot tenant GoogleGenAI client:", e);
    }
  }

  if (!activeAiClient) {
    const fallbackReply = (agent.greetingMessage ? agent.greetingMessage + " " : "") + 
      (agent.defaultFallbackResponse || tenant.defaultFallbackResponse || "Mohon maaf, saya belum terhubung ke API Key Gemini.");
    addLog("out", "Gateway", "CHAT_RES", `Demo Chat response from '${agent.agentName}' (${tenant.name})`, undefined, tenant.id);
    return res.json({
      reply: fallbackReply,
      agentName: agent.agentName,
      tenantName: tenant.name,
      extension: agent.extension,
      mode: "demo"
    });
  }

  try {
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const item of history) {
        if (item.role && item.text) {
          contents.push({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.text }]
          });
        }
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await activeAiClient.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: agent.temperature ?? tenant.temperature ?? 0.3,
      }
    });

    const replyText = response.text || agent.defaultFallbackResponse || tenant.defaultFallbackResponse || "Mohon maaf, saya tidak dapat menemukan jawaban.";
    addLog("out", "Gemini", "CHAT_RES", `Chat reply from ${agent.agentName}: "${replyText.substring(0, 60)}..."`, undefined, tenant.id);

    return res.json({
      reply: replyText,
      agentName: agent.agentName,
      tenantName: tenant.name,
      extension: agent.extension,
      modelUsed: modelName,
      mode: "live"
    });
  } catch (err: any) {
    console.error("Chat generation error:", err);
    addLog("system", "Gateway", "CHAT_ERROR", `Chat error for Agent '${agent.agentName}': ${err.message}`, undefined, tenant.id);
    
    return res.json({
      reply: agent.defaultFallbackResponse || tenant.defaultFallbackResponse || `Mohon maaf, terjadi kendala saat memproses tanggapan (${err.message}).`,
      agentName: agent.agentName,
      tenantName: tenant.name,
      extension: agent.extension,
      mode: "fallback"
    });
  }
});

// ----------------------------------------------------
// TENANT API KEY MANAGEMENT APIs (TenantApiKey)
// ----------------------------------------------------
app.get("/api/tenants/:tenantId/api-key", async (req, res) => {
  const { tenantId } = req.params;
  const service = (req.query.service as string) || "gemini";
  try {
    const record = await getTenantApiKeyRecord(tenantId, service);
    const effectiveKey = await getEffectiveTenantApiKey(tenantId, service);
    const isFromEnv = !record || record.status !== "active" || !record.apiKey;
    const envKey = process.env.GEMINI_API_KEY || "";

    const maskKey = (key: string) => {
      if (!key) return "";
      if (key.length <= 10) return "••••••••";
      return key.substring(0, 6) + "••••••••" + key.slice(-4);
    };

    res.json({
      id: record?.id || null,
      tenantId: tenantId,
      service,
      apiKey: record?.apiKey || "",
      status: record?.status || "active",
      isFromEnv,
      maskedApiKey: record?.apiKey ? maskKey(record.apiKey) : maskKey(envKey),
      hasEnvFallback: !!envKey,
      createdAt: record?.createdAt || null,
      updatedAt: record?.updatedAt || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tenants/:tenantId/api-key", async (req, res) => {
  const { tenantId } = req.params;
  const { apiKey, service = "gemini", status = "active" } = req.body;

  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return res.status(400).json({ error: "API key text is required" });
  }

  try {
    const saved = await saveOrUpdateTenantApiKey(tenantId, apiKey.trim(), service, status);
    addLog("system", "Gateway", "API_KEY_SAVE", `Saved TenantApiKey (${service}) for Tenant '${tenantId}'`, undefined, tenantId);
    broadcastToDashboard({ event: "tenant_updated" });
    res.json({
      success: true,
      record: saved,
      isFromEnv: false
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tenants/:tenantId/api-key", async (req, res) => {
  const { tenantId } = req.params;
  const service = (req.query.service as string) || "gemini";

  try {
    await deleteTenantApiKey(tenantId, service);
    const envKey = process.env.GEMINI_API_KEY || "";
    addLog("system", "Gateway", "API_KEY_DELETE", `Deleted custom TenantApiKey (${service}) for Tenant '${tenantId}', reverting to .env`, undefined, tenantId);
    broadcastToDashboard({ event: "tenant_updated" });
    res.json({
      success: true,
      revertedToEnv: true,
      hasEnvFallback: !!envKey
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SIP HANDSHAKE & HEADER INTEGRATION APIs (NO EXTENSIONS)
// ----------------------------------------------------
app.post("/api/sip/connect", (req, res) => {
  const apiKey = (req.headers["x-api-key"] as string) || req.body?.apiKey;
  const tenantId = (req.headers["x-tenant-id"] as string) || req.body?.tenantId || req.body?.tenant_id;
  const agentId = (req.headers["x-agent-id"] as string) || req.body?.agentId || req.body?.agent_id;

  const resolved = getTenantAndAgentBySipHeaders(apiKey, tenantId, agentId);
  if (!resolved) {
    return res.status(404).json({
      error: "Tenant or Agent not found using provided SIP headers",
      headersReceived: { apiKey: apiKey ? "***" : undefined, tenantId, agentId }
    });
  }

  const { tenant, agent } = resolved;
  const sessionId = `sip_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  activeSipSessions.set(sessionId, {
    sessionId,
    apiKey,
    tenantId: tenant.id,
    agentId: agent.id,
    callerNumber: req.body?.callerNumber,
    createdAt: Date.now()
  });

  addLog("in", "Asterisk", "SIP_CONNECT", `Asterisk initialized call session ${sessionId} for Agent '${agent.agentName}' via SIP headers (X-Tenant-ID: ${tenant.id})`, undefined, tenant.id);

  return res.json({
    success: true,
    sessionId,
    tenant: { id: tenant.id, name: tenant.name },
    agent: { id: agent.id, name: agent.agentName, voice: agent.prebuiltVoice },
    audioSocket: {
      host: "0.0.0.0",
      port: TCP_PORT,
      uuid: sessionId
    },
    systemInstructionSnippet: compileSystemInstruction(tenant, agent).substring(0, 150) + "..."
  });
});

app.post("/api/sip/resolve", (req, res) => {
  const apiKey = (req.headers["x-api-key"] as string) || req.body?.apiKey;
  const tenantId = (req.headers["x-tenant-id"] as string) || req.body?.tenantId || req.body?.tenant_id;
  const agentId = (req.headers["x-agent-id"] as string) || req.body?.agentId || req.body?.agent_id;

  const resolved = getTenantAndAgentBySipHeaders(apiKey, tenantId, agentId);
  if (!resolved) {
    return res.status(404).json({ error: "Tenant or Agent not found for SIP headers" });
  }

  const { tenant, agent } = resolved;
  res.json({
    tenant,
    agent,
    compiledInstruction: compileSystemInstruction(tenant, agent)
  });
});

app.get("/api/sip/config", (req, res) => {
  res.json({
    protocol: "AudioSocket TCP & WebSocket",
    tcpPort: TCP_PORT,
    httpPort: HTTP_PORT,
    requiredSipHeaders: [
      { name: "X-API-KEY", description: "API Key gateway atau tenant secret" },
      { name: "X-Tenant-ID", description: "ID unik tenant e.g. tenant_cable, tenant_telecom" },
      { name: "X-Agent-ID", description: "ID unik agent e.g. agent_cable_sarah, agent_telko_siti" }
    ],
    dialplanExample: `; Asterisk extensions.conf (SIP Headers without extensions)
[from-internal]
exten => _X.,1,NoOp(AI Gateway Incoming Call)
 same => n,Set(X_API_KEY=\${PJSIP_HEADER(read,X-API-KEY)})
 same => n,Set(X_TENANT_ID=\${PJSIP_HEADER(read,X-Tenant-ID)})
 same => n,Set(X_AGENT_ID=\${PJSIP_HEADER(read,X-Agent-ID)})
 same => n,AudioSocket(\${X_API_KEY}:\${X_TENANT_ID}:\${X_AGENT_ID},127.0.0.1:8050)
 same => n,Hangup()`
  });
});

// RAG DOCUMENT UPLOAD API
app.post("/api/tenants/:id/rag/upload", upload.single("file"), async (req, res) => {
  const tenantId = req.params.id;
  const tenant = getTenantById(tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const file = req.file;
    const ragDoc = await saveRagDocument(tenantId, {
      filename: file.originalname,
      fileFormat: path.extname(file.originalname).substring(1).toUpperCase() || "PDF",
      fileSizeBytes: file.size,
      mimeType: file.mimetype,
      storagePath: file.path,
      status: "completed", 
    });

    if (ragDoc) {
      addLog("system", "Gateway", "RAG_UPLOAD", `Uploaded RAG Document '${ragDoc.filename}' for Tenant '${tenant.name}'`, undefined, tenantId);
      broadcastToDashboard({ event: "tenant_updated" });
      res.json(ragDoc);
    } else {
      res.status(500).json({ error: "Failed to save RAG document to database" });
    }
  } catch (err: any) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// OPENAPI 3.0 & API DOCUMENTATION ENDPOINT
// ----------------------------------------------------
app.get("/api/docs", (req, res) => {
  res.json({
    openapi: "3.0.0",
    info: {
      title: "Multi-Tenant Multi-Agent AI Voice & Text Gateway API",
      version: "2.0.0",
      description: "Dokumentasi REST, WebSocket, dan Asterisk SIP Integration API untuk menghubungkan sistem komunikasi eksisting dengan Gemini Live AI Voice Agents."
    },
    servers: [
      { url: "http://localhost:3000", description: "Local Development Server" },
      { url: "/api", description: "Production Base API URL" }
    ],
    paths: {
      "/api/status": {
        get: {
          summary: "Cek Status Sistem Gateway",
          description: "Mengembalikan port TCP, status koneksi Gemini Live, jumlah panggilan aktif, dan total tenant."
        }
      },
      "/api/calls": {
        get: { summary: "Daftar Panggilan Aktif Real-time" }
      },
      "/api/logs": {
        get: { summary: "Log Aktivitas Gateway Real-time" }
      },
      "/api/sip/connect": {
        post: {
          summary: "Inisiasi Panggilan Asterisk SIP via SIP Headers",
          description: "Memproses SIP Headers (X-API-KEY, X-Tenant-ID, X-Agent-ID) tanpa memerlukan extension number."
        }
      },
      "/api/sip/resolve": {
        post: { summary: "Resolve Agent Metadata & System Prompt via SIP Headers" }
      },
      "/api/tenants": {
        get: { summary: "Dapatkan Seluruh Tenant & Agents" },
        post: { summary: "Tambah / Update Profil Tenant" }
      },
      "/api/tenants/{tenantId}/agents": {
        get: { summary: "Daftar Agent per Tenant" },
        post: { summary: "Tambah / Update Agent pada Tenant" }
      },
      "/api/tenants/{id}/documents": {
        post: { summary: "Tambah / Update Dokumen Knowledge Base (RAG)" }
      },
      "/api/tenants/{id}/callbacks": {
        post: { summary: "Simpan Permintaan Telepon Kembali (Callback)" }
      },
      "/api/tenants/{id}/chat": {
        post: { summary: "Kirim Pesan Teks ke AI Agent (Chatbot API)" }
      }
    }
  });
});

// Configure Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving production static files from dist.");
  }

  httpServer.listen(HTTP_PORT, "0.0.0.0", () => {
    console.log(`Full-stack Express server running on port ${HTTP_PORT}`);
  });
}

startServer();

