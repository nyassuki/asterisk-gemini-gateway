import React, { useState, useEffect, useRef } from "react";
import { SystemStatus, CallInfo, LogItem, CallState, CallType, TenantProfile } from "../types";
import { Network, Server, PhoneCall, HelpCircle, FileText, Code2, ShieldAlert, Users, Building2, MessageSquare, Terminal, Activity, Cpu, DollarSign, Key, Trophy, LayoutDashboard, ChevronDown, ChevronRight, BarChart3, ShieldCheck } from "lucide-react";
import CallLogs from "./CallLogs";
import AsteriskConfig from "./AsteriskConfig";
import Simulator from "./Simulator";
import TenantsManager from "./TenantsManager";
import AgentChatbot from "./AgentChatbot";
import ApiDocumentation from "./ApiDocumentation";
import AiSessionMonitor from "./AiSessionMonitor";
import WidgetEmbedBuilder from "./WidgetEmbedBuilder";
import ModelManagement from "./ModelManagement";
import AgentPerformanceReport from "./AgentPerformanceReport";
import Overview from "./Overview";
import StatusMonitoringDashboard from "./StatusMonitoringDashboard";
import { AnalyticsReports } from "./AnalyticsReports";

interface DashboardProps {
  appTheme?: "dark" | "light" | "system";
  appLang?: "id" | "en";
  setAppTheme?: (theme: "dark" | "light" | "system") => void;
  setAppLang?: (lang: "id" | "en") => void;
}

