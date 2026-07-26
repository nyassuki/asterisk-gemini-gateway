/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import { Sun, Moon, Laptop, Languages } from "lucide-react";

export default function App() {
  const [appTheme, setAppTheme] = useState<"dark" | "light" | "system">(() => {
    return (localStorage.getItem("app_theme") as "dark" | "light" | "system") || "system";
  });

  const [appLang, setAppLang] = useState<"id" | "en">(() => {
    return (localStorage.getItem("app_lang") as "id" | "en") || "id";
  });

  // Apply dark mode class to HTML element
  useEffect(() => {
    localStorage.setItem("app_theme", appTheme);
    const root = document.documentElement;

    const applyDark = () => {
      if (appTheme === "dark") {
        root.classList.add("dark");
      } else if (appTheme === "light") {
        root.classList.remove("dark");
      } else {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    };

    applyDark();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (appTheme === "system") applyDark();
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [appTheme]);

  // Persist language setting
  useEffect(() => {
    localStorage.setItem("app_lang", appLang);
  }, [appLang]);

  const isEn = appLang === "en";

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-indigo-100 dark:selection:bg-indigo-900/50 transition-colors duration-200" id="app-container">
      {/* Top Professional Navigation Bar */}
      <nav className="bg-white dark:bg-black border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 transition-colors sticky top-0 z-40" id="app-nav">
        <div className="max-w-[90%] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3" id="nav-inner">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3" id="nav-logo">
            <div className="h-9 w-9 rounded-lg bg-slate-900 dark:bg-indigo-600 flex items-center justify-center text-white shadow-xs" id="logo-icon">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                <line x1="12" x2="12" y1="19" y2="22"/>
              </svg>
            </div>
            <div id="logo-text">
              <span className="font-sans font-bold text-slate-900 dark:text-slate-100 tracking-tight block text-sm">ASTERISK LINK</span>
              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-400 font-semibold uppercase block -mt-0.5 tracking-wider">
                {isEn ? "Gemini Live Hub & Voice Gateway" : "Gemini Live Hub & PBX Gateway"}
              </span>
            </div>
          </div>

          {/* Controls: Language Switcher & Theme Switcher */}
          <div className="flex items-center gap-3 flex-wrap justify-center" id="nav-controls">
            
            {/* Language Toggle (ID / EN) */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1" id="nav-lang-picker">
              <button
                type="button"
                onClick={() => setAppLang("id")}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  appLang === "id"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title="Bahasa Indonesia"
              >
                <span>🇮🇩 ID</span>
              </button>
              <button
                type="button"
                onClick={() => setAppLang("en")}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  appLang === "en"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title="English Language"
              >
                <span>🇺🇸 EN</span>
              </button>
            </div>

            {/* Theme Toggle (Dark / Light / System) */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1" id="nav-theme-picker">
              <button
                type="button"
                onClick={() => setAppTheme("light")}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  appTheme === "light"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title={isEn ? "Light Theme" : "Tema Terang"}
              >
                <Sun size={13} />
                <span className="hidden sm:inline">{isEn ? "Light" : "Terang"}</span>
              </button>

              <button
                type="button"
                onClick={() => setAppTheme("dark")}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  appTheme === "dark"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title={isEn ? "Dark Theme" : "Tema Gelap"}
              >
                <Moon size={13} />
                <span className="hidden sm:inline">{isEn ? "Dark" : "Gelap"}</span>
              </button>

              <button
                type="button"
                onClick={() => setAppTheme("system")}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  appTheme === "system"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title={isEn ? "System Theme" : "Tema Sistem"}
              >
                <Laptop size={13} />
                <span className="hidden sm:inline">{isEn ? "System" : "Sistem"}</span>
              </button>
            </div>

            {/* Gateway Version Badge */}
            <span className="hidden md:flex bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md text-xs font-mono font-semibold items-center gap-1.5 border border-slate-200 dark:border-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              v1.0
            </span>

          </div>

        </div>
      </nav>

      {/* Main Content Dashboard */}
      <main className="flex-1" id="app-main">
        <Dashboard appTheme={appTheme} appLang={appLang} setAppTheme={setAppTheme} setAppLang={setAppLang} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 bg-white dark:bg-black transition-colors" id="app-footer">
        <div className="max-w-[90%] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500" id="footer-inner">
          <span>&copy; {new Date().getFullYear()} Asterisk Gemini Live Gateway. {isEn ? "All rights reserved." : "Semua hak dilindungi."}</span>
          <div className="flex items-center gap-4" id="footer-links">
            <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded">UTC-0</span>
            <span className="font-mono text-slate-500 dark:text-slate-400">PCM 16-bit 8kHz/16kHz</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
