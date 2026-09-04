import React, { useState } from 'react';
import { Upload, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { NoteBlock } from '../types';

interface ImageBlockEditorProps {
  block: NoteBlock;
  onAddUrl: (url: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImg: (idx: number) => void;
}

export const ImageBlockEditor: React.FC<ImageBlockEditorProps> = ({
  block,
  onAddUrl,
  onFileUpload,
  onRemoveImg,
}) => {
  const [inputUrl, setInputUrl] = useState('');
  const imgs = block.images && block.images.length > 0 ? block.images : (block.content ? [block.content] : []);

  const handleAdd = () => {
    if (!inputUrl.trim()) return;
    onAddUrl(inputUrl.trim());
    setInputUrl('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-[#8B949E]">
          Koleksi Gambar ({imgs.length} gambar)
        </span>
        <label className="px-2 py-1 rounded bg-[#212631] hover:bg-[#2A303C] text-[#F0F6FC] border border-[#30363D] text-[11px] font-mono cursor-pointer flex items-center gap-1 transition active:scale-98">
          <Upload className="w-3 h-3 text-[#E5A93C]" />
          <span>+ Unggah Berkas</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFileUpload}
          />
        </label>
      </div>

      <div className="flex gap-1.5">
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="Masukkan URL gambar..."
          className="flex-1 px-2.5 py-1.5 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C]"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-2.5 py-1.5 rounded bg-[#212631] hover:bg-[#2A303C] text-[#E5A93C] text-xs font-mono border border-[#30363D] transition cursor-pointer"
        >
          + Tambah URL
        </button>
      </div>

      {imgs.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
          {imgs.map((img, idx) => (
            <div
              key={idx}
              className="relative aspect-square rounded bg-[#0F1117] border border-[#30363D] overflow-hidden group/img"
            >
              <img src={img} alt={`Gambar ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemoveImg(idx)}
                className="absolute top-1 right-1 p-1 rounded bg-black/80 hover:bg-rose-950 text-rose-300 text-xs transition cursor-pointer"
                title="Hapus gambar ini"
              >
                <X className="w-3 h-3" />
              </button>
              <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-black/70 text-[9px] text-white font-mono">
                #{idx + 1}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 text-center text-xs font-mono text-[#57606A] border border-dashed border-[#30363D] rounded">
          Belum ada gambar ditambahkan.
        </div>
      )}
    </div>
  );
};

interface MultiImageBlockRendererProps {
  images: string[];
}

export const MultiImageBlockRenderer: React.FC<MultiImageBlockRendererProps> = ({ images }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="p-4 text-center text-xs font-mono text-[#57606A] bg-[#0F1117] border border-[#30363D] rounded-md my-2">
        [Gambar belum diunggah]
      </div>
    );
  }

  const currentImg = images[activeIdx] || images[0];

  return (
    <div className="relative rounded-md overflow-hidden bg-[#0F1117] border border-[#30363D] my-2 group">
      <div className="relative flex items-center justify-center max-h-[460px] min-h-[180px] bg-black/60">
        <img
          src={currentImg}
          alt={`Gambar ${activeIdx + 1}`}
          referrerPolicy="no-referrer"
          className="max-h-[440px] w-auto max-w-full object-contain mx-auto transition duration-200"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&auto=format&fit=crop&q=80';
          }}
        />

        {/* Carousel controls if > 1 image */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActiveIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition cursor-pointer"
              title="Gambar Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 transition cursor-pointer"
              title="Gambar Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Slide Index Badge */}
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-[#E5A93C] border border-[#30363D]">
              {activeIdx + 1} / {images.length}
            </div>

            {/* Indicator Dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1 rounded-full bg-black/60 backdrop-blur-xs">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={`w-1.5 h-1.5 rounded-full transition ${
                    i === activeIdx ? 'bg-[#E5A93C] w-3' : 'bg-white/40 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
