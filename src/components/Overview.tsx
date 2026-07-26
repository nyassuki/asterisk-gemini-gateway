import React, { useState, useEffect } from "react";
import { SystemStatus, TenantProfile, CallInfo, AiSessionRecord } from "../types";
import { CostReport } from "./CostReport";
import CallActivityTable from "./CallActivityTable";
import CallVolumeTrendsChart from "./CallVolumeTrendsChart";
import TopTenantsTable from "./TopTenantsTable";
import { 
  Activity, 
  Users, 
  Cpu, 
  PhoneCall, 
  Zap, 
  ShieldCheck, 
  ShieldAlert,
  Server,
  Network,
  Clock,
  TrendingUp,
  BarChart3
} from "lucide-react";

interface OverviewProps {
  status: SystemStatus;
  tenants: TenantProfile[];
  activeCalls: CallInfo[];
  appLang: "id" | "en";
}

export default function Overview({ status, tenants, activeCalls, appLang }: OverviewProps) {
  const isEn = appLang === "en";
  const [dbSessions, setDbSessions] = useState<AiSessionRecord[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch("/api/db/ai-sessions");
        if (res.ok) {
          const data = await res.json();
          setDbSessions(data);
        }
      } catch (err) {
        console.error("Failed to fetch sessions for overview:", err);
      }
    };
    fetchSessions();
  }, []);

  const kpis = [
    {
      label: isEn ? "Total Tenants" : "Total Tenant",
      value: status.totalTenantsCount || tenants.length,
      icon: Users,
      color: "text-indigo-500",
      bg: "bg-white dark:bg-black",
      border: "border-slate-200 dark:border-slate-800"
    },
    {
      label: isEn ? "Active Calls" : "Sesi Aktif",
      value: status.activeCallsCount || activeCalls.length,
      icon: PhoneCall,
      color: "text-emerald-500",
      bg: "bg-white dark:bg-black",
      border: "border-slate-200 dark:border-slate-800"
    },
    {
      label: isEn ? "Gemini Engine" : "Status Gemini",
      value: status.geminiConnected ? (isEn ? "Connected" : "Aktif") : (isEn ? "Offline" : "Tidak Aktif"),
      icon: status.geminiConnected ? ShieldCheck : ShieldAlert,
      color: status.geminiConnected ? "text-emerald-500" : "text-rose-500",
      bg: "bg-white dark:bg-black",
      border: "border-slate-200 dark:border-slate-800"
    },
    {
      label: isEn ? "System Port" : "Port Sistem",
      value: status.tcpPort,
      icon: Server,
      color: "text-amber-500",
      bg: "bg-white dark:bg-black",
      border: "border-slate-200 dark:border-slate-800"
    }
  ];

  return (
    <div className="space-y-6" id="overview-root">
      
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm relative overflow-hidden transition-colors" id="overview-welcome">
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
            {isEn ? "Welcome to VoiceCore" : "Selamat Datang di VoiceCore"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl font-medium">
            {isEn 
              ? "Your centralized hub for managing Gemini-powered AI Voice Agents, Asterisk PBX integration, and real-time conversation analytics."
              : "Pusat kendali terpadu untuk mengelola Agent Suara AI bertenaga Gemini, integrasi PBX Asterisk, dan analisis percakapan real-time."}
          </p>
          
          <div className="flex flex-wrap gap-3 mt-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 transition-colors">
              <Network size={12} />
              SIP GATEWAY: {status.tcpPort}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 transition-colors">
              <Activity size={12} />
              WEB DASHBOARD: {status.wsPort}
            </div>
          </div>
        </div>
        
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="overview-kpi-grid">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className={`p-6 rounded-3xl border ${kpi.bg} ${kpi.border} transition-all hover:scale-[1.02] shadow-sm`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs ${kpi.color} transition-colors`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {kpi.label}
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
                {kpi.value}
              </h3>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-time Call Activity Table & Trends Chart */}
        <div className="lg:col-span-2 space-y-6">
          <CallVolumeTrendsChart dbSessions={dbSessions} activeCalls={activeCalls} appLang={appLang} />
          
          <CallActivityTable activeCalls={activeCalls} appLang={appLang} />

          {/* Cost Report Summary on Dashboard */}
          {tenants.length > 0 && (
            <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 size={20} className="text-emerald-500" />
                  {isEn ? "Cost & Usage Report" : "Laporan Biaya & Penggunaan"}
                </h3>
              </div>
              <CostReport tenantId={tenants[0].id} />
              <p className="text-[10px] text-slate-400 mt-4 text-center italic">
                {isEn ? "Aggregate report for primary tenant based on real-time session logs." : "Laporan agregat untuk tenant utama berdasarkan log sesi real-time."}
              </p>
            </div>
          )}
          <TopTenantsTable />
        </div>

        {/* Right Sidebar: Health & Versions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="font-black text-sm text-slate-900 dark:text-white mb-4 uppercase tracking-widest flex items-center gap-2">
              <Activity size={16} className="text-amber-500" />
              {isEn ? "Engine Health" : "Kesehatan Engine"}
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">{isEn ? "Gateway Uptime" : "Uptime Gateway"}</span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">99.9%</span>
              </div>
              <div className="w-full h-1 bg-slate-100 dark:bg-slate-900 rounded-full">
                <div className="w-full h-full bg-emerald-500 rounded-full" />
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500 font-bold">{isEn ? "API Latency" : "Latensi API"}</span>
                <span className="text-xs font-mono font-bold text-emerald-600">~240ms</span>
              </div>
              <div className="w-full h-1 bg-slate-100 dark:bg-slate-900 rounded-full">
                <div className="w-[85%] h-full bg-emerald-500 rounded-full" />
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={16} className="text-indigo-600" />
                    <span className="text-[10px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">{isEn ? "AI Model Usage" : "Penggunaan Model AI"}</span>
                  </div>
                  <p className="text-xs font-medium text-indigo-800 dark:text-indigo-400">
                    {isEn 
                      ? "Gemini 2.5 Flash is handling 82% of current traffic." 
                      : "Gemini 2.5 Flash menangani 82% trafik saat ini."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
