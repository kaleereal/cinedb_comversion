import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, Edit2, Search } from 'lucide-react';
import { EntryTypeDefinition, GenericEntry } from '../types';
import { getStoredGenericEntries, saveGenericEntries } from '../utils/storage';
import { CustomEntryFormModal } from './CustomEntryFormModal';

interface CustomEntryViewProps {
  entryType: EntryTypeDefinition;
}

export const CustomEntryView: React.FC<CustomEntryViewProps> = ({ entryType }) => {
  const [entries, setEntries] = useState<GenericEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GenericEntry | null>(null);

  useEffect(() => {
    const all = getStoredGenericEntries();
    setEntries(all.filter((e) => e.entryTypeId === entryType.id));
  }, [entryType.id]);

  const handleOpenCreate = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: GenericEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleSaveEntry = (saved: GenericEntry) => {
    const all = getStoredGenericEntries();
    const existingIdx = all.findIndex((e) => e.id === saved.id);
    let updated: GenericEntry[] = [];

    if (existingIdx >= 0) {
      updated = all.map((e) => (e.id === saved.id ? saved : e));
    } else {
      updated = [saved, ...all];
    }

    saveGenericEntries(updated);
    setEntries(updated.filter((e) => e.entryTypeId === entryType.id));
  };

  const handleDeleteEntry = (id: string) => {
    const all = getStoredGenericEntries();
    const updated = all.filter((e) => e.id !== id);
    saveGenericEntries(updated);
    setEntries(updated.filter((e) => e.entryTypeId === entryType.id));
  };

  const filtered = entries.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-28 animate-in fade-in">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>{entryType.name}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{entryType.description}</p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="min-h-[42px] px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-lg shadow-indigo-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Cari entri ${entryType.name}...`}
          className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-slate-900/50 border border-slate-800/80">
            <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-300">Belum ada entri {entryType.name}</p>
          </div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-md"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{entry.title}</h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(entry)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-amber-300 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Dynamic Field Display */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-xs">
                {entryType.fields.map((field) => (
                  <div key={field.id} className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">
                      {field.label}
                    </span>
                    <span className="font-semibold text-slate-200">
                      {entry.fieldsData[field.id] !== undefined
                        ? String(entry.fieldsData[field.id])
                        : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <CustomEntryFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveEntry}
          entryType={entryType}
          initialEntry={editingEntry}
        />
      )}
    </div>
  );
};
