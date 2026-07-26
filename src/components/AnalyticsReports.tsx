import React, { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, Users, Clock, CheckCircle2, Zap, Calendar, 
  Download, RefreshCw, Filter, ChevronRight, BarChart3, PieChart as PieIcon, LineChart as LineIcon
} from "lucide-react";
import { TenantProfile } from "../types";

interface AnalyticsReportsProps {
  tenants: TenantProfile[];
}

export const AnalyticsReports: React.FC<AnalyticsReportsProps> = ({ tenants }) => {
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || "");
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [agentPerf, setAgentPerf] = useState<any[]>([]);
  const [sentiment, setSentiment] = useState<any[]>([]);
  const [peakHours, setPeakHours] = useState<any[]>([]);
  const [taskCompletion, setTaskCompletion] = useState<any[]>([]);
  const [quality, setQuality] = useState<any>(null);
  const [usage, setUsage] = useState<any[]>([]);

  const fetchData = async () => {
    if (!selectedTenantId) return;
    setLoading(true);
    try {
      const [perfRes, sentRes, peakRes, taskRes, qualRes, usageRes] = await Promise.all([
        fetch(`/api/reports/agent-performance?tenantId=${selectedTenantId}`).then(r => r.json()),
        fetch(`/api/reports/sentiment-analysis?tenantId=${selectedTenantId}`).then(r => r.json()),
        fetch(`/api/reports/peak-hours?tenantId=${selectedTenantId}`).then(r => r.json()),
        fetch(`/api/reports/task-completion?tenantId=${selectedTenantId}`).then(r => r.json()),
        fetch(`/api/reports/quality-metrics?tenantId=${selectedTenantId}`).then(r => r.json()),
        fetch(`/api/reports/usage-summary?tenantId=${selectedTenantId}`).then(r => r.json())
      ]);

      setAgentPerf(perfRes);
      setSentiment(Object.entries(sentRes).map(([name, value]) => ({ name, value })));
      setPeakHours(peakRes);
      setTaskCompletion(taskRes);
      setQuality(qualRes);
      setUsage(usageRes);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTenantId]);

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

  return (
    <div className="space-y-8 pb-12" id="analytics-root">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="text-indigo-500" size={28} />
            Advanced AI Analytics
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Deep insights into agent performance, customer sentiment, and operational efficiency.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors" size={16} />
            <select 
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="pl-10 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer shadow-sm min-w-[200px]"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300 disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Grid Layout for Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 1. Agent Performance (Bar Chart) */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <Users size={24} />
              </div>
              <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight">Agent Performance</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md uppercase tracking-wider">Top 5 Agents</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentPerf.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-900" opacity={0.5} />
                <XAxis dataKey="agentName" fontSize={11} fontWeight={600} tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={10} />
                <YAxis fontSize={11} fontWeight={600} tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: 'currentColor', opacity: 0.1}}
                  contentStyle={{
                    borderRadius: '16px', 
                    border: 'none', 
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
                    padding: '12px'
                  }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Bar dataKey="successRate" name="Success Rate %" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                <Bar dataKey="calls" name="Total Calls" fill="#94a3b8" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Sentiment Analysis (Pie Chart) */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <PieIcon size={24} />
              </div>
              <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight">Sentiment Distribution</h3>
            </div>
            <div className="flex gap-2">
               {COLORS.map((c, i) => <div key={i} className="w-2 h-2 rounded-full" style={{backgroundColor: c}} />)}
            </div>
          </div>
          <div className="h-[300px] w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentiment}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sentiment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    borderRadius: '16px', 
                    border: 'none', 
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)'
                  }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Peak Hours (Area Chart) */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-2xl">
                <Clock size={24} />
              </div>
              <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight">Hourly Volume (Peak Hours)</h3>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={peakHours}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-900" opacity={0.5} />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} fontSize={10} axisLine={false} tickLine={false} dy={10} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{
                    borderRadius: '16px', 
                    border: 'none', 
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)'
                  }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Area type="monotone" dataKey="count" stroke="#f59e0b" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Task Completion (Horizontal Bar Chart) */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight">AI Tool Execution Success</h3>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskCompletion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-slate-100 dark:text-slate-900" opacity={0.5} />
                <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis dataKey="toolName" type="category" fontSize={11} fontWeight={600} axisLine={false} tickLine={false} width={100} />
                <Tooltip 
                  contentStyle={{
                    borderRadius: '16px', 
                    border: 'none', 
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)'
                  }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Bar dataKey="completed" name="Success" fill="#10b981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Quality Metrics & Latency (Stat Cards & Small Chart) */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-2xl">
                <Zap size={24} />
              </div>
              <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight">Service Quality (AI QoS)</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-black p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg Latency (TTFB)</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{Math.round(quality?.avgLatencyMs || 0)}</span>
                <span className="text-xs font-bold text-slate-500">ms</span>
              </div>
            </div>
            <div className="bg-white dark:bg-black p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trans. Confidence</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{Math.round((quality?.avgConfidence || 0) * 100)}</span>
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
            </div>
          </div>
          <div className="bg-indigo-600 dark:bg-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="font-bold text-sm mb-1 opacity-90">Network Status</h4>
              <p className="text-xs opacity-75 leading-relaxed">System is operating within optimal parameters. High confidence scores detected.</p>
            </div>
            <Zap className="absolute -right-4 -bottom-4 text-white/10" size={100} />
          </div>
        </div>

        {/* 6. Usage Summary (Line Chart) */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl">
                <Calendar size={24} />
              </div>
              <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight">Usage Summary (History)</h3>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usage}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} dy={10} tick={{fill: '#94a3b8'}} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#000', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)'}}
                  itemStyle={{fontSize: '11px'}}
                />
                <Legend />
                <Line type="monotone" dataKey="callCount" stroke="#f43f5e" strokeWidth={3} dot={{r: 4, fill: '#f43f5e'}} name="Total Calls" />
                <Line type="monotone" dataKey="totalMinutes" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981'}} name="Duration (Min)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Export Footer */}
      <div className="flex items-center justify-between bg-slate-900 dark:bg-black border dark:border-slate-800 text-white p-6 rounded-3xl transition-colors">
        <div className="flex items-center gap-3">
           <Download className="text-indigo-400" />
           <span className="text-sm font-bold">Ready to export detailed CSV data?</span>
        </div>
        <button className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20">
          Export All Reports
        </button>
      </div>
    </div>
  );
};
