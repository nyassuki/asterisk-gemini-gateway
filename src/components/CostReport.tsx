import React, { useState, useEffect } from 'react';
import { DollarSign, User, Clock, BarChart3, Loader2, ArrowUpRight, TrendingUp } from 'lucide-react';

interface AgentCostData {
  agentName: string;
  totalDuration: number;
  sessionCount: number;
  estimatedCost: number;
}

interface CostReportProps {
  tenantId: string;
}

export const CostReport: React.FC<CostReportProps> = ({ tenantId }) => {
  const [data, setData] = useState<AgentCostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/reports/cost-per-agent?tenantId=${tenantId}`);
        if (!response.ok) throw new Error('Failed to fetch cost report');
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (tenantId) fetchReport();
  }, [tenantId]);

  const totalCost = data.reduce((acc, curr) => acc + curr.estimatedCost, 0);
  const totalSessions = data.reduce((acc, curr) => acc + curr.sessionCount, 0);
  const totalDuration = data.reduce((acc, curr) => acc + curr.totalDuration, 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Menghitung Biaya...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Estimasi Biaya</span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-900 dark:text-white">${totalCost.toFixed(2)}</span>
            <span className="text-xs font-bold text-slate-500 tracking-tighter">USD</span>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-emerald-600 font-black uppercase">
            <TrendingUp size={12} />
            Berdasarkan Penggunaan Gemini
          </div>
        </div>

        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Durasi AI</span>
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 rounded-xl">
              <Clock size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{Math.floor(totalDuration / 60)}</span>
            <span className="text-xs font-bold text-slate-500 tracking-tighter">Menit</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-4 uppercase">Total dari {totalSessions} Sesi</p>
        </div>

        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efisiensi Biaya</span>
            <div className="p-2 bg-amber-100 dark:bg-amber-950/50 text-amber-600 rounded-xl">
              <BarChart3 size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-900 dark:text-white">${totalSessions > 0 ? (totalCost / totalSessions).toFixed(3) : "0.000"}</span>
            <span className="text-xs font-bold text-slate-500 tracking-tighter">per Sesi</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-4 uppercase">Rata-rata per interaksi</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Breakdown Biaya per Agent</h4>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-lg font-bold uppercase">{data.length} Agent Terdeteksi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sessions</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Total Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Est. Cost (USD)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {data.sort((a, b) => b.estimatedCost - a.estimatedCost).map((agent, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400">
                        <User size={14} />
                      </div>
                      <span className="text-xs font-black text-slate-900 dark:text-white">{agent.agentName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{agent.sessionCount}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {Math.floor(agent.totalDuration / 60)}m {agent.totalDuration % 60}s
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs font-black text-slate-900 dark:text-white">${agent.estimatedCost.toFixed(3)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                      <ArrowUpRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada data penggunaan untuk tenant ini.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 rounded-2xl transition-colors">
        <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
          <strong>Catatan:</strong> Estimasi biaya dihitung berdasarkan durasi interaksi suara dengan model Gemini. Biaya nyata dapat bervariasi tergantung pada jumlah token input/output, penggunaan Multimodal Live API, dan fitur caching. Gunakan angka ini sebagai referensi anggaran operasional.
        </p>
      </div>
    </div>
  );
};
