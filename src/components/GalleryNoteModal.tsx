import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Users,
  Bold,
  Italic,
  Heading,
  List,
  Image as ImageIcon,
  Quote,
  X,
  Check,
  Upload,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Calendar,
  Sparkles,
  Link,
  Search,
} from 'lucide-react';
import { GalleryNote, NoteBlock, Artist } from '../types';

interface GalleryNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: GalleryNote) => void;
  initialNote?: GalleryNote | null;
  artists: Artist[];
  readOnlyInitial?: boolean;
}

export const GalleryNoteModal: React.FC<GalleryNoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialNote,
  artists,
  readOnlyInitial = false,
}) => {
  const [isReadOnly, setIsReadOnly] = useState(readOnlyInitial);
  const [title, setTitle] = useState(initialNote?.title || 'Catatan Baru');
  const [blocks, setBlocks] = useState<NoteBlock[]>(
    initialNote?.blocks
      ? JSON.parse(JSON.stringify(initialNote.blocks))
      : [
          { id: 'b_1', type: 'heading', content: 'Judul Catatan' },
          { id: 'b_2', type: 'text', content: 'Tuliskan catatan detail di sini...' },
        ]
  );
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>(
    initialNote?.linkedArtistIds ? [...initialNote.linkedArtistIds] : []
  );
  const [artistFilterQuery, setArtistFilterQuery] = useState('');
  const [showArtistSelector, setShowArtistSelector] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialNote) {
        setTitle(initialNote.title || '');
        setBlocks(initialNote.blocks ? JSON.parse(JSON.stringify(initialNote.blocks)) : []);
        setSelectedArtistIds(initialNote.linkedArtistIds ? [...initialNote.linkedArtistIds] : []);
      } else {
        setTitle('Catatan Baru');
        setBlocks([
          { id: 'b_1', type: 'heading', content: 'Judul Catatan' },
          { id: 'b_2', type: 'text', content: 'Tuliskan catatan detail di sini...' },
        ]);
        setSelectedArtistIds([]);
      }
      setIsReadOnly(readOnlyInitial);
      setShowArtistSelector(false);

      // Auto-focus title if not read-only
      if (!readOnlyInitial) {
        setTimeout(() => {
          titleInputRef.current?.focus();
        }, 100);
      }
    }
  }, [initialNote, isOpen, readOnlyInitial]);

  // Keyboard shortcut: Cmd/Ctrl + S to save, Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!isReadOnly) {
          handleSave();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isReadOnly, title, blocks, selectedArtistIds]);

  if (!isOpen) return null;

  // Local File Upload Handler -> Base64
  const handleFileUpload = (blockId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      updateBlockContent(blockId, base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add new block
  const addBlock = (type: NoteBlock['type']) => {
    const newBlock: NoteBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      content:
        type === 'heading'
          ? 'Sub-judul'
          : type === 'image'
          ? ''
          : type === 'quote'
          ? 'Kutipan inspiratif...'
          : type === 'bullet_list'
          ? 'Poin catatan baru'
          : 'Isi paragraf baru...',
    };
    setBlocks([...blocks, newBlock]);
  };

  // Update block content
  const updateBlockContent = (id: string, content: string) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  // Toggle formatting
  const toggleBlockFormatting = (id: string, format: 'bold' | 'italic') => {
    setBlocks(
      blocks.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          [format]: !b[format],
        };
      })
    );
  };

  // Move block up or down
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
    setBlocks(newBlocks);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const toggleArtistLink = (artistId: string) => {
    if (selectedArtistIds.includes(artistId)) {
      setSelectedArtistIds(selectedArtistIds.filter((id) => id !== artistId));
    } else {
      setSelectedArtistIds([...selectedArtistIds, artistId]);
    }
  };

  const handleSave = () => {
    const savedNote: GalleryNote = {
      id: initialNote?.id || `note_${Date.now()}`,
      title: title.trim() || 'Untitled Note',
      blocks,
      linkedArtistIds: selectedArtistIds,
      createdAt: initialNote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(savedNote);
    onClose();
  };

  const linkedArtists = artists.filter((a) => selectedArtistIds.includes(a.id));
  const filteredAvailableArtists = artists.filter((a) =>
    a.name.toLowerCase().includes(artistFilterQuery.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-60 flex flex-col justify-end sm:justify-center bg-black/85 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl mx-auto bg-[#181B22] border border-[#30363D] rounded-t-xl sm:rounded-xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#30363D] bg-[#111319] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#212631] border border-[#30363D] flex items-center justify-center text-[#E5A93C]">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#F0F6FC]">
                  {isReadOnly
                    ? 'Pratinjau Catatan'
                    : initialNote
                    ? 'Edit Catatan'
                    : 'Entri Catatan Baru'}
                </span>
                <span className="text-[10px] font-mono text-[#8B949E]">
                  [{blocks.length} blok]
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Mode Switcher: Edit vs Preview */}
            <button
              type="button"
              onClick={() => setIsReadOnly(!isReadOnly)}
              className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1 transition cursor-pointer border ${
                isReadOnly
                  ? 'bg-[#E5A93C]/15 text-[#E5A93C] border-[#E5A93C]'
                  : 'bg-[#212631] text-[#8B949E] border-[#30363D] hover:text-[#F0F6FC]'
              }`}
              title={isReadOnly ? 'Kembali ke mode edit' : 'Lihat pratinjau hasil'}
            >
              {isReadOnly ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{isReadOnly ? 'Editor' : 'Pratinjau'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#212631] transition cursor-pointer"
              title="Tutup (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {isReadOnly ? (
          /* =========================================================
             PREVIEW / READ-ONLY VIEW (Minimalist Catalog Style)
             ========================================================= */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#111319]/40">
            {/* Document Meta Header */}
            <div className="space-y-1.5 border-b border-[#30363D] pb-3">
              <div className="flex items-center gap-2 text-[10px] font-mono text-[#8B949E]">
                <span className="text-[#E5A93C] uppercase">ARCHIVE NOTE</span>
                <span>•</span>
                <span>
                  {initialNote?.updatedAt
                    ? new Date(initialNote.updatedAt).toLocaleDateString('id-ID')
                    : 'Belum disimpan'}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-semibold text-[#F0F6FC] leading-snug">
                {title || 'Tanpa Judul'}
              </h1>

              {linkedArtists.length > 0 && (
                <div className="flex items-center flex-wrap gap-1 pt-1.5">
                  <span className="text-[10px] font-mono text-[#8B949E]">Artis:</span>
                  {linkedArtists.map((a) => (
                    <span
                      key={a.id}
                      className="px-1.5 py-0.5 rounded bg-[#212631] border border-[#30363D] text-[11px] text-[#F0F6FC]"
                    >
                      {a.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Block Previews */}
            <div className="space-y-3">
              {blocks.map((block) => {
                if (block.type === 'heading') {
                  return (
                    <h2
                      key={block.id}
                      className={`text-sm sm:text-base font-semibold text-[#F0F6FC] pt-1.5 pb-1 border-b border-[#30363D]/60 ${
                        block.bold ? 'font-bold' : ''
                      } ${block.italic ? 'italic' : ''}`}
                    >
                      {block.content}
                    </h2>
                  );
                }
                if (block.type === 'image') {
                  return (
                    <div
                      key={block.id}
                      className="rounded-md overflow-hidden bg-[#0F1117] border border-[#30363D] my-2"
                    >
                      {block.content ? (
                        <img
                          src={block.content}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-auto max-h-[440px] object-contain mx-auto"
                        />
                      ) : (
                        <div className="p-4 text-center text-xs font-mono text-[#57606A]">
                          [Gambar belum diunggah]
                        </div>
                      )}
                    </div>
                  );
                }
                if (block.type === 'quote') {
                  return (
                    <blockquote
                      key={block.id}
                      className="pl-3 py-1.5 my-2 border-l-2 border-[#E5A93C] bg-[#212631]/40 rounded-r text-xs text-[#E2E2EB] italic"
                    >
                      "{block.content}"
                    </blockquote>
                  );
                }
                if (block.type === 'bullet_list') {
                  return (
                    <div key={block.id} className="flex items-start gap-2 text-xs text-[#E2E2EB] pl-1">
                      <span className="text-[#E5A93C] font-mono leading-none mt-1">•</span>
                      <span className={`${block.bold ? 'font-semibold' : ''} ${block.italic ? 'italic' : ''}`}>
                        {block.content}
                      </span>
                    </div>
                  );
                }
                return (
                  <p
                    key={block.id}
                    className={`text-xs text-[#E2E2EB] leading-relaxed whitespace-pre-wrap ${
                      block.bold ? 'font-semibold' : ''
                    } ${block.italic ? 'italic' : ''}`}
                  >
                    {block.content}
                  </p>
                );
              })}
            </div>
          </div>
        ) : (
          /* =========================================================
             COMPACT EDITOR VIEW (Obsidian Archive Style)
             ========================================================= */
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#111319]/20">
            {/* Note Title Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">
                  Judul Dokumen
                </label>
                <span className="text-[10px] font-mono text-[#57606A]">
                  {title.length} karakter
                </span>
              </div>
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masukkan judul catatan galeri..."
                className="w-full min-h-[38px] px-3 rounded-md bg-[#181B22] border border-[#30363D] text-[#F0F6FC] font-semibold text-sm focus:outline-none focus:border-[#E5A93C] transition placeholder:text-[#57606A]"
              />
            </div>

            {/* Block Insertion Ribbon (Compact Bar) */}
            <div className="p-1.5 rounded-md bg-[#111319] border border-[#30363D] flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-mono text-[#8B949E] px-1 shrink-0 uppercase">
                Tambah:
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => addBlock('heading')}
                  className="px-2 py-1 rounded bg-[#181B22] hover:bg-[#212631] text-[11px] font-medium text-[#F0F6FC] border border-[#30363D] hover:border-[#8B949E]/50 flex items-center gap-1 cursor-pointer transition active:scale-98"
                >
                  <Heading className="w-3 h-3 text-[#E5A93C]" />
                  <span>Header</span>
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('text')}
                  className="px-2 py-1 rounded bg-[#181B22] hover:bg-[#212631] text-[11px] font-medium text-[#F0F6FC] border border-[#30363D] hover:border-[#8B949E]/50 flex items-center gap-1 cursor-pointer transition active:scale-98"
                >
                  <FileText className="w-3 h-3 text-[#8B949E]" />
                  <span>Teks</span>
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('bullet_list')}
                  className="px-2 py-1 rounded bg-[#181B22] hover:bg-[#212631] text-[11px] font-medium text-[#F0F6FC] border border-[#30363D] hover:border-[#8B949E]/50 flex items-center gap-1 cursor-pointer transition active:scale-98"
                >
                  <List className="w-3 h-3 text-[#8B949E]" />
                  <span>Daftar</span>
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('quote')}
                  className="px-2 py-1 rounded bg-[#181B22] hover:bg-[#212631] text-[11px] font-medium text-[#F0F6FC] border border-[#30363D] hover:border-[#8B949E]/50 flex items-center gap-1 cursor-pointer transition active:scale-98"
                >
                  <Quote className="w-3 h-3 text-[#E5A93C]" />
                  <span>Kutipan</span>
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('image')}
                  className="px-2 py-1 rounded bg-[#181B22] hover:bg-[#212631] text-[11px] font-medium text-[#F0F6FC] border border-[#30363D] hover:border-[#8B949E]/50 flex items-center gap-1 cursor-pointer transition active:scale-98"
                >
                  <ImageIcon className="w-3 h-3 text-emerald-400" />
                  <span>Gambar</span>
                </button>
              </div>
            </div>

            {/* Blocks List */}
            <div className="space-y-2">
              {blocks.map((block, idx) => (
                <div
                  key={block.id}
                  className="p-2.5 rounded-md bg-[#181B22] border border-[#30363D] space-y-1.5 transition hover:border-[#8B949E]/40 group"
                >
                  {/* Block Micro Header */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#212631] text-[#8B949E] border border-[#30363D]/60 uppercase">
                        #{idx + 1} {block.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5">
                      {/* Reorder Up/Down */}
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] disabled:opacity-30 disabled:hover:text-[#8B949E] transition cursor-pointer"
                        title="Geser ke atas"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, 'down')}
                        disabled={idx === blocks.length - 1}
                        className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] disabled:opacity-30 disabled:hover:text-[#8B949E] transition cursor-pointer"
                        title="Geser ke bawah"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {/* Formatting tools for text-based blocks */}
                      {block.type !== 'image' && (
                        <div className="flex items-center gap-0.5 border-l border-[#30363D] pl-1 ml-0.5">
                          <button
                            type="button"
                            onClick={() => toggleBlockFormatting(block.id, 'bold')}
                            className={`p-1 rounded text-xs transition cursor-pointer ${
                              block.bold
                                ? 'bg-[#E5A93C]/20 text-[#E5A93C]'
                                : 'text-[#8B949E] hover:text-[#F0F6FC]'
                            }`}
                            title="Tebal (Bold)"
                          >
                            <Bold className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleBlockFormatting(block.id, 'italic')}
                            className={`p-1 rounded text-xs transition cursor-pointer ${
                              block.italic
                                ? 'bg-[#E5A93C]/20 text-[#E5A93C]'
                                : 'text-[#8B949E] hover:text-[#F0F6FC]'
                            }`}
                            title="Miring (Italic)"
                          >
                            <Italic className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        className="p-1 rounded text-[#8B949E] hover:text-rose-400 hover:bg-rose-950/40 ml-1 transition cursor-pointer"
                        title="Hapus Blok"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Block Content Inputs */}
                  {block.type === 'heading' ? (
                    <input
                      type="text"
                      value={block.content}
                      onChange={(e) => updateBlockContent(block.id, e.target.value)}
                      placeholder="Judul bagian..."
                      className={`w-full px-2.5 py-1.5 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] font-semibold text-xs focus:outline-none focus:border-[#E5A93C] transition ${
                        block.bold ? 'font-bold' : ''
                      } ${block.italic ? 'italic' : ''}`}
                    />
                  ) : block.type === 'image' ? (
                    <div className="space-y-1.5">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={block.content.startsWith('data:') ? '[Gambar Berkas Terunggah]' : block.content}
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                          placeholder="Masukkan URL gambar atau unggah berkas..."
                          className="flex-1 px-2.5 py-1.5 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C]"
                        />
                        <label className="px-2.5 py-1.5 rounded bg-[#212631] hover:bg-[#2A303C] text-[#F0F6FC] border border-[#30363D] text-xs font-mono cursor-pointer flex items-center gap-1 shrink-0 transition active:scale-98">
                          <Upload className="w-3 h-3 text-[#E5A93C]" />
                          <span>Unggah</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(block.id, e)}
                          />
                        </label>
                      </div>

                      {block.content && (
                        <div className="relative rounded bg-[#0F1117] border border-[#30363D] overflow-hidden max-h-40 flex items-center justify-center group/img">
                          <img
                            src={block.content}
                            alt="Preview"
                            className="max-h-40 w-auto object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => updateBlockContent(block.id, '')}
                            className="absolute top-1.5 right-1.5 p-1 rounded bg-black/70 hover:bg-rose-950 text-rose-300 text-xs transition"
                            title="Hapus Gambar"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : block.type === 'quote' ? (
                    <div className="flex items-start gap-1.5">
                      <div className="w-1 self-stretch bg-[#E5A93C] rounded-full shrink-0 my-0.5" />
                      <textarea
                        rows={2}
                        value={block.content}
                        onChange={(e) => updateBlockContent(block.id, e.target.value)}
                        placeholder="Tulis kutipan di sini..."
                        className={`flex-1 px-2.5 py-1.5 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs italic focus:outline-none focus:border-[#E5A93C] transition ${
                          block.bold ? 'font-semibold' : ''
                        }`}
                      />
                    </div>
                  ) : (
                    <textarea
                      rows={2}
                      value={block.content}
                      onChange={(e) => updateBlockContent(block.id, e.target.value)}
                      placeholder={block.type === 'bullet_list' ? 'Tulis poin catatan...' : 'Tulis isi teks catatan...'}
                      className={`w-full px-2.5 py-1.5 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs leading-relaxed focus:outline-none focus:border-[#E5A93C] transition ${
                        block.bold ? 'font-semibold' : ''
                      } ${block.italic ? 'italic' : ''}`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Link Artists Accordion / Strip */}
            <div className="p-2.5 rounded-md bg-[#181B22] border border-[#30363D] space-y-2">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setShowArtistSelector(!showArtistSelector)}
              >
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <span className="text-xs font-semibold text-[#F0F6FC]">Tautkan Artis</span>
                  <span className="text-[10px] font-mono text-[#8B949E]">
                    ({selectedArtistIds.length} terpilih)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-[#8B949E]">
                  <span>{showArtistSelector ? 'Sembunyikan' : 'Kelola'}</span>
                  {showArtistSelector ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
              </div>

              {/* Selected Artists Pills Summary */}
              {selectedArtistIds.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {linkedArtists.map((art) => (
                    <span
                      key={art.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#212631] border border-[#E5A93C]/50 text-[11px] font-medium text-[#E5A93C]"
                    >
                      <span>{art.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleArtistLink(art.id);
                        }}
                        className="hover:text-rose-400"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Expanded Artist Selector */}
              {showArtistSelector && (
                <div className="space-y-1.5 pt-1.5 border-t border-[#30363D]/60 animate-in fade-in">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#57606A]" />
                    <input
                      type="text"
                      value={artistFilterQuery}
                      onChange={(e) => setArtistFilterQuery(e.target.value)}
                      placeholder="Cari nama artis..."
                      className="w-full min-h-[30px] pl-7 pr-3 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-[11px] focus:outline-none focus:border-[#E5A93C]"
                    />
                  </div>

                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                    {filteredAvailableArtists.length === 0 ? (
                      <p className="text-[10px] font-mono text-[#57606A] p-2 text-center">
                        Artis tidak ditemukan
                      </p>
                    ) : (
                      filteredAvailableArtists.map((art) => {
                        const isSelected = selectedArtistIds.includes(art.id);
                        return (
                          <div
                            key={art.id}
                            onClick={() => toggleArtistLink(art.id)}
                            className={`px-2 py-1 rounded text-xs flex items-center justify-between cursor-pointer transition ${
                              isSelected
                                ? 'bg-[#E5A93C]/15 text-[#E5A93C] border border-[#E5A93C]/40'
                                : 'bg-[#111319] text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#212631]'
                            }`}
                          >
                            <span>{art.name}</span>
                            {isSelected && <Check className="w-3 h-3 text-[#E5A93C]" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compact Footer Action Bar */}
        <div className="px-4 py-2.5 border-t border-[#30363D] bg-[#111319] shrink-0 flex items-center justify-between gap-2">
          <div className="text-[10px] font-mono text-[#57606A] hidden sm:block">
            {isReadOnly ? 'Mode Pratinjau' : 'Ctrl+S untuk simpan'}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-[#212631] hover:bg-[#2A303C] text-[#8B949E] hover:text-[#F0F6FC] border border-[#30363D] font-mono text-xs transition cursor-pointer active:scale-98"
            >
              {isReadOnly ? 'Tutup' : 'Batal'}
            </button>

            {!isReadOnly && (
              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-1.5 rounded-md bg-[#E5A93C] hover:bg-[#F0B854] text-[#0F1117] font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-98 shadow-sm"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Simpan Catatan</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
