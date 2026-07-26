import React, { useState, useEffect } from "react";
import { TenantProfile, CallInfo, CallState, AiSessionRecord } from "../types";
import CallVolumeTrendsChart from "./CallVolumeTrendsChart";
import AgentTrafficBreakdownChart from "./AgentTrafficBreakdownChart";
import {
  Activity,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  Clock,
  Building2,
  Search,
  RefreshCw,
  SlidersHorizontal,
  User,
  Database,
  CheckCircle2,
  Radio,
  Volume2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Zap
} from "lucide-react";

interface AiSessionMonitorProps {
  tenants: TenantProfile[];
  activeCalls: CallInfo[];
}

type SortField = "tenant" | "caller" | "type" | "startTime" | "duration";
type SortOrder = "asc" | "desc";

export default function AiSessionMonitor({ tenants, activeCalls }: AiSessionMonitorProps) {
  const [selectedTenantId, setSelectedTenantId] = useState<string>("all");
  const [filterState, setFilterState] = useState<"all" | "active" | "ended">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dbSessions, setDbSessions] = useState<AiSessionRecord[]>([]);
  const [loadingDb, setLoadingDb] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [terminatingIds, setTerminatingIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sorting state for Active Sessions table
  const [sortField, setSortField] = useState<SortField>("duration");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Timer tick for live session durations
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch PostgreSQL AiSessions
  const fetchDbSessions = async () => {
    setLoadingDb(true);
    try {
      const url = selectedTenantId && selectedTenantId !== "all" 
        ? `/api/db/ai-sessions?tenantId=${selectedTenantId}`
        : "/api/db/ai-sessions";
      const res = await fetch(url);
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        setDbSessions(data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch DB AI sessions:", err);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchDbSessions();
  }, [selectedTenantId]);

  // Toast Auto Clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Map tenant names for lookup
  const tenantMap = new Map<string, TenantProfile>();
  tenants.forEach((t) => tenantMap.set(t.id, t));

  // Force Terminate Action
  const handleForceTerminate = async (callId: string, callerNumber?: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin MENGHENTIKAN PAKSA (Force Terminate) sesi panggilan dari ${callerNumber || callId}?`)) {
      return;
    }

    setTerminatingIds((prev) => new Set(prev).add(callId));

    try {
      const res = await fetch(`/api/calls/${callId}/terminate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        setToastMessage({
          type: "success",
          text: `Sesi panggilan ID ${callId} (${callerNumber || "Simulasi"}) berhasil dihentikan secara paksa.`
        });
        // Refresh DB session records
        setTimeout(() => fetchDbSessions(), 500);
      } else {
        const errData = await res.json().catch(() => ({}));
        setToastMessage({
          type: "error",
          text: errData.error || "Gagal menghentikan sesi panggilan."
        });
      }
    } catch (err: any) {
      setToastMessage({
        type: "error",
        text: `Error sistem: ${err.message}`
      });
    } finally {
      setTerminatingIds((prev) => {
        const next = new Set(prev);
        next.delete(callId);
        return next;
      });
    }
  };

  // Filter active calls by selected tenant and search
  const filteredActiveCalls = activeCalls.filter((c) => {
    if (selectedTenantId !== "all" && c.tenantId !== selectedTenantId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCaller = (c.callerNumber || "").toLowerCase().includes(q);
      const matchTenant = (c.tenantName || "").toLowerCase().includes(q);
      const matchChannel = (c.id || "").toLowerCase().includes(q);
      const matchAgent = (c.agentName || "").toLowerCase().includes(q);
      return matchCaller || matchTenant || matchChannel || matchAgent;
    }
    return true;
  });

  // Sort Active Calls
  const sortedActiveCalls = [...filteredActiveCalls].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    if (sortField === "tenant") {
      aVal = a.tenantName || tenantMap.get(a.tenantId || "")?.name || "";
      bVal = b.tenantName || tenantMap.get(b.tenantId || "")?.name || "";
    } else if (sortField === "caller") {
      aVal = a.callerNumber || a.remoteAddress || "";
      bVal = b.callerNumber || b.remoteAddress || "";
    } else if (sortField === "type") {
      aVal = a.type || "";
      bVal = b.type || "";
    } else if (sortField === "startTime") {
      aVal = a.startTime;
      bVal = b.startTime;
    } else if (sortField === "duration") {
      aVal = now - a.startTime;
      bVal = now - b.startTime;
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Toggle Sorting Helper
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "duration" || field === "startTime" ? "desc" : "asc");
    }
  };

  // Filter DB historical sessions
  const filteredDbSessions = dbSessions.filter((s) => {
    if (selectedTenantId !== "all" && s.tenantId !== selectedTenantId) return false;
    
    // Filter by state
    const isEnded = Boolean(s.endedAt);
    if (filterState === "active" && isEnded) return false;
    if (filterState === "ended" && !isEnded) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCaller = (s.callerNumber || "").toLowerCase().includes(q);
      const matchChannel = (s.channelId || s.id || "").toLowerCase().includes(q);
      const tenantName = tenantMap.get(s.tenantId)?.name || "";
      const matchTenant = tenantName.toLowerCase().includes(q);
      return matchCaller || matchChannel || matchTenant;
    }
    return true;
  });

  // KPI Calculations
  const activeCount = filteredActiveCalls.length;
  const activeTenantsCount = new Set(filteredActiveCalls.map((c) => c.tenantId)).size;
  const avgDuration = activeCount > 0
    ? Math.floor(filteredActiveCalls.reduce((acc, c) => acc + Math.floor((now - c.startTime) / 1000), 0) / activeCount)
    : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} className="text-slate-400 opacity-60" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp size={12} className="text-purple-600 font-bold" />
    ) : (
      <ArrowDown size={12} className="text-purple-600 font-bold" />
    );
  };

  return (
    <div className="space-y-6" id="ai-session-monitor-root">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-400"
          }`}
          id="monitor-toast-banner"
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-rose-600 shrink-0" />
            )}
            <span className="text-xs font-semibold">{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top Banner & Control Bar */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors" id="monitor-header">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold" id="monitor-icon">
              <Activity size={18} />
            </div>
            <h2 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100">Monitoring Dashboard Real-Time AiSessions</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Gateway Sync
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Visualisasi status panggilan AI aktif, nomor pemanggil, durasi percakapan real-time, dan fitur paksa henti (Force Terminate) per saluran.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap" id="monitor-actions">
          <button
            onClick={fetchDbSessions}
            disabled={loadingDb}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 dark:border-slate-800 disabled:opacity-50"
            id="refresh-db-btn"
          >
            <RefreshCw size={14} className={loadingDb ? "animate-spin text-indigo-600" : ""} />
            <span>Segarkan Data</span>
          </button>

          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-black px-2.5 py-1.5 rounded-md border border-slate-200/60 dark:border-slate-800/60">
            Diperbarui: {lastRefreshed.toLocaleTimeString("id-ID")}
          </span>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="monitor-kpi-grid">
        {/* Total Active Calls Summary Card */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center justify-between relative overflow-hidden transition-colors" id="kpi-active-calls">
          <div className="space-y-1">
            <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono uppercase font-semibold tracking-wider block">Total Panggilan Aktif</span>
            <span className="font-mono text-3xl font-extrabold text-slate-900 dark:text-white block">{activeCount}</span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Tersambung Real-Time
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
            <PhoneCall size={22} />
          </div>
        </div>

        {/* Active Tenants */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center justify-between transition-colors" id="kpi-active-tenants">
          <div className="space-y-1">
            <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono uppercase font-semibold tracking-wider block">Tenant Beraktivitas</span>
            <span className="font-mono text-3xl font-extrabold text-slate-900 dark:text-white block">{activeTenantsCount}</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
              <Building2 size={12} />
              Dari Total {tenants.length} Tenant
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
            <Building2 size={22} />
          </div>
        </div>

        {/* Avg Duration */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center justify-between transition-colors" id="kpi-avg-duration">
          <div className="space-y-1">
            <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono uppercase font-semibold tracking-wider block">Rata-Rata Durasi Live</span>
            <span className="font-mono text-3xl font-extrabold text-slate-900 dark:text-white block">{formatDuration(avgDuration)}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
              <Clock size={12} />
              Hitungan Detik Aktif
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
            <Clock size={22} />
          </div>
        </div>

        {/* Total DB Sessions */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center justify-between transition-colors" id="kpi-total-db-sessions">
          <div className="space-y-1">
            <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono uppercase font-semibold tracking-wider block">Total Sesi Terdaftar</span>
            <span className="font-mono text-3xl font-extrabold text-slate-900 dark:text-white block">{dbSessions.length}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <Database size={12} />
              PostgreSQL Cloud SQL
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <Database size={22} />
          </div>
        </div>
      </div>

      {/* ANALYTICS CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" id="monitoring-charts-grid">
        <CallVolumeTrendsChart dbSessions={dbSessions} activeCalls={activeCalls} />
        <AgentTrafficBreakdownChart tenants={tenants} dbSessions={dbSessions} activeCalls={activeCalls} />
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 transition-colors" id="monitor-filters">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1" id="filter-controls">
          {/* Tenant Dropdown Selector */}
          <div className="flex items-center gap-2" id="tenant-select-container">
            <Building2 size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-600 w-full sm:w-56 transition-colors"
              id="tenant-filter-select"
            >
              <option value="all">Semua Tenant ({tenants.length})</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Ext {t.extension || "N/A"})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1" id="search-container">
            <Search size={14} className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Cari nomor pemanggil, channel ID, atau tenant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-600 transition-colors"
              id="monitor-search-input"
            />
          </div>
        </div>

        {/* Filter State Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200/80 dark:border-slate-800/80 shrink-0 transition-colors" id="state-filter-tabs">
          <button
            onClick={() => setFilterState("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filterState === "all" ? "bg-white dark:bg-black text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
            id="filter-all-btn"
          >
            Semua ({dbSessions.length})
          </button>
          <button
            onClick={() => setFilterState("active")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${filterState === "active" ? "bg-white dark:bg-black text-purple-700 dark:text-purple-400 shadow-xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
            id="filter-active-btn"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
            Aktif Saja ({activeCount})
          </button>
          <button
            onClick={() => setFilterState("ended")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filterState === "ended" ? "bg-white dark:bg-black text-slate-800 dark:text-white shadow-xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
            id="filter-ended-btn"
          >
            Riwayat Selesai
          </button>
        </div>
      </div>

      {/* SORTABLE TABLE FOR ACTIVE CALL SESSIONS WITH FORCE TERMINATE BUTTON */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden transition-colors" id="active-sessions-table-card">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition-colors" id="active-table-header">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Radio size={16} className="text-purple-600 dark:text-purple-400 animate-pulse" />
              Tabel Panggilan Aktif & Fitur Force Terminate ({sortedActiveCalls.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Klik judul kolom tabel untuk mengurutkan data (Sort). Tekan tombol <strong className="text-rose-600 dark:text-rose-400">Force Terminate</strong> untuk memutuskan koneksi secara paksa.
            </p>
          </div>

          <span className="text-[11px] font-mono font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded border border-purple-200 dark:border-purple-800 shrink-0">
            Real-Time Monitor
          </span>
        </div>

        <div className="overflow-x-auto" id="active-table-wrapper">
          <table className="w-full text-left text-xs" id="active-sessions-table">
            <thead className="bg-slate-100/80 dark:bg-black border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono uppercase text-[10px] tracking-wider select-none">
              <tr>
                <th
                  onClick={() => toggleSort("caller")}
                  className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nomor Pemanggil (Caller)</span>
                    {renderSortIcon("caller")}
                  </div>
                </th>

                <th
                  onClick={() => toggleSort("tenant")}
                  className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tenant & Agent AI</span>
                    {renderSortIcon("tenant")}
                  </div>
                </th>

                <th
                  onClick={() => toggleSort("type")}
                  className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Saluran / Type</span>
                    {renderSortIcon("type")}
                  </div>
                </th>

                <th
                  onClick={() => toggleSort("duration")}
                  className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Durasi Live</span>
                    {renderSortIcon("duration")}
                  </div>
                </th>

                <th
                  onClick={() => toggleSort("startTime")}
                  className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Waktu Mulai</span>
                    {renderSortIcon("startTime")}
                  </div>
                </th>

                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-right">Aksi Paksa (Action)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-sans" id="active-table-body">
              {sortedActiveCalls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500 font-sans">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 mx-auto flex items-center justify-center mb-2">
                      <PhoneCall size={18} />
                    </div>
                    <span className="font-semibold block text-slate-600 dark:text-slate-300">Tidak ada panggilan aktif saat ini.</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 block mt-0.5">
                      Gunakan menu <strong>Simulasi Telepon Agent</strong> atau widget embed untuk memulai test call.
                    </span>
                  </td>
                </tr>
              ) : (
                sortedActiveCalls.map((call) => {
                  const liveSecs = Math.floor((now - call.startTime) / 1000);
                  const tenantObj = tenantMap.get(call.tenantId || "");
                  const isTerminating = terminatingIds.has(call.id);

                  return (
                    <tr
                      key={call.id}
                      className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors"
                      id={`active-row-${call.id}`}
                    >
                      {/* Caller Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold shrink-0">
                            <PhoneIncoming size={14} />
                          </div>
                          <div>
                            <span className="block font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {call.callerNumber || call.remoteAddress || "Simulasi"}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">ID: {call.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Tenant & Agent */}
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        <div>
                          <span className="block font-bold text-slate-800 dark:text-slate-200">
                            {call.tenantName || tenantObj?.name || "Tenant Tanpa Nama"}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                            <User size={11} className="text-indigo-500 dark:text-indigo-400" />
                            Agent: <strong className="text-slate-700 dark:text-slate-300">{call.agentName || "Agent AI"}</strong> (Ext {call.extension || "N/A"})
                          </span>
                        </div>
                      </td>

                      {/* Channel Type */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="px-2.5 py-1 rounded text-[11px] font-bold uppercase bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 inline-block">
                          {call.type}
                        </span>
                      </td>

                      {/* Live Duration */}
                      <td className="py-3.5 px-4 font-mono text-right font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                          {formatDuration(liveSecs)}
                        </span>
                      </td>

                      {/* Started At */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {new Date(call.startTime).toLocaleTimeString("id-ID")}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400 animate-pulse" />
                          {call.state}
                        </span>
                      </td>

                      {/* Force Terminate Action Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleForceTerminate(call.id, call.callerNumber)}
                          disabled={isTerminating}
                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 dark:hover:bg-rose-600 text-rose-700 dark:text-rose-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 ml-auto disabled:opacity-50 shadow-2xs"
                          id={`terminate-btn-${call.id}`}
                          title="Hentikan sambungan panggilan ini secara paksa"
                        >
                          <PhoneOff size={13} className={isTerminating ? "animate-spin" : ""} />
                          <span>{isTerminating ? "Menghentikan..." : "Force Terminate"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POSTGRESQL AISESSION HISTORY TABLE */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden transition-colors" id="db-sessions-table-container">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 transition-colors" id="table-header">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Database size={16} className="text-emerald-600 dark:text-emerald-400" />
              Tabel Riwayat Sesi Permanen (PostgreSQL Cloud SQL)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Menampilkan {filteredDbSessions.length} catatan sesi yang tersimpan permanen di database PostgreSQL.
            </p>
          </div>

          <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800">
            Tabel: ai_sessions
          </span>
        </div>

        <div className="overflow-x-auto" id="table-scroll-wrapper">
          <table className="w-full text-left text-xs" id="sessions-table">
            <thead className="bg-slate-50 dark:bg-black border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] tracking-wider select-none">
              <tr>
                <th className="py-3 px-4 font-semibold">Tenant</th>
                <th className="py-3 px-4 font-semibold">Nomor Pemanggil (Caller)</th>
                <th className="py-3 px-4 font-semibold">Channel ID / Session ID</th>
                <th className="py-3 px-4 font-semibold">Waktu Mulai</th>
                <th className="py-3 px-4 font-semibold">Waktu Selesai</th>
                <th className="py-3 px-4 font-semibold text-right">Durasi Total</th>
                <th className="py-3 px-4 font-semibold text-center">Status Sesi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-sans" id="sessions-table-body">
              {filteredDbSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500 font-sans">
                    Belum ada data sesi yang tersimpan untuk filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredDbSessions.map((session) => {
                  const tenantObj = tenantMap.get(session.tenantId);
                  const isEnded = Boolean(session.endedAt);
                  
                  let durationStr = "Sedang Berjalan";
                  if (session.startedAt) {
                    const startMs = new Date(session.startedAt).getTime();
                    const endMs = session.endedAt ? new Date(session.endedAt).getTime() : now;
                    const diffSecs = Math.max(0, Math.floor((endMs - startMs) / 1000));
                    durationStr = formatDuration(diffSecs);
                  }

                  return (
                    <tr key={session.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors" id={`row-session-${session.id}`}>
                      {/* Tenant */}
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <div>
                            <span className="block font-semibold">{tenantObj?.name || session.tenantName || "Unknown Tenant"}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">ID: {session.tenantId}</span>
                          </div>
                        </div>
                      </td>

                      {/* Caller Number */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <PhoneIncoming size={12} className="text-purple-600 dark:text-purple-400" />
                          <span>{session.callerNumber || "N/A"}</span>
                        </div>
                      </td>

                      {/* Channel ID */}
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-[11px] border border-slate-200 dark:border-slate-800">
                          {session.channelId || session.id}
                        </span>
                      </td>

                      {/* Started At */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {session.startedAt ? new Date(session.startedAt).toLocaleString("id-ID") : "-"}
                      </td>

                      {/* Ended At */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {session.endedAt ? (
                          new Date(session.endedAt).toLocaleString("id-ID")
                        ) : (
                          <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-ping" />
                            Sedang Berlangsung
                          </span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 font-mono font-bold text-right text-slate-800 dark:text-slate-200">
                        {durationStr}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isEnded ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                            <CheckCircle2 size={10} className="text-slate-500 dark:text-slate-400" />
                            Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Aktif
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
