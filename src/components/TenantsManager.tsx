import React, { useState } from "react";
import { TenantProfile, AgentProfile, KnowledgeDoc, CallbackRequest } from "../types";
import { resolveModelPricing } from "../utils/geminiPricing";
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  FileText,
  PhoneCall,
  CheckCircle2,
  XCircle,
  BookOpen,
  Wrench,
  Sparkles,
  Save,
  Check,
  MessageSquare,
  Bot,
  UserCheck,
  Globe,
  Mic,
  Settings,
  ChevronRight,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  Zap,
  DollarSign,
  Clock,
  Volume2
} from "lucide-react";
import { VoicePreviewPlayer } from "./VoicePreviewPlayer";
import { CostReport } from "./CostReport";
import AgentChatbot from "./AgentChatbot";
import DocumentUpload from "./DocumentUpload";

interface TenantsManagerProps {
  tenants: TenantProfile[];
  onRefreshTenants: () => void;
}

export default function TenantsManager({ tenants, onRefreshTenants }: TenantsManagerProps) {
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || "");
  const [activeSubTab, setActiveSubTab] = useState<"agents" | "rag" | "callbacks" | "chatbot" | "apikey" | "voicestudio" | "billing">("agents");

  // Active Tenant
  const activeTenant = tenants.find((t) => t.id === selectedTenantId) || tenants[0];

  // Selected Agent for Chatbot or Agent Editor
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  // Agent Modal state (Add / Edit)
  const [showAgentModal, setShowAgentModal] = useState<boolean>(false);
  const [editingAgent, setEditingAgent] = useState<Partial<AgentProfile>>({});

  // Tenant Editing state (Base Company info)
  const [tenantName, setTenantName] = useState<string>("");
  const [tenantCategory, setTenantCategory] = useState<string>("");
  const [isSavingTenant, setIsSavingTenant] = useState<boolean>(false);
  const [saveTenantSuccess, setSaveTenantSuccess] = useState<boolean>(false);

  // New Document modal/form state
  const [showDocModal, setShowDocModal] = useState<boolean>(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState<string>("");
  const [docCategory, setDocCategory] = useState<string>("Umum");
  const [docContent, setDocContent] = useState<string>("");

  // New Tenant Modal state
  const [showNewTenantModal, setShowNewTenantModal] = useState<boolean>(false);
  const [newTenantName, setNewTenantName] = useState<string>("");
  const [newTenantCategory, setNewTenantCategory] = useState<string>("Layanan Pelanggan");
  const [newTenantExtension, setNewTenantExtension] = useState<string>("504");
  const [newAgentName, setNewAgentName] = useState<string>("Rina - Customer Support");

  // TenantApiKey state
  const [tenantApiKeyData, setTenantApiKeyData] = useState<{
    id: string | null;
    service: string;
    apiKey: string;
    status: string;
    isFromEnv: boolean;
    maskedApiKey: string;
    hasEnvFallback: boolean;
  }>({
    id: null,
    service: "gemini",
    apiKey: "",
    status: "active",
    isFromEnv: true,
    maskedApiKey: "",
    hasEnvFallback: true,
  });
  const [inputApiKey, setInputApiKey] = useState<string>("");
  const [showFullApiKey, setShowFullApiKey] = useState<boolean>(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState<boolean>(false);
  const [apiKeySaveSuccess, setApiKeySaveSuccess] = useState<boolean>(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // Fetch API Key when active tenant changes
  const fetchTenantApiKey = async (tenantId: string) => {
    try {
      const res = await fetch(`/api/tenants/${tenantId}/api-key?service=gemini`);
      if (res.ok) {
        const data = await res.json();
        setTenantApiKeyData(data);
        setInputApiKey(data.apiKey || "");
      }
    } catch (err) {
      console.error("Failed to fetch tenant API key:", err);
    }
  };

  // Sync state when active tenant changes
  React.useEffect(() => {
    if (activeTenant) {
      setTenantName(activeTenant.name);
      setTenantCategory(activeTenant.businessCategory);
      if (activeTenant.agents && activeTenant.agents.length > 0) {
        if (!selectedAgentId || !activeTenant.agents.some((a) => a.id === selectedAgentId)) {
          setSelectedAgentId(activeTenant.agents[0].id);
        }
      }
      fetchTenantApiKey(activeTenant.id);
    }
  }, [selectedTenantId, tenants]);

  // Save Tenant Custom API Key
  const handleSaveTenantApiKey = async () => {
    if (!activeTenant) return;
    if (!inputApiKey.trim()) {
      setApiKeyError("API Key tidak boleh kosong.");
      return;
    }
    setIsSavingApiKey(true);
    setApiKeyError(null);
    setApiKeySaveSuccess(false);

    try {
      const res = await fetch(`/api/tenants/${activeTenant.id}/api-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: inputApiKey.trim(),
          service: "gemini",
          status: "active",
        }),
      });

      if (res.ok) {
        setApiKeySaveSuccess(true);
        fetchTenantApiKey(activeTenant.id);
        setTimeout(() => setApiKeySaveSuccess(false), 3000);
      } else {
        const err = await res.json();
        setApiKeyError(err.error || "Gagal menyimpan API Key.");
      }
    } catch (err: any) {
      setApiKeyError(err.message || "Gagal menghubungi server.");
    } finally {
      setIsSavingApiKey(false);
    }
  };

  // Revert / Reset Tenant Custom API Key
  const handleResetTenantApiKey = async () => {
    if (!activeTenant) return;
    if (!confirm(`Hapus API Key khusus untuk ${activeTenant.name}? Sistem akan otomatis mengambil default API Key dari file .env (GEMINI_API_KEY).`)) return;

    setIsSavingApiKey(true);
    setApiKeyError(null);
    try {
      const res = await fetch(`/api/tenants/${activeTenant.id}/api-key?service=gemini`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchTenantApiKey(activeTenant.id);
      }
    } catch (err: any) {
      setApiKeyError(err.message || "Gagal menghapus API Key.");
    } finally {
      setIsSavingApiKey(false);
    }
  };

  // Save base Tenant Info
  const handleSaveTenantInfo = async () => {
    if (!activeTenant) return;
    setIsSavingTenant(true);
    setSaveTenantSuccess(false);
    try {
      const updatedTenant = {
        ...activeTenant,
        name: tenantName,
        businessCategory: tenantCategory,
      };
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTenant),
      });
      if (res.ok) {
        setSaveTenantSuccess(true);
        onRefreshTenants();
        setTimeout(() => setSaveTenantSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save tenant info:", err);
    } finally {
      setIsSavingTenant(false);
    }
  };

  // Open modal to add new agent
  const handleOpenAddAgentModal = () => {
    const nextExt = String(500 + (activeTenant.agents?.length || 0) + 1);
    setEditingAgent({
      agentName: "",
      role: "Customer Support",
      extension: nextExt,
      prebuiltVoice: "Zephyr",
      language: "Indonesia",
      dialect: "Standar / Baku",
      gender: "Perempuan",
      aiModel: "Gemini 2.5 Flash",
      temperature: 0.3,
      agentStartsFirst: true,
      systemInstruction: `Anda adalah AI Customer Support resmi dari ${activeTenant.name}. Jawablah dengan ramah, sopan, dan jelas.`,
      greetingMessage: `Halo! Selamat datang di ${activeTenant.name}. Ada yang bisa saya bantu hari ini?`,
      defaultFallbackResponse: "Mohon maaf, saya belum memiliki informasi mengenai hal tersebut.",
      isDefault: (activeTenant.agents?.length || 0) === 0,
    });
    setShowAgentModal(true);
  };

  // Open modal to edit existing agent
  const handleOpenEditAgentModal = (agent: AgentProfile) => {
    setEditingAgent({ ...agent });
    setShowAgentModal(true);
  };

  // Save Agent (Add or Edit)
  const handleSaveAgent = async () => {
    if (!editingAgent.agentName || !editingAgent.extension || !activeTenant) return;
    try {
      const agentObj = {
        ...editingAgent,
        id: editingAgent.id || `agent_${Date.now()}`,
      };

      const res = await fetch(`/api/tenants/${activeTenant.id}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentObj),
      });

      if (res.ok) {
        setShowAgentModal(false);
        onRefreshTenants();
      }
    } catch (err) {
      console.error("Failed to save agent:", err);
    }
  };

  // Delete Agent
  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    if (!activeTenant) return;
    if (activeTenant.agents.length <= 1) {
      alert("Tenant harus memiliki minimal 1 Agent AI.");
      return;
    }
    if (!confirm(`Hapus Agent AI '${agentName}' dari tenant ${activeTenant.name}?`)) return;

    try {
      const res = await fetch(`/api/tenants/${activeTenant.id}/agents/${agentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onRefreshTenants();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menghapus agent.");
      }
    } catch (err) {
      console.error("Failed to delete agent:", err);
    }
  };

  // Save RAG Document
  const handleSaveDoc = async () => {
    if (!docTitle || !docContent || !activeTenant.id) return;
    try {
      const res = await fetch(`/api/tenants/${activeTenant.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingDocId || undefined,
          title: docTitle,
          category: docCategory,
          content: docContent,
        }),
      });
      if (res.ok) {
        setShowDocModal(false);
        setEditingDocId(null);
        setDocTitle("");
        setDocCategory("Umum");
        setDocContent("");
        onRefreshTenants();
      }
    } catch (err) {
      console.error("Failed to save document:", err);
    }
  };

  // Delete RAG Document
  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("Hapus dokumen pengetahuan ini?")) return;
    try {
      const res = await fetch(`/api/tenants/${activeTenant.id}/documents/${docId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onRefreshTenants();
      }
    } catch (err) {
      console.error("Failed to delete doc:", err);
    }
  };

  // Create New Tenant
  const handleCreateTenant = async () => {
    if (!newTenantName) return;
    const newId = `tenant_${Date.now()}`;
    const initialAgent: AgentProfile = {
      id: `agent_${Date.now()}`,
      agentName: newAgentName,
      role: "Customer Service Utama",
      extension: newTenantExtension,
      prebuiltVoice: "Zephyr",
      systemInstruction: `Anda adalah ${newAgentName}, asisten AI resmi dari ${newTenantName}. Jawablah pertanyaan pelanggan secara ramah, profesional, dan ringkas.`,
      greetingMessage: `Halo! Selamat datang di ${newTenantName}. Saya ${newAgentName}, ada yang bisa saya bantu?`,
      agentStartsFirst: true,
      aiModel: "Gemini 2.5 Flash",
      language: "Indonesia",
      dialect: "Standar / Baku",
      gender: "Perempuan",
      temperature: 0.3,
      defaultFallbackResponse: "Mohon maaf, saya belum memiliki informasi mengenai hal tersebut.",
      isDefault: true,
    };

    const newTenantObj: TenantProfile = {
      id: newId,
      name: newTenantName,
      businessCategory: newTenantCategory,
      agents: [initialAgent],
      documents: [],
      tools: [
        {
          id: "request_callback",
          name: "Catat Callback / Janji Temu",
          description: "Mencatat nomor telepon dan nama pelanggan yang minta dihubungi kembali",
          enabled: true,
        },
      ],
      callbackRequests: [],
    };

    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTenantObj),
      });
      if (res.ok) {
        setShowNewTenantModal(false);
        setNewTenantName("");
        onRefreshTenants();
        setSelectedTenantId(newId);
      }
    } catch (err) {
      console.error("Failed to create tenant:", err);
    }
  };

  // Delete Tenant
  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus Tenant ini? Semua agent, dokumen RAG, dan catatan callback akan terhapus.")) return;
    try {
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onRefreshTenants();
      }
    } catch (err) {
      console.error("Failed to delete tenant:", err);
    }
  };

  // Update Callback Status
  const handleUpdateCallback = async (cbId: string, newStatus: "completed" | "cancelled") => {
    try {
      const res = await fetch(`/api/tenants/${activeTenant.id}/callbacks/${cbId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onRefreshTenants();
      }
    } catch (err) {
      console.error("Failed to update callback:", err);
    }
  };

  if (!activeTenant) {
    return <div className="text-center py-12 text-slate-500 font-sans">Tidak ada data tenant tersedia.</div>;
  }

  const activeAgentsList = activeTenant.agents || [];
  const activeSelectedAgent = activeAgentsList.find((a) => a.id === selectedAgentId) || activeAgentsList[0];

  return (
    <div className="space-y-6" id="tenants-manager-root">
      {/* Top Tenant Selector Header */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors" id="tenant-selector-bar">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0 transition-colors">
                <Users size={20} />
              </span>
              <div>
                <h2 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100">Manajemen Tenant & Multi-Agent AI</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  1 Tenant Perusahaan dapat memiliki <span className="font-semibold text-slate-700 dark:text-slate-300">banyak Agent AI</span> dengan ekstensi telepon, dialek, suara, dan perannya masing-masing.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowNewTenantModal(true)}
            className="bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-sans text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-sm shrink-0"
            id="add-tenant-btn"
          >
            <Plus size={16} />
            <span>Tambah Tenant Baru</span>
          </button>
        </div>

        {/* Tenant Cards Selection Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5" id="tenants-list-grid">
          {tenants.map((t) => {
            const isSelected = t.id === activeTenant.id;
            const agentCount = t.agents?.length || 1;
            const pendingCallbacksCount = (t.callbackRequests || []).filter((c) => c.status === "pending").length;

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTenantId(t.id)}
                className={`cursor-pointer rounded-xl p-4 border transition-all text-left relative ${
                  isSelected
                    ? "bg-slate-900 dark:bg-black border-slate-800 text-white shadow-md ring-2 ring-indigo-500/20"
                    : "bg-slate-50/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
                id={`tenant-card-${t.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isSelected ? "bg-slate-800 dark:bg-indigo-900/50 text-indigo-300" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400"}`}>
                    {agentCount} Agent AI
                  </span>
                  {tenants.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTenant(t.id);
                      }}
                      className={`p-1 rounded hover:bg-rose-500 hover:text-white transition-all ${isSelected ? "text-slate-400" : "text-slate-400 hover:text-rose-600"}`}
                      title="Hapus Tenant"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <h3 className={`font-sans font-bold text-sm mt-2 line-clamp-1 ${isSelected ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>
                  {t.name}
                </h3>
                <p className={`text-[11px] line-clamp-1 mt-0.5 ${isSelected ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>
                  {t.businessCategory}
                </p>

                <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-200/20 text-[10px] font-mono">
                  <span className={isSelected ? "text-slate-300" : "text-slate-500 dark:text-slate-500"}>
                    {t.documents?.length || 0} Dokumen RAG
                  </span>
                  {pendingCallbacksCount > 0 && (
                    <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={10} />
                      {pendingCallbacksCount} Callback
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tenant Workspace */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden" id="tenant-workspace">
        {/* Workspace Navigation Header */}
        <div className="bg-white dark:bg-black border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4" id="workspace-header">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl font-bold">
              <Bot size={22} className="text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-bold text-slate-800 text-base">{activeTenant.name}</h3>
                <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                  {activeAgentsList.length} Agent Active
                </span>
              </div>
              <p className="text-xs text-slate-500">{activeTenant.businessCategory}</p>
            </div>
          </div>

          {/* Sub Tab Buttons */}
          <div className="flex items-center gap-1 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-lg p-1" id="subtab-buttons">
            <button
              onClick={() => setActiveSubTab("agents")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeSubTab === "agents" ? "bg-slate-900 dark:bg-white dark:text-black text-white" : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              <Users size={13} />
              <span>Daftar Agent AI ({activeAgentsList.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab("rag")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeSubTab === "rag" ? "bg-slate-900 dark:bg-white dark:text-black text-white" : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              <BookOpen size={13} />
              <span>Dokumen RAG ({activeTenant.documents?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveSubTab("callbacks")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeSubTab === "callbacks" ? "bg-slate-900 dark:bg-white dark:text-black text-white" : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              <PhoneCall size={13} />
              <span>Permintaan Callback ({activeTenant.callbackRequests?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveSubTab("chatbot")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeSubTab === "chatbot" ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              <MessageSquare size={13} />
              <span>Uji Chatbot Agent</span>
            </button>

            <button
              onClick={() => setActiveSubTab("voicestudio")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeSubTab === "voicestudio" ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              <Volume2 size={13} />
              <span>Voice Studio</span>
            </button>

            <button
              onClick={() => setActiveSubTab("billing")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeSubTab === "billing" ? "bg-emerald-600 dark:bg-emerald-500 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              <DollarSign size={13} />
              <span>Billing & Cost</span>
            </button>

            <button
              onClick={() => setActiveSubTab("apikey")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeSubTab === "apikey" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Key size={13} />
              <span>API Key Gemini ({tenantApiKeyData.isFromEnv ? "Default .env" : "Khusus Tenant"})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Agents AI Manager */}
        {activeSubTab === "agents" && (
          <div className="p-6 space-y-6" id="panel-agents">
            {/* Header Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-xl p-4 transition-colors">
              <div>
                <h4 className="font-sans font-bold text-sm text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
                  Daftar Agent AI untuk {activeTenant.name}
                </h4>
                <p className="text-xs text-indigo-800 dark:text-indigo-300 mt-0.5">
                  Setiap Agent memiliki ekstensi Asterisk unik, suara, prompt kepribadian, dialek bahasa, dan model AI pilihan.
                </p>
              </div>

              <button
                onClick={handleOpenAddAgentModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs shrink-0"
              >
                <Plus size={16} />
                <span>Tambah Agent AI Baru</span>
              </button>
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeAgentsList.map((ag) => (
                <div
                  key={ag.id}
                  className={`bg-white dark:bg-black border rounded-xl p-5 shadow-xs flex flex-col justify-between transition-all ${
                    ag.isDefault ? "border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-500/20" : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div>
                    {/* Top Row: Ext & Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 dark:bg-slate-800 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-md">
                          Ext {ag.extension}
                        </span>
                        {ag.isDefault && (
                          <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors">
                            Agent Utama
                          </span>
                        )}
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors">
                          {ag.role || "General CS"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditAgentModal(ag)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition"
                          title="Edit Profile Agent"
                        >
                          <Edit3 size={15} />
                        </button>
                        {activeAgentsList.length > 1 && (
                          <button
                            onClick={() => handleDeleteAgent(ag.id, ag.agentName)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition"
                            title="Hapus Agent"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Agent Name & Voice */}
                    <h4 className="font-sans font-bold text-base text-slate-800 dark:text-slate-100">{ag.agentName}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {ag.systemInstruction || ag.personality}
                    </p>

                    {/* Technical Specs */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Mic size={13} className="text-slate-400 dark:text-slate-500" />
                        <span>Suara: <strong>{ag.prebuiltVoice || "Zephyr"}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Globe size={13} className="text-slate-400 dark:text-slate-500" />
                        <span>Dialek: <strong>{ag.dialect || "Standar"}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Sparkles size={13} className="text-indigo-500 dark:text-indigo-400" />
                        <span>Model: <strong>{ag.aiModel || "Gemini 2.5 Flash"}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <UserCheck size={13} className="text-slate-400 dark:text-slate-500" />
                        <span>Inisiasi: <strong>{ag.agentStartsFirst !== false ? "Sapa Duluan" : "Tunggu User"}</strong></span>
                      </div>
                    </div>

                    {/* Gemini Pricing Rate Badge */}
                    {(() => {
                      const pricing = resolveModelPricing(ag.aiModel);
                      const idrRate = Math.round(pricing.estimatedCostPerMinuteUSD * 16000);
                      return (
                        <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg flex items-center justify-between text-[11px] transition-colors">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Tarif Percakapan:</span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 transition-colors">
                            ${pricing.estimatedCostPerMinuteUSD.toFixed(3)}/mnt (Rp {idrRate.toLocaleString("id-ID")}/mnt)
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      Bahasa {ag.language || "Indonesia"} ({ag.gender || "Perempuan"})
                    </span>
                    <button
                      onClick={() => {
                        setSelectedAgentId(ag.id);
                        setActiveSubTab("chatbot");
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs font-semibold flex items-center gap-1 hover:underline"
                    >
                      <span>Uji Chatbot Agent</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Base Company Information Box */}
            <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl p-5 mt-6 transition-colors">
              <h4 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Settings size={16} className="text-slate-600 dark:text-slate-400" />
                Informasi Dasar Perusahaan Tenant
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Perusahaan / Tenant</label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="w-full bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-800 dark:focus:ring-slate-700 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kategori Bisnis</label>
                  <input
                    type="text"
                    value={tenantCategory}
                    onChange={(e) => setTenantCategory(e.target.value)}
                    className="w-full bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-800 dark:focus:ring-slate-700 transition-colors"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-4">
                {saveTenantSuccess && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <Check size={14} /> Info tenant disimpan!
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveTenantInfo}
                  disabled={isSavingTenant}
                  className="bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-xs"
                >
                  <Save size={14} />
                  <span>{isSavingTenant ? "Menyimpan..." : "Simpan Info Perusahaan"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: RAG Knowledge Base Manager */}
        {activeSubTab === "rag" && (
          <div className="p-6 space-y-6" id="panel-rag">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-100">
                  Dokumen Pengetahuan & Prosedur Perusahaan (RAG)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Masukkan informasi produk, FAQ, tarif, atau SOP. Semua Agent AI pada tenant ini akan otomatis membaca dokumen ini saat menjawab percakapan.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingDocId(null);
                  setDocTitle("");
                  setDocCategory("Umum");
                  setDocContent("");
                  setShowDocModal(true);
                }}
                className="bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-sans text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm shrink-0"
              >
                <Plus size={15} />
                <span>Tambah Dokumen RAG</span>
              </button>
            </div>

            <DocumentUpload 
              tenantId={activeTenant.id} 
              onUploadSuccess={() => onRefreshTenants()} 
            />

            {/* List of Documents */}
            {(!activeTenant.documents || activeTenant.documents.length === 0) ? (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl transition-colors">
                <BookOpen className="mx-auto text-slate-400 dark:text-slate-500 mb-2" size={32} />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Belum ada dokumen RAG untuk tenant ini.</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Klik 'Tambah Dokumen RAG' untuk menambah pengetahuan agent.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTenant.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-400 font-semibold text-[10px] px-2 py-0.5 rounded transition-colors">
                          {doc.category}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingDocId(doc.id);
                              setDocTitle(doc.title);
                              setDocCategory(doc.category);
                              setDocContent(doc.content);
                              setShowDocModal(true);
                            }}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 transition-colors"
                            title="Edit Dokumen"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                            title="Hapus Dokumen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <h5 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-100 mt-2">{doc.title}</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-4 leading-relaxed font-sans whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 transition-colors">
                        {doc.content}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
                      <span>Diperbarui: {new Date(doc.updatedAt).toLocaleDateString()}</span>
                      <span className="font-mono">{doc.content.length} karakter</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Callback Requests */}
        {activeSubTab === "callbacks" && (
          <div className="p-6 space-y-6" id="panel-callbacks">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-100">
                  Daftar Permintaan Telepon Kembali (Callback / Janji Temu)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pesan yang dicatat secara otomatis oleh Gemini AI dari pemanggil telepon selama panggilan berlangsung.
                </p>
              </div>
            </div>

            {(!activeTenant.callbackRequests || activeTenant.callbackRequests.length === 0) ? (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl transition-colors">
                <PhoneCall className="mx-auto text-slate-400 dark:text-slate-500 mb-2" size={32} />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Belum ada catatan callback dari pemanggil.</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Gunakan Web Simulator untuk mencoba menelpon dan meminta callback!</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl transition-colors">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider transition-colors">
                    <tr>
                      <th className="px-4 py-3">Waktu Dibuat</th>
                      <th className="px-4 py-3">Nama Pemanggil</th>
                      <th className="px-4 py-3">Nomor Telepon</th>
                      <th className="px-4 py-3">Alasan / Pesan</th>
                      <th className="px-4 py-3">Waktu Diharapkan</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {activeTenant.callbackRequests.map((cb) => (
                      <tr key={cb.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-all">
                        <td className="px-4 py-3 font-mono text-slate-400 dark:text-slate-500">
                          {new Date(cb.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{cb.callerName}</td>
                        <td className="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-400 font-medium">{cb.phoneNumber}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs">{cb.reason}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{cb.preferredTime || "-"}</td>
                        <td className="px-4 py-3">
                          {cb.status === "pending" && (
                            <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded font-semibold text-[10px] inline-flex items-center gap-1 transition-colors">
                              <Clock size={11} />
                              Pending
                            </span>
                          )}
                          {cb.status === "completed" && (
                            <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-semibold text-[10px] inline-flex items-center gap-1 transition-colors">
                              <CheckCircle2 size={11} />
                              Selesai
                            </span>
                          )}
                          {cb.status === "cancelled" && (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-semibold text-[10px] inline-flex items-center gap-1 transition-colors">
                              <XCircle size={11} />
                              Batal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {cb.status === "pending" && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleUpdateCallback(cb.id, "completed")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[10px] font-semibold transition-all"
                              >
                                Tandai Selesai
                              </button>
                              <button
                                onClick={() => handleUpdateCallback(cb.id, "cancelled")}
                                className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-[10px] font-semibold transition-all"
                              >
                                Batal
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Chatbot Agent Panel */}
        {activeSubTab === "chatbot" && (
          <div className="p-6 space-y-4" id="panel-chatbot">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-indigo-950 flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600" />
                  Uji Chatbot Agent AI (1 Profile Agent = Voice Call + Web Chatbot)
                </h4>
                <p className="text-xs text-indigo-800 mt-0.5">
                  Pilih Agent AI mana yang ingin diuji coba melalui teks percakapan interaktif.
                </p>
              </div>

              {/* Agent Selector Dropdown for Chatbot */}
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-semibold text-indigo-900">Pilih Agent:</label>
                <select
                  value={activeSelectedAgent?.id || ""}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="bg-white border border-indigo-300 text-indigo-950 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {activeAgentsList.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      Ext {ag.extension} - {ag.agentName} ({ag.role || "CS"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <AgentChatbot tenant={activeTenant} selectedAgent={activeSelectedAgent} />
          </div>
        )}

        {/* Tab 5: Voice Studio Preview */}
        {activeSubTab === "voicestudio" && (
          <div className="p-6 space-y-6" id="panel-voicestudio">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <h4 className="text-xl font-black text-indigo-950 flex items-center justify-center md:justify-start gap-2">
                  <Volume2 size={24} className="text-indigo-600" />
                  Voice Profile Studio
                </h4>
                <p className="text-sm text-indigo-800 font-medium max-w-lg">
                  Eksperimen dengan berbagai karakter suara AI Gemini. Dengarkan simulasi pengucapan sebelum Anda menetapkannya ke Agent AI di lapangan.
                </p>
              </div>
              <div className="flex -space-x-3">
                {["Zephyr", "Puck", "Aoede", "Kore"].map((v, i) => (
                  <div key={v} className={`w-12 h-12 rounded-full border-4 border-white dark:border-slate-900 bg-slate-200 flex items-center justify-center text-[10px] font-black shadow-sm z-[${4-i}]`}>
                    {v[0]}
                  </div>
                ))}
              </div>
            </div>

            <div className="max-w-3xl mx-auto">
              <VoicePreviewPlayer />
            </div>
          </div>
        )}

        {/* Tab 6: Billing & Cost Analysis */}
        {activeSubTab === "billing" && (
          <div className="p-6 space-y-6" id="panel-billing">
            <CostReport tenantId={activeTenant.id} />
          </div>
        )}

        {/* Tab 7: Tenant API Key Manager */}
        {activeSubTab === "apikey" && (
          <div className="p-6 space-y-6" id="panel-apikey">
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                    <Key size={18} />
                  </span>
                  <h4 className="font-bold text-sm text-amber-950">
                    Pengaturan Custom API Key Gemini ({activeTenant.name})
                  </h4>
                </div>
                <p className="text-xs text-amber-800">
                  Setiap tenant dapat menggunakan API Key Gemini milik sendiri atau menggunakan default API Key dari file <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">.env</code>.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {tenantApiKeyData.isFromEnv ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-800 border border-slate-300">
                    <RefreshCw size={12} className="animate-spin text-slate-500" />
                    Default Key (.env)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    API Key Khusus Tenant Active
                  </span>
                )}
              </div>
            </div>

            {/* Main Key Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h5 className="font-sans font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Lock size={16} className="text-slate-600" />
                  Konfigurasi Key TenantApiKey
                </h5>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  Service: {tenantApiKeyData.service || "gemini"}
                </span>
              </div>

              {apiKeySaveSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-lg flex items-center gap-2 font-medium">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>API Key khusus berhasil disimpan di database (<code className="font-mono">tenant_api_keys</code>).</span>
                </div>
              )}

              {apiKeyError && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-3 rounded-lg flex items-center gap-2 font-medium">
                  <XCircle size={16} className="text-red-600 shrink-0" />
                  <span>{apiKeyError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  API Key Gemini (Google AI Studio) untuk Tenant '{activeTenant.name}'
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showFullApiKey ? "text" : "password"}
                      value={inputApiKey}
                      onChange={(e) => setInputApiKey(e.target.value)}
                      placeholder={tenantApiKeyData.isFromEnv ? "Menggunakan default API key dari .env (Kosongkan jika tetap ingin pakai default)" : "AIzaSy..."}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-10 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFullApiKey(!showFullApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showFullApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <button
                    onClick={handleSaveTenantApiKey}
                    disabled={isSavingApiKey}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs shrink-0 disabled:opacity-50"
                  >
                    <Save size={15} />
                    <span>{isSavingApiKey ? "Menyimpan..." : "Simpan Key"}</span>
                  </button>

                  {!tenantApiKeyData.isFromEnv && (
                    <button
                      onClick={handleResetTenantApiKey}
                      disabled={isSavingApiKey}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-sans text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0"
                      title="Hapus API key khusus dan kembali menggunakan .env"
                    >
                      <Trash2 size={14} className="text-red-500" />
                      <span>Gunakan .env</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Status saat ini:{" "}
                  {tenantApiKeyData.isFromEnv ? (
                    <span className="font-semibold text-slate-700">Mengambil dari environment variable <code className="font-mono text-amber-700">.env (GEMINI_API_KEY)</code></span>
                  ) : (
                    <span className="font-semibold text-emerald-700">Tersimpan di tabel <code className="font-mono text-emerald-800">tenant_api_keys</code> (<code className="font-mono">{tenantApiKeyData.maskedApiKey}</code>)</span>
                  )}
                </p>
              </div>

              {/* Schema & Fallback Info Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs text-slate-600">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-indigo-600" />
                  Struktur Schema Model Database:
                </div>
                <pre className="bg-slate-900 text-slate-200 text-[11px] font-mono p-3 rounded-md overflow-x-auto">
{`model TenantApiKey {
  id         String   @id @default(uuid())
  tenant_id  String   @unique
  service    String   @default("gemini")
  api_key    String
  status     String   @default("active")
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  tenant     Tenant   @relation(fields: [tenant_id], references: [id])
}`}
                </pre>
                <p className="text-[11px] text-slate-500 italic mt-1">
                  Aturan Fallback: Jika <code className="font-mono">tenant_api_keys</code> tidak memiliki record aktif untuk tenant ini, sistem secara otomatis akan menggunakan key dari <code className="font-mono">process.env.GEMINI_API_KEY</code>.
                </p>
              </div>

              {/* API Status & Limits Section */}
              <div className="pt-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Zap size={12} className="text-amber-500" />
                  API Status & Limits (Estimasi Quota)
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all hover:border-amber-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Model Aktif</span>
                    <span className="text-xs font-black text-slate-900 block">Gemini 2.0 Flash-Lite</span>
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Status: Ready</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all hover:border-amber-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Rate Limit (RPM)</span>
                    <span className="text-xs font-black text-slate-900 block">15 RPM</span>
                    <div className="mt-2 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full w-[10%]" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium mt-1.5 block">Permintaan per Menit</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all hover:border-amber-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Daily Limit (RPD)</span>
                    <span className="text-xs font-black text-slate-900 block">1,500 RPD</span>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-indigo-600 font-black">Sisa: ~1,482</span>
                      <span className="text-[10px] text-slate-400 font-medium">98.8%</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all hover:border-amber-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Billing Tier</span>
                    <span className="text-xs font-black text-slate-900 block">Free Tier Tier 1</span>
                    <button className="mt-2 text-[10px] text-amber-600 font-black hover:underline uppercase tracking-tighter">Upgrade to Paid</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Add/Edit Agent Modal */}
      {showAgentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-sans font-bold text-base text-slate-800 flex items-center gap-2">
                <Bot size={20} className="text-indigo-600" />
                {editingAgent.id ? `Edit Agent AI: ${editingAgent.agentName}` : `Tambah Agent AI Baru untuk ${activeTenant.name}`}
              </h3>
              <button
                onClick={() => setShowAgentModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Row 1: Agent Name & Role & Extension */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 ml-0.5 tracking-tight">Nama Agent AI *</label>
                <div className="relative">
                  <Bot size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={editingAgent.agentName || ""}
                    onChange={(e) => setEditingAgent({ ...editingAgent, agentName: e.target.value })}
                    placeholder="Maya - CS Promos"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 ml-0.5 tracking-tight">Peran / Divisi</label>
                <div className="relative">
                  <Users size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={editingAgent.role || ""}
                    onChange={(e) => setEditingAgent({ ...editingAgent, role: e.target.value })}
                    placeholder="Layanan Paket 5G"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 ml-0.5 tracking-tight">Ekstensi Telepon *</label>
                <div className="relative">
                  <PhoneCall size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={editingAgent.extension || ""}
                    onChange={(e) => setEditingAgent({ ...editingAgent, extension: e.target.value })}
                    placeholder="501"
                    className="w-full font-mono bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Bahasa, Dialek, Model AI, Voice */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                <Globe size={14} />
                Bahasa & Personalisasi Suara
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1.5 ml-0.5 uppercase">Bahasa</label>
                  <select
                    value={editingAgent.language || "Indonesia"}
                    onChange={(e) => setEditingAgent({ ...editingAgent, language: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 shadow-xs"
                  >
                    <option value="Indonesia">Indonesia</option>
                    <option value="Inggris">Inggris</option>
                    <option value="Mandarin">Mandarin</option>
                    <option value="Jepang">Jepang</option>
                    <option value="Arab">Arab</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1.5 ml-0.5 uppercase">Dialek</label>
                  <select
                    value={editingAgent.dialect || "Standar / Baku"}
                    onChange={(e) => setEditingAgent({ ...editingAgent, dialect: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 shadow-xs"
                  >
                    <optgroup label="Indonesia">
                      <option value="Standar / Baku">Standar / Baku</option>
                      <option value="Jawa">Jawa</option>
                      <option value="Sunda">Sunda</option>
                      <option value="Jakarta / Gaul">Jakarta / Gaul</option>
                    </optgroup>
                    <option value="American English">American English</option>
                    <option value="British English">British English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1.5 ml-0.5 uppercase">Model AI</label>
                  <select
                    value={editingAgent.aiModel || "Gemini 2.5 Flash"}
                    onChange={(e) => setEditingAgent({ ...editingAgent, aiModel: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 shadow-xs"
                  >
                    <option value="Gemini 2.5 Flash">Gemini 2.5 Flash</option>
                    <option value="Gemini 2.5 Pro">Gemini 2.5 Pro</option>
                    <option value="Gemini 1.5 Flash">Gemini 1.5 Flash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1.5 ml-0.5 uppercase">Pilihan Suara</label>
                  <select
                    value={editingAgent.prebuiltVoice || "Zephyr"}
                    onChange={(e) => setEditingAgent({ ...editingAgent, prebuiltVoice: e.target.value as any })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 shadow-xs"
                  >
                    <option value="Zephyr">Zephyr (Female)</option>
                    <option value="Puck">Puck (Male)</option>
                    <option value="Charon">Charon (Deep Male)</option>
                    <option value="Kore">Kore (Soft Female)</option>
                  </select>
                </div>
              </div>

              {/* Advanced Voice Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">Speaking Rate (Kecepatan Bicara)</label>
                    <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{editingAgent.speakingRate || "1.0"}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={editingAgent.speakingRate || "1.0"}
                    onChange={(e) => setEditingAgent({ ...editingAgent, speakingRate: e.target.value })}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                    <span>Lambat</span>
                    <span>Normal</span>
                    <span>Cepat</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">AI Temperature (Kreativitas)</label>
                    <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{editingAgent.temperature || 0.3}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.1"
                    value={editingAgent.temperature || 0.3}
                    onChange={(e) => setEditingAgent({ ...editingAgent, temperature: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                    <span>Faktual</span>
                    <span>Seimbang</span>
                    <span>Kreatif</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Personality / System Instruction */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 ml-0.5 tracking-tight flex items-center gap-2">
                  <Sparkles size={14} className="text-indigo-500" />
                  Instruksi Sistem & Kepribadian Agent
                </label>
                <textarea
                  rows={4}
                  value={editingAgent.systemInstruction || ""}
                  onChange={(e) => setEditingAgent({ ...editingAgent, systemInstruction: e.target.value, personality: e.target.value })}
                  placeholder="Contoh: Anda adalah Maya, asisten ramah yang fokus membantu klaim asuransi pelanggan. Bicara dengan sopan, gunakan kata ganti 'Saya' dan sapa pelanggan dengan 'Bapak/Ibu'..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all placeholder:text-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 ml-0.5 tracking-tight flex items-center gap-2">
                    <MessageSquare size={14} className="text-emerald-500" />
                    Pesan Sapaan (Greeting)
                  </label>
                  <textarea
                    rows={2}
                    value={editingAgent.greetingMessage || ""}
                    onChange={(e) => setEditingAgent({ ...editingAgent, greetingMessage: e.target.value })}
                    placeholder="Contoh: Halo! Selamat datang di Layanan Pelanggan. Ada yang bisa saya bantu?"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all placeholder:text-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 ml-0.5 tracking-tight flex items-center gap-2">
                    <XCircle size={14} className="text-amber-500" />
                    Pesan Fallback (Jika Bingung)
                  </label>
                  <textarea
                    rows={2}
                    value={editingAgent.defaultFallbackResponse || ""}
                    onChange={(e) => setEditingAgent({ ...editingAgent, defaultFallbackResponse: e.target.value })}
                    placeholder="Contoh: Maaf, saya kurang paham mengenai hal itu. Ingin saya hubungkan ke rekan manusia?"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Advanced Behavioral Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">Fitur Barge-In (Interupsi)</h5>
                    <div 
                      onClick={() => setEditingAgent({ ...editingAgent, bargeIn: !editingAgent.bargeIn })}
                      className={`w-10 h-5 rounded-full relative cursor-pointer transition-all ${editingAgent.bargeIn !== false ? "bg-indigo-600" : "bg-slate-300"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${editingAgent.bargeIn !== false ? "left-5.5" : "left-0.5"}`} />
                    </div>
                  </div>
                  <p className="text-[10px] text-indigo-800/70 font-medium leading-relaxed">
                    Jika aktif, Agent akan berhenti bicara saat mendeteksi suara dari penelfon di tengah kalimat.
                  </p>
                </div>
                
                <div className="mt-4">
                  <label className="block text-[9px] font-bold text-indigo-900 uppercase mb-1.5 ml-0.5">Filter Sensitivitas</label>
                  <select
                    disabled={editingAgent.bargeIn === false}
                    value={editingAgent.bargeInSensitivity || "gemini_only"}
                    onChange={(e) => setEditingAgent({ ...editingAgent, bargeInSensitivity: e.target.value as any })}
                    className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-xs font-bold text-indigo-950 disabled:opacity-40 transition-all"
                  >
                    <option value="gemini_only">Gemini VAD (Paling Akurat)</option>
                    <option value="strict">Strict (Hanya Suara Jelas)</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High (Sangat Sensitif)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Inisiasi Agent</h5>
                    <div 
                      onClick={() => setEditingAgent({ ...editingAgent, agentStartsFirst: !editingAgent.agentStartsFirst })}
                      className={`w-10 h-5 rounded-full relative cursor-pointer transition-all ${editingAgent.agentStartsFirst !== false ? "bg-emerald-600" : "bg-slate-300"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${editingAgent.agentStartsFirst !== false ? "left-5.5" : "left-0.5"}`} />
                    </div>
                  </div>
                  <p className="text-[10px] text-emerald-800/70 font-medium leading-relaxed">
                    Agent akan langsung menyapa (Greeting) saat telepon terhubung tanpa menunggu penelfon bicara.
                  </p>
                </div>

                <div className="mt-4">
                  <label className="block text-[9px] font-bold text-emerald-900 uppercase mb-1.5 ml-0.5">Zona Waktu (Timezone)</label>
                  <select
                    value={editingAgent.timezone || "Asia/Jakarta"}
                    onChange={(e) => setEditingAgent({ ...editingAgent, timezone: e.target.value })}
                    className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-950 transition-all"
                  >
                    <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                    <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                    <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
                    <option value="UTC">UTC / GMT</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Final Options: Is Default & Submit */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={editingAgent.isDefault === true}
                    onChange={(e) => setEditingAgent({ ...editingAgent, isDefault: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${editingAgent.isDefault ? "bg-indigo-600" : "bg-slate-300"}`} />
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${editingAgent.isDefault ? "left-5.5" : "left-0.5"}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Jadikan Agent Utama</span>
                  <span className="text-[10px] text-slate-400">Agent ini akan menjadi default saat panggilan masuk.</span>
                </div>
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAgentModal(false)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAgent}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-slate-900/10 flex items-center gap-2 transition-all active:scale-95"
                >
                  <Save size={16} />
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Add/Edit RAG Document */}
      {showDocModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="font-sans font-bold text-base text-slate-800">
              {editingDocId ? "Edit Dokumen RAG" : "Tambah Dokumen RAG Baru"}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Dokumen</label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Contoh: Katalog Paket Internet 5G / SOP Retur"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
              <input
                type="text"
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                placeholder="Produk & Tarif / SOP / FAQ / Syarat"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Isi Konten Dokumen (RAG Knowledge Base)</label>
              <textarea
                rows={6}
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="Tuliskan detail informasi, harga, daftar FAQ, atau SOP lengkap..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveDoc}
                className="bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Save size={15} />
                <span>Simpan Dokumen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Create New Tenant */}
      {showNewTenantModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-sans font-bold text-base text-slate-800">
              Tambah Perusahaan / Tenant Baru
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Tenant / Perusahaan</label>
              <input
                type="text"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                placeholder="Contoh: PT Bank Mandiri Syariah"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Bisnis</label>
              <input
                type="text"
                value={newTenantCategory}
                onChange={(e) => setNewTenantCategory(e.target.value)}
                placeholder="Perbankan / Asuransi / Hospital"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ekstensi Telepon Awal</label>
                <input
                  type="text"
                  value={newTenantExtension}
                  onChange={(e) => setNewTenantExtension(e.target.value)}
                  placeholder="504"
                  className="w-full font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Agent Utama</label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Rina - AI Assistant"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewTenantModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateTenant}
                className="bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus size={15} />
                <span>Buat Tenant</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
