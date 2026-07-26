import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { GoogleGenAI, Modality } from "@google/genai";
import { TenantProfile, KnowledgeDoc, CallbackRequest, CallInfo, LogItem, SystemStatus } from "../types";
import {
  getAllTenants,
  getTenantById,
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
  saveOrUpdateTenantApiKey,
  deleteTenantApiKey,
  saveRagDocument,
  getTenantRagDocuments
} from "../../server/tenantsStore";
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
  dbCreateVoiceProfile
} from "../db/repository";

// Interface untuk fungsi & state yang disuntikkan dari server utama
export interface ApiContext {
  ai: GoogleGenAI | null;
  systemLogs: LogItem[];
  activeSipSessions: Map<string, any>;
  getCleanActiveCalls: () => CallInfo[];
  getSystemStatus: () => SystemStatus & any;
  forceTerminateCall: (callId: string) => boolean;
  addLog: (direction: "in" | "out" | "system", source: "Asterisk" | "Gateway" | "Gemini" | "Simulator", type: string, message: string, details?: string, tenantId?: string) => void;
  broadcastToDashboard: (data: any) => void;
  TCP_PORT?: string;
  HTTP_PORT?: string;
}


export function createApiRouter(ctx: ApiContext) {
  const router = express.Router();

  // Multer setup for file uploads
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // ----------------------------------------------------
  // MONITORING & LOGS
  // ----------------------------------------------------
  router.get("/api/status", (req, res) => {
    res.json(ctx.getSystemStatus());
  });

  router.get("/api/calls", (req, res) => {
    res.json(ctx.getCleanActiveCalls());
  });

  router.get("/api/logs", (req, res) => {
    res.json(ctx.systemLogs.slice(-100));
  });

  // ----------------------------------------------------
  // TENANT MANAGEMENT APIs
  // ----------------------------------------------------
  router.get("/api/tenants", (req, res) => {
    res.json(getAllTenants());
  });

  router.get("/api/tenants/:id", (req, res) => {
    const tenant = getTenantById(req.params.id);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    res.json(tenant);
  });

  router.post("/api/tenants", async (req, res) => {
    const tenantData: TenantProfile = req.body;
    if (!tenantData.id || !tenantData.name) {
      return res.status(400).json({ error: "Missing required tenant fields (id, name)" });
    }

    if (!tenantData.documents) tenantData.documents = [];
    if (!tenantData.tools) tenantData.tools = [];
    if (!tenantData.callbackRequests) tenantData.callbackRequests = [];

    const saved = await saveOrUpdateTenant(tenantData);
    ctx.broadcastToDashboard({ event: "tenant_updated" });
    ctx.addLog("system", "Gateway", "TENANT_SAVE", `Saved/Updated Tenant '${saved.name}' (${saved.id})`);
    res.json(saved);
  });

  router.delete("/api/tenants/:id", async (req, res) => {
    const success = await deleteTenant(req.params.id);
    if (success) {
      ctx.broadcastToDashboard({ event: "tenant_updated" });
      ctx.addLog("system", "Gateway", "TENANT_DELETE", `Deleted Tenant ID '${req.params.id}'`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Tenant not found" });
    }
  });

  // ----------------------------------------------------
  // AGENT MANAGEMENT APIs
  // ----------------------------------------------------
  router.get("/api/tenants/:tenantId/agents", (req, res) => {
    const tenant = getTenantById(req.params.tenantId);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    res.json(tenant.agents || []);
  });

  router.post("/api/tenants/:tenantId/agents", async (req, res) => {
    const { tenantId } = req.params;
    const agentData = req.body;
    if (!agentData.agentName || !agentData.extension) {
      return res.status(400).json({ error: "agentName and extension are required" });
    }

    const result = await saveOrUpdateAgent(tenantId, agentData);
    if (result) {
      ctx.broadcastToDashboard({ event: "tenant_updated" });
      ctx.addLog("system", "Gateway", "AGENT_SAVE", `Saved Agent '${result.agent.agentName}' (Ext ${result.agent.extension}) for Tenant '${result.tenant.name}'`, undefined, tenantId);
      res.json(result);
    } else {
      res.status(404).json({ error: "Tenant not found" });
    }
  });

  router.delete("/api/tenants/:tenantId/agents/:agentId", async (req, res) => {
    const { tenantId, agentId } = req.params;
    const success = await deleteAgent(tenantId, agentId);
    if (success) {
      ctx.broadcastToDashboard({ event: "tenant_updated" });
      ctx.addLog("system", "Gateway", "AGENT_DELETE", `Deleted Agent ID '${agentId}' from Tenant '${tenantId}'`, undefined, tenantId);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Cannot delete agent (tenant not found or agent is the last remaining agent)" });
    }
  });

  // ----------------------------------------------------
  // RAG DOCUMENT & CALLBACK MANAGEMENT APIs
  // ----------------------------------------------------
  router.post("/api/tenants/:id/documents", async (req, res) => {
    const tenant = getTenantById(req.params.id);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const { title, category, content, id } = req.body;
    if (!title || !content) return res.status(400).json({ error: "Title and content are required" });

    const docId = id || `doc_${Date.now()}`;
    const existingIndex = tenant.documents.findIndex(d => d.id === docId);

    const docItem: KnowledgeDoc = { id: docId, title, category: category || "Umum", content, updatedAt: Date.now() };
    if (existingIndex >= 0) tenant.documents[existingIndex] = docItem;
    else tenant.documents.push(docItem);

    await saveOrUpdateTenant(tenant);
    ctx.broadcastToDashboard({ event: "tenant_updated" });
    ctx.addLog("system", "Gateway", "RAG_DOC_SAVE", `Updated Knowledge Doc '${docItem.title}' for Tenant '${tenant.name}'`, undefined, tenant.id);
    res.json(docItem);
  });

  router.delete("/api/tenants/:id/documents/:docId", async (req, res) => {
    const tenant = getTenantById(req.params.id);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    tenant.documents = tenant.documents.filter(d => d.id !== req.params.docId);
    await saveOrUpdateTenant(tenant);
    ctx.broadcastToDashboard({ event: "tenant_updated" });
    ctx.addLog("system", "Gateway", "RAG_DOC_DELETE", `Deleted Knowledge Doc '${req.params.docId}' for Tenant '${tenant.name}'`, undefined, tenant.id);
    res.json({ success: true });
  });

  router.post("/api/tenants/:id/callbacks", async (req, res) => {
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
      ctx.broadcastToDashboard({ event: "tenant_updated" });
      res.json(result);
    } else {
      res.status(404).json({ error: "Tenant not found" });
    }
  });

  router.patch("/api/tenants/:id/callbacks/:cbId", async (req, res) => {
    const { status } = req.body;
    const success = await updateCallbackStatus(req.params.id, req.params.cbId, status);
    if (success) {
      ctx.broadcastToDashboard({ event: "tenant_updated" });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Callback or tenant not found" });
    }
  });

  // ----------------------------------------------------
  // POSTGRESQL DB MODEL APIS
  // ----------------------------------------------------
  router.get("/api/db/ai-identities", async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string;
      if (tenantId) return res.json(await dbGetAiIdentitiesByTenant(tenantId));
      res.json(await dbGetAllAiIdentities());
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post("/api/db/ai-identities", async (req, res) => {
    try { res.json(await dbUpsertAiIdentity(req.body)); } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.delete("/api/db/ai-identities/:id", async (req, res) => {
    try { res.json({ success: await dbDeleteAiIdentity(req.params.id) }); } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.put("/api/db/ai-identities/:id", async (req, res) => {
    try { res.json(await dbUpsertAiIdentity({ ...req.body, id: req.params.id })); } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get("/api/db/ai-sessions", async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string;
      if (tenantId) return res.json(await dbGetSessionsByTenant(tenantId));
      res.json(await dbGetAllAiSessions());
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get("/api/db/ai-sessions/tenant/:tenantId", async (req, res) => {
    try { res.json(await dbGetSessionsByTenant(req.params.tenantId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post("/api/db/ai-sessions", async (req, res) => {
    try { res.json(await dbCreateAiSession(req.body)); } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.patch("/api/db/ai-sessions/:id/end", async (req, res) => {
    try { res.json(await dbEndAiSession(req.params.id, req.body.sessionState)); } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get("/api/db/rag-documents/tenant/:tenantId", async (req, res) => {
    try { res.json(await dbGetRagDocumentsByTenant(req.params.tenantId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post("/api/db/rag-documents", async (req, res) => {
    try {
      const { tenantId, filename, fileFormat, fileSizeBytes, mimeType, storagePath, status, errorMessage, chunkCount, aiIdentityId } = req.body;
      const result = await dbCreateRagDocument({
        tenantId, filename, fileFormat,
        fileSizeBytes: fileSizeBytes ? BigInt(fileSizeBytes) : 0n,
        mimeType, storagePath, status, errorMessage, chunkCount, aiIdentityId
      });
      res.json({ ...result, fileSizeBytes: result.fileSizeBytes.toString() });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.patch("/api/db/rag-documents/:id/status", async (req, res) => {
    try {
      const { status, errorMessage, chunkCount } = req.body;
      res.json(await dbUpdateRagDocumentStatus(req.params.id, status, errorMessage, chunkCount));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get("/api/db/ai-tool-calls/tenant/:tenantId", async (req, res) => {
    try { res.json(await dbGetToolCallsByTenant(req.params.tenantId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post("/api/db/ai-tool-calls", async (req, res) => {
    try { res.json(await dbCreateAiToolCall(req.body)); } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.patch("/api/db/ai-tool-calls/:id/result", async (req, res) => {
    try {
      const { result, status } = req.body;
      res.json(await dbUpdateAiToolCallResult(req.params.id, result, status));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ----------------------------------------------------
  // STATIC ASSETS & CALL TERMINATION
  // ----------------------------------------------------
  router.get("/widget.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache");
    const widgetPath = path.join(process.cwd(), "public", "widget.js");
    if (fs.existsSync(widgetPath)) res.sendFile(widgetPath);
    else res.status(404).send("// Widget script not found");
  });

  router.post("/api/calls/:id/terminate", (req, res) => {
    if (ctx.forceTerminateCall(req.params.id)) res.json({ success: true, message: `Session ${req.params.id} terminated` });
    else res.status(404).json({ error: "Active call session not found" });
  });

  router.delete("/api/calls/:id", (req, res) => {
    if (ctx.forceTerminateCall(req.params.id)) res.json({ success: true, message: `Session ${req.params.id} terminated` });
    else res.status(404).json({ error: "Active call session not found" });
  });

  // ----------------------------------------------------
  // REPORTING APIs
  // ----------------------------------------------------
  router.get("/api/reports/cost-per-agent", async (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId || typeof tenantId !== "string") return res.status(400).json({ error: "tenantId query parameter is required" });
    try {
      const sessions = await dbGetSessionsByTenant(tenantId);
      const report: Record<string, { agentName: string, totalDuration: number, sessionCount: number, estimatedCost: number }> = {};
      sessions.forEach(session => {
        const sessionState = session.sessionState as any;
        const agentId = session.agentId || sessionState?.agentId || "unknown_agent";
        const agentName = sessionState?.agentName || "Unknown Agent";
        let duration = 0;
        if (session.endedAt && session.startedAt) duration = Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000);
        else if (sessionState?.duration) duration = sessionState.duration;

        if (!report[agentId]) report[agentId] = { agentName, totalDuration: 0, sessionCount: 0, estimatedCost: 0 };
        report[agentId].totalDuration += duration;
        report[agentId].sessionCount += 1;
        report[agentId].estimatedCost += (duration / 60) * 0.02;
      });
      res.json(Object.values(report));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get("/api/reports/agent-performance", async (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId || typeof tenantId !== "string") return res.status(400).json({ error: "tenantId required" });
    try {
      const sessions = await dbGetSessionsByTenant(tenantId);
      const report: Record<string, any> = {};
      sessions.forEach(s => {
        const state = s.sessionState as any;
        const agentId = s.agentId || state?.agentId || "unknown";
        if (!report[agentId]) report[agentId] = { agentName: state?.agentName || "Unknown", calls: 0, success: 0, sentimentScore: 0, totalDuration: 0 };
        report[agentId].calls++;
        if (state?.status === "Success" || s.endedAt) report[agentId].success++;
        const sentimentMap = { Positive: 1, Neutral: 0, Negative: -1 };
        report[agentId].sentimentScore += sentimentMap[state?.sentiment as keyof typeof sentimentMap] || 0;
        if (s.endedAt && s.startedAt) report[agentId].totalDuration += Math.floor((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000);
      });
      res.json(Object.values(report).map(r => ({ ...r, avgDuration: r.calls ? r.totalDuration / r.calls : 0, successRate: r.calls ? (r.success / r.calls) * 100 : 0 })));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get("/api/reports/sentiment-analysis", async (req, res) => {
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

  router.get("/api/reports/peak-hours", async (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId || typeof tenantId !== "string") return res.status(400).json({ error: "tenantId required" });
    try {
      const sessions = await dbGetSessionsByTenant(tenantId);
      const hours = Array(24).fill(0);
      sessions.forEach(s => { hours[new Date(s.startedAt).getHours()]++; });
      res.json(hours.map((count, hour) => ({ hour, count })));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get("/api/reports/task-completion", async (req, res) => {
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

  router.get("/api/reports/quality-metrics", async (req, res) => {
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

  router.get("/api/reports/usage-summary", async (req, res) => {
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

  router.get("/api/reports/top-active-tenants", async (req, res) => {
    try {
      const tenants = getAllTenants();
      const result = await Promise.all(tenants.map(async (t) => {
        const sessions = await dbGetSessionsByTenant(t.id);
        return { id: t.id, name: t.name, balance: t.balance || 0, billingType: t.billingType || "prepaid", sessionCount: sessions.length };
      }));
      res.json(result.sort((a, b) => b.sessionCount - a.sessionCount).slice(0, 5));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ----------------------------------------------------
  // UPLOADS, VOICE PROFILES & TTS
  // ----------------------------------------------------
  router.post(["/api/tenants/:tenantId/documents", "/api/tenants/:id/rag/upload"], upload.single("file"), async (req, res) => {
    const tenantId = req.params.tenantId || req.params.id;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    try {
      const file = req.file;
      const doc = await saveRagDocument(tenantId, {
        filename: file.originalname,
        fileFormat: path.extname(file.originalname).substring(1).toUpperCase() || "PDF",
        fileSizeBytes: file.size,
        mimeType: file.mimetype,
        storagePath: file.path,
        status: "completed",
      });
      ctx.addLog("system", "Gateway", "RAG_UPLOAD", `Uploaded RAG Document '${doc.filename}' for Tenant ID '${tenantId}'`, undefined, tenantId);
      ctx.broadcastToDashboard({ event: "tenant_updated" });
      res.json(doc);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get("/api/tenants/:tenantId/documents", async (req, res) => {
    try { res.json(await getTenantRagDocuments(req.params.tenantId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get("/api/voice-profiles", async (req, res) => {
    try { res.json(await dbGetAllVoiceProfiles()); } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post("/api/voice-profiles", async (req, res) => {
    try { res.json(await dbCreateVoiceProfile(req.body)); } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post("/api/tts/preview", async (req, res) => {
    const { text, voice } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });
    try {
      const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const response = await aiClient.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || "Zephyr" } } } },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) res.json({ audio: base64Audio });
      else res.status(500).json({ error: "Failed to generate audio" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ----------------------------------------------------
  // CHATBOT API
  // ----------------------------------------------------
  router.post(["/api/tenants/:id/chat", "/api/tenants/:id/agents/:agentId/chat"], async (req, res) => {
    const tenantId = req.params.id;
    const requestedAgentId = req.params.agentId || req.query.agentId || req.body.agentId;
    const resolved = getTenantAndAgent(tenantId, requestedAgentId ? String(requestedAgentId) : undefined);
    if (!resolved) return res.status(404).json({ error: "Tenant or Agent not found" });

    const { tenant, agent } = resolved;
    const { message, history } = req.body;
    if (!message || typeof message !== "string") return res.status(400).json({ error: "Message string is required" });

    const systemInstruction = compileSystemInstruction(tenant, agent);
    let modelName = "gemini-2.5-flash";
    const modelChoice = agent.aiModel || tenant.aiModel || "";
    if (modelChoice) {
      const mLower = modelChoice.toLowerCase();
      if (mLower.includes("2.5 pro") || mLower.includes("2.5-pro")) modelName = "gemini-2.5-pro";
      else if (mLower.includes("1.5-pro")) modelName = "gemini-1.5-pro";
      else if (mLower.includes("1.5-flash")) modelName = "gemini-1.5-flash";
    }

    ctx.addLog("in", "Gateway", "CHAT_REQ", `Chat request for Agent '${agent.agentName}' (${tenant.name}): "${message.substring(0, 50)}"`, undefined, tenant.id);
    const effectiveKey = await getEffectiveTenantApiKey(tenant.id, "gemini");
    let activeAiClient = ctx.ai;
    if (effectiveKey && effectiveKey !== process.env.GEMINI_API_KEY) {
      try { activeAiClient = new GoogleGenAI({ apiKey: effectiveKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } }); } catch (e) {}
    }

    if (!activeAiClient) {
      const fallbackReply = (agent.greetingMessage ? agent.greetingMessage + " " : "") + (agent.defaultFallbackResponse || tenant.defaultFallbackResponse || "Mohon maaf, saya belum terhubung ke API Key Gemini.");
      return res.json({ reply: fallbackReply, agentName: agent.agentName, tenantName: tenant.name, extension: agent.extension, mode: "demo" });
    }

    try {
      const contents: any[] = [];
      if (Array.isArray(history)) {
        for (const item of history) {
          if (item.role && item.text) contents.push({ role: item.role === "assistant" ? "model" : "user", parts: [{ text: item.text }] });
        }
      }
      contents.push({ role: "user", parts: [{ text: message }] });

      const response = await activeAiClient.models.generateContent({
        model: modelName,
        contents,
        config: { systemInstruction, temperature: agent.temperature ?? tenant.temperature ?? 0.3 }
      });

      const replyText = response.text || agent.defaultFallbackResponse || tenant.defaultFallbackResponse || "Mohon maaf, saya tidak dapat menemukan jawaban.";
      ctx.addLog("out", "Gemini", "CHAT_RES", `Chat reply from ${agent.agentName}: "${replyText.substring(0, 60)}..."`, undefined, tenant.id);
      return res.json({ reply: replyText, agentName: agent.agentName, tenantName: tenant.name, extension: agent.extension, modelUsed: modelName, mode: "live" });
    } catch (err: any) {
      ctx.addLog("system", "Gateway", "CHAT_ERROR", `Chat error for Agent '${agent.agentName}': ${err.message}`, undefined, tenant.id);
      return res.json({ reply: agent.defaultFallbackResponse || tenant.defaultFallbackResponse || `Mohon maaf, terjadi kendala (${err.message}).`, agentName: agent.agentName, tenantName: tenant.name, extension: agent.extension, mode: "fallback" });
    }
  });

  // ----------------------------------------------------
  // API KEY MANAGEMENT
  // ----------------------------------------------------
  router.get("/api/tenants/:tenantId/api-key", async (req, res) => {
    const { tenantId } = req.params;
    const service = (req.query.service as string) || "gemini";
    try {
      const record = await getTenantApiKeyRecord(tenantId, service);
      const isFromEnv = !record || record.status !== "active" || !record.apiKey;
      const envKey = process.env.GEMINI_API_KEY || "";
      const maskKey = (key: string) => (!key ? "" : key.length <= 10 ? "••••••••" : key.substring(0, 6) + "••••••••" + key.slice(-4));

      res.json({
        id: record?.id || null, tenantId, service, apiKey: record?.apiKey || "", status: record?.status || "active",
        isFromEnv, maskedApiKey: record?.apiKey ? maskKey(record.apiKey) : maskKey(envKey), hasEnvFallback: !!envKey,
        createdAt: record?.createdAt || null, updatedAt: record?.updatedAt || null,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post("/api/tenants/:tenantId/api-key", async (req, res) => {
    const { tenantId } = req.params;
    const { apiKey, service = "gemini", status = "active" } = req.body;
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) return res.status(400).json({ error: "API key text is required" });
    try {
      const saved = await saveOrUpdateTenantApiKey(tenantId, apiKey.trim(), service, status);
      ctx.addLog("system", "Gateway", "API_KEY_SAVE", `Saved TenantApiKey (${service}) for Tenant '${tenantId}'`, undefined, tenantId);
      ctx.broadcastToDashboard({ event: "tenant_updated" });
      res.json({ success: true, record: saved, isFromEnv: false });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.delete("/api/tenants/:tenantId/api-key", async (req, res) => {
    const { tenantId } = req.params;
    const service = (req.query.service as string) || "gemini";
    try {
      await deleteTenantApiKey(tenantId, service);
      ctx.addLog("system", "Gateway", "API_KEY_DELETE", `Deleted custom TenantApiKey (${service}) for Tenant '${tenantId}', reverting to .env`, undefined, tenantId);
      ctx.broadcastToDashboard({ event: "tenant_updated" });
      res.json({ success: true, revertedToEnv: true, hasEnvFallback: !!(process.env.GEMINI_API_KEY || "") });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ----------------------------------------------------
  // SIP HANDSHAKE & OUT-OF-BAND REGISTRATION
  // ----------------------------------------------------
  router.post(["/api/v1/session/register", "/api/sip/register"], (req, res) => {
    const uuid = req.body?.uuid || req.body?.sessionId;
    const tenantId = req.body?.tenant || req.body?.tenantId || req.body?.tenant_id;
    const agentId = req.body?.agent || req.body?.agentId || req.body?.agent_id;
    const apiKey = req.body?.api_key || req.body?.apiKey || req.headers["x-api-key"] as string;
    const callerNumber = req.body?.callerNumber || req.body?.caller_number;

    if (!uuid) return res.status(400).json({ error: "UUID is required for session registration" });
    const resolved = getTenantAndAgentBySipHeaders(apiKey, tenantId, agentId) || getTenantAndAgent(tenantId || "", agentId || "");
    if (!resolved) return res.status(404).json({ error: "Tenant or Agent not found for given parameters" });

    const { tenant, agent } = resolved;
    const formattedUuid = uuid.toLowerCase().trim();

    ctx.activeSipSessions.set(formattedUuid, { sessionId: formattedUuid, apiKey: apiKey || "", tenantId: tenant.id, agentId: agent.id, callerNumber: callerNumber || "Asterisk Call", createdAt: Date.now() });
    setTimeout(() => { if (ctx.activeSipSessions.has(formattedUuid)) ctx.activeSipSessions.delete(formattedUuid); }, 60000);

    ctx.addLog("system", "Gateway", "SESSION_REGISTER", `Registered out-of-band UUID [${formattedUuid}] for Agent '${agent.agentName}' (${tenant.name})`, undefined, tenant.id);
    return res.status(200).json({ status: "success", message: "Session registered successfully", uuid: formattedUuid, tenant: { id: tenant.id, name: tenant.name }, agent: { id: agent.id, name: agent.agentName } });
  });

  router.post("/api/sip/connect", (req, res) => {
    const apiKey = (req.headers["x-api-key"] as string) || req.body?.apiKey;
    const tenantId = (req.headers["x-tenant-id"] as string) || req.body?.tenantId || req.body?.tenant_id;
    const agentId = (req.headers["x-agent-id"] as string) || req.body?.agentId || req.body?.agent_id;

    const resolved = getTenantAndAgentBySipHeaders(apiKey, tenantId, agentId);
    if (!resolved) return res.status(404).json({ error: "Tenant or Agent not found using provided SIP headers", headersReceived: { apiKey: apiKey ? "***" : undefined, tenantId, agentId } });

    const { tenant, agent } = resolved;
    const sessionId = `sip_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    ctx.activeSipSessions.set(sessionId, { sessionId, apiKey, tenantId: tenant.id, agentId: agent.id, callerNumber: req.body?.callerNumber, createdAt: Date.now() });

    ctx.addLog("in", "Asterisk", "SIP_CONNECT", `Asterisk initialized call session ${sessionId} via SIP headers (X-Tenant-ID: ${tenant.id})`, undefined, tenant.id);
    return res.json({
      success: true, sessionId, tenant: { id: tenant.id, name: tenant.name }, agent: { id: agent.id, name: agent.agentName, voice: agent.prebuiltVoice },
      audioSocket: { host: "0.0.0.0", port: ctx.TCP_PORT, uuid: sessionId },
      systemInstructionSnippet: compileSystemInstruction(tenant, agent).substring(0, 150) + "..."
    });
  });

  router.post("/api/sip/resolve", (req, res) => {
    const apiKey = (req.headers["x-api-key"] as string) || req.body?.apiKey;
    const tenantId = (req.headers["x-tenant-id"] as string) || req.body?.tenantId || req.body?.tenant_id;
    const agentId = (req.headers["x-agent-id"] as string) || req.body?.agentId || req.body?.agent_id;

    const resolved = getTenantAndAgentBySipHeaders(apiKey, tenantId, agentId);
    if (!resolved) return res.status(404).json({ error: "Tenant or Agent not found for SIP headers" });
    res.json({ tenant: resolved.tenant, agent: resolved.agent, compiledInstruction: compileSystemInstruction(resolved.tenant, resolved.agent) });
  });

  router.get("/api/sip/config", (req, res) => {
    res.json({
      protocol: "AudioSocket TCP & WebSocket", tcpPort: ctx.TCP_PORT, httpPort: ctx.HTTP_PORT,
      requiredSipHeaders: [{ name: "X-API-KEY" }, { name: "X-Tenant-ID" }, { name: "X-Agent-ID" }]
    });
  });

  // ----------------------------------------------------
  // OPENAPI 3.0 DOCS
  // ----------------------------------------------------
  router.get("/api/docs", (req, res) => {
    res.json({
      openapi: "3.0.0",
      info: { title: "Multi-Tenant Multi-Agent AI Voice & Text Gateway API", version: "2.0.0" },
      paths: { "/api/status": { get: { summary: "Cek Status Gateway" } }, "/api/calls": { get: { summary: "Daftar Panggilan Aktif" } } }
    });
  });

  return router;
}
