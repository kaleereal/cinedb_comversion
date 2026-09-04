import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Hapus',
  cancelText = 'Batal',
  isDanger = true,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-70 flex flex-col justify-end sm:justify-center items-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#181B22] border border-[#30363D] rounded-t-md sm:rounded-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[#30363D] bg-[#111319]">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded flex items-center justify-center ${
                isDanger
                  ? 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                  : 'bg-[#181B22] text-[#E5A93C] border border-[#30363D]'
              }`}
            >
              {isDanger ? <Trash2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            </div>
            <h3 className="text-xs font-bold text-[#F0F6FC]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#212631] transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Message body */}
        <div className="p-3">
          <p className="text-xs text-[#8B949E] leading-relaxed">{message}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 p-3 pt-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-1.5 px-3 rounded bg-[#212631] hover:bg-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] border border-[#30363D] text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-1.5 px-3 rounded text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-[#E5A93C] hover:bg-[#d4982f] text-black'
            }`}
          >
            {isDanger && <Trash2 className="w-3.5 h-3.5" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
