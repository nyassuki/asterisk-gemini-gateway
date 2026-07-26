import React, { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, ArrowRight, ShieldCheck, Activity, Users, BookOpen, Wrench, CheckCircle2 } from "lucide-react";
import { TenantProfile } from "../types";

interface SimulatorProps {
  tenants?: TenantProfile[];
}

export default function Simulator({ tenants = [] }: SimulatorProps) {
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || "tenant_telecom");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [callActive, setCallActive] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "active" | "disconnected" | "error">("idle");
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [aiTranscript, setAiTranscript] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callDuration, setCallActiveDuration] = useState<number>(0);
  const [echoMode, setEchoMode] = useState<boolean>(false);
  const [recordedCallbackMessage, setRecordedCallbackMessage] = useState<string | null>(null);

  // Active Tenant details & Active Agent
  const currentTenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];
  const activeAgentsList = currentTenant?.agents || [];
  const currentAgent = activeAgentsList.find(a => a.id === selectedAgentId) || activeAgentsList[0];

  useEffect(() => {
    if (tenants.length > 0 && !tenants.some(t => t.id === selectedTenantId)) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [tenants]);

  useEffect(() => {
    if (currentTenant && activeAgentsList.length > 0) {
      if (!selectedAgentId || !activeAgentsList.some(a => a.id === selectedAgentId)) {
        setSelectedAgentId(activeAgentsList[0].id);
      }
    }
  }, [selectedTenantId, currentTenant]);

  // Audio nodes and socket references
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeAudioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const speechFrameCounterRef = useRef<number>(0);
  const durationIntervalRef = useRef<any>(null);

  // Stop all currently playing and queued AI audio sources immediately
  const stopAllAudioSources = () => {
    activeAudioSourcesRef.current.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {
        // Source already stopped or disconnected
      }
    });
    activeAudioSourcesRef.current = [];
    nextStartTimeRef.current = 0;
    setAiVolume(0);
  };

  // Audio wave visual states
  const [userVolume, setUserVolume] = useState<number>(0);
  const [aiVolume, setAiVolume] = useState<number>(0);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  // Format call duration MM:SS
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60).toString().padStart(2, "0");
    const secs = (sec % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const startCall = async () => {
    setConnectionState("connecting");
    setCallActive(true);
    setCallActiveDuration(0);
    setUserTranscript("Menunggu suara Anda...");
    setAiTranscript(currentAgent?.greetingMessage || currentTenant?.greetingMessage || "Gemini sedang bersiap...");
    setEchoMode(false);
    setRecordedCallbackMessage(null);

    try {
      // 1. Establish WebSocket Connection to server with tenantId and agentId parameter
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const tenantParam = currentTenant ? `tenantId=${encodeURIComponent(currentTenant.id)}` : "";
      const agentParam = currentAgent ? `&agentId=${encodeURIComponent(currentAgent.id)}` : "";
      const wsUrl = `${protocol}//${window.location.host}/api/ws?${tenantParam}${agentParam}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          micStreamRef.current = stream;

          const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
          const inputAudioCtx = new AudioCtxClass({ sampleRate: 16000 });
          inputAudioCtxRef.current = inputAudioCtx;

          const outputAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
          outputAudioCtxRef.current = outputAudioCtx;
          nextStartTimeRef.current = 0;

          const source = inputAudioCtx.createMediaStreamSource(stream);
          const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          source.connect(processor);
          processor.connect(inputAudioCtx.destination);

          processor.onaudioprocess = (e) => {
            if (isMuted) {
              setUserVolume(0);
              return;
            }

            const inputBuffer = e.inputBuffer.getChannelData(0);
            
            let sum = 0;
            for (let i = 0; i < inputBuffer.length; i++) {
              sum += inputBuffer[i] * inputBuffer[i];
            }
            const rms = Math.sqrt(sum / inputBuffer.length);
            setUserVolume(Math.min(100, Math.round(rms * 250)));

            // Barge-In Interruption Check
            const agentBargeIn = currentAgent?.bargeIn !== false;
            const sensitivity = currentAgent?.bargeInSensitivity || "gemini_only";

            if (agentBargeIn && sensitivity !== "gemini_only" && activeAudioSourcesRef.current.length > 0) {
              const reqRms = sensitivity === "strict" ? 0.35 : sensitivity === "moderate" ? 0.25 : 0.18;
              const reqFrames = sensitivity === "strict" ? 10 : sensitivity === "moderate" ? 7 : 4;

              if (rms > reqRms) {
                speechFrameCounterRef.current += 1;
              } else {
                speechFrameCounterRef.current = 0;
              }

              if (speechFrameCounterRef.current >= reqFrames) {
                stopAllAudioSources();
                speechFrameCounterRef.current = 0;
              }
            } else {
              speechFrameCounterRef.current = 0;
            }

            const pcm16 = new Int16Array(inputBuffer.length);
            for (let i = 0; i < inputBuffer.length; i++) {
              const s = Math.max(-1, Math.min(1, inputBuffer[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            const bytes = new Uint8Array(pcm16.buffer);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);

            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ event: "audio", data: base64 }));
            }
          };
        } catch (err: any) {
          console.error("Microphone access failed:", err);
          setConnectionState("error");
          setUserTranscript("Gagal mengakses mikrofon.");
          setAiTranscript("Silakan izinkan akses mikrofon di browser Anda.");
          endCall();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.event === "connected") {
            setConnectionState("active");
            if (currentTenant?.agentStartsFirst === false) {
              setAiTranscript("[Agent diam - Menunggu Anda berbicara terlebih dahulu]");
            } else {
              setAiTranscript(currentTenant?.greetingMessage || "Halo! Ada yang bisa saya bantu hari ini?");
            }
            if (msg.echoMode) {
              setEchoMode(true);
              setAiTranscript("Mode Gema (Tanpa Kunci API). Suara Anda akan dipantulkan kembali.");
            }
            
            durationIntervalRef.current = setInterval(() => {
              setCallActiveDuration((prev) => prev + 1);
            }, 1000);
          }

          if (msg.event === "audio" && msg.data) {
            if (outputAudioCtxRef.current) {
              playAudioChunk(outputAudioCtxRef.current, msg.data);
            }
          }

          if (msg.event === "user_transcript") {
            setUserTranscript(msg.text);
          }

          if (msg.event === "ai_transcript") {
            setAiTranscript(msg.text);
            setAiVolume(50);
            setTimeout(() => setAiVolume(0), 400);
          }

          if (msg.event === "callback_created") {
            setRecordedCallbackMessage(
              `Permintaan callback berhasil dicatat: ${msg.callback.callerName} (${msg.callback.phoneNumber})`
            );
          }

          if (msg.event === "interrupted") {
            setAiTranscript("[Terganggu/Interrupted]");
            stopAllAudioSources();
          }

          if (msg.event === "disconnected") {
            setConnectionState("disconnected");
            endCall();
          }
        } catch (e) {
          console.error("Failed to parse simulator server message:", e);
        }
      };

      ws.onclose = () => {
        setConnectionState("disconnected");
        endCall();
      };

      ws.onerror = () => {
        setConnectionState("error");
        endCall();
      };

    } catch (err) {
      setConnectionState("error");
      endCall();
    }
  };

  const playAudioChunk = (audioCtx: AudioContext, base64PCM: string) => {
    const binary = atob(base64PCM);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    let sum = 0;
    for (let i = 0; i < float32.length; i++) {
      sum += float32[i] * float32[i];
    }
    const rms = Math.sqrt(sum / float32.length);
    setAiVolume(Math.min(100, Math.round(rms * 300)));

    const buffer = audioCtx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);

    // Track active audio source nodes for instant interruption cancellation
    activeAudioSourcesRef.current.push(source);
    source.onended = () => {
      activeAudioSourcesRef.current = activeAudioSourcesRef.current.filter((s) => s !== source);
    };

    let startTime = nextStartTimeRef.current;
    const currentTime = audioCtx.currentTime;

    if (startTime < currentTime) {
      startTime = currentTime + 0.05;
    }

    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;
  };

  const endCall = () => {
    stopAllAudioSources();
    setCallActive(false);
    setUserVolume(0);
    setAiVolume(0);

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event: "hangup" }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (connectionState === "connecting" || connectionState === "active") {
      setConnectionState("disconnected");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="simulator-tab">
      
      {/* Visual Call Flow and Diagnostics */}
      <div className="lg:col-span-2 space-y-6" id="simulator-left">
        
        {/* Tenant Agent Selector Header */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors" id="tenant-agent-selector shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
                <span>Pilih Tenant AI Agent yang Ingin Ditelfon</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pilih perusahaan untuk mencoba interaksi telepon dengan instruksi bisnis & dokumen RAG tenant tersebut.
              </p>
            </div>

            <div className="shrink-0 flex flex-wrap items-center gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Pilih Tenant</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => {
                    if (callActive) endCall();
                    setSelectedTenantId(e.target.value);
                  }}
                  disabled={callActive}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-800 dark:focus:ring-slate-700 transition-colors"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.agents?.length || 1} Agents)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase mb-0.5 font-bold">Pilih Agent AI</label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => {
                    if (callActive) endCall();
                    setSelectedAgentId(e.target.value);
                  }}
                  disabled={callActive || activeAgentsList.length === 0}
                  className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 text-indigo-950 dark:text-indigo-100 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-colors"
                >
                  {activeAgentsList.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      Ext {ag.extension} - {ag.agentName} ({ag.role || "CS"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Active Tenant & Agent Metadata Summary */}
          {currentTenant && (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs transition-colors">
              <div>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block font-semibold">Agent Ext {currentAgent?.extension || currentTenant.extension}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">{currentAgent?.agentName || currentTenant.agentName}</span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Suara: {currentAgent?.prebuiltVoice || currentTenant.prebuiltVoice}</span>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block font-semibold">Knowledge Base (RAG)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">{currentTenant.documents?.length || 0} Dokumen Dimuat</span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-1">
                  {currentTenant.documents?.map(d => d.title).join(", ") || "Tidak ada dokumen"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block font-semibold">Tools Function Calling</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {currentTenant.tools?.filter(t => t.enabled).length || 0} Tools Aktif
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  {currentTenant.tools?.filter(t => t.enabled).map(t => t.name).join(", ") || "Tanpa tools"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase block font-semibold">Inisiasi Percakapan</span>
                <span className={`font-semibold mt-0.5 block ${
                  currentTenant.agentStartsFirst !== false ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                }`}>
                  {currentTenant.agentStartsFirst !== false ? "Agent Sapa Terlebih Dahulu" : "Agent Diam (Tunggu User)"}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                  {currentTenant.agentStartsFirst !== false ? "First Speaker" : "User First Speaker"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Callback Execution Banner Notice */}
        {recordedCallbackMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-100 rounded-xl p-4 flex items-center gap-3 transition-colors">
            <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block">Tool Request Callback Berhasil Dieksekusi!</span>
              <span>{recordedCallbackMessage}</span>
            </div>
          </div>
        )}

        {/* Real-time Transcription Display */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 transition-colors" id="transcription-card">
          <h4 className="font-sans font-semibold text-slate-800 dark:text-slate-100 text-sm">Transkrip Panggilan Real-time</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="transcripts-grid">
            {/* User Transcript */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-4 flex flex-col h-[150px] justify-between transition-colors" id="user-transcript-box">
              <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-semibold tracking-wider block mb-1">Suara Pemanggil (Input Anda)</span>
              <div className="flex-1 overflow-y-auto text-sm text-slate-700 dark:text-slate-300 font-sans italic mt-1 leading-relaxed">
                "{userTranscript}"
              </div>
              {callActive && (
                <div className="flex items-center gap-2 mt-2" id="user-wave">
                  <div className="h-1 bg-purple-200 dark:bg-purple-900 rounded-full flex-1 overflow-hidden">
                    <div className="h-full bg-purple-600 dark:bg-purple-500 transition-all duration-75" style={{ width: `${userVolume}%` }} />
                  </div>
                  <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 w-6 text-right">{userVolume}%</span>
                </div>
              )}
            </div>

            {/* AI Transcript */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-4 flex flex-col h-[150px] justify-between transition-colors" id="ai-transcript-box">
              <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 font-semibold tracking-wider block mb-1">Suara Agent ({currentTenant?.agentName || "Gemini"})</span>
              <div className="flex-1 overflow-y-auto text-sm text-slate-700 dark:text-slate-300 font-sans mt-1 leading-relaxed">
                {aiTranscript}
              </div>
              {callActive && (
                <div className="flex items-center gap-2 mt-2" id="ai-wave">
                  <div className="h-1 bg-blue-200 dark:bg-blue-900 rounded-full flex-1 overflow-hidden">
                    <div className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-75" style={{ width: `${aiVolume}%` }} />
                  </div>
                  <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 w-6 text-right">{aiVolume}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Phone UI */}
      <div className="flex flex-col" id="simulator-right">
        <div className="bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex-1 flex flex-col aspect-[9/16] max-w-[340px] mx-auto w-full p-6 justify-between relative" id="phone-container">
          
          {/* Header Signal Bars */}
          <div className="flex justify-between items-center text-xs text-slate-500 font-mono" id="phone-status-bar">
            <span>EXT {currentAgent?.extension || currentTenant?.extension || "501"}</span>
            <div className="flex items-center gap-1">
              <span className="h-2 w-1 bg-slate-700 rounded-sm" />
              <span className="h-3 w-1 bg-slate-700 rounded-sm" />
              <span className={`h-4 w-1 rounded-sm ${callActive ? "bg-emerald-500" : "bg-slate-700"}`} />
              <span className="ml-1">LTE</span>
            </div>
          </div>

          {/* Caller Profile */}
          <div className="text-center my-4" id="caller-profile">
            <div className={`h-20 w-20 rounded-full flex items-center justify-center mx-auto border-2 transition-all ${callActive ? "bg-emerald-950/40 border-emerald-500 animate-pulse shadow-lg shadow-emerald-500/20" : "bg-slate-950 border-slate-800"}`} id="caller-avatar">
              <Phone size={30} className={callActive ? "text-emerald-400" : "text-slate-600"} />
            </div>
            <h3 className="font-sans font-semibold text-base text-slate-100 mt-3 line-clamp-1">{currentTenant?.name || "Gemini Live Gateway"}</h3>
            <span className="text-xs text-indigo-400 font-medium block">{currentAgent?.agentName || currentTenant?.agentName} ({currentAgent?.role || "CS"})</span>
            <span className="font-mono text-[11px] text-slate-400 mt-1 block">
              {connectionState === "idle" && "Siap Melakukan Panggilan"}
              {connectionState === "connecting" && "Menghubungkan..."}
              {connectionState === "active" && `Panggilan Aktif • ${formatDuration(callDuration)}`}
              {connectionState === "disconnected" && "Terputus"}
              {connectionState === "error" && "Koneksi Bermasalah"}
            </span>
            {echoMode && (
              <span className="inline-block mt-2 bg-amber-950/80 border border-amber-900 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded-full">
                ECHO TEST ACTIVE
              </span>
            )}
          </div>

          {/* Live Waves during Active Call */}
          <div className="h-12 flex items-center justify-center gap-1 mb-4" id="phone-waves">
            {callActive && connectionState === "active" ? (
              Array.from({ length: 15 }).map((_, i) => {
                const activeVol = (i % 2 === 0 ? userVolume : aiVolume) || 5;
                const h = Math.max(4, Math.min(40, Math.round(activeVol * 0.4 + Math.sin(i) * 5)));
                return (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-75 ${i % 2 === 0 ? "bg-purple-500" : "bg-blue-500"}`}
                    style={{ height: `${h}px` }}
                  />
                );
              })
            ) : (
              <div className="text-slate-600 text-[11px] font-mono text-center">
                [Penelepon Siap]
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-4" id="phone-controls">
            {callActive ? (
              <div className="flex justify-around items-center" id="active-call-actions">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`h-12 w-12 rounded-full flex items-center justify-center border transition-all ${isMuted ? "bg-rose-950 border-rose-500 text-rose-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"}`}
                  id="mute-btn"
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <button
                  onClick={endCall}
                  className="h-16 w-16 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center text-white shadow-lg shadow-rose-950/30 transition-all hover:scale-105 active:scale-95"
                  id="hangup-btn"
                >
                  <PhoneOff size={24} />
                </button>
              </div>
            ) : (
              <div className="text-center" id="idle-call-actions">
                <button
                  onClick={startCall}
                  disabled={connectionState === "connecting"}
                  className="w-full max-w-[200px] h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-sans text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 transition-all hover:scale-[1.02] active:scale-[0.98] mx-auto"
                  id="dial-btn"
                >
                  <Phone size={18} className="animate-bounce" />
                  <span>Panggil {currentTenant?.agentName || "Agent"}</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}

