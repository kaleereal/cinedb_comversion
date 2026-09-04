import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Copy,
  Edit3,
  Users,
  Calendar,
  LayoutGrid,
  List as ListIcon,
  ArrowLeft,
  Share2,
  Check,
  Tag,
  ImageIcon,
  Eye,
  Quote,
  ListFilter,
  X,
} from 'lucide-react';
import { GalleryNote, Artist, NoteBlock } from '../types';
import {
  getStoredGalleryNotes,
  saveGalleryNotes,
  getStoredArtists,
  saveArtists,
} from '../utils/storage';
import { GalleryNoteModal } from './GalleryNoteModal';

interface GalleryNotesViewProps {
  artists?: Artist[];
  selectedNoteId?: string | null;
  onSelectArtist?: (artistId: string) => void;
  onSelectNote?: (noteId: string | null) => void;
}

export const GalleryNotesView: React.FC<GalleryNotesViewProps> = ({
  artists = [],
  selectedNoteId = null,
  onSelectArtist,
  onSelectNote,
}) => {
  const [notes, setNotes] = useState<GalleryNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtistFilter, setSelectedArtistFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<GalleryNote | null>(null);
  const [isReadOnlyModal, setIsReadOnlyModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const effectiveArtists = artists.length > 0 ? artists : getStoredArtists();

  useEffect(() => {
    setNotes(getStoredGalleryNotes());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const activeStandaloneNote = selectedNoteId
    ? notes.find((n) => n.id === selectedNoteId)
    : null;

  const handleOpenCreate = () => {
    setEditingNote(null);
    setIsReadOnlyModal(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (note: GalleryNote, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingNote(note);
    setIsReadOnlyModal(false);
    setIsModalOpen(true);
  };

  const handleOpenQuickView = (note: GalleryNote, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingNote(note);
    setIsReadOnlyModal(true);
    setIsModalOpen(true);
  };

  const handleSaveNote = (savedNote: GalleryNote) => {
    const existingIndex = notes.findIndex((n) => n.id === savedNote.id);
    let updated: GalleryNote[] = [];
    if (existingIndex >= 0) {
      updated = notes.map((n) => (n.id === savedNote.id ? savedNote : n));
    } else {
      updated = [savedNote, ...notes];
    }
    setNotes(updated);
    saveGalleryNotes(updated);

    // Keep stored artists' galleryNoteIds bidirectionally in sync
    const allStoredArtists = getStoredArtists();
    let artistsChanged = false;
    const syncedArtists = allStoredArtists.map((artist) => {
      const isLinkedToNote = savedNote.linkedArtistIds?.includes(artist.id);
      const currentNotes = artist.galleryNoteIds || [];
      const hasNoteId = currentNotes.includes(savedNote.id);

      if (isLinkedToNote && !hasNoteId) {
        artistsChanged = true;
        return {
          ...artist,
          galleryNoteIds: [...currentNotes, savedNote.id],
        };
      } else if (!isLinkedToNote && hasNoteId) {
        artistsChanged = true;
        return {
          ...artist,
          galleryNoteIds: currentNotes.filter((nid) => nid !== savedNote.id),
        };
      }
      return artist;
    });

    if (artistsChanged) {
      saveArtists(syncedArtists);
    }

    showToast('Catatan berhasil disimpan');
  };

  const handleDeleteNote = (noteId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm('Hapus catatan galeri ini secara permanen?')) return;
    const updated = notes.filter((n) => n.id !== noteId);
    setNotes(updated);
    saveGalleryNotes(updated);

    // Also remove noteId from all artists
    const allStoredArtists = getStoredArtists();
    let artistsChanged = false;
    const syncedArtists = allStoredArtists.map((artist) => {
      if (artist.galleryNoteIds?.includes(noteId)) {
        artistsChanged = true;
        return {
          ...artist,
          galleryNoteIds: artist.galleryNoteIds.filter((nid) => nid !== noteId),
        };
      }
      return artist;
    });
    if (artistsChanged) {
      saveArtists(syncedArtists);
    }

    showToast('Catatan dihapus');
  };

  const handleDuplicateNote = (note: GalleryNote, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const duplicated: GalleryNote = {
      ...note,
      id: `note_${Date.now()}`,
      title: `${note.title} (Salinan)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [duplicated, ...notes];
    setNotes(updated);
    saveGalleryNotes(updated);
    showToast('Catatan diduplikasi');
  };

  const handleOpenNoteDetail = (noteId: string) => {
    if (onSelectNote) {
      onSelectNote(noteId);
    } else {
      window.location.hash = `#/gallery_note/${noteId}`;
    }
  };

  const handleBackToList = () => {
    if (onSelectNote) {
      onSelectNote(null);
    } else {
      window.location.hash = '#/gallery_notes';
    }
  };

  const handleCopyNoteUrl = (noteId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#/gallery_note/${noteId}`;
    navigator.clipboard.writeText(url);
    showToast('Tautan catatan disalin ke clipboard');
  };

  // Helper to extract first image and text preview
  const getNotePreview = (blocks: NoteBlock[]) => {
    let firstImage = '';
    let previewText = '';

    for (const b of blocks) {
      if (!firstImage && b.type === 'image' && b.content) {
        firstImage = b.content;
      }
      if (!previewText && (b.type === 'text' || b.type === 'quote' || b.type === 'bullet_list')) {
        previewText = b.content;
      }
    }
    return { firstImage, previewText };
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchSearch =
        !searchQuery.trim() ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.blocks.some((b) => b.content.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchArtist =
        !selectedArtistFilter ||
        n.linkedArtistIds?.includes(selectedArtistFilter);

      return matchSearch && matchArtist;
    });
  }, [notes, searchQuery, selectedArtistFilter]);

  // Unique linked artists from all notes for fast filter tabs
  const linkedArtistsInNotes = useMemo(() => {
    const artistIdSet = new Set<string>();
    notes.forEach((n) => n.linkedArtistIds?.forEach((id) => artistIdSet.add(id)));
    return effectiveArtists.filter((a) => artistIdSet.has(a.id));
  }, [notes, effectiveArtists]);

  // --------------------------------------------------------------------------
  // STANDALONE VIEW (Requirement B.1)
  // --------------------------------------------------------------------------
  if (activeStandaloneNote) {
    const linkedArtists = effectiveArtists.filter((a) =>
      activeStandaloneNote.linkedArtistIds?.includes(a.id)
    );

    return (
      <div id="gallery-note-standalone-page" className="space-y-4 pb-28 animate-in fade-in max-w-3xl mx-auto px-1">
        {/* Compact Navigation Bar */}
        <div className="flex items-center justify-between gap-2 py-1 border-b border-[#30363D] pb-3">
          <button
            type="button"
            onClick={handleBackToList}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181B22] border border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] hover:border-[#8B949E]/50 text-xs font-mono transition cursor-pointer active:scale-98"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => handleCopyNoteUrl(activeStandaloneNote.id, e)}
              className="p-1.5 rounded-md bg-[#181B22] border border-[#30363D] text-[#8B949E] hover:text-[#E5A93C] hover:border-[#E5A93C]/50 transition cursor-pointer"
              title="Salin tautan unik"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => handleDuplicateNote(activeStandaloneNote, e)}
              className="p-1.5 rounded-md bg-[#181B22] border border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] hover:border-[#8B949E]/50 transition cursor-pointer"
              title="Duplikat catatan"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenEdit(activeStandaloneNote)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#E5A93C] hover:bg-[#F0B854] text-[#0F1117] text-xs font-semibold transition cursor-pointer active:scale-98"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                handleDeleteNote(activeStandaloneNote.id, e);
                handleBackToList();
              }}
              className="p-1.5 rounded-md bg-[#181B22] border border-[#30363D] text-[#8B949E] hover:text-rose-400 hover:border-rose-900/60 transition cursor-pointer"
              title="Hapus catatan"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Standalone Document Header */}
        <article className="rounded-lg bg-[#181B22] border border-[#30363D] p-5 space-y-4">
          <div className="space-y-1.5 border-b border-[#30363D] pb-3">
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#8B949E]">
              <span className="px-1.5 py-0.5 rounded bg-[#212631] border border-[#30363D] text-[#E5A93C] text-[10px] uppercase tracking-wider">
                CATATAN
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(activeStandaloneNote.updatedAt).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span>•</span>
              <span>{activeStandaloneNote.blocks.length} blok</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#F0F6FC] tracking-tight leading-snug">
              {activeStandaloneNote.title}
            </h1>
          </div>

          {/* Linked Artists Tags */}
          {linkedArtists.length > 0 && (
            <div className="flex items-center flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] font-mono text-[#8B949E] flex items-center gap-1 mr-1">
                <Users className="w-3 h-3 text-[#E5A93C]" />
                Artis:
              </span>
              {linkedArtists.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => onSelectArtist?.(art.id)}
                  className="px-2 py-0.5 rounded bg-[#212631] hover:bg-[#2A303C] text-[#F0F6FC] border border-[#30363D] hover:border-[#E5A93C]/60 text-xs font-medium transition cursor-pointer"
                >
                  {art.name}
                </button>
              ))}
            </div>
          )}

          {/* Content Blocks */}
          <div className="space-y-3 pt-2">
            {activeStandaloneNote.blocks.map((block) => {
              if (block.type === 'heading') {
                return (
                  <h2
                    key={block.id}
                    className={`text-base font-semibold text-[#F0F6FC] pt-2 pb-1 border-b border-[#30363D]/60 ${
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
                        alt="Galeri Catatan"
                        referrerPolicy="no-referrer"
                        className="w-full h-auto max-h-[520px] object-contain mx-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&auto=format&fit=crop&q=80';
                        }}
                      />
                    ) : (
                      <div className="p-6 text-center text-xs font-mono text-[#57606A]">
                        [Gambar kosong]
                      </div>
                    )}
                  </div>
                );
              }
              if (block.type === 'quote') {
                return (
                  <blockquote
                    key={block.id}
                    className="pl-3.5 py-1.5 my-2 border-l-2 border-[#E5A93C] bg-[#212631]/40 rounded-r text-xs sm:text-sm text-[#E2E2EB] italic"
                  >
                    "{block.content}"
                  </blockquote>
                );
              }
              if (block.type === 'bullet_list') {
                return (
                  <div key={block.id} className="flex items-start gap-2 text-xs sm:text-sm text-[#E2E2EB] pl-1.5">
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
                  className={`text-xs sm:text-sm text-[#E2E2EB] leading-relaxed whitespace-pre-wrap ${
                    block.bold ? 'font-semibold' : ''
                  } ${block.italic ? 'italic' : ''}`}
                >
                  {block.content}
                </p>
              );
            })}
          </div>
        </article>

        {/* Modal */}
        {isModalOpen && (
          <GalleryNoteModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={(saved) => {
              handleSaveNote(saved);
              setIsModalOpen(false);
            }}
            initialNote={editingNote}
            artists={effectiveArtists}
            readOnlyInitial={isReadOnlyModal}
          />
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // LIST / DIRECTORY VIEW (Redesigned Compact & Minimalist)
  // --------------------------------------------------------------------------
  return (
    <div id="gallery-notes-view" className="space-y-3 pb-28 animate-in fade-in">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-70 px-3.5 py-1.5 rounded-md bg-[#212631] border border-[#E5A93C] text-[#F0F6FC] text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-black/50 animate-in fade-in">
          <Check className="w-3.5 h-3.5 text-[#E5A93C]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Compact Header Bar */}
      <div className="flex items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#181B22] border border-[#30363D] flex items-center justify-center text-[#E5A93C]">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#F0F6FC] tracking-tight">Catatan Galeri</h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#181B22] border border-[#30363D] text-[#8B949E]">
                {filteredNotes.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* View Mode Toggle: Grid vs List */}
          <div className="flex items-center bg-[#181B22] border border-[#30363D] rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded text-xs transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#212631] text-[#E5A93C]'
                  : 'text-[#8B949E] hover:text-[#F0F6FC]'
              }`}
              title="Tampilan Grid Kartu"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1 rounded text-xs transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#212631] text-[#E5A93C]'
                  : 'text-[#8B949E] hover:text-[#F0F6FC]'
              }`}
              title="Tampilan Daftar Padat"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="min-h-[34px] px-3 rounded-md bg-[#E5A93C] hover:bg-[#F0B854] text-[#0F1117] font-semibold text-xs flex items-center gap-1.5 transition active:scale-98 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Baru</span>
          </button>
        </div>
      </div>

      {/* Search & Quick Filter Strip */}
      <div className="space-y-1.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#57606A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul atau isi catatan..."
            className="w-full min-h-[36px] pl-8 pr-8 rounded-md bg-[#181B22] border border-[#30363D] text-[#F0F6FC] placeholder:text-[#57606A] text-xs focus:outline-none focus:border-[#E5A93C] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#F0F6FC]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Optional Artist Filter Chips (Compact Scroll) */}
        {linkedArtistsInNotes.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedArtistFilter(null)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition shrink-0 cursor-pointer border ${
                selectedArtistFilter === null
                  ? 'bg-[#E5A93C]/15 text-[#E5A93C] border-[#E5A93C]'
                  : 'bg-[#181B22] text-[#8B949E] border-[#30363D] hover:border-[#8B949E]/50'
              }`}
            >
              Semua ({notes.length})
            </button>
            {linkedArtistsInNotes.map((artist) => {
              const count = notes.filter((n) => n.linkedArtistIds?.includes(artist.id)).length;
              const isSelected = selectedArtistFilter === artist.id;
              return (
                <button
                  key={artist.id}
                  type="button"
                  onClick={() => setSelectedArtistFilter(isSelected ? null : artist.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition shrink-0 cursor-pointer border flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#E5A93C]/15 text-[#E5A93C] border-[#E5A93C]'
                      : 'bg-[#181B22] text-[#8B949E] border-[#30363D] hover:border-[#8B949E]/50'
                  }`}
                >
                  <span>{artist.name}</span>
                  <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content Area: Compact Cards / List */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-lg bg-[#181B22]/60 border border-[#30363D] space-y-2">
          <FileText className="w-7 h-7 text-[#57606A] mx-auto" />
          <p className="text-xs font-semibold text-[#8B949E]">Tidak ada catatan galeri ditemukan</p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="text-xs font-mono text-[#E5A93C] hover:underline"
          >
            + Buat catatan sekarang
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID MODE: Compact Modular Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredNotes.map((note) => {
            const { firstImage, previewText } = getNotePreview(note.blocks);
            const linkedArtists = effectiveArtists.filter((a) =>
              note.linkedArtistIds?.includes(a.id)
            );

            return (
              <div
                key={note.id}
                onClick={() => handleOpenNoteDetail(note.id)}
                className="group flex flex-col rounded-lg bg-[#181B22] border border-[#30363D] hover:border-[#8B949E]/50 transition cursor-pointer overflow-hidden relative"
              >
                {/* Optional Media Header Thumbnail if exists */}
                {firstImage && (
                  <div className="h-32 w-full bg-[#0F1117] border-b border-[#30363D] overflow-hidden relative">
                    <img
                      src={firstImage}
                      alt={note.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-mono text-[#E2E2EB] flex items-center gap-1">
                      <ImageIcon className="w-2.5 h-2.5 text-[#E5A93C]" />
                      <span>{note.blocks.filter((b) => b.type === 'image').length}</span>
                    </div>
                  </div>
                )}

                {/* Card Body */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    {/* Date & Block Count */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8B949E]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(note.updatedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span>{note.blocks.length} blok</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xs sm:text-sm font-semibold text-[#F0F6FC] group-hover:text-[#E5A93C] transition line-clamp-1">
                      {note.title}
                    </h3>

                    {/* Text Preview Snippet */}
                    {previewText && (
                      <p className="text-[11px] text-[#8B949E] line-clamp-2 leading-relaxed">
                        {previewText}
                      </p>
                    )}
                  </div>

                  {/* Card Bottom: Artists & Action strip */}
                  <div className="pt-2 border-t border-[#30363D]/60 flex items-center justify-between gap-1">
                    {/* Linked Artists */}
                    <div className="flex items-center gap-1 overflow-hidden">
                      {linkedArtists.length > 0 ? (
                        <div className="flex items-center gap-1 truncate">
                          <Users className="w-2.5 h-2.5 text-[#E5A93C] shrink-0" />
                          <span className="text-[10px] text-[#8B949E] truncate">
                            {linkedArtists.map((a) => a.name).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-[#57606A] italic">Tunggal</span>
                      )}
                    </div>

                    {/* Micro Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleCopyNoteUrl(note.id, e)}
                        className="p-1 rounded text-[#8B949E] hover:text-[#E5A93C] hover:bg-[#212631] transition"
                        title="Salin Tautan"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDuplicateNote(note, e)}
                        className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#212631] transition"
                        title="Duplikat"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(note, e)}
                        className="p-1 rounded text-[#8B949E] hover:text-[#E5A93C] hover:bg-[#212631] transition"
                        title="Edit Catatan"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="p-1 rounded text-[#8B949E] hover:text-rose-400 hover:bg-rose-950/40 transition"
                        title="Hapus"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST MODE: High Density Row Items */
        <div className="space-y-1.5">
          {filteredNotes.map((note) => {
            const { firstImage, previewText } = getNotePreview(note.blocks);
            const linkedArtists = effectiveArtists.filter((a) =>
              note.linkedArtistIds?.includes(a.id)
            );

            return (
              <div
                key={note.id}
                onClick={() => handleOpenNoteDetail(note.id)}
                className="group flex items-center justify-between gap-3 p-2.5 rounded-md bg-[#181B22] border border-[#30363D] hover:border-[#8B949E]/50 transition cursor-pointer"
              >
                {/* Left: Thumbnail / Icon + Title + Meta */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {firstImage ? (
                    <div className="w-10 h-10 rounded bg-[#0F1117] border border-[#30363D] overflow-hidden shrink-0">
                      <img
                        src={firstImage}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded bg-[#212631] border border-[#30363D] flex items-center justify-center text-[#8B949E] shrink-0">
                      <FileText className="w-4 h-4 text-[#8B949E]" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold text-[#F0F6FC] group-hover:text-[#E5A93C] transition truncate">
                        {note.title}
                      </h3>
                      <span className="text-[10px] font-mono text-[#8B949E] shrink-0">
                        {new Date(note.updatedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#8B949E]">
                      {previewText ? (
                        <p className="truncate max-w-xs sm:max-w-md">{previewText}</p>
                      ) : (
                        <span className="font-mono text-[10px] text-[#57606A]">{note.blocks.length} blok</span>
                      )}
                      {linkedArtists.length > 0 && (
                        <span className="text-[10px] font-mono text-[#E5A93C] shrink-0 hidden sm:inline">
                          • {linkedArtists.map((a) => a.name).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => handleCopyNoteUrl(note.id, e)}
                    className="p-1 rounded text-[#8B949E] hover:text-[#E5A93C] hover:bg-[#212631] transition"
                    title="Salin Tautan"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDuplicateNote(note, e)}
                    className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#212631] transition"
                    title="Duplikat"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(note, e)}
                    className="p-1 rounded text-[#8B949E] hover:text-[#E5A93C] hover:bg-[#212631] transition"
                    title="Edit Catatan"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteNote(note.id, e)}
                    className="p-1 rounded text-[#8B949E] hover:text-rose-400 hover:bg-rose-950/40 transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor / Reader Modal */}
      {isModalOpen && (
        <GalleryNoteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveNote}
          initialNote={editingNote}
          artists={effectiveArtists}
          readOnlyInitial={isReadOnlyModal}
        />
      )}
    </div>
  );
};
