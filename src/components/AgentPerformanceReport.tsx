import React, { useMemo } from "react";
import { 
  TenantProfile, 
  AiSessionRecord 
} from "../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { 
  Trophy, 
  AlertCircle, 
  Smile, 
  Zap, 
  Activity, 
  Clock, 
  TrendingUp, 
  Target,
  BarChart3,
  PieChart as PieIcon,
  Timer,
  RefreshCw
} from "lucide-react";

interface AgentPerformanceReportProps {
  tenants: TenantProfile[];
  appLang?: "id" | "en";
}

const COLORS = ["#10b981", "#f59e0b", "#ef4444"]; // Success, Warning, Error
const SENTIMENT_COLORS = {
  Positive: "#10b981",
  Neutral: "#64748b",
  Negative: "#ef4444"
};

export default function AgentPerformanceReport({ 
  tenants, 
  appLang = "id" 
}: AgentPerformanceReportProps) {
  const isEn = appLang === "en";
  const [sessions, setSessions] = React.useState<AiSessionRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch("/api/db/ai-sessions");
        if (res.ok) {
          const data = await res.json();
          setSessions(data);
        }
      } catch (err) {
        console.error("Failed to fetch sessions for performance report:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  // Aggregate Data per Agent
  const agentMetrics = useMemo(() => {
    const metricsMap = new Map<string, {
      agentId: string;
      agentName: string;
      tenantName: string;
      totalCalls: number;
      successfulCalls: number;
      failedCalls: number;
      droppedCalls: number;
      sentiments: { Positive: number; Neutral: number; Negative: number };
      totalLatency: number;
      totalProcessingLatency: number;
      minLatency: number;
      maxLatency: number;
    }>();

    // Initialize all agents
    tenants.forEach(tenant => {
      tenant.agents.forEach(agent => {
        metricsMap.set(agent.id, {
          agentId: agent.id,
          agentName: agent.agentName,
          tenantName: tenant.name,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          droppedCalls: 0,
          sentiments: { Positive: 0, Neutral: 0, Negative: 0 },
          totalLatency: 0,
          totalProcessingLatency: 0,
          minLatency: Infinity,
          maxLatency: 0
        });
      });
    });

    // Process sessions
    sessions.forEach(session => {
      const metric = metricsMap.get(session.agentId || "");
      if (metric) {
        metric.totalCalls++;
        
        // Success Ratio
        if (session.status === "Success") metric.successfulCalls++;
        else if (session.status === "Failed") metric.failedCalls++;
        else if (session.status === "Dropped") metric.droppedCalls++;
        else metric.successfulCalls++; // Fallback for legacy

        // Sentiment
        if (session.sentiment) {
          metric.sentiments[session.sentiment]++;
        } else {
          metric.sentiments.Neutral++; // Fallback
        }

        // Latency
        const lat = session.latencyMs || 250;
        metric.totalLatency += lat;
        metric.minLatency = Math.min(metric.minLatency, lat);
        metric.maxLatency = Math.max(metric.maxLatency, lat);
        metric.totalProcessingLatency += session.processingLatencyMs || 400;
      }
    });

    return Array.from(metricsMap.values()).map(m => ({
      ...m,
      successRate: m.totalCalls > 0 ? (m.successfulCalls / m.totalCalls) * 100 : 0,
      avgLatency: m.totalCalls > 0 ? Math.round(m.totalLatency / m.totalCalls) : 0,
      avgProcessingLatency: m.totalCalls > 0 ? Math.round(m.totalProcessingLatency / m.totalCalls) : 0,
      dominantSentiment: Object.entries(m.sentiments).reduce((a, b) => a[1] > b[1] ? a : b)[0]
    })).sort((a, b) => b.successRate - a.successRate);
  }, [tenants, sessions]);

  // Overall Totals
  const totals = useMemo(() => {
    const totalCalls = agentMetrics.reduce((acc, m) => acc + m.totalCalls, 0);
    const totalSuccessful = agentMetrics.reduce((acc, m) => acc + m.successfulCalls, 0);
    const totalLatency = agentMetrics.reduce((acc, m) => acc + m.totalLatency, 0);
    
    return {
      totalCalls,
      avgSuccessRate: totalCalls > 0 ? (totalSuccessful / totalCalls) * 100 : 0,
      avgLatency: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0
    };
  }, [agentMetrics]);

  // Success Chart Data
  const successData = useMemo(() => [
    { name: isEn ? "Success" : "Berhasil", value: agentMetrics.reduce((acc, m) => acc + m.successfulCalls, 0) },
    { name: isEn ? "Failed" : "Gagal", value: agentMetrics.reduce((acc, m) => acc + m.failedCalls, 0) },
    { name: isEn ? "Dropped" : "Terputus", value: agentMetrics.reduce((acc, m) => acc + m.droppedCalls, 0) }
  ], [agentMetrics, isEn]);

  // Sentiment Chart Data
  const sentimentData = useMemo(() => [
    { name: isEn ? "Positive" : "Positif", count: agentMetrics.reduce((acc, m) => acc + m.sentiments.Positive, 0), color: SENTIMENT_COLORS.Positive },
    { name: isEn ? "Neutral" : "Netral", count: agentMetrics.reduce((acc, m) => acc + m.sentiments.Neutral, 0), color: SENTIMENT_COLORS.Neutral },
    { name: isEn ? "Negative" : "Negatif", count: agentMetrics.reduce((acc, m) => acc + m.sentiments.Negative, 0), color: SENTIMENT_COLORS.Negative }
  ], [agentMetrics, isEn]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl animate-pulse">
        <RefreshCw className="text-amber-500 animate-spin mb-4" size={48} />
        <p className="text-slate-500 font-mono font-bold animate-pulse">
          {isEn ? "Compiling Performance Metrics..." : "Menganalisis Benchmark Performa..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="performance-report-root">

      {/* Header with Refresh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm transition-colors">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
            <BarChart3 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {isEn ? "Agent Intelligence Performance Report" : "Laporan Performa & Inteligensi Agent"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {isEn ? "Advanced analytics for success ratios, emotional sentiment, and technical latency metrics." : "Analisis mendalam untuk rasio keberhasilan, sentimen emosional, dan latensi teknis."}
            </p>
          </div>
        </div>
        <button 
          onClick={() => {
            setLoading(true);
            const fetchSessions = async () => {
              try {
                const res = await fetch("/api/db/ai-sessions");
                if (res.ok) {
                  const data = await res.json();
                  setSessions(data);
                }
              } catch (err) {
                console.error("Failed to refresh sessions:", err);
              } finally {
                setLoading(false);
              }
            };
            fetchSessions();
          }}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-blue-600 text-white dark:text-white rounded-2xl text-xs font-black shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {isEn ? "Refresh Metrics" : "Segarkan Laporan"}
        </button>
      </div>
      
      {/* Global KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/50 p-4 rounded-2xl shadow-sm transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-md">
              <Trophy size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {isEn ? "Success Rate" : "Rasio Keberhasilan"}
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {totals.avgSuccessRate.toFixed(1)}%
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/50 p-4 rounded-2xl shadow-sm transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 text-white rounded-xl shadow-md">
              <Timer size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {isEn ? "Avg TTFB Latency" : "Rata-rata Latensi TTFB"}
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {totals.avgLatency}ms
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/50 p-4 rounded-2xl shadow-sm transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-md">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                {isEn ? "Total Managed Calls" : "Total Panggilan Terkelola"}
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {totals.totalCalls.toLocaleString("id-ID")}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-500 text-white rounded-xl shadow-md">
              <Target size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isEn ? "Active Agents" : "Agent AI Aktif"}
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {agentMetrics.length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Success vs Failure Ratio */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center transition-colors">
          <div className="w-full flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <PieIcon size={18} className="text-emerald-500" />
              {isEn ? "Call Outcome Distribution" : "Distribusi Hasil Panggilan"}
            </h4>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={successData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {successData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "#000000",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    color: "#ffffff",
                    fontSize: "12px",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.5)"
                  }}
                  itemStyle={{ color: "#ffffff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-xs font-mono font-bold mt-2">
            {successData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-slate-500 dark:text-slate-400">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sentiment Analysis Bar Chart */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm lg:col-span-2 transition-colors">
          <div className="w-full flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Smile size={18} className="text-indigo-500" />
              {isEn ? "Sentiment Analysis Summary" : "Ringkasan Analisis Sentimen"}
            </h4>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sentimentData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.5} stroke="currentColor" className="text-slate-100 dark:text-slate-900" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={12} 
                  width={80}
                  tick={{fill: '#94a3b8'}}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "#000000",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    color: "#ffffff",
                    fontSize: "12px",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.5)"
                  }}
                  itemStyle={{ color: "#ffffff" }}
                />
                <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={40}>
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Latency Benchmarks Table & Rankings */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Zap size={18} className="text-amber-500" />
            {isEn ? "Agent Performance & Latency Benchmarks" : "Benchmark Performa & Latensi Agent"}
          </h4>
          <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full text-slate-500 dark:text-slate-400">
            Sorted by Success Rate
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                <th className="px-6 py-4">{isEn ? "Agent Name" : "Nama Agent"}</th>
                <th className="px-6 py-4">{isEn ? "Success Rate" : "Rasio Berhasil"}</th>
                <th className="px-6 py-4">{isEn ? "Avg TTFB" : "Rata TTFB"}</th>
                <th className="px-6 py-4">{isEn ? "Processing" : "Pemrosesan"}</th>
                <th className="px-6 py-4">{isEn ? "Sentiment" : "Sentimen Dominan"}</th>
                <th className="px-6 py-4">{isEn ? "Total Calls" : "Total Call"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 transition-colors">
              {agentMetrics.map((agent) => (
                <tr key={agent.agentId} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 dark:text-white">{agent.agentName}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{agent.tenantName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${agent.successRate}%` }} 
                        />
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{agent.successRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-mono font-bold ${agent.avgLatency > 500 ? "text-amber-500" : "text-slate-700 dark:text-slate-300"}`}>
                      {agent.avgLatency}ms
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                    {agent.avgProcessingLatency}ms
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm border ${
                      agent.dominantSentiment === "Positive" 
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800" 
                        : agent.dominantSentiment === "Negative" 
                        ? "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-800" 
                        : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800"
                    }`}>
                      {agent.dominantSentiment}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-500 dark:text-slate-400">
                    {agent.totalCalls}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
