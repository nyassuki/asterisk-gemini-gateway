import React, { useState } from "react";
import { BookOpen, Copy, Check, Info, FileCode, Play, Terminal, ShieldCheck, Key, Building2, UserCheck } from "lucide-react";

export default function AsteriskConfig() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sipHeaderDialplanConfig = `; /etc/asterisk/extensions.conf
; Dialplan Asterisk dengan SIP Headers (TANPA EXTENSION ROUTING)
; Mengirim X-API-KEY, X-Tenant-ID, dan X-Agent-ID langsung ke AI Voice Gateway

[from-internal]
; Tangkap seluruh panggilan SIP masuk
exten => _X.,1,NoOp(=== AI Gateway Call via SIP Headers ===)
 same => n,Answer()
 same => n,Playback(beep)

 ; 1. Baca Header SIP Kustom yang dikirimkan Softphone / PJSIP Trunk
 same => n,Set(X_API_KEY=\${PJSIP_HEADER(read,X-API-KEY)})
 same => n,Set(X_TENANT_ID=\${PJSIP_HEADER(read,X-Tenant-ID)})
 same => n,Set(X_AGENT_ID=\${PJSIP_HEADER(read,X-Agent-ID)})

 ; 2. Fallback Default jika header tidak terisi dari panggil biasa
 same => n,ExecIf($["\${X_TENANT_ID}" = ""]?Set(X_TENANT_ID=tenant_cable))
 same => n,ExecIf($["\${X_AGENT_ID}" = ""]?Set(X_AGENT_ID=agent_cable_sarah))
 same => n,ExecIf($["\${X_API_KEY}" = ""]?Set(X_API_KEY=key_apex_cable_2026))

 ; 3. Kirim paket identifiers ke AudioSocket Gateway (TCP Port 8050)
 ; Format payload: <X-API-KEY>:<X-Tenant-ID>:<X-Agent-ID>
 same => n,NoOp(Routing to Tenant: \${X_TENANT_ID} | Agent: \${X_AGENT_ID})
 same => n,AudioSocket(\${X_API_KEY}:\${X_TENANT_ID}:\${X_AGENT_ID},127.0.0.1:8050)
 same => n,Hangup()
`;

  const pjsipHeaderConfig = `; /etc/asterisk/pjsip.conf
; Contoh konfigurasi Endpoint PJSIP yang menyisipkan SIP Headers otomatis

[ai-gateway-endpoint]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw

; Menyisipkan SIP Headers pada setiap panggilan yang diterima
set_var=PJSIP_HEADER(add,X-API-KEY)=key_apex_cable_2026
set_var=PJSIP_HEADER(add,X-Tenant-ID)=tenant_cable
set_var=PJSIP_HEADER(add,X-Agent-ID)=agent_cable_sarah
`;

  const moduleConfig = `; /etc/asterisk/modules.conf
; Modul res_audiosocket di-load saat startup Asterisk
load => res_audiosocket.so
`;

  return (
    <div className="space-y-6" id="asterisk-config-tab">
      {/* Introduction Card */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors" id="intro-card">
        <h3 className="font-sans font-semibold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2 mb-2">
          <BookOpen size={20} className="text-blue-600 dark:text-blue-400" />
          <span>Panduan Koneksi Asterisk PBX via SIP Headers (No Extension)</span>
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
          Sesuai standar integrasi enterprise, panggilan dari Asterisk PBX ke AI Voice Gateway <strong className="text-slate-900 dark:text-slate-100 font-semibold">TIDAK MENGGUNAKAN NOMOR EXTENSION</strong>. Penentuan Tenant dan Agent AI dilakukan secara dinamis menggunakan <strong className="text-blue-600 dark:text-blue-400 font-semibold">SIP Headers (X-API-KEY, X-Tenant-ID, X-Agent-ID)</strong> yang dikirim saat sinyal PJSIP INVITE atau dialplan Asterisk.
        </p>
        
        {/* SIP Headers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4" id="sip-headers-explanation">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 transition-colors">
            <span className="font-mono text-xs font-bold text-blue-800 dark:text-blue-400 flex items-center gap-1.5 mb-1">
              <Key size={14} /> X-API-KEY
            </span>
            <p className="text-[11px] text-blue-900 dark:text-blue-300 leading-normal">
              Kunci API Gateway untuk autentikasi keamanan panggilan.
            </p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg p-3 transition-colors">
            <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
              <Building2 size={14} /> X-Tenant-ID
            </span>
            <p className="text-[11px] text-emerald-900 dark:text-emerald-300 leading-normal">
              ID unik tenant perusahaan (contoh: <code className="bg-white/80 dark:bg-black/50 px-1 py-0.5 rounded font-mono border border-emerald-200/50 dark:border-emerald-800/50">tenant_cable</code>).
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-lg p-3 transition-colors">
            <span className="font-mono text-xs font-bold text-purple-800 dark:text-purple-400 flex items-center gap-1.5 mb-1">
              <UserCheck size={14} /> X-Agent-ID
            </span>
            <p className="text-[11px] text-purple-900 dark:text-purple-300 leading-normal">
              ID unik agent spesifik (contoh: <code className="bg-white/80 dark:bg-black/50 px-1 py-0.5 rounded font-mono border border-purple-200/50 dark:border-purple-800/50">agent_cable_sarah</code>).
            </p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400 transition-colors" id="intro-note">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Persyaratan Sistem Asterisk:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
              <li>Asterisk versi 16.5 ke atas (Direkomendasikan Asterisk 18/20/21 LTS).</li>
              <li>Modul <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono transition-colors">res_audiosocket.so</code> terinstall.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Grid of Configuration Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="steps-grid">
        {/* Step 1: Loading Module */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between transition-colors" id="step-module">
          <div>
            <div className="flex items-center gap-2 mb-3" id="step-module-title">
              <span className="bg-slate-900 dark:bg-blue-600 text-white h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs">1</span>
              <h4 className="font-sans font-semibold text-slate-800 dark:text-slate-100 text-sm">Aktifkan Modul res_audiosocket</h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mb-4">
              Pastikan modul <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-slate-800 dark:text-slate-200 transition-colors">res_audiosocket.so</code> aktif di <code className="font-mono text-slate-800 dark:text-slate-200">/etc/asterisk/modules.conf</code>:
            </p>
          </div>
          <div className="relative mt-2" id="module-code-container">
            <pre className="bg-slate-950 text-slate-300 p-4 rounded-lg font-mono text-xs overflow-x-auto select-all leading-relaxed border border-slate-900">
              {moduleConfig}
            </pre>
            <button
              onClick={() => handleCopy(moduleConfig, "module")}
              className="absolute top-2.5 right-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 p-1.5 rounded transition"
              id="copy-module-btn"
            >
              {copiedSection === "module" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Step 2: Configuring Dialplan for SIP Headers */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between transition-colors" id="step-dialplan">
          <div>
            <div className="flex items-center gap-2 mb-3" id="step-dialplan-title">
              <span className="bg-slate-900 dark:bg-blue-600 text-white h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs">2</span>
              <h4 className="font-sans font-semibold text-slate-800 dark:text-slate-100 text-sm">Konfigurasi Dialplan Header SIP</h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mb-4">
              Gunakan fungsi <code className="font-mono text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-1 rounded transition-colors">PJSIP_HEADER(read, ...)</code> pada <code className="font-mono text-slate-800 dark:text-slate-200">/etc/asterisk/extensions.conf</code> untuk membaca SIP Headers:
            </p>
          </div>
          <div className="relative mt-2" id="dialplan-code-container">
            <pre className="bg-slate-950 text-slate-200 p-4 rounded-lg font-mono text-xs overflow-x-auto select-all leading-relaxed border border-slate-900 max-h-[180px]">
              {sipHeaderDialplanConfig}
            </pre>
            <button
              onClick={() => handleCopy(sipHeaderDialplanConfig, "dialplan")}
              className="absolute top-2.5 right-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 p-1.5 rounded transition"
              id="copy-dialplan-btn"
            >
              {copiedSection === "dialplan" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Deployment & Execution Details */}
      <div className="bg-slate-900 dark:bg-black border border-slate-800 rounded-xl p-5 text-slate-200 shadow-lg transition-colors" id="testing-card">
        <h4 className="font-mono font-semibold text-sm text-amber-400 flex items-center gap-2 mb-3">
          <Terminal size={16} />
          <span>Pengujian CLI Asterisk & Terminal</span>
        </h4>
        <div className="space-y-4 text-xs font-mono leading-relaxed text-slate-300" id="testing-steps">
          <div>
            <p className="text-slate-400 font-sans font-semibold mb-1">A. Reload Asterisk CLI:</p>
            <div className="bg-slate-950 p-3 rounded border border-slate-800 flex items-center justify-between text-slate-300">
              <span>asterisk -rvvvvv<br />*CLI&gt; module reload res_audiosocket.so<br />*CLI&gt; dialplan reload</span>
              <button
                onClick={() => handleCopy("module reload res_audiosocket.so\ndialplan reload", "reload")}
                className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 p-1 rounded border border-slate-800 shrink-0 self-start mt-1"
                id="copy-reload-btn"
              >
                {copiedSection === "reload" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div>
            <p className="text-slate-400 font-sans font-semibold mb-1">B. Catatan IP Address & Port TCP Gateway:</p>
            <p className="font-sans text-slate-400 text-xs">
              AudioSocket TCP Gateway ini mendengarkan pada IP <code className="bg-slate-950 px-1 py-0.5 rounded font-mono text-emerald-400">0.0.0.0:8050</code>. Pastikan firewall mengizinkan lalu lintas TCP port <code className="bg-slate-950 px-1 py-0.5 rounded font-mono text-emerald-400">8050</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
