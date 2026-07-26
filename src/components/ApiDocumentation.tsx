import React, { useState } from "react";
import { 
  Code2, 
  Copy, 
  Check, 
  Terminal, 
  BookOpen, 
  Server, 
  ShieldCheck, 
  Layers, 
  PhoneCall, 
  MessageSquare, 
  Building2, 
  Database, 
  PhoneIncoming, 
  Send,
  ExternalLink,
  Download,
  CheckCircle2,
  BarChart3
} from "lucide-react";

interface ApiEndpoint {
  id: string;
  category: "sip" | "tenants" | "rag" | "callbacks" | "chatbot" | "system" | "reports";
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  title: string;
  description: string;
  headers?: { name: string; required: boolean; description: string; example: string }[];
  requestBody?: string;
  responseExample: string;
  curlExample: string;
}

export default function ApiDocumentation() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<{ [key: string]: string }>({});
  const [loadingTest, setLoadingTest] = useState<string | null>(null);
  const [showOpenApiJson, setShowOpenApiJson] = useState<boolean>(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunTest = async (endpoint: ApiEndpoint) => {
    setLoadingTest(endpoint.id);
    try {
      let url = endpoint.path;
      // Replace path parameters for test run
      url = url.replace("{id}", "tenant_cable").replace("{tenantId}", "tenant_cable").replace("{agentId}", "agent_cable_sarah").replace("{docId}", "doc_cable_1").replace("{cbId}", "cb_demo");

      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": "key_apex_cable_2026",
          "X-Tenant-ID": "tenant_cable",
          "X-Agent-ID": "agent_cable_sarah"
        }
      };

      if (endpoint.method !== "GET" && endpoint.requestBody) {
        options.body = endpoint.requestBody;
      }

      const res = await fetch(url, options);
      const data = await res.json();
      setTestResponse(prev => ({ ...prev, [endpoint.id]: JSON.stringify(data, null, 2) }));
    } catch (err: any) {
      setTestResponse(prev => ({ ...prev, [endpoint.id]: JSON.stringify({ error: err.message }, null, 2) }));
    } finally {
      setLoadingTest(null);
    }
  };

  const endpoints: ApiEndpoint[] = [
    {
      id: "sip-connect",
      category: "sip",
      method: "POST",
      path: "/api/sip/connect",
      title: "Inisiasi Panggilan SIP Asterisk via SIP Headers",
      description: "Menghubungkan panggilan dari Asterisk menggunakan Header SIP (X-API-KEY, X-Tenant-ID, X-Agent-ID) tanpa menggunakan extension number. Mengembalikan token sesi AudioSocket TCP.",
      headers: [
        { name: "X-API-KEY", required: false, description: "API Key Gateway / Secret Tenant", example: "key_apex_cable_2026" },
        { name: "X-Tenant-ID", required: true, description: "ID Unik Tenant", example: "tenant_cable" },
        { name: "X-Agent-ID", required: false, description: "ID Unik Agent (Default jika dikosongkan)", example: "agent_cable_sarah" }
      ],
      requestBody: JSON.stringify({
        callerNumber: "+628123456789",
        channelId: "PJSIP/trunk-000000a1"
      }, null, 2),
      curlExample: `curl -X POST "http://localhost:3000/api/sip/connect" \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: key_apex_cable_2026" \\
  -H "X-Tenant-ID: tenant_cable" \\
  -H "X-Agent-ID: agent_cable_sarah" \\
  -d '{"callerNumber": "+628123456789"}'`,
      responseExample: JSON.stringify({
        success: true,
        sessionId: "sip_sess_1784883100_9x2a",
        tenant: { id: "tenant_cable", name: "Apex Cable & Broadband TV" },
        agent: { id: "agent_cable_sarah", name: "Sarah", voice: "Zephyr" },
        audioSocket: { host: "0.0.0.0", port: 8050, uuid: "sip_sess_1784883100_9x2a" },
        systemInstructionSnippet: "You are Sarah, Senior Customer Care Representative at Apex Cable TV..."
      }, null, 2)
    },
    {
      id: "sip-resolve",
      category: "sip",
      method: "POST",
      path: "/api/sip/resolve",
      title: "Resolve Agent Metadata & System Prompt via SIP Headers",
      description: "Mengambil konfigurasi lengkap Agent dan dokumen Knowledge Base yang sudah di-compile berdasarkan SIP Headers yang dikirim Asterisk.",
      headers: [
        { name: "X-API-KEY", required: false, description: "API Key Gateway", example: "key_apex_cable_2026" },
        { name: "X-Tenant-ID", required: true, description: "ID Unik Tenant", example: "tenant_cable" },
        { name: "X-Agent-ID", required: false, description: "ID Unik Agent", example: "agent_cable_sarah" }
      ],
      curlExample: `curl -X POST "http://localhost:3000/api/sip/resolve" \\
  -H "X-Tenant-ID: tenant_cable" \\
  -H "X-Agent-ID: agent_cable_sarah"`,
      responseExample: JSON.stringify({
        tenant: { id: "tenant_cable", name: "Apex Cable & Broadband TV" },
        agent: { id: "agent_cable_sarah", agentName: "Sarah", role: "Customer Care" },
        compiledInstruction: "Identitas Agent AI: Sarah... [DOKUMEN KNOWLEDGE BASE RAG Context]..."
      }, null, 2)
    },
    {
      id: "sip-config",
      category: "sip",
      method: "GET",
      path: "/api/sip/config",
      title: "Konfigurasi Integrasi Asterisk SIP",
      description: "Mengambil informasi port TCP AudioSocket, spesifikasi header SIP wajib, serta contoh dialplan extensions.conf untuk Asterisk.",
      curlExample: `curl -X GET "http://localhost:3000/api/sip/config"`,
      responseExample: JSON.stringify({
        protocol: "AudioSocket TCP & WebSocket",
        tcpPort: 8050,
        httpPort: 3000,
        requiredSipHeaders: [
          { name: "X-API-KEY", description: "API Key gateway" },
          { name: "X-Tenant-ID", description: "ID tenant e.g. tenant_cable" },
          { name: "X-Agent-ID", description: "ID agent e.g. agent_cable_sarah" }
        ],
        dialplanExample: "; Asterisk extensions.conf (SIP Headers without extensions)\n[from-internal]\nexten => _X.,1,NoOp(AI Gateway Incoming Call)\n same => n,Set(X_API_KEY=${PJSIP_HEADER(read,X-API-KEY)})\n same => n,Set(X_TENANT_ID=${PJSIP_HEADER(read,X-Tenant-ID)})\n same => n,Set(X_AGENT_ID=${PJSIP_HEADER(read,X-Agent-ID)})\n same => n,AudioSocket(${X_API_KEY}:${X_TENANT_ID}:${X_AGENT_ID},127.0.0.1:8050)\n same => n,Hangup()"
      }, null, 2)
    },
    {
      id: "get-tenants",
      category: "tenants",
      method: "GET",
      path: "/api/tenants",
      title: "Dapatkan Seluruh Tenant & Agent Profile",
      description: "Mengambil seluruh daftar Tenant, profil Multi-Agent, dokumen Knowledge Base, dan riwayat callback.",
      curlExample: `curl -X GET "http://localhost:3000/api/tenants"`,
      responseExample: JSON.stringify([
        {
          id: "tenant_cable",
          name: "Apex Cable & Broadband TV",
          businessCategory: "TV Cable & Fiber Broadband",
          agents: [
            { id: "agent_cable_sarah", agentName: "Sarah", role: "Customer Care & Channel Packages", prebuiltVoice: "Zephyr", isDefault: true },
            { id: "agent_cable_mark", agentName: "Mark (Tech Support)", role: "Set-Top Box & Signal Troubleshooting", prebuiltVoice: "Puck", isDefault: false }
          ]
        }
      ], null, 2)
    },
    {
      id: "save-tenant",
      category: "tenants",
      method: "POST",
      path: "/api/tenants",
      title: "Tambah / Update Tenant Baru",
      description: "Membuat profil tenant baru atau memperbarui data tenant yang sudah ada.",
      requestBody: JSON.stringify({
        id: "tenant_finance",
        name: "Bank Mega Finansial",
        businessCategory: "Perbankan & Keuangan",
        description: "Layanan perbankan digital dan kartu kredit."
      }, null, 2),
      curlExample: `curl -X POST "http://localhost:3000/api/tenants" \\
  -H "Content-Type: application/json" \\
  -d '{"id": "tenant_finance", "name": "Bank Mega Finansial", "businessCategory": "Perbankan"}'`,
      responseExample: JSON.stringify({
        id: "tenant_finance",
        name: "Bank Mega Finansial",
        businessCategory: "Perbankan",
        agents: [],
        documents: [],
        tools: []
      }, null, 2)
    },
    {
      id: "save-agent",
      category: "tenants",
      method: "POST",
      path: "/api/tenants/{tenantId}/agents",
      title: "Tambah / Update Agent pada Tenant",
      description: "Menambahkan profil AI Agent baru atau memperbarui pengaturan suara/instruksi agent.",
      requestBody: JSON.stringify({
        id: "agent_fin_andi",
        agentName: "Andi (CS Deposito)",
        role: "Konsultan Deposito & Investasi",
        prebuiltVoice: "Fenrir",
        systemInstruction: "Anda adalah Andi, CS Deposito Bank Mega Finansial...",
        greetingMessage: "Halo, dengan Andi dari Bank Mega Finansial. Ada yang bisa dibantu mengenai deposito?",
        agentStartsFirst: true,
        isDefault: true
      }, null, 2),
      curlExample: `curl -X POST "http://localhost:3000/api/tenants/tenant_cable/agents" \\
  -H "Content-Type: application/json" \\
  -d '{"agentName": "Andi", "prebuiltVoice": "Fenrir", "greetingMessage": "Halo!"}'`,
      responseExample: JSON.stringify({
        tenant: { id: "tenant_cable", name: "Apex Cable & Broadband TV" },
        agent: { id: "agent_fin_andi", agentName: "Andi (CS Deposito)", prebuiltVoice: "Fenrir" }
      }, null, 2)
    },
    {
      id: "save-rag-doc",
      category: "rag",
      method: "POST",
      path: "/api/tenants/{id}/documents",
      title: "Tambah / Update Dokumen Knowledge Base (RAG)",
      description: "Mengisi atau memperbarui dokumen SOP, daftar harga, katalog produk, atau prosedur layanan untuk konteks RAG agent.",
      requestBody: JSON.stringify({
        title: "Katalog Channel Premium & Harga HD Pass 2026",
        category: "Produk & Harga",
        content: "Paket Essential Starter: $49.99/bln. Family Ultra HD Pass: $79.99/bln. Sports Mega Pass: $29.99/bln."
      }, null, 2),
      curlExample: `curl -X POST "http://localhost:3000/api/tenants/tenant_cable/documents" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Katalog Channel", "category": "Produk", "content": "Paket Essential $49.99/bln"}'`,
      responseExample: JSON.stringify({
        id: "doc_1784883100",
        title: "Katalog Channel Premium & Harga HD Pass 2026",
        category: "Produk & Harga",
        content: "Paket Essential Starter: $49.99/bln...",
        updatedAt: 1784883100000
      }, null, 2)
    },
    {
      id: "save-callback",
      category: "callbacks",
      method: "POST",
      path: "/api/tenants/{id}/callbacks",
      title: "Simpan Permintaan Callback / Ticket Baru",
      description: "Mencatat nomor telepon pelanggan dan alasan permintaan callback dari panggilan atau sistem external.",
      requestBody: JSON.stringify({
        callerName: "Ahmad Subagja",
        phoneNumber: "081299887766",
        reason: "Gagal reset Set-Top Box Error 102",
        preferredTime: "Segera"
      }, null, 2),
      curlExample: `curl -X POST "http://localhost:3000/api/tenants/tenant_cable/callbacks" \\
  -H "Content-Type: application/json" \\
  -d '{"callerName": "Ahmad", "phoneNumber": "081299887766", "reason": "Kendala Sinyal"}'`,
      responseExample: JSON.stringify({
        id: "cb_1784883100_a1b2",
        tenantId: "tenant_cable",
        callerName: "Ahmad Subagja",
        phoneNumber: "081299887766",
        reason: "Gagal reset Set-Top Box Error 102",
        status: "pending",
        createdAt: 1784883100000
      }, null, 2)
    },
    {
      id: "agent-chat",
      category: "chatbot",
      method: "POST",
      path: "/api/tenants/{id}/agents/{agentId}/chat",
      title: "Chatbot Text API per Agent",
      description: "Mengirimkan pesan teks ke AI Agent tertentu dan menerima balasan teks berdasarkan RAG Knowledge Base.",
      requestBody: JSON.stringify({
        message: "How much is the Family Ultra HD cable package and what channels are included?",
        history: []
      }, null, 2),
      curlExample: `curl -X POST "http://localhost:3000/api/tenants/tenant_cable/agents/agent_cable_sarah/chat" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Berapa harga paket cable TV Family Ultra HD?"}'`,
      responseExample: JSON.stringify({
        reply: "The Family Ultra HD Pass is $79.99/month and includes 180+ channels featuring HBO Max, Showtime, and 4K Sports!",
        agentName: "Sarah",
        tenantName: "Apex Cable & Broadband TV",
        mode: "live"
      }, null, 2)
    },
    {
      id: "system-status",
      category: "system",
      method: "GET",
      path: "/api/status",
      title: "Cek Status & Port Server Gateway",
      description: "Mengembalikan status koneksi Gemini Live API, port TCP AudioSocket (8050), port WebSocket HTTP (3000), dan total panggilan aktif.",
      curlExample: `curl -X GET "http://localhost:3000/api/status"`,
      responseExample: JSON.stringify({
        tcpPort: 8050,
        wsPort: 3000,
        activeCallsCount: 0,
        geminiConnected: true,
        isAsteriskServerRunning: true,
        totalTenantsCount: 4
      }, null, 2)
    },
    {
      id: "report-agent-perf",
      category: "reports",
      method: "GET",
      path: "/api/reports/agent-performance?tenantId={tenantId}",
      title: "Laporan Performa Agent",
      description: "Analisis performa tiap agent berdasarkan jumlah panggilan, tingkat keberhasilan, skor sentimen, dan durasi rata-rata.",
      curlExample: `curl -X GET "http://localhost:3000/api/reports/agent-performance?tenantId=tenant_cable"`,
      responseExample: JSON.stringify([{
        agentName: "Sarah",
        calls: 45,
        success: 42,
        sentimentScore: 38,
        totalDuration: 13500,
        avgDuration: 300,
        successRate: 93.33
      }], null, 2)
    },
    {
      id: "report-sentiment",
      category: "reports",
      method: "GET",
      path: "/api/reports/sentiment-analysis?tenantId={tenantId}",
      title: "Distribusi Sentimen Pelanggan",
      description: "Ringkasan total sentimen Positive, Neutral, dan Negative dari seluruh interaksi panggilan.",
      curlExample: `curl -X GET "http://localhost:3000/api/reports/sentiment-analysis?tenantId=tenant_cable"`,
      responseExample: JSON.stringify({ Positive: 120, Neutral: 45, Negative: 12, Unknown: 5 }, null, 2)
    },
    {
      id: "report-peak-hours",
      category: "reports",
      method: "GET",
      path: "/api/reports/peak-hours?tenantId={tenantId}",
      title: "Analisis Peak Hours (Waktu Sibuk)",
      description: "Statistik volume panggilan per jam dalam sehari (0-23) untuk membantu manajemen shift agent.",
      curlExample: `curl -X GET "http://localhost:3000/api/reports/peak-hours?tenantId=tenant_cable"`,
      responseExample: JSON.stringify([{ hour: 0, count: 2 }, { hour: 9, count: 85 }, { hour: 10, count: 110 }], null, 2)
    },
    {
      id: "report-tasks",
      category: "reports",
      method: "GET",
      path: "/api/reports/task-completion?tenantId={tenantId}",
      title: "Laporan Penyelesaian Tugas (Tool Calls)",
      description: "Menganalisis penggunaan tools (misal: reset password, cek saldo) dan tingkat keberhasilan eksekusinya oleh AI.",
      curlExample: `curl -X GET "http://localhost:3000/api/reports/task-completion?tenantId=tenant_cable"`,
      responseExample: JSON.stringify([{ toolName: "check_billing", total: 56, completed: 54, failed: 2 }], null, 2)
    },
    {
      id: "report-quality",
      category: "reports",
      method: "GET",
      path: "/api/reports/quality-metrics?tenantId={tenantId}",
      title: "Metrik Kualitas Layanan (Latency & Confidence)",
      description: "Mengukur rata-rata latensi respon (TTFB) dan tingkat kepercayaan transkripsi suara.",
      curlExample: `curl -X GET "http://localhost:3000/api/reports/quality-metrics?tenantId=tenant_cable"`,
      responseExample: JSON.stringify({ avgLatencyMs: 450, avgConfidence: 0.92 }, null, 2)
    },
    {
      id: "report-usage",
      category: "reports",
      method: "GET",
      path: "/api/reports/usage-summary?tenantId={tenantId}",
      title: "Ringkasan Penggunaan Bulanan",
      description: "Akumulasi jumlah panggilan dan total durasi dalam menit per bulan untuk keperluan billing.",
      curlExample: `curl -X GET "http://localhost:3000/api/reports/usage-summary?tenantId=tenant_cable"`,
      responseExample: JSON.stringify([{ month: "2026-07", callCount: 1250, totalMinutes: 6250 }], null, 2)
    }
  ];

  const filteredEndpoints = activeCategory === "all" 
    ? endpoints 
    : endpoints.filter(e => e.category === activeCategory);

  const asteriskSipDialplanCode = `; =========================================================================
; Asterisk Dialplan: Routing Panggilan Menggunakan SIP Headers (TANPA EXTENSION)
; File: /etc/asterisk/extensions.conf
; =========================================================================

[from-internal]
; Routing dinamis untuk seluruh panggilan masuk menggunakan SIP Headers
exten => _X.,1,NoOp(=== AI Voice Gateway Incoming Call ===)
 same => n,Answer()
 same => n,Playback(beep)

 ; 1. Baca Header SIP Kustom dari PJSIP INVITE
 same => n,Set(X_API_KEY=\${PJSIP_HEADER(read,X-API-KEY)})
 same => n,Set(X_TENANT_ID=\${PJSIP_HEADER(read,X-Tenant-ID)})
 same => n,Set(X_AGENT_ID=\${PJSIP_HEADER(read,X-Agent-ID)})

 ; 2. Fallback Default jika header kosong dari Softphone
 same => n,ExecIf($["\${X_TENANT_ID}" = ""]?Set(X_TENANT_ID=tenant_cable))
 same => n,ExecIf($["\${X_AGENT_ID}" = ""]?Set(X_AGENT_ID=agent_cable_sarah))
 same => n,ExecIf($["\${X_API_KEY}" = ""]?Set(X_API_KEY=key_apex_cable_2026))

 ; 3. Kirim streaming audio PCM dua arah ke AudioSocket Gateway (Port 8050)
 ; Format identifier: <X-API-KEY>:<X-Tenant-ID>:<X-Agent-ID>
 same => n,NoOp(Routing to Tenant: \${X_TENANT_ID} | Agent: \${X_AGENT_ID})
 same => n,AudioSocket(\${X_API_KEY}:\${X_TENANT_ID}:\${X_AGENT_ID},127.0.0.1:8050)
 same => n,Hangup()`;

  return (
    <div className="space-y-6" id="api-docs-container">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden" id="api-docs-header">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Code2 size={240} className="text-blue-400" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-mono font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck size={16} />
            <span>Integrasi Sistem Eksisting & Asterisk PBX</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-sans tracking-tight text-slate-100">
            Dokumentasi REST API & SIP Header Integration
          </h2>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed mt-2">
            Gateway AI ini menyediakan endpoint REST, WebSocket, dan <strong className="text-blue-400 font-semibold">AudioSocket TCP (Asterisk 16.5+)</strong>. Koneksi dari Asterisk PBX diarahkan secara presisi menggunakan <strong className="text-amber-300 font-semibold">SIP Headers (X-API-KEY, X-Tenant-ID, X-Agent-ID)</strong> tanpa bergantung pada nomor extension.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={() => setShowOpenApiJson(!showOpenApiJson)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-semibold px-3.5 py-2 rounded-lg transition flex items-center gap-2 shadow-sm"
              id="toggle-openapi-btn"
            >
              <Terminal size={14} />
              <span>{showOpenApiJson ? "Sembunyikan OpenAPI Spec" : "Lihat OpenAPI 3.0 JSON Spec"}</span>
            </button>
            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-sans text-xs font-medium px-3.5 py-2 rounded-lg transition flex items-center gap-1.5"
            >
              <ExternalLink size={14} />
              <span>Buka Raw /api/docs</span>
            </a>
          </div>
        </div>
      </div>

      {/* OpenAPI Spec Viewer Drawer */}
      {showOpenApiJson && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3" id="openapi-json-viewer">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-semibold text-blue-400 flex items-center gap-2">
              <Code2 size={16} />
              <span>OpenAPI 3.0 Schema Output (/api/docs)</span>
            </h3>
            <button
              onClick={() => handleCopy(JSON.stringify({
                openapi: "3.0.0",
                info: { title: "AI Voice & Text Gateway API", version: "2.0.0" },
                paths: endpoints.reduce((acc: any, ep) => {
                  acc[ep.path] = { [ep.method.toLowerCase()]: { summary: ep.title, description: ep.description } };
                  return acc;
                }, {})
              }, null, 2), "openapi_spec")}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded flex items-center gap-1.5"
            >
              {copiedId === "openapi_spec" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>Salin OpenAPI JSON</span>
            </button>
          </div>
          <pre className="bg-slate-900 text-emerald-300 font-mono text-xs p-4 rounded-lg overflow-x-auto border border-slate-800 max-h-[300px]">
            {JSON.stringify({
              openapi: "3.0.0",
              info: {
                title: "Multi-Tenant Multi-Agent AI Voice & Text Gateway API",
                version: "2.0.0",
                description: "Integrasi Asterisk SIP Headers & REST APIs"
              },
              endpointsCount: endpoints.length,
              sipHeadersRequired: ["X-API-KEY", "X-Tenant-ID", "X-Agent-ID"],
              paths: endpoints.reduce((acc: any, ep) => {
                acc[ep.path] = { [ep.method.toLowerCase()]: { summary: ep.title, description: ep.description } };
                return acc;
              }, {})
            }, null, 2)}
          </pre>
        </div>
      )}

      {/* Asterisk SIP Header Integration Card */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 transition-colors" id="asterisk-sip-headers-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded tracking-wide">
              Mekanisme Utama Asterisk PBX
            </span>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans mt-1 flex items-center gap-2">
              <PhoneIncoming size={18} className="text-blue-600 dark:text-blue-400" />
              Koneksi Asterisk Menggunakan SIP Header (Bukan Extension)
            </h3>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg transition-colors">
            <span>AudioSocket TCP:</span>
            <strong className="text-slate-900 dark:text-slate-100 font-bold">Port 8050</strong>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Koneksi panggilan dari Asterisk tidak dipetakan berdasarkan nomor extension, melainkan melalui 3 header SIP khusus yang dikirimkan Asterisk pada saat PJSIP INVITE atau dialplan AudioSocket:
        </p>

        {/* SIP Headers Table */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3" id="sip-headers-spec">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-1 transition-colors">
            <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 block">1. X-API-KEY</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
              API Key autentikasi gateway atau secret khusus tenant (contoh: <code className="bg-white dark:bg-black px-1 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-mono text-slate-800 dark:text-slate-200 transition-colors">key_apex_cable_2026</code>).
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-1 transition-colors">
            <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 block">2. X-Tenant-ID</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
              ID unik profil Tenant perusahaan (contoh: <code className="bg-white dark:bg-black px-1 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-mono text-slate-800 dark:text-slate-200 transition-colors">tenant_cable</code>, <code className="bg-white dark:bg-black px-1 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-mono text-slate-800 dark:text-slate-200 transition-colors">tenant_telecom</code>).
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-1 transition-colors">
            <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-400 block">3. X-Agent-ID</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
              ID unik profil Agent spesifik yang melayani (contoh: <code className="bg-white dark:bg-black px-1 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-mono text-slate-800 dark:text-slate-200 transition-colors">agent_cable_sarah</code>, <code className="bg-white dark:bg-black px-1 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-mono text-slate-800 dark:text-slate-200 transition-colors">agent_cable_mark</code>).
            </p>
          </div>
        </div>

        {/* Code Snippet for extensions.conf */}
        <div className="relative pt-2" id="asterisk-dialplan-snippet">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 bg-slate-900 px-4 py-2 rounded-t-lg border-b border-slate-800">
            <span>/etc/asterisk/extensions.conf</span>
            <button
              onClick={() => handleCopy(asteriskSipDialplanCode, "asterisk_dialplan")}
              className="hover:text-white transition flex items-center gap-1 text-[11px]"
            >
              {copiedId === "asterisk_dialplan" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>Salin Dialplan</span>
            </button>
          </div>
          <pre className="bg-slate-950 text-slate-200 p-4 rounded-b-lg font-mono text-xs overflow-x-auto leading-relaxed border border-slate-900 border-t-0">
            {asteriskSipDialplanCode}
          </pre>
        </div>
      </div>

      {/* API Category Filter Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 select-none overflow-x-auto pb-0.5 transition-colors" id="api-category-tabs">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3.5 py-2 font-sans font-medium text-xs rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${activeCategory === "all" ? "bg-slate-900 dark:bg-black text-white dark:text-blue-400 border-x border-t border-slate-200 dark:border-slate-800 font-semibold" : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"}`}
        >
          <Layers size={14} />
          <span>Semua Endpoint ({endpoints.length})</span>
        </button>
        <button
          onClick={() => setActiveCategory("reports")}
          className={`px-3.5 py-2 font-sans font-medium text-xs rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${activeCategory === "reports" ? "bg-slate-900 dark:bg-black text-white dark:text-blue-400 border-x border-t border-slate-200 dark:border-slate-800 font-semibold" : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"}`}
        >
          <BarChart3 size={14} className="text-emerald-500" />
          <span>Reports & Analytics</span>
        </button>
        <button
          onClick={() => setActiveCategory("sip")}
          className={`px-3.5 py-2 font-sans font-medium text-xs rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${activeCategory === "sip" ? "bg-slate-900 dark:bg-black text-white dark:text-blue-400 border-x border-t border-slate-200 dark:border-slate-800 font-semibold" : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"}`}
        >
          <PhoneIncoming size={14} className="text-blue-500" />
          <span>SIP & Asterisk (Headers)</span>
        </button>
        <button
          onClick={() => setActiveCategory("tenants")}
          className={`px-3.5 py-2 font-sans font-medium text-xs rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${activeCategory === "tenants" ? "bg-slate-900 dark:bg-black text-white dark:text-blue-400 border-x border-t border-slate-200 dark:border-slate-800 font-semibold" : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"}`}
        >
          <Building2 size={14} className="text-indigo-500" />
          <span>Tenant & Multi-Agent</span>
        </button>
        <button
          onClick={() => setActiveCategory("rag")}
          className={`px-3.5 py-2 font-sans font-medium text-xs rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${activeCategory === "rag" ? "bg-slate-900 dark:bg-black text-white dark:text-blue-400 border-x border-t border-slate-200 dark:border-slate-800 font-semibold" : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"}`}
        >
          <Database size={14} className="text-emerald-500" />
          <span>Knowledge Base (RAG)</span>
        </button>
        <button
          onClick={() => setActiveCategory("callbacks")}
          className={`px-3.5 py-2 font-sans font-medium text-xs rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${activeCategory === "callbacks" ? "bg-slate-900 dark:bg-black text-white dark:text-blue-400 border-x border-t border-slate-200 dark:border-slate-800 font-semibold" : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"}`}
        >
          <PhoneCall size={14} className="text-amber-500" />
          <span>Callback & Tickets</span>
        </button>
        <button
          onClick={() => setActiveCategory("chatbot")}
          className={`px-3.5 py-2 font-sans font-medium text-xs rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${activeCategory === "chatbot" ? "bg-slate-900 dark:bg-black text-white dark:text-blue-400 border-x border-t border-slate-200 dark:border-slate-800 font-semibold" : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"}`}
        >
          <MessageSquare size={14} className="text-purple-500" />
          <span>Chatbot Text API</span>
        </button>
        <button
          onClick={() => setActiveCategory("system")}
          className={`px-3.5 py-2 font-sans font-medium text-xs rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${activeCategory === "system" ? "bg-slate-900 dark:bg-black text-white dark:text-blue-400 border-x border-t border-slate-200 dark:border-slate-800 font-semibold" : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"}`}
        >
          <Server size={14} className="text-slate-500" />
          <span>System & Status</span>
        </button>
      </div>

      {/* List of Endpoints */}
      <div className="space-y-6" id="endpoints-list">
        {filteredEndpoints.map((ep) => {
          const methodColors = {
            GET: "bg-emerald-100 text-emerald-800 border-emerald-300",
            POST: "bg-blue-100 text-blue-800 border-blue-300",
            PATCH: "bg-amber-100 text-amber-800 border-amber-300",
            DELETE: "bg-rose-100 text-rose-800 border-rose-300"
          }[ep.method];

          return (
            <div key={ep.id} className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors" id={`endpoint-card-${ep.id}`}>
              {/* Endpoint Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`font-mono text-xs font-extrabold px-2.5 py-1 rounded border uppercase tracking-wide ${methodColors}`}>
                    {ep.method}
                  </span>
                  <code className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded transition-colors">
                    {ep.path}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(ep.curlExample, `curl_${ep.id}`)}
                    className="bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1 rounded transition flex items-center gap-1.5 font-medium border border-transparent dark:border-slate-800"
                    id={`copy-curl-btn-${ep.id}`}
                  >
                    {copiedId === `curl_${ep.id}` ? <Check size={12} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={12} />}
                    <span>Salin cURL</span>
                  </button>
                  <button
                    onClick={() => handleRunTest(ep)}
                    disabled={loadingTest === ep.id}
                    className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-xs px-3 py-1 rounded transition flex items-center gap-1.5 font-medium shadow-xs disabled:opacity-50"
                    id={`test-endpoint-btn-${ep.id}`}
                  >
                    <Send size={12} />
                    <span>{loadingTest === ep.id ? "Memproses..." : "Uji Endpoint (Live)"}</span>
                  </button>
                </div>
              </div>

              {/* Endpoint Description */}
              <div>
                <h4 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-100">{ep.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{ep.description}</p>
              </div>

              {/* Required SIP Headers Table (if any) */}
              {ep.headers && ep.headers.length > 0 && (
                <div className="space-y-1.5" id={`headers-table-${ep.id}`}>
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider block">
                    HTTP / SIP Request Headers:
                  </span>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto transition-colors">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-200 dark:border-slate-800 transition-colors">
                        <tr>
                          <th className="p-2 pl-3">Header</th>
                          <th className="p-2">Wajib</th>
                          <th className="p-2">Deskripsi</th>
                          <th className="p-2 pr-3">Contoh Nilai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px] transition-colors">
                        {ep.headers.map((h, i) => (
                          <tr key={i} className="hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors">
                            <td className="p-2 pl-3 font-bold text-blue-700 dark:text-blue-400">{h.name}</td>
                            <td className="p-2">
                              {h.required ? (
                                <span className="text-rose-600 dark:text-rose-400 font-bold">YA</span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">Opsional</span>
                              )}
                            </td>
                            <td className="p-2 font-sans text-slate-600 dark:text-slate-400">{h.description}</td>
                            <td className="p-2 pr-3 text-slate-800 dark:text-slate-200">{h.example}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Code Blocks: Request Body & Response */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Request / cURL */}
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                    Contoh Perintah cURL:
                  </span>
                  <pre className="bg-slate-950 text-slate-200 p-3 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-900 max-h-[180px]">
                    {ep.curlExample}
                  </pre>
                </div>

                {/* Response Example */}
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                    Contoh Respons JSON:
                  </span>
                  <pre className="bg-slate-950 text-emerald-400 p-3 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-900 max-h-[180px]">
                    {ep.responseExample}
                  </pre>
                </div>
              </div>

              {/* Live Test Response Output */}
              {testResponse[ep.id] && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1" id={`test-result-${ep.id}`}>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <CheckCircle2 size={14} /> Hasil Pengujian Live HTTP:
                    </span>
                    <button
                      onClick={() => setTestResponse(prev => {
                        const copy = { ...prev };
                        delete copy[ep.id];
                        return copy;
                      })}
                      className="text-slate-500 hover:text-slate-300 text-[11px]"
                    >
                      Tutup Hasil
                    </button>
                  </div>
                  <pre className="bg-slate-950 text-sky-300 font-mono text-[11px] p-3 rounded overflow-x-auto border border-slate-800 max-h-[220px]">
                    {testResponse[ep.id]}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
