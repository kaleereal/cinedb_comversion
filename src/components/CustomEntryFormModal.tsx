import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { EntryTypeDefinition, GenericEntry } from '../types';

interface CustomEntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: GenericEntry) => void;
  entryType: EntryTypeDefinition;
  initialEntry?: GenericEntry | null;
}

export const CustomEntryFormModal: React.FC<CustomEntryFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  entryType,
  initialEntry,
}) => {
  const [title, setTitle] = useState(initialEntry?.title || '');
  const [fieldsData, setFieldsData] = useState<Record<string, any>>(
    initialEntry?.fieldsData || {}
  );

  useEffect(() => {
    if (initialEntry) {
      setTitle(initialEntry.title || '');
      setFieldsData(initialEntry.fieldsData || {});
    } else {
      setTitle('');
      setFieldsData({});
    }
  }, [initialEntry, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Judul entri wajib diisi.');
      return;
    }

    const saved: GenericEntry = {
      id: initialEntry?.id || `entry_${Date.now()}`,
      entryTypeId: entryType.id,
      title: title.trim(),
      fieldsData,
      createdAt: initialEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex flex-col justify-end sm:justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-lg mx-auto bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <h3 className="text-base font-bold text-white">
            {initialEntry ? `Edit Entri ${entryType.name}` : `Buat Entri ${entryType.name} Baru`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Judul {entryType.name} *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Masukkan nama/judul ${entryType.name}...`}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Dynamic Schema Fields (Poin 1 & 3) */}
          {entryType.fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>{field.label}</span>
                {field.is_required && (
                  <span className="text-rose-400 text-[10px] font-bold">* Wajib</span>
                )}
              </label>

              {field.type === 'notes' ? (
                <textarea
                  rows={3}
                  required={field.is_required}
                  value={fieldsData[field.id] || ''}
                  onChange={(e) =>
                    setFieldsData({ ...fieldsData, [field.id]: e.target.value })
                  }
                  placeholder={field.description || `Masukkan ${field.label}...`}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  required={field.is_required}
                  value={fieldsData[field.id] ?? ''}
                  onChange={(e) =>
                    setFieldsData({
                      ...fieldsData,
                      [field.id]: e.target.value !== '' ? Number(e.target.value) : '',
                    })
                  }
                  placeholder={field.description || '0'}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              ) : (
                <input
                  type="text"
                  required={field.is_required}
                  value={fieldsData[field.id] || ''}
                  onChange={(e) =>
                    setFieldsData({ ...fieldsData, [field.id]: e.target.value })
                  }
                  placeholder={field.description || `Masukkan ${field.label}...`}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}
            </div>
          ))}

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Simpan Entri</span>
          </button>
        </form>
      </div>
    </div>
  );
};
