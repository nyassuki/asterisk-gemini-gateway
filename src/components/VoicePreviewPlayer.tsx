import React, { useState } from 'react';
import { Play, Loader2, Volume2 } from 'lucide-react';

interface VoicePreviewPlayerProps {
  initialVoice?: string;
  onVoiceChange?: (voice: string) => void;
}

const PREBUILT_VOICES = [
  { id: "Zephyr", name: "Zephyr (Maskulin - Tenang)" },
  { id: "Puck", name: "Puck (Maskulin - Energetik)" },
  { id: "Charon", name: "Charon (Maskulin - Dalam)" },
  { id: "Kore", name: "Kore (Feminin - Ceria)" },
  { id: "Fenrir", name: "Fenrir (Maskulin - Otoriter)" },
  { id: "Aoede", name: "Aoede (Feminin - Lembut)" },
];

export const VoicePreviewPlayer: React.FC<VoicePreviewPlayerProps> = ({ 
  initialVoice = "Zephyr",
  onVoiceChange
}) => {
  const [voice, setVoice] = useState(initialVoice);
  const [text, setText] = useState("Halo, saya adalah asisten suara Gemini. Bagaimana saya bisa membantu Anda hari ini?");
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handlePreview = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });
      const data = await response.json();
      if (data.audio) {
        const blob = await fetch(`data:audio/wav;base64,${data.audio}`).then(res => res.blob());
        const url = URL.createObjectURL(blob);
        
        // Revoke old URL if it exists
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        
        setAudioUrl(url);
        const audio = new Audio(url);
        audio.play();
      }
    } catch (err) {
      console.error("Preview failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceSelect = (v: string) => {
    setVoice(v);
    if (onVoiceChange) onVoiceChange(v);
  };

  return (
    <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded-xl">
            <Volume2 size={18} />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Voice Studio</h4>
            <p className="text-[10px] text-slate-500 font-medium">Preview karakter suara AI sebelum deploy.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Pilih Profil Suara</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PREBUILT_VOICES.map(v => (
              <button
                key={v.id}
                onClick={() => handleVoiceSelect(v.id)}
                className={`px-3 py-2.5 rounded-xl text-[10px] font-bold border transition-all ${
                  voice === v.id 
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" 
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300"
                }`}
              >
                {v.id}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Testing Script</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 h-24 resize-none focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            placeholder="Ketik sesuatu untuk dicoba..."
          />
        </div>

        <button
          onClick={handlePreview}
          disabled={isLoading || !text}
          className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-black flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 shadow-lg shadow-slate-200 dark:shadow-none"
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Play size={16} fill="currentColor" />
          )}
          SIMULASI SUARA {voice.toUpperCase()}
        </button>
      </div>
      
      <div className="pt-2 flex items-center justify-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
        <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-emerald-500" /> 24kHz Audio</span>
        <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-indigo-500" /> Gemini TTS 3.1</span>
        <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-amber-500" /> Prebuilt Engine</span>
      </div>
    </div>
  );
};
