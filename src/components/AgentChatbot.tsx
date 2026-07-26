import React, { useState, useRef, useEffect } from "react";
import { TenantProfile, AgentProfile } from "../types";
import { MessageSquare, Send, Bot, User, Sparkles, Code, Copy, Check, RefreshCw, Zap, Volume2 } from "lucide-react";

interface AgentChatbotProps {
  tenant: TenantProfile;
  selectedAgent?: AgentProfile;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export default function AgentChatbot({ tenant, selectedAgent }: AgentChatbotProps) {
  // Use selectedAgent or fallback to default agent from tenant
  const activeAgent: AgentProfile = selectedAgent || tenant.agents?.[0] || {
    id: "default_agent",
    tenantId: tenant.id,
    agentName: tenant.agentName || "AI Assistant",
    role: "Customer Service",
    extension: tenant.extension || "501",
    prebuiltVoice: tenant.prebuiltVoice || "Zephyr",
    systemInstruction: tenant.systemInstruction || "",
    greetingMessage: tenant.greetingMessage || "Halo, ada yang bisa saya bantu?",
    defaultFallbackResponse: tenant.defaultFallbackResponse || "Mohon maaf, saya tidak memiliki informasi tersebut.",
    aiModel: tenant.aiModel || "Gemini 2.5 Flash",
    language: tenant.language || "Indonesia",
    dialect: tenant.dialect || "Standar / Baku",
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize greeting message on tenant or activeAgent change
  useEffect(() => {
    const greeting = activeAgent.greetingMessage || tenant.greetingMessage || `Halo! Selamat datang di ${tenant.name}. Saya ${activeAgent.agentName}, ada yang bisa saya bantu hari ini?`;
    setMessages([
      {
        id: "msg_init",
        role: "assistant",
        text: greeting,
        timestamp: Date.now(),
      },
    ]);
  }, [tenant.id, activeAgent.id, activeAgent.agentName, activeAgent.greetingMessage, tenant.name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: "user",
      text: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText("");
    setIsLoading(true);

    try {
      // Build previous history for endpoint
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch(`/api/tenants/${tenant.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: activeAgent.id,
          message: text,
          history: historyPayload,
        }),
      });

      let data: any = {};
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        data = await res.json();
      }

      const aiMsg: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        role: "assistant",
        text: data.reply || activeAgent.defaultFallbackResponse || tenant.defaultFallbackResponse || "Mohon maaf, saya tidak dapat menemukan jawaban.",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Chat request failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_e_${Date.now()}`,
          role: "assistant",
          text: activeAgent.defaultFallbackResponse || tenant.defaultFallbackResponse || "Mohon maaf, terjadi gangguan koneksi ke server chatbot.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    const greeting = activeAgent.greetingMessage || tenant.greetingMessage || `Halo! Selamat datang di ${tenant.name}. Saya ${activeAgent.agentName}, ada yang bisa saya bantu hari ini?`;
    setMessages([
      {
        id: `msg_init_${Date.now()}`,
        role: "assistant",
        text: greeting,
        timestamp: Date.now(),
      },
    ]);
  };

  const quickPrompts = [
    "Apa saja layanan atau produk unggulan yang tersedia?",
    "Bagaimana cara pendaftaran atau prosedur transaksi?",
    "Mohon bantuan untuk callback / dihubungi oleh tim CS",
  ];

  const codeSnippet = `// Integrasi Endpoint Chatbot Multi-Agent
const response = await fetch('/api/tenants/${tenant.id}/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: '${activeAgent.id}', // Agent: ${activeAgent.agentName} (Ext ${activeAgent.extension})
    message: "Halo ${activeAgent.agentName}, tanyakan promo...",
    history: []
  })
});
const data = await response.json();
console.log(data.reply);`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[650px] overflow-hidden transition-colors">
      {/* Top Header */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
            {activeAgent.agentName ? activeAgent.agentName.substring(0, 2).toUpperCase() : "AI"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">{activeAgent.agentName || "AI Agent"}</h3>
              <span className="text-[10px] bg-slate-800 text-indigo-300 font-mono px-2 py-0.5 rounded-full font-bold">
                Ext {activeAgent.extension}
              </span>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Zap size={10} />
                {activeAgent.aiModel || "Gemini 2.5 Flash"}
              </span>
            </div>
            <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
              <span>{tenant.name}</span>
              <span>•</span>
              <span className="text-slate-400">Dialek {activeAgent.dialect || "Standar"} ({activeAgent.prebuiltVoice || "Zephyr"})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCode(!showCode)}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
            title="Lihat API Integration Code"
          >
            <Code size={13} />
            <span className="hidden sm:inline">API Endpoint</span>
          </button>
          <button
            onClick={handleClearChat}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Bersihkan percakapan"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* API Integration Drawer */}
      {showCode && (
        <div className="bg-slate-950 text-slate-200 p-4 text-xs font-mono border-b border-slate-800 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-indigo-400 font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} /> REST API Endpoint: POST /api/tenants/{tenant.id}/chat (Agent ID: {activeAgent.id})
            </span>
            <button
              onClick={handleCopyCode}
              className="text-slate-400 hover:text-white text-xs flex items-center gap-1 bg-slate-800 px-2 py-1 rounded"
            >
              {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedCode ? "Tersalin" : "Salin Code"}</span>
            </button>
          </div>
          <pre className="bg-slate-900/80 p-3 rounded-lg overflow-x-auto text-[11px] text-indigo-200 leading-relaxed border border-slate-800/80">
            {codeSnippet}
          </pre>
        </div>
      )}

      {/* Chat Messages Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-black/50">
        {messages.map((msg) => {
          const isAssistant = msg.role === "assistant";
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}
            >
              {isAssistant && (
                <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                  <Bot size={16} className="text-indigo-400 dark:text-white" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                  isAssistant
                    ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xs rounded-tl-xs"
                    : "bg-slate-900 dark:bg-indigo-600 text-white rounded-tr-xs shadow-xs"
                }`}
              >
                {isAssistant && (
                  <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                    <span>{activeAgent.agentName}</span>
                    <span>•</span>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-mono font-medium">
                      Ext {activeAgent.extension}
                    </span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <div
                  className={`text-[10px] mt-1.5 text-right ${
                    isAssistant ? "text-slate-400 dark:text-slate-500" : "text-slate-400 dark:text-indigo-200/60"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              {!isAssistant && (
                <div className="w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                  <User size={15} />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Bot size={16} className="text-indigo-400 dark:text-white" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 font-medium">{activeAgent.agentName} sedang mengetik...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 bg-white dark:bg-black border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto transition-colors">
          <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap flex items-center gap-1">
            <Sparkles size={11} className="text-indigo-500" /> Rekomendasi:
          </span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="text-xs bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full whitespace-nowrap transition border border-slate-200 dark:border-slate-800"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="p-3 bg-white dark:bg-black border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 transition-colors">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder={`Tanyakan sesuatu kepada ${activeAgent.agentName}...`}
          disabled={isLoading}
          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-600 focus:bg-white dark:focus:bg-black transition"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
          className="bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-40 text-white p-2.5 rounded-xl transition flex items-center justify-center shrink-0 shadow-xs"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
