import React, { useState, useEffect } from "react";
import { Building2, CreditCard, Activity, TrendingUp, ChevronRight } from "lucide-react";
import { TenantProfile } from "../types";

export default function TopTenantsTable() {
  const [topTenants, setTopTenants] = useState<Partial<TenantProfile>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/reports/top-active-tenants");
        if (res.ok) {
          const data = await res.json();
          setTopTenants(data);
        }
      } catch (err) {
        console.error("Failed to fetch top tenants:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-slate-100 dark:bg-slate-900 rounded-lg mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-500" />
            Top Active Tenants
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Summarizing top 5 organizations by engagement.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-black">
              <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organization</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Billing</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Sessions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {topTenants.map((tenant, idx) => (
              <tr key={tenant.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                      {idx + 1}
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{tenant.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                    tenant.billingType === "postpaid" 
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" 
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  }`}>
                    {tenant.billingType}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                    <CreditCard size={12} className="opacity-50" />
                    ${Number(tenant.balance).toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{tenant.sessionCount}</span>
                    <Activity size={14} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 bg-slate-50 dark:bg-black border-t border-slate-100 dark:border-slate-800">
        <button className="w-full py-2 px-4 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-white dark:hover:bg-slate-900 shadow-sm transition-all flex items-center justify-center gap-2">
          View All Tenant Accounts
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}
