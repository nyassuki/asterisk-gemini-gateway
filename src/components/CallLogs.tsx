import React, { useState, useEffect, useRef } from "react";
import { LogItem } from "../types";
import { Terminal, Filter, Trash2, ArrowDownLeft, ArrowUpRight, Cpu } from "lucide-react";

interface CallLogsProps {
  logs: LogItem[];
  onClearLogs?: () => void;
}

export default function CallLogs({ logs, onClearLogs }: CallLogsProps) {
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterDirection, setFilterDirection] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = logs.filter((log) => {
    const matchesSource = filterSource === "all" || log.source.toLowerCase() === filterSource.toLowerCase();
    const matchesDirection = filterDirection === "all" || log.direction.toLowerCase() === filterDirection.toLowerCase();
    return matchesSource && matchesDirection;
  });

  return (
    <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-[500px]" id="logs-card">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-black px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between" id="logs-header">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-mono text-sm">
          <Terminal size={16} className="text-indigo-600 dark:text-emerald-400" id="terminal-icon" />
          <span className="font-bold uppercase tracking-tight">Real-time Gateway Logs</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" id="terminal-status-dot" />
        </div>
        <div className="flex items-center gap-2" id="logs-actions">
          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="text-slate-400 hover:text-rose-500 p-1.5 rounded transition hover:bg-white dark:hover:bg-slate-800 shadow-xs border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
              title="Clear Terminal Logs"
              id="clear-logs-btn"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-black p-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between" id="logs-filter-bar">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-widest" id="filter-label">
          <Filter size={12} />
          <span>Filters:</span>
        </div>
        <div className="flex gap-2" id="filter-selectors">
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            id="filter-source"
          >
            <option value="all">Source: All</option>
            <option value="asterisk">Asterisk</option>
            <option value="gateway">Gateway</option>
            <option value="gemini">Gemini</option>
            <option value="simulator">Simulator</option>
          </select>

          <select
            value={filterDirection}
            onChange={(e) => setFilterDirection(e.target.value)}
            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            id="filter-direction"
          >
            <option value="all">Direction: All</option>
            <option value="in">Incoming (In)</option>
            <option value="out">Outgoing (Out)</option>
            <option value="system">System (Sys)</option>
          </select>
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={scrollRef}
        className="p-4 flex-1 overflow-y-auto font-mono text-[11px] space-y-2 bg-black select-text"
        id="logs-viewport"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600" id="empty-logs-msg">
            <span>No matching log entries. Waiting for call traffic...</span>
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            let badgeColor = "bg-slate-800 text-slate-300";
            if (log.source === "Asterisk") badgeColor = "bg-orange-950/80 border border-orange-900 text-orange-400";
            if (log.source === "Gemini") badgeColor = "bg-blue-950/80 border border-blue-900 text-blue-400";
            if (log.source === "Gateway") badgeColor = "bg-emerald-950/80 border border-emerald-900 text-emerald-400";
            if (log.source === "Simulator") badgeColor = "bg-purple-950/80 border border-purple-900 text-purple-400";

            return (
              <div key={idx} className="hover:bg-slate-900/30 py-1 px-1.5 rounded transition flex items-start gap-2.5 border border-transparent hover:border-slate-900" id={`log-item-${idx}`}>
                {/* Time */}
                <span className="text-slate-500 shrink-0 select-none">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                </span>

                {/* Direction Icon */}
                <span className="shrink-0 select-none" id={`direction-icon-${idx}`}>
                  {log.direction === "in" && <ArrowDownLeft size={13} className="text-blue-400" />}
                  {log.direction === "out" && <ArrowUpRight size={13} className="text-emerald-400" />}
                  {log.direction === "system" && <Cpu size={13} className="text-slate-500" />}
                </span>

                {/* Source Badge */}
                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold shrink-0 select-none ${badgeColor}`} id={`source-badge-${idx}`}>
                  {log.source}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0" id={`log-content-${idx}`}>
                  <span className="text-slate-400 select-none">[{log.type}] </span>
                  <span className="text-slate-200 break-words">{log.message}</span>
                  
                  {log.details && (
                    <div className="mt-1 text-slate-500 text-[11px] bg-slate-950/50 p-1.5 rounded border border-slate-900 overflow-x-auto whitespace-pre-wrap font-mono break-all leading-relaxed" id={`log-details-${idx}`}>
                      {log.details}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
