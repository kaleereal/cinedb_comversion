import React, { useState } from 'react';
import { Palette, Check, X, ChevronDown, ChevronUp, Type } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ThemeSettings } from '../types';

export const ThemeEditorToolbar: React.FC = () => {
  const {
    isThemeEditMode,
    draftTheme,
    updateDraftColor,
    updateDraftTheme,
    saveThemeChanges,
    cancelThemeChanges,
  } = useTheme();

  const [isExpanded, setIsExpanded] = useState(true);

  if (!isThemeEditMode) return null;

  const colorTokens: Array<{ key: keyof ThemeSettings['colors']; label: string }> = [
    { key: 'bg', label: 'Background' },
    { key: 'card', label: 'Card/Panel' },
    { key: 'cardBorder', label: 'Border' },
    { key: 'textPrimary', label: 'Teks Utama' },
    { key: 'textSecondary', label: 'Teks Sekunder' },
    { key: 'primary', label: 'Warna Utama' },
    { key: 'accent', label: 'Warna Aksen' },
    { key: 'danger', label: 'Warna Bahaya' },
  ];

  return (
    <div
      id="theme-editor-toolbar"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-70 w-[92%] max-w-md bg-slate-900/95 border border-indigo-500/80 rounded-3xl shadow-2xl backdrop-blur-md overflow-hidden text-white animate-in slide-in-from-top-4"
    >
      {/* Sticky Bar Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-950/90 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white animate-pulse">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Mode Edit Tema Active</h4>
            <p className="text-[10px] text-indigo-300">Live preview di seluruh halaman</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg hover:bg-indigo-900 text-indigo-200 transition"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Controls Panel */}
      {isExpanded && (
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Colors Token Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {colorTokens.map((token) => (
              <div key={token.key} className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-300">{token.label}</span>
                <input
                  type="color"
                  value={draftTheme.colors[token.key]}
                  onChange={(e) => updateDraftColor(token.key, e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
              </div>
            ))}
          </div>

          {/* Typography / Font Size Scale Selector (Poin 8) */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <Type className="w-3.5 h-3.5 text-indigo-400" />
                <span>Skala Ukuran Font Global</span>
              </span>
              <span className="font-extrabold text-indigo-400 uppercase">{draftTheme.fontSize}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => updateDraftTheme({ fontSize: size })}
                  className={`py-1 rounded-lg text-xs font-bold transition uppercase ${
                    draftTheme.fontSize === size
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Footer: Simpan & Batal (Poin 7) */}
      <div className="flex items-center gap-2 p-3 bg-slate-950 border-t border-slate-800">
        <button
          type="button"
          onClick={saveThemeChanges}
          className="flex-1 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Simpan Tema</span>
        </button>
        <button
          type="button"
          onClick={cancelThemeChanges}
          className="flex-1 min-h-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>Batal</span>
        </button>
      </div>
    </div>
  );
};
