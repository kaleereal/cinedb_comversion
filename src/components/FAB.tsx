import React from 'react';
import { Plus, Film } from 'lucide-react';

interface FABProps {
  onClick: () => void;
  label?: string;
}

export const FAB: React.FC<FABProps> = ({ onClick, label = 'Tambah' }) => {
  return (
    <div className="fixed bottom-20 right-4 sm:right-6 z-30 max-w-md mx-auto pointer-events-none">
      <button
        id="fab-add-button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className="pointer-events-auto w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/40 hover:from-indigo-500 hover:to-violet-500 active:scale-95 transition-all duration-200 border border-indigo-400/40 cursor-pointer"
      >
        <Plus className="w-6 h-6 stroke-[3px]" />
      </button>
    </div>
  );
};
