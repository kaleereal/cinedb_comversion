import React, { useState } from 'react';
import { X, RotateCcw, Check, Zap } from 'lucide-react';
import { CustomFieldDefinition, FilterCriteria } from '../types';

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  criteria: FilterCriteria;
  onApply: (newCriteria: FilterCriteria) => void;
  fieldDefinitions: CustomFieldDefinition[];
}

export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  isOpen,
  onClose,
  criteria,
  onApply,
  fieldDefinitions,
}) => {
  const [localSingleChoices, setLocalSingleChoices] = useState<Record<string, string>>(
    criteria.singleChoices || {}
  );
  const [localMultiChoices, setLocalMultiChoices] = useState<Record<string, string[]>>(
    criteria.multiChoices || {}
  );
  const [minScore, setMinScore] = useState<number>(criteria.minRating || 0);

  if (!isOpen) return null;

  const singleChoiceFields = fieldDefinitions.filter((f) => f.type === 'single_choice');
  const multiChoiceFields = fieldDefinitions.filter((f) => f.type === 'multi_choice');

  const toggleMultiChoice = (fieldId: string, option: string) => {
    const current = localMultiChoices[fieldId] || [];
    if (current.includes(option)) {
      setLocalMultiChoices({
        ...localMultiChoices,
        [fieldId]: current.filter((o) => o !== option),
      });
    } else {
      setLocalMultiChoices({
        ...localMultiChoices,
        [fieldId]: [...current, option],
      });
    }
  };

  const handleReset = () => {
    setLocalSingleChoices({});
    setLocalMultiChoices({});
    setMinScore(0);
    onApply({
      ...criteria,
      singleChoices: {},
      multiChoices: {},
      minRating: 0,
    });
    onClose();
  };

  const handleApply = () => {
    onApply({
      ...criteria,
      singleChoices: localSingleChoices,
      multiChoices: localMultiChoices,
      minRating: minScore,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg mx-auto bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Filter Kategori &amp; Kriteria</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Minimum Rating Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">Rating Minimum</span>
              <span className="text-indigo-400">{minScore} / 100</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Single Choice Dropdowns */}
          {singleChoiceFields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {field.label}
              </label>
              <select
                value={localSingleChoices[field.id] || ''}
                onChange={(e) =>
                  setLocalSingleChoices({
                    ...localSingleChoices,
                    [field.id]: e.target.value,
                  })
                }
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Semua {field.label}</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Multi Choice Checkboxes */}
          {multiChoiceFields.map((field) => {
            const selected = localMultiChoices[field.id] || [];
            return (
              <div key={field.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {field.label}
                  </label>
                  {selected.length > 0 && (
                    <span className="text-[10px] text-indigo-400 font-bold">
                      {selected.length} aktif
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {field.options?.map((opt) => {
                    const isChecked = selected.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleMultiChoice(field.id, opt)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons: Terapkan & Reset */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-2 min-h-[48px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition"
          >
            <Check className="w-4 h-4" />
            <span>Terapkan Filter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
