import React, { useState, useEffect } from "react";
import { TenantProfile } from "../types";
import {
  Code2,
  Copy,
  Check,
  Building2,
  User,
  Sliders,
  Sparkles,
  PhoneCall,
  ExternalLink,
  Globe,
  Layers,
  HelpCircle,
  Eye,
  Smartphone,
  Palette,
  CheckCircle2,
  Play,
  X,
  Sun,
  Moon,
  Laptop,
  Languages
} from "lucide-react";

interface WidgetEmbedBuilderProps {
  tenants: TenantProfile[];
  appLang?: "id" | "en";
}

export default function WidgetEmbedBuilder({ tenants, appLang = "id" }: WidgetEmbedBuilderProps) {
  const isEn = appLang === "en";

  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || "");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [title, setTitle] = useState<string>(isEn ? "Ask AI Voice" : "Tanya AI Voice");
  const [subtitle, setSubtitle] = useState<string>(isEn ? "24/7 Customer Support Voice" : "Layanan Suara Customer Support 24/7");
  const [color, setColor] = useState<string>("#4f46e5");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left">("bottom-right");
  const [widgetTheme, setWidgetTheme] = useState<"dark" | "light" | "system">("dark");
  const [widgetLang, setWidgetLang] = useState<"id" | "en">(appLang);
  const [defaultCallerNumber, setDefaultCallerNumber] = useState<string>("+62 812-3456-7890");
  const [activeFrameworkTab, setActiveFrameworkTab] = useState<"html" | "nextjs" | "vuejs">("html");
  const [copied, setCopied] = useState<boolean>(false);
  const [showCanvasModal, setShowCanvasModal] = useState<boolean>(false);
  const [liveWidgetActive, setLiveWidgetActive] = useState<boolean>(false);

  // Sync title / subtitle default if user hasn't changed custom values
  useEffect(() => {
    setWidgetLang(appLang);
    if (appLang === "en") {
      if (title === "Tanya AI Voice") setTitle("Ask AI Voice");
      if (subtitle === "Layanan Suara Customer Support 24/7") setSubtitle("24/7 Customer Support Voice");
    } else {
      if (title === "Ask AI Voice") setTitle("Tanya AI Voice");
      if (subtitle === "24/7 Customer Support Voice") setSubtitle("Layanan Suara Customer Support 24/7");
    }
  }, [appLang]);

  // Sync agent selector when tenant changes
  const currentTenant = tenants.find((t) => t.id === selectedTenantId) || tenants[0];
  const agents = currentTenant?.agents || [];
  const currentAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  // Base URL calculation
  const originUrl = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

  // Framework Snippets Generators
  const htmlSnippet = `<!-- AI Voice Agent Test Call Widget (HTML / Vanilla JS) -->
<script 
  src="${originUrl}/widget.js"
  data-tenant-id="${currentTenant?.id || "tenant_clinic"}"
  data-agent-id="${currentAgent?.id || "agent_1"}"
  data-title="${title}"
  data-subtitle="${subtitle}"
  data-color="${color}"
  data-position="${position}"
  data-theme="${widgetTheme}"
  data-lang="${widgetLang}"
  data-caller-number="${defaultCallerNumber}">
</script>`;

  const nextjsSnippet = `// Next.js (App Router layout.tsx or page.tsx)
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="${widgetLang}">
      <body>
        {children}

        {/* AI Voice Agent Floating Widget */}
        <Script
          src="${originUrl}/widget.js"
          strategy="afterInteractive"
          data-tenant-id="${currentTenant?.id || "tenant_clinic"}"
          data-agent-id="${currentAgent?.id || "agent_1"}"
          data-title="${title}"
          data-subtitle="${subtitle}"
          data-color="${color}"
          data-position="${position}"
          data-theme="${widgetTheme}"
          data-lang="${widgetLang}"
          data-caller-number="${defaultCallerNumber}"
        />
      </body>
    </html>
  );
}`;

  const vuejsSnippet = `<!-- components/AiVoiceWidget.vue (Vue 3 / Composition API) -->
<template>
  <!-- Floating Widget attaches automatically to body -->
</template>

<script setup>
import { onMounted } from 'vue';

onMounted(() => {
  if (document.getElementById('aiv-voice-widget-script')) return;
  const script = document.createElement('script');
  script.id = 'aiv-voice-widget-script';
  script.src = '${originUrl}/widget.js';
  script.setAttribute('data-tenant-id', '${currentTenant?.id || "tenant_clinic"}');
  script.setAttribute('data-agent-id', '${currentAgent?.id || "agent_1"}');
  script.setAttribute('data-title', '${title}');
  script.setAttribute('data-subtitle', '${subtitle}');
  script.setAttribute('data-color', '${color}');
  script.setAttribute('data-position', '${position}');
  script.setAttribute('data-theme', '${widgetTheme}');
  script.setAttribute('data-lang', '${widgetLang}');
  script.setAttribute('data-caller-number', '${defaultCallerNumber}');
  document.body.appendChild(script);
});
</script>`;

  const getActiveSnippet = () => {
    if (activeFrameworkTab === "nextjs") return nextjsSnippet;
    if (activeFrameworkTab === "vuejs") return vuejsSnippet;
    return htmlSnippet;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getActiveSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Launch live widget on the current page dynamically
  const launchLiveWidgetOnPage = () => {
    if (typeof window === "undefined") return;

    // Clean existing widget if present
    if ((window as any).AiVoiceWidgetInstance) {
      (window as any).AiVoiceWidgetInstance.remove();
    }

    // Set configuration
    (window as any).AiVoiceWidgetConfig = {
      tenantId: currentTenant?.id,
      agentId: currentAgent?.id,
      title,
      subtitle,
      color,
      position,
      theme: widgetTheme,
      lang: widgetLang,
      callerNumber: defaultCallerNumber
    };

    // Remove any previous script
    const prevScript = document.getElementById("aiv-dynamic-widget-script");
    if (prevScript) prevScript.remove();

    // Create and inject new script
    const script = document.createElement("script");
    script.id = "aiv-dynamic-widget-script";
    script.src = `${originUrl}/widget.js?t=${Date.now()}`;
    script.setAttribute("data-tenant-id", currentTenant?.id || "");
    script.setAttribute("data-agent-id", currentAgent?.id || "");
    script.setAttribute("data-title", title);
    script.setAttribute("data-subtitle", subtitle);
    script.setAttribute("data-color", color);
    script.setAttribute("data-position", position);
    script.setAttribute("data-theme", widgetTheme);
    script.setAttribute("data-lang", widgetLang);
    script.setAttribute("data-caller-number", defaultCallerNumber);

    document.body.appendChild(script);
    setLiveWidgetActive(true);
  };

  const presetColors = [
    { label: "Indigo", hex: "#4f46e5" },
    { label: "Emerald", hex: "#10b981" },
    { label: "Rose", hex: "#f43f5e" },
    { label: "Amber", hex: "#f59e0b" },
    { label: "Slate", hex: "#334155" },
    { label: "Purple", hex: "#9333ea" }
  ];

  return (
    <div className="space-y-6" id="widget-builder-root">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors" id="widget-builder-header">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold" id="widget-icon">
              <Code2 size={18} />
            </div>
            <h2 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100">
              {isEn ? "Widget Script Embed Generator" : "Widget Script Embed Generator"}
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <Sparkles size={12} />
              Zero Dependency JS
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            {isEn
              ? "Embed this floating AI voice call widget on your website, landing page, or web application for live visitor testing."
              : "Tempelkan widget tombol panggilan suara AI ini pada situs website, landing page, atau aplikasi web Anda untuk pengujian test call langsung oleh pengunjung."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={launchLiveWidgetOnPage}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
            id="launch-live-widget-btn"
          >
            <Play size={14} className="text-emerald-400 fill-emerald-400" />
            <span>
              {liveWidgetActive
                ? (isEn ? "Update Floating Widget on Screen" : "Perbarui Widget Floating Di Layar")
                : (isEn ? "Test Live Widget On Screen" : "Uji Coba Live Widget Di Layar")}
            </span>
          </button>

          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
            id="copy-script-top-btn"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? (isEn ? "Code Copied!" : "Kode Tersalin!") : (isEn ? "Copy Widget Script Tag" : "Salin Tag Script Widget")}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="builder-main-grid">
        
        {/* LEFT COLUMN: Configuration Panel */}
        <div className="lg:col-span-5 space-y-5" id="builder-config-column">
          
          {/* Tenant & Agent Selection Card */}
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4" id="config-tenant-agent-card">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <Building2 size={16} className="text-indigo-600 dark:text-indigo-400" />
              {isEn ? "1. Select Target Tenant & Agent" : "1. Pilih Target Tenant & Agent"}
            </h3>

            {/* Tenant Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                {isEn ? "Tenant Company" : "Tenant Perusahaan"}
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => {
                  setSelectedTenantId(e.target.value);
                  setSelectedAgentId("");
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                id="widget-tenant-select"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.businessCategory || "Umum"})
                  </option>
                ))}
              </select>
            </div>

            {/* Agent Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                {isEn ? "AI Voice Agent" : "Agent AI Suara"}
              </label>
              <select
                value={selectedAgentId || currentAgent?.id || ""}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                id="widget-agent-select"
              >
                {agents.length === 0 ? (
                  <option value="">{isEn ? "No Agent available" : "Tidak ada Agent tersedia"}</option>
                ) : (
                  agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.agentName} (Ext {a.extension || "N/A"}) - {a.personality || "Friendly"}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Customization Options Card */}
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4" id="config-appearance-card">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <Palette size={16} className="text-purple-600 dark:text-purple-400" />
              {isEn ? "2. Custom Appearance & Preferences" : "2. Kustomisasi Tampilan & Bahasa Widget"}
            </h3>

            {/* Theme Selector (Gelap / Terang / Sistem) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {isEn ? "Widget Theme (Dark / Light / System)" : "Opsi Tema Widget (Gelap / Terang / Sistem)"}
              </label>
              <div className="grid grid-cols-3 gap-2" id="widget-theme-picker">
                <button
                  type="button"
                  onClick={() => setWidgetTheme("dark")}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    widgetTheme === "dark"
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                  }`}
                  id="theme-dark-btn"
                >
                  <Moon size={14} />
                  <span>{isEn ? "Dark" : "Gelap"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWidgetTheme("light")}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    widgetTheme === "light"
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                  }`}
                  id="theme-light-btn"
                >
                  <Sun size={14} />
                  <span>{isEn ? "Light" : "Terang"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWidgetTheme("system")}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    widgetTheme === "system"
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                  }`}
                  id="theme-system-btn"
                >
                  <Laptop size={14} />
                  <span>{isEn ? "System" : "Sistem"}</span>
                </button>
              </div>
            </div>

            {/* Language Selector (ID / EN) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {isEn ? "Widget Language (ID / EN)" : "Bahasa Dialog Widget (ID / EN)"}
              </label>
              <div className="grid grid-cols-2 gap-2" id="widget-lang-picker">
                <button
                  type="button"
                  onClick={() => {
                    setWidgetLang("id");
                    if (title === "Ask AI Voice") setTitle("Tanya AI Voice");
                    if (subtitle === "24/7 Customer Support Voice") setSubtitle("Layanan Suara Customer Support 24/7");
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    widgetLang === "id"
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                  }`}
                  id="lang-id-btn"
                >
                  <Languages size={14} />
                  <span>🇮🇩 ID (Indonesia)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWidgetLang("en");
                    if (title === "Tanya AI Voice") setTitle("Ask AI Voice");
                    if (subtitle === "Layanan Suara Customer Support 24/7") setSubtitle("24/7 Customer Support Voice");
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    widgetLang === "en"
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                  }`}
                  id="lang-en-btn"
                >
                  <Languages size={14} />
                  <span>🇺🇸 EN (English)</span>
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                {isEn ? "Widget Button Title" : "Judul Tombol Widget"}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder={isEn ? "e.g. Ask AI Voice" : "misal: Tanya AI Voice"}
                id="widget-title-input"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                {isEn ? "Header Subtitle Description" : "Deskripsi Singkat Header"}
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder={isEn ? "e.g. 24/7 AI Customer Service" : "misal: Customer Support 24 Jam"}
                id="widget-subtitle-input"
              />
            </div>

            {/* Default Caller Number */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                {isEn ? "Default Caller Number" : "Nomor Caller Default (Awal)"}
              </label>
              <input
                type="text"
                value={defaultCallerNumber}
                onChange={(e) => setDefaultCallerNumber(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="+62 812-3456-7890"
                id="widget-caller-input"
              />
            </div>

            {/* Color Picker Presets */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {isEn ? "Primary Accent Color" : "Warna Utama (Theme Color)"}
              </label>
              <div className="flex items-center gap-2 flex-wrap" id="color-preset-picker">
                {presetColors.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setColor(p.hex)}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${color === p.hex ? "ring-2 ring-slate-900 border-slate-900 scale-105" : "border-slate-200 hover:border-slate-300"}`}
                    style={{ backgroundColor: p.hex, color: "#ffffff" }}
                  >
                    {color === p.hex && <Check size={12} />}
                    <span>{p.label}</span>
                  </button>
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-10 p-0 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer bg-transparent"
                  title="Pilih warna kustom"
                  id="widget-color-picker"
                />
              </div>
            </div>

            {/* Position Picker */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {isEn ? "Widget Screen Position" : "Posisi Widget Pada Halaman"}
              </label>
              <div className="grid grid-cols-2 gap-2" id="position-toggle">
                <button
                  type="button"
                  onClick={() => setPosition("bottom-right")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all ${position === "bottom-right" ? "bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600" : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"}`}
                  id="pos-right-btn"
                >
                  {isEn ? "Bottom Right" : "Kanan Bawah (Bottom Right)"}
                </button>
                <button
                  type="button"
                  onClick={() => setPosition("bottom-left")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all ${position === "bottom-left" ? "bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600" : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"}`}
                  id="pos-left-btn"
                >
                  {isEn ? "Bottom Left" : "Kiri Bawah (Bottom Left)"}
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Code Snippet & Live Canvas Preview */}
        <div className="lg:col-span-7 space-y-5" id="builder-preview-column">
          
          {/* Generated Code Snippet Card with Multi-Framework Tabs */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 shadow-md space-y-4" id="snippet-box">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 size={18} className="text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {isEn ? "Embed Integration Code" : "Kode Integrasi Embed Widget"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isEn ? "Select your target web framework" : "Pilih framework website tujuan Anda"}
                  </p>
                </div>
              </div>

              <button
                onClick={copyToClipboard}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs self-start sm:self-auto shrink-0"
                id="copy-code-btn"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? (isEn ? "Copied!" : "Tersalin!") : (isEn ? "Copy Snippet" : "Salin Kode")}</span>
              </button>
            </div>

            {/* Framework Selector Tabs */}
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800" id="framework-tabs">
              <button
                type="button"
                onClick={() => setActiveFrameworkTab("html")}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeFrameworkTab === "html"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
                id="tab-framework-html"
              >
                <span>🌐 HTML / Plain JS</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFrameworkTab("nextjs")}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeFrameworkTab === "nextjs"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
                id="tab-framework-nextjs"
              >
                <span>⚡ Next.js / React</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFrameworkTab("vuejs")}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeFrameworkTab === "vuejs"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
                id="tab-framework-vuejs"
              >
                <span>💚 Vue.js / Nuxt</span>
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800 leading-relaxed select-all max-h-56" id="script-code-block">
              {getActiveSnippet()}
            </pre>
          </div>

          {/* Interactive Webpage Live Canvas Preview */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col h-[460px] relative transition-colors" id="canvas-preview-container">
            {/* Mock Browser Header */}
            <div className="bg-slate-100 dark:bg-slate-950 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0" id="mock-browser-bar">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-400 block" />
                <span className="w-3 h-3 rounded-full bg-amber-400 block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 block" />
              </div>
              <div className="bg-white dark:bg-slate-900 px-3 py-1 rounded-md text-[11px] font-mono text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 w-72 justify-center">
                <Globe size={12} className="text-slate-400" />
                <span>https://website-client.com</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Live Preview Canvas</span>
            </div>

            {/* Mock Website Frame */}
            <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden flex flex-col justify-between" id="mock-web-content">
              {/* Fake Website Header & Banner */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                      {currentTenant?.name?.charAt(0) || "T"}
                    </div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{currentTenant?.name || "Klinik Utama Sehat"}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span>{isEn ? "Home" : "Beranda"}</span>
                    <span>{isEn ? "Services" : "Layanan"}</span>
                    <span>{isEn ? "Contact Us" : "Kontak Kami"}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 space-y-2 shadow-xs">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/30 text-indigo-200 font-bold uppercase">
                    {isEn ? "Client Demo Website" : "Situs Client Demo"}
                  </span>
                  <h4 className="font-bold text-lg leading-snug">
                    {isEn ? `Welcome to Official Portal of ${currentTenant?.name}` : `Selamat Datang di Portal Resmi ${currentTenant?.name}`}
                  </h4>
                  <p className="text-xs text-slate-300 max-w-md">
                    {isEn
                      ? "Click the floating widget button below to open and test the interactive AI Voice dialog."
                      : "Klik tombol floating di bawah ini untuk membuka dan menguji dialog interaktif AI Voice Assistant."}
                  </p>
                </div>
              </div>

              {/* MOCK INTERACTIVE DIALOG IN CANVAS */}
              {showCanvasModal && (
                <div className={`absolute bottom-20 ${position === "bottom-left" ? "left-5" : "right-5"} w-72 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-2xl p-4 space-y-3 z-10 animate-in fade-in zoom-in-95 duration-200`}>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <h5 className="font-bold text-xs text-white">{title}</h5>
                      <p className="text-[10px] text-slate-400">{subtitle}</p>
                    </div>
                    <button
                      onClick={() => setShowCanvasModal(false)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg text-xs text-slate-300 border border-slate-800">
                    {widgetLang === "en"
                      ? `👋 Hello! I am AI Agent ${currentAgent?.agentName || "Voice Assistant"} from ${currentTenant?.name}. Click the floating widget button below for live voice testing.`
                      : `👋 Halo! Saya AI Agent ${currentAgent?.agentName || "Voice Assistant"} dari ${currentTenant?.name}. Silakan tekan tombol live floating di layar untuk pengujian suara langsung.`}
                  </div>

                  <button
                    onClick={launchLiveWidgetOnPage}
                    className="w-full py-2 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-xs transition-all"
                    style={{ backgroundColor: color }}
                  >
                    <PhoneCall size={14} />
                    <span>{isEn ? "Start Live Test Call" : "Mulai Panggilan Test Live"}</span>
                  </button>
                </div>
              )}

              {/* FLOATING MOCK WIDGET IN PREVIEW CANVAS */}
              <div
                className={`absolute bottom-5 ${position === "bottom-left" ? "left-5" : "right-5"} transition-all`}
                id="mock-widget-preview-floating"
              >
                <button
                  type="button"
                  onClick={() => setShowCanvasModal(!showCanvasModal)}
                  className="px-4 py-2.5 rounded-full text-white font-semibold text-xs shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                  style={{ backgroundColor: color }}
                >
                  <PhoneCall size={16} />
                  <span>{title}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Integration Guides */}
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3 transition-colors" id="integration-guide-card">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
              <HelpCircle size={14} className="text-indigo-600 dark:text-indigo-400" />
              {isEn ? "Framework Integration Guides" : "Petunjuk Integrasi Framework"}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="bg-slate-50 dark:bg-black p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1">
                <strong className="text-slate-800 dark:text-slate-100 block font-bold flex items-center gap-1">
                  <span>🌐 HTML / WordPress / Webflow</span>
                </strong>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {isEn
                    ? "Paste the script snippet directly into index.html before </body> or in your CMS custom footer scripts."
                    : "Tempelkan tag script langsung ke dalam file index.html di sebelum </body> atau menu Footer Script di CMS Anda."}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-black p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1">
                <strong className="text-slate-800 dark:text-slate-100 block font-bold flex items-center gap-1">
                  <span>⚡ Next.js (App / Pages Router)</span>
                </strong>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {isEn
                    ? "Import Next.js Script from 'next/script' and place it inside RootLayout layout.tsx with strategy='afterInteractive'."
                    : "Gunakan komponen Script dari 'next/script' pada layout.tsx atau _app.tsx dengan properti strategy='afterInteractive'."}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-black p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1">
                <strong className="text-slate-800 dark:text-slate-100 block font-bold flex items-center gap-1">
                  <span>💚 Vue.js 3 / Nuxt 3</span>
                </strong>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {isEn
                    ? "Inject script in onMounted lifecycle hook in a component or configure head scripts in nuxt.config.ts."
                    : "Sisipkan elemen script dalam lifecycle hook onMounted pada komponen Vue atau di nuxt.config.ts."}
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
