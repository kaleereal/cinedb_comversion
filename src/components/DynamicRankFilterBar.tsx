import React from 'react';
import { Layers, Tag, Check, Sparkles } from 'lucide-react';
import { CustomFieldDefinition } from '../types';

interface DynamicRankFilterBarProps {
  fieldDefinitions: CustomFieldDefinition[];
  activeFieldId: string | null;
  onSelectField: (fieldId: string | null) => void;
  selectedOption: string | null;
  onSelectOption: (option: string | null) => void;
  /** Optional custom extra options discovered from data */
  dynamicOptionsByField?: Record<string, string[]>;
}

export const DynamicRankFilterBar: React.FC<DynamicRankFilterBarProps> = ({
  fieldDefinitions,
  activeFieldId,
  onSelectField,
  selectedOption,
  onSelectOption,
  dynamicOptionsByField = {},
}) => {
  // Extract all single_choice, multi_choice, text_dynamic_filter, and number fields created/managed in Settings
  const choiceFields = React.useMemo(() => {
    return fieldDefinitions
      .filter(
        (f) =>
          f.type === 'single_choice' ||
          f.type === 'multi_choice' ||
          f.type === 'text_dynamic_filter' ||
          f.type === 'number'
      )
      .sort((a, b) => a.order - b.order);
  }, [fieldDefinitions]);

  // Current active field object (if a specific field tab is selected)
  const currentField = React.useMemo(() => {
    if (!activeFieldId) return null;
    return choiceFields.find((f) => f.id === activeFieldId) || null;
  }, [choiceFields, activeFieldId]);

  // Items/Options available for current active field (options from field config + discovered data)
  const currentOptions = React.useMemo(() => {
    if (!currentField) return [];
    const configuredOptions = currentField.options || [];
    const discovered = dynamicOptionsByField[currentField.id] || [];
    // Combine and deduplicate
    const combined = Array.from(new Set([...configuredOptions, ...discovered]));
    return combined.filter((opt) => opt && opt.trim().length > 0);
  }, [currentField, dynamicOptionsByField]);

  return (
    <div className="sticky top-0 z-20 bg-[#0D1117]/95 backdrop-blur-xs pb-2 -mx-4 px-4 pt-1 border-b border-[#30363D] space-y-1.5 font-mono">
      {/* 1. STICKY FIELD CATEGORY TABS (Horizontal Scrollable) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
        {/* Tab: Semua Kategori */}
        <button
          type="button"
          onClick={() => {
            onSelectField(null);
            onSelectOption(null);
          }}
          className={`shrink-0 px-2.5 py-1 rounded text-xs transition flex items-center gap-1 cursor-pointer active:scale-95 ${
            activeFieldId === null
              ? 'bg-[#212631] text-[#E5A93C] border border-[#30363D]'
              : 'bg-[#181B22] text-[#8B949E] hover:text-[#F0F6FC] border border-[#30363D]/60 hover:bg-[#212631]'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>Semua</span>
        </button>

        {/* Dynamic Tabs from Settings Fields */}
        {choiceFields.map((field) => {
          const isActive = activeFieldId === field.id;
          const optionsCount = (field.options || []).length;

          return (
            <button
              key={field.id}
              type="button"
              onClick={() => {
                if (activeFieldId === field.id) {
                  // Keep active
                } else {
                  onSelectField(field.id);
                  onSelectOption(null); // Reset option filter on tab switch
                }
              }}
              className={`shrink-0 px-2.5 py-1 rounded text-xs transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-[#212631] text-[#E5A93C] border border-[#30363D]'
                  : 'bg-[#181B22] text-[#8B949E] hover:text-[#F0F6FC] border border-[#30363D]/60 hover:bg-[#212631]'
              }`}
            >
              <Tag className="w-3 h-3" />
              <span>{field.label}</span>
              {optionsCount > 0 && (
                <span
                  className={`text-[9px] px-1 py-0.2 rounded ${
                    isActive ? 'bg-[#111319] text-[#E5A93C]' : 'bg-[#111319] text-[#8B949E]'
                  }`}
                >
                  {optionsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2. HORIZONTAL SCROLLABLE CHIPS (Items/Values Filter under the Tab) */}
      {currentField ? (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth pt-0.5">
          {/* Chip "Semua [Nama Field]" to show all in this field category */}
          <button
            type="button"
            onClick={() => onSelectOption(null)}
            className={`shrink-0 px-2 py-0.5 rounded text-[11px] transition flex items-center gap-1 cursor-pointer active:scale-95 ${
              selectedOption === null
                ? 'bg-[#E5A93C] text-[#0D1117] font-semibold'
                : 'bg-[#111319] border border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC]'
            }`}
          >
            {selectedOption === null && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            <span>Semua {currentField.label}</span>
          </button>

          {/* Value Chips */}
          {currentOptions.map((opt) => {
            const isChipActive = selectedOption === opt;

            return (
              <button
                key={opt}
                type="button"
                onClick={() => onSelectOption(isChipActive ? null : opt)}
                className={`shrink-0 px-2 py-0.5 rounded text-[11px] transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                  isChipActive
                    ? 'bg-[#E5A93C] text-[#0D1117] font-semibold'
                    : 'bg-[#181B22] border border-[#30363D] text-[#E2E2EB] hover:text-[#F0F6FC] hover:bg-[#212631]'
                }`}
              >
                {isChipActive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                <span>{opt}</span>
              </button>
            );
          })}

          {currentOptions.length === 0 && (
            <span className="text-[10px] text-[#57606A] italic py-0.5">
              Belum ada pilihan item.
            </span>
          )}
        </div>
      ) : (
        /* Hint when "Semua" tab is selected */
        <div className="flex items-center justify-between text-[10px] text-[#57606A] px-0.5">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#E5A93C]" />
            <span>Pilih tab kategori untuk filter khusus</span>
          </span>
        </div>
      )}
    </div>
  );
};
