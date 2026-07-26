import React, { useState, useEffect } from "react";
import { CallInfo, AiSessionRecord, CallState, CallType } from "../types";
import { 
  PhoneCall, 
  Clock, 
  User, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  History,
  PhoneIncoming,
  Building2,
  RefreshCw,
  PhoneOff
} from "lucide-react";

interface CallActivityTableProps {
  activeCalls: CallInfo[];
  appLang: "id" | "en";
}

export default function CallActivityTable({ activeCalls, appLang }: CallActivityTableProps) {
  const isEn = appLang === "en";
  const [historicalSessions, setHistoricalSessions] = useState<AiSessionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  const fetchHistoricalSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/db/ai-sessions");
      if (res.ok) {
        const data = await res.json();
        setHistoricalSessions(data);
      }
    } catch (err) {
      console.error("Failed to fetch historical sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoricalSessions();
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (state: string | CallState) => {
    switch (state) {
      case CallState.ACTIVE:
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 uppercase border border-emerald-200 dark:border-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {isEn ? "Live" : "Aktif"}
          </span>
        );
      case CallState.DISCONNECTED:
      case "disconnected":
      case "Success":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 uppercase border border-slate-200 dark:border-slate-700">
            <CheckCircle2 size={10} />
            {isEn ? "Ended" : "Selesai"}
          </span>
        );
      case CallState.ERROR:
      case "error":
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 uppercase border border-rose-200 dark:border-rose-800">
            <XCircle size={10} />
            {isEn ? "Failed" : "Gagal"}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 uppercase border border-amber-200 dark:border-amber-800">
            {state}
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Activity size={20} className="text-indigo-500" />
            {isEn ? "Real-Time Call Activity" : "Aktivitas Panggilan Real-Time"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isEn ? "Streaming active and historical AudioSocket sessions." : "Streaming sesi AudioSocket aktif dan riwayat panggilan."}
          </p>
        </div>
        <button 
          onClick={fetchHistoricalSessions}
          disabled={loading}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-indigo-500"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white dark:bg-black border-b border-slate-100 dark:border-slate-800">
              <th className="px-6 py-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{isEn ? "Caller / Session" : "Pemanggil / Sesi"}</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{isEn ? "Agent / Tenant" : "Agent / Tenant"}</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{isEn ? "Status" : "Status"}</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">{isEn ? "Duration" : "Durasi"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {/* Active Calls First */}
            {activeCalls.map((call) => (
              <tr key={call.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 shrink-0">
                      <PhoneIncoming size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-white leading-none mb-1">{call.callerNumber || "Simulator"}</p>
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">ID: {call.id.substring(0, 12)}...</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <User size={12} className="text-indigo-500" />
                      {call.agentName || "Agent AI"}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Building2 size={10} />
                      {call.tenantName || "Unknown"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(call.state)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black font-mono text-emerald-600">
                      {formatDuration(Math.floor((now - call.startTime) / 1000))}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
                      {isEn ? "Live Streaming" : "Berjalan"}
                    </span>
                  </div>
                </td>
              </tr>
            ))}

            {/* Historical Sessions */}
            {historicalSessions.slice(0, 10).map((session) => {
              const isActiveInLocalState = activeCalls.some(c => c.id === session.id);
              if (isActiveInLocalState) return null; // Avoid duplicate showing as historical if it's already in activeCalls

              const startMs = new Date(session.startedAt).getTime();
              const endMs = session.endedAt ? new Date(session.endedAt).getTime() : startMs;
              const durationSecs = session.durationSeconds || Math.floor((endMs - startMs) / 1000);

              return (
                <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                        <History size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-600 dark:text-slate-400 leading-none mb-1">{session.callerNumber || "Anonymous"}</p>
                        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">ID: {session.id.substring(0, 12)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <User size={12} className="text-slate-400" />
                        {session.agentName || "Agent AI"}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Building2 size={10} />
                        {session.tenantName || "Tenant"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(session.status || (session.endedAt ? "disconnected" : "idle"))}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-black font-mono text-slate-500">
                        {formatDuration(durationSecs)}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
                        {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}

            {activeCalls.length === 0 && historicalSessions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-white dark:bg-black flex items-center justify-center mx-auto mb-3 text-slate-300">
                    <PhoneOff size={24} />
                  </div>
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                    {isEn ? "No Call History Found" : "Tidak Ada Riwayat Panggilan"}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-white dark:bg-black border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Clock size={12} />
          {isEn ? "Auto-refreshing live data" : "Sinkronisasi data otomatis"}
        </span>
        <span className="text-[10px] font-mono font-bold text-slate-400">
          Last Check: {new Date(now).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
