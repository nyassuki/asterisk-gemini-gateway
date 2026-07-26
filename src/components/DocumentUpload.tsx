import React, { useState, useRef } from "react";
import { Upload, File, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DocumentUploadProps {
  tenantId: string;
  onUploadSuccess?: (doc: any) => void;
}

export default function DocumentUpload({ tenantId, onUploadSuccess }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus("idle");
      setErrorMessage("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStatus("idle");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Using the new RAG upload endpoint
      const res = await fetch(`/api/tenants/${tenantId}/rag/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      setStatus("success");
      setFile(null);
      if (onUploadSuccess) onUploadSuccess(data);
    } catch (err: any) {
      console.error("Upload error:", err);
      setStatus("error");
      setErrorMessage(err.message);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setStatus("idle");
  };

  return (
    <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
          <Upload size={20} />
        </div>
        <div>
          <h3 className="font-black text-slate-900 dark:text-white">Knowledge Base Upload</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Upload PDF, TXT, or DOCX for AI context.</p>
        </div>
      </div>

      {!file ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              setFile(e.dataTransfer.files[0]);
            }
          }}
          className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors group bg-slate-50 dark:bg-slate-900/40"
        >
          <div className="w-12 h-12 rounded-full bg-white dark:bg-black border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors shadow-sm">
            <Upload size={24} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Click or drag to upload</p>
            <p className="text-[10px] text-slate-400 font-medium">Max file size: 10MB</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            accept=".pdf,.txt,.docx,.doc"
          />
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-black shadow-xs flex items-center justify-center text-indigo-500 border border-slate-100 dark:border-slate-800 transition-colors">
                <File size={20} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            {!uploading && (
              <button 
                onClick={clearFile}
                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Start Processing
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {status === "success" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 size={18} />
            <span className="text-xs font-bold">Document uploaded and processed successfully!</span>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800 rounded-xl flex items-center gap-3 text-rose-600 dark:text-rose-400"
          >
            <AlertCircle size={18} />
            <span className="text-xs font-bold">{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
