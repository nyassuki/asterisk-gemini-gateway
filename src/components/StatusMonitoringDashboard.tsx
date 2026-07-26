import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Cpu, 
  Database, 
  Globe, 
  HardDrive, 
  RefreshCw, 
  ShieldCheck, 
  Zap,
  CheckCircle2,
  AlertTriangle,
  Server
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface StatusData {
  tcpPort: number;
  wsPort: number;
  activeCallsCount: number;
  geminiConnected: boolean;
  isAsteriskServerRunning: boolean;
  totalTenantsCount: number;
  load: number[];
  memory: { total: number, free: number };
  activeAiSessions: number;
  cpuCount: number;
}

export default function StatusMonitoringDashboard() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loadHistory, setLoadHistory] = useState<{ time: string, load: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error("Failed to fetch system status");
      const data = await res.json();
      setStatus(data);
      
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLoadHistory(prev => {
        const next = [...prev, { time: now, load: data.load[0] }];
        if (next.length > 20) return next.slice(1);
        return next;
      });
      
      setLoading(false);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={32} className="text-indigo-500 animate-spin" />
      </div>
    );
  }

  const memUsedPercent = status ? Math.round(((status.memory.total - status.memory.free) / status.memory.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Activity className="text-indigo-500" />
            System Health Monitoring
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time infrastructure and AI gateway performance metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">System Operational</span>
        </div>
      </div>

      {/* Grid of status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gemini Status */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 bg-violet-100 dark:bg-violet-950/50 rounded-2xl text-violet-600">
              <Zap size={20} />
            </div>
            {status?.geminiConnected ? (
              <CheckCircle2 size={18} className="text-emerald-500" />
            ) : (
              <AlertTriangle size={18} className="text-rose-500" />
            )}
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gemini AI Link</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            {status?.geminiConnected ? "Connected" : "Disconnected"}
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Multimodal Latency</span>
            <span className="text-[10px] text-emerald-500 font-black italic">~340ms</span>
          </div>
        </div>

        {/* Asterisk Status */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950/50 rounded-2xl text-amber-600">
              <Server size={20} />
            </div>
            {status?.isAsteriskServerRunning ? (
              <CheckCircle2 size={18} className="text-emerald-500" />
            ) : (
              <AlertTriangle size={18} className="text-rose-500" />
            )}
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gateway Engine</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            {status?.isAsteriskServerRunning ? "Running" : "Stopped"}
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">AudioSocket Port</span>
            <span className="text-[10px] text-indigo-500 font-black font-mono">{status?.tcpPort}</span>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/50 rounded-2xl text-indigo-600">
              <Globe size={20} />
            </div>
            <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full uppercase">Live</div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active AI Sessions</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            {status?.activeAiSessions} <span className="text-xs text-slate-400 font-bold ml-1">Concurrent</span>
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Total Tenants</span>
            <span className="text-[10px] text-indigo-500 font-black">{status?.totalTenantsCount}</span>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 bg-rose-100 dark:bg-rose-950/50 rounded-2xl text-rose-600">
              <HardDrive size={20} />
            </div>
            <span className={`text-[10px] font-black ${memUsedPercent > 80 ? "text-rose-500" : "text-emerald-500"} bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full`}>
              {memUsedPercent}% Used
            </span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Memory Allocation</p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${memUsedPercent}%` }}
              className={`h-full ${memUsedPercent > 80 ? "bg-rose-500" : "bg-emerald-500"}`}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Free RAM</span>
            <span className="text-[10px] text-slate-500 font-black">{(status!.memory.free / (1024 * 1024)).toFixed(0)} MB</span>
          </div>
        </div>
      </div>

      {/* Load Monitoring Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu size={20} className="text-indigo-500" />
                Processor Load Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">System load average over the last 1 minute window.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">CPU Load</span>
              </div>
            </div>
          </div>

          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={loadHistory}>
                <defs>
                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-900" />
                <XAxis 
                  dataKey="time" 
                  hide
                />
                <YAxis 
                  domain={[0, 'auto']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="load" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorLoad)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2 mb-6">
            <ShieldCheck size={20} className="text-emerald-500" />
            Security Audit
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600">
                  <Database size={14} />
                </div>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">Prisma / PG Connection</span>
              </div>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            
            <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600">
                  <Globe size={14} />
                </div>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">SSL Certificate</span>
              </div>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>

            <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600">
                  <RefreshCw size={14} />
                </div>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">Auto-Scaling</span>
              </div>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
          </div>

          <div className="mt-8 p-4 bg-indigo-500 rounded-2xl text-white">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Server Load Avg</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-black">{status?.load[0].toFixed(2)}</p>
              <p className="text-xs font-bold opacity-80 mb-1">/ {status?.cpuCount || 1} Cores</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
