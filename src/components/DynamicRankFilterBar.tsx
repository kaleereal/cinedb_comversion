import React from 'react';
import { Layers, Tag, Check, Sparkles } from 'lucide-react';
import { CustomFieldDefinition } from '../types';
import { formatNumberWithAffixes } from '../utils/dynamicFilterSchema';

interface DynamicRankFilterBarProps {
  fieldDefinitions: CustomFieldDefinition[];
  activeFieldId: string | null;
  onSelectField: (fieldId: string | null) => void;
  selectedOption: string | null;
  onSelectOption: (option: string | null) => void;
  /** Optional custom extra options discovered from active data */
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
  // Extract all supported dynamic filter fields (single_choice, multi_choice, text_dynamic_filter, custom_text, text, number)
  // AUTO-PRUNING: If dynamicOptionsByField is provided, prune/hide tabs that have 0 active records
  const choiceFields = React.useMemo(() => {
    return fieldDefinitions
      .filter((f) => {
        const isSupportedType =
          f.type === 'single_choice' ||
          f.type === 'multi_choice' ||
          f.type === 'text_dynamic_filter' ||
          f.type === 'custom_text' ||
          f.type === 'text' ||
          f.type === 'number';

        if (!isSupportedType) return false;

        // Auto-pruning: If dynamicOptionsByField is available, ensure field has at least 1 active option
        if (dynamicOptionsByField && Object.keys(dynamicOptionsByField).length > 0) {
          const opts = dynamicOptionsByField[f.id];
          return Array.isArray(opts) && opts.length > 0;
        }

        return true;
      })
      .sort((a, b) => a.order - b.order);
  }, [fieldDefinitions, dynamicOptionsByField]);

  // Current active field object (if a specific field tab is selected)
  const currentField = React.useMemo(() => {
    if (!activeFieldId) return null;
    return choiceFields.find((f) => f.id === activeFieldId) || null;
  }, [choiceFields, activeFieldId]);

  // Items/Options available for current active field:
  // Render active options discovered from data records (auto-pruning unpopulated options)
  const currentOptions = React.useMemo(() => {
    if (!currentField) return [];
    if (dynamicOptionsByField && dynamicOptionsByField[currentField.id]) {
      return dynamicOptionsByField[currentField.id];
    }
    const configuredOptions = currentField.options || [];
    return configuredOptions.filter((opt) => opt && opt.trim().length > 0);
  }, [currentField, dynamicOptionsByField]);

  // Auto-pruning cleanup: reset filter states reactively if the active field or option was pruned
  React.useEffect(() => {
    if (activeFieldId && !choiceFields.some((f) => f.id === activeFieldId)) {
      onSelectField(null);
      onSelectOption(null);
    } else if (activeFieldId && selectedOption && !currentOptions.includes(selectedOption)) {
      onSelectOption(null);
    }
  }, [activeFieldId, selectedOption, choiceFields, currentOptions, onSelectField, onSelectOption]);

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

        {/* Dynamic Tabs from Settings Fields (Auto-pruned when empty/null) */}
        {choiceFields.map((field) => {
          const isActive = activeFieldId === field.id;
          const optionsCount = dynamicOptionsByField[field.id]?.length ?? (field.options || []).length;

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

          {/* Value Chips (Auto-pruned to only render options with active data) */}
          {currentOptions.map((opt) => {
            const isChipActive = selectedOption === opt;
            const displayLabel =
              currentField.type === 'number'
                ? formatNumberWithAffixes(opt, currentField.prefix, currentField.suffix)
                : opt;

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
                <span>{displayLabel}</span>
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
