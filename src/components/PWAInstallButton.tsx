import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  if (isInstalled) {
    return compact ? null : (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-medium">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>Terinstal sebagai Aplikasi PWA</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 4000);
    }
  };

  if (isInstallable) {
    return (
      <>
        <button
          id="pwa-install-btn"
          onClick={handleInstallClick}
          className={`flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-95 shadow-md ${
            compact
              ? 'p-2 bg-indigo-600 text-white hover:bg-indigo-500'
              : 'px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 text-sm w-full'
          }`}
          title="Pasang Aplikasi ke Layar Utama"
        >
          <Download className="w-4 h-4" />
          {!compact && <span>Pasang Aplikasi (PWA)</span>}
        </button>

        {justInstalled && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Aplikasi berhasil ditambahkan ke layar utama!</span>
          </div>
        )}
      </>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          id="pwa-ios-guide-btn"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center justify-center gap-2 rounded-xl font-medium border border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-700/80 transition active:scale-95 ${
            compact ? 'p-2' : 'px-4 py-2.5 text-xs w-full'
          }`}
          title="Panduan Pasang iOS"
        >
          <Share className="w-3.5 h-3.5 text-sky-400" />
          {!compact && <span>Pasang di iPhone / iPad</span>}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold flex items-center gap-2 text-white">
                  <Share className="w-4 h-4 text-indigo-400" />
                  Pasang di iPhone / Safari
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <p>
                    Ketuk tombol <strong className="text-white">Share</strong> (ikon kotak panah ke atas) di bilah navigasi Safari bawah.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <p>
                    Gulir ke bawah lalu pilih opsi{' '}
                    <strong className="text-white flex items-center gap-1 inline-flex">
                      <PlusSquare className="w-3.5 h-3.5 text-indigo-400 inline" /> Tambahkan ke Layar Utama (Add to Home Screen)
                    </strong>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <p>
                    Ketuk <strong className="text-white">Tambah (Add)</strong> di pojok kanan atas untuk membuka aplikasi secara fullscreen tanpa browser bar.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