export default function Dashboard({ appTheme = "system", appLang = "id" }: DashboardProps) {
  const isEn = appLang === "en";

  const [activeTab, setActiveTab] = useState<"overview" | "tenants" | "simulator" | "monitor" | "performance" | "analytics" | "widget" | "chatbot" | "apidocs" | "models" | "config" | "logs" | "health">("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isReportsOpen, setIsReportsOpen] = useState(true);
  const [selectedChatbotTenantId, setSelectedChatbotTenantId] = useState<string>("");
  const [status, setStatus] = useState<SystemStatus>({
    tcpPort: 8050,
    wsPort: 3000,
    activeCallsCount: 0,
    geminiConnected: false,
    isAsteriskServerRunning: false,
    totalTenantsCount: 0
  });
  const [activeCalls, setActiveCalls] = useState<CallInfo[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [tenants, setTenants] = useState<TenantProfile[]>([]);
  const [dashboardConnected, setDashboardConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch Tenants List
  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/tenants");
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        setTenants(data);
      }
    } catch (err) {
      console.error("Failed to fetch tenants:", err);
    }
  };

  useEffect(() => {
    fetchTenants();

    // Connect dashboard WebSocket
    const connectDashboardWs = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/api/ws?role=dashboard`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setDashboardConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === "init") {
              setStatus(data.status);
              setActiveCalls(data.calls);
              setLogs(data.logs);
            } else if (data.event === "log_added") {
              setLogs((prev) => [...prev, data.log].slice(-400));
            } else if (data.event === "call_updated") {
              setActiveCalls(data.calls);
            }
          } catch (e) {
            console.error("Failed to parse dashboard ws message:", e);
          }
        };

        ws.onclose = () => {
          setDashboardConnected(false);
          setTimeout(connectDashboardWs, 3000);
        };

        ws.onerror = () => {
          setDashboardConnected(false);
        };
      } catch (err) {
        console.error("Dashboard WebSocket connection failed:", err);
      }
    };

    connectDashboardWs();

    const pollInterval = setInterval(() => {
      fetchTenants();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
      
      Promise.all([
        fetch("/api/status").then(r => r.ok && r.headers.get("content-type")?.includes("application/json") ? r.json() : null).then(data => data && setStatus(data)).catch(() => {}),
        fetch("/api/calls").then(r => r.ok && r.headers.get("content-type")?.includes("application/json") ? r.json() : null).then(data => data && setActiveCalls(data)).catch(() => {}),
        fetch("/api/logs").then(r => r.ok && r.headers.get("content-type")?.includes("application/json") ? r.json() : null).then(data => data && setLogs(data)).catch(() => {})
      ]);
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleClearLogs = () => {
    setLogs([]);
  };

  const navItems = [
    { id: "overview", label: isEn ? "Dashboard" : "Beranda Dashboard", icon: LayoutDashboard, color: "text-indigo-600" },
    { id: "tenants", label: isEn ? "Tenants & Agents" : "Tenant & Agent AI", icon: Building2, color: "text-indigo-500" },
    { id: "models", label: isEn ? "Model Management" : "Kelola Model & Biaya", icon: Cpu, color: "text-amber-500" },
    { id: "simulator", label: isEn ? "AI Simulator" : "Simulator AI", icon: PhoneCall, color: "text-emerald-500" },
    { id: "widget", label: isEn ? "Widget Builder" : "Pembuat Widget", icon: Code2, color: "text-blue-500" },
    { id: "chatbot", label: isEn ? "Chatbot Test" : "Uji Chatbot", icon: MessageSquare, color: "text-purple-500" },
  ];

  const reportItems = [
    { id: "analytics", label: isEn ? "AI Analytics" : "Analitik AI", icon: BarChart3, color: "text-emerald-600" },
    { id: "health", label: isEn ? "System Health" : "Kesehatan Sistem", icon: ShieldCheck, color: "text-emerald-500" },
    { id: "monitor", label: isEn ? "Live Monitor" : "Monitor Langsung", icon: Activity, color: "text-rose-500" },
    { id: "performance", label: isEn ? "Performance Report" : "Laporan Performa", icon: Trophy, color: "text-amber-600" },
    { id: "logs", label: isEn ? "Terminal Logs" : "Log Terminal", icon: Terminal, color: "text-slate-500" },
  ];

  const secondaryItems = [
    { id: "apidocs", label: isEn ? "API & SIP Docs" : "Dokumentasi API", icon: FileText, color: "text-slate-500" },
    { id: "config", label: isEn ? "Asterisk Guide" : "Panduan Asterisk", icon: Server, color: "text-slate-500" },
  ];

  const renderNavItem = (item: any) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
          isActive 
            ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-black shadow-lg shadow-slate-200/50 dark:shadow-none" 
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/40 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        <Icon size={18} className={`${isActive ? (appTheme === 'dark' ? "text-black" : "text-white") : item.color} group-hover:scale-110 transition-transform`} />
        {isSidebarOpen && <span className="text-sm font-bold tracking-tight">{item.label}</span>}
      </button>
    );
  };

  return (
    <div className={`flex h-screen overflow-hidden ${appTheme === "dark" ? "dark bg-black" : "bg-white text-slate-900"}`}>
      
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? "w-64" : "w-20"} flex-shrink-0 bg-white dark:bg-black border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out z-20`}
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black shadow-lg">V</div>
              <h1 className="font-black text-lg tracking-tighter text-slate-900 dark:text-white">VOICE<span className="text-indigo-600">CORE</span></h1>
            </div>
          ) : (
            <div className="w-8 h-8 bg-indigo-600 rounded-lg mx-auto flex items-center justify-center text-white font-black">V</div>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-6 overflow-y-auto pt-4 no-scrollbar">
          {/* Main Group */}
          <div>
            {isSidebarOpen && <p className="px-4 mb-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{isEn ? "Management" : "Manajemen"}</p>}
            <div className="space-y-1">
              {navItems.map(renderNavItem)}
            </div>
          </div>

          {/* Reports Group */}
          <div>
            {isSidebarOpen && (
              <button 
                onClick={() => setIsReportsOpen(!isReportsOpen)}
                className="w-full flex items-center justify-between px-4 mb-2 text-[10px] font-black text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest transition-colors"
              >
                <span>{isEn ? "Reports Group" : "Grup Laporan"}</span>
                {isReportsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            )}
            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isReportsOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}>
              {reportItems.map(renderNavItem)}
            </div>
          </div>

          {/* Support/Config Group */}
          <div>
            {isSidebarOpen && <p className="px-4 mb-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{isEn ? "System & Docs" : "Sistem & Dokumen"}</p>}
            <div className="space-y-1">
              {secondaryItems.map(renderNavItem)}
            </div>
          </div>
        </nav>

        {/* API Usage Section */}
        {isSidebarOpen && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{isEn ? "API Usage" : "Penggunaan API"}</span>
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">72%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden transition-colors">
              <div 
                className="h-full bg-indigo-500 transition-all duration-1000" 
                style={{ width: "72%" }} 
              />
            </div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 leading-tight">
              {isEn ? "Estimated based on active sessions & model limits." : "Estimasi berdasarkan sesi aktif & limit model."}
            </p>
          </div>
        )}

        {/* User / Bottom Section */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 transition-colors">
          <div className={`flex items-center ${isSidebarOpen ? "gap-3" : "justify-center"} p-2 bg-slate-50 dark:bg-black rounded-xl border border-transparent dark:border-slate-800 transition-colors`}>
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase transition-colors">
              AD
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-xs font-black text-slate-900 dark:text-white truncate">Admin Dashboard</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{status.geminiConnected ? "Gemini 3.1 Live" : "VAD Only Mode"}</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full mt-3 py-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex justify-center"
          >
            {isSidebarOpen ? <ShieldAlert size={16} /> : <Activity size={16} />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top bar with status */}
        <header className="h-16 flex-shrink-0 bg-white dark:bg-black border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-slate-800 dark:text-white capitalize">
              {activeTab.replace("-", " ")}
            </h2>
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2" />
            <div className={`flex items-center gap-1.5 px-3 py-1 border rounded-full text-[10px] font-black uppercase tracking-wider ${dashboardConnected ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900 text-emerald-600" : "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900 text-amber-600"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dashboardConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-ping"}`} />
              {dashboardConnected ? (isEn ? "Gateway Connected" : "Gateway Terhubung") : (isEn ? "Reconnecting..." : "Menghubungkan...")}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-xs font-mono font-bold">
              <div className="flex flex-col items-end">
                <span className="text-slate-400 text-[9px] uppercase tracking-widest">{isEn ? "TCP Port" : "Port TCP"}</span>
                <span className="text-slate-700 dark:text-slate-300">{status.tcpPort}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-slate-400 text-[9px] uppercase tracking-widest">{isEn ? "Active Sesi" : "Sesi Aktif"}</span>
                <span className="text-slate-700 dark:text-slate-300">{status.activeCallsCount}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar relative">
          <div className="max-w-[90%] mx-auto pb-12">
            {!status.geminiConnected && activeTab !== "apidocs" && (
               <div className="mb-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
                <ShieldAlert className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-sm text-amber-800 dark:text-amber-300">
                    {isEn ? "GEMINI_API_KEY Missing" : "GEMINI_API_KEY Belum Ada"}
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed mt-1">
                    {isEn
                      ? "Gateway is running in Echo Test Mode. Add GEMINI_API_KEY in Secrets to enable AI."
                      : "Gateway berjalan dalam Mode Echo. Tambahkan GEMINI_API_KEY di Secrets untuk mengaktifkan AI."}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "overview" && <Overview status={status} tenants={tenants} activeCalls={activeCalls} appLang={appLang} />}
            {activeTab === "health" && <StatusMonitoringDashboard />}
            {activeTab === "analytics" && <AnalyticsReports tenants={tenants} />}
            {activeTab === "tenants" && <TenantsManager tenants={tenants} onRefreshTenants={fetchTenants} />}
            {activeTab === "simulator" && <Simulator tenants={tenants} />}
            {activeTab === "monitor" && <AiSessionMonitor tenants={tenants} activeCalls={activeCalls} />}
            {activeTab === "performance" && <AgentPerformanceReport tenants={tenants} appLang={appLang} />}
            {activeTab === "widget" && <WidgetEmbedBuilder tenants={tenants} appLang={appLang} />}
            {activeTab === "chatbot" && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <MessageSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                      {isEn ? "Select Agent for Chatbot Testing" : "Pilih Agent untuk Uji Chatbot"}
                    </h3>
                  </div>

                  <select
                    value={selectedChatbotTenantId || (tenants[0]?.id || "")}
                    onChange={(e) => setSelectedChatbotTenantId(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 w-full sm:w-auto"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} - Ext {t.extension} ({t.agentName || "Agent"})
                      </option>
                    ))}
                  </select>
                </div>
                {(() => {
                  const activeChatTenant = tenants.find(
                    (t) => t.id === (selectedChatbotTenantId || tenants[0]?.id)
                  ) || tenants[0];
                  if (!activeChatTenant) return null;
                  return <AgentChatbot tenant={activeChatTenant} />;
                })()}
              </div>
            )}
            {activeTab === "models" && <ModelManagement tenants={tenants} activeCalls={activeCalls} appLang={appLang} />}
            {activeTab === "apidocs" && <ApiDocumentation />}
            {activeTab === "config" && <AsteriskConfig />}
            {activeTab === "logs" && <CallLogs logs={logs} onClearLogs={handleClearLogs} />}
          </div>
        </div>
      </main>
    </div>
  );
}
