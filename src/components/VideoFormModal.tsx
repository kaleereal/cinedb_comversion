import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  Plus,
  Trash2,
  Check,
  Search,
  UserPlus,
  Link as LinkIcon,
  HelpCircle,
} from 'lucide-react';
import {
  Video,
  Artist,
  CustomFieldDefinition,
  RatingFolder,
  RatingItem,
  VideoMetadata,
} from '../types';
import { fetchUrlMetadata } from '../utils/metadataFetcher';
import {
  calculateOverallRating,
  getStoredRatingTemplates,
  getStoredVideos,
  getStoredRoleWeights,
  getDynamicRoleHistory,
} from '../utils/storage';
import { RatingBadge } from './RatingBadge';

interface VideoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (videoData: Partial<Video>) => void;
  initialVideo?: Video | null;
  artists: Artist[];
  fieldDefinitions: CustomFieldDefinition[];
  onQuickCreateArtist?: (name: string) => void;
}

export const VideoFormModal: React.FC<VideoFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialVideo,
  artists,
  fieldDefinitions,
  onQuickCreateArtist,
}) => {
  // Form State
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [fallbackThumbnailUrl, setFallbackThumbnailUrl] = useState('');
  const [metadata, setMetadata] = useState<VideoMetadata | undefined>(undefined);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [notes, setNotes] = useState('');
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // Dynamic Rating Folders
  const [ratingFolders, setRatingFolders] = useState<RatingFolder[]>([]);
  const [openFolderIds, setOpenFolderIds] = useState<Record<string, boolean>>({});

  // Artist Select state & Bottom Sheet
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [artistRoles, setArtistRoles] = useState<Record<string, string>>({});
  const [artistPerformances, setArtistPerformances] = useState<Record<string, number>>({});
  const [isArtistSheetOpen, setIsArtistSheetOpen] = useState(false);
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [newArtistName, setNewArtistName] = useState('');

  // Dynamic History of roles for autocomplete / suggestions from existing videos
  const roleSuggestions = useMemo(() => {
    return getDynamicRoleHistory();
  }, [isOpen]);

  // Master role weights map for quick lookups of S
  const roleWeightsMap = useMemo(() => {
    const weights = getStoredRoleWeights();
    const map = new Map<string, number>();
    weights.forEach((w) => map.set(w.roleName.toLowerCase().trim(), w.weight));
    return map;
  }, [isOpen]);

  // Single choice and Multi choice values
  const [singleChoices, setSingleChoices] = useState<Record<string, string>>({});
  const [multiChoices, setMultiChoices] = useState<Record<string, string[]>>({});
  const [customTextFields, setCustomTextFields] = useState<Record<string, string>>({});

  // Active clicked option for real-time description display (Req 7)
  const [activeOptionPerField, setActiveOptionPerField] = useState<Record<string, string>>({});

  // Live Overall Rating
  const [overallRating, setOverallRating] = useState(0);

  // Resolve folders from master settings template
  // IMPORTANT: For NEW video creation, enforce Default 0 rule!
  function getResolvedRatingFolders(existing?: RatingFolder[], isNewVideo?: boolean): RatingFolder[] {
    const templates = getStoredRatingTemplates();

    if (isNewVideo || !existing || existing.length === 0) {
      return templates.map((tmpl) => ({
        id: tmpl.id,
        name: tmpl.name,
        items: tmpl.items.map((it) => ({
          id: it.id,
          name: it.name,
          description: it.description,
          score: isNewVideo ? 0 : (it.defaultScore ?? 0), // Aturan Default 0
        })),
      }));
    }

    // Preserve existing saved scores for EDIT
    return templates.map((tmpl) => {
      const existingFolder = existing.find(
        (f) => f.id === tmpl.id || f.name.toLowerCase() === tmpl.name.toLowerCase()
      );

      return {
        id: tmpl.id,
        name: tmpl.name,
        items: tmpl.items.map((itemTmpl) => {
          const existingItem = existingFolder?.items.find(
            (it) => it.id === itemTmpl.id || it.name.toLowerCase() === itemTmpl.name.toLowerCase()
          );
          return {
            id: itemTmpl.id,
            name: itemTmpl.name,
            description: itemTmpl.description || existingItem?.description,
            score:
              typeof existingItem?.score === 'number'
                ? existingItem.score
                : 0,
          };
        }),
      };
    });
  }

  // Helper to get default role weight S
  const getRoleWeightS = (roleName: string) => {
    const trimmed = roleName.trim().toLowerCase();
    return roleWeightsMap.has(trimmed) ? roleWeightsMap.get(trimmed)! : 100;
  };

  // Initialize or Reset form on open/change
  useEffect(() => {
    if (initialVideo) {
      setUrl(initialVideo.url || '');
      setTitle(initialVideo.title || '');
      setReleaseDate(initialVideo.releaseDate || '');
      setFallbackThumbnailUrl(initialVideo.fallbackThumbnailUrl || '');
      setMetadata(initialVideo.metadata);
      setNotes(initialVideo.notes || '');
      setIsNotesOpen(!!initialVideo.notes);
      setRatingFolders(getResolvedRatingFolders(initialVideo.ratingFolders, false));
      setSelectedArtistIds(initialVideo.artistIds || []);
      setArtistRoles(initialVideo.artistRoles || {});
      setArtistPerformances(initialVideo.artistPerformances || {});
      setSingleChoices(initialVideo.singleChoices || {});
      setMultiChoices(initialVideo.multiChoices || {});
      setCustomTextFields(initialVideo.customFields || {});
    } else {
      // NEW Video: load clean structure with ALL numeric fields defaulted to 0
      setUrl('');
      setTitle('');
      setReleaseDate(new Date().toISOString().slice(0, 10));
      setFallbackThumbnailUrl('');
      setMetadata(undefined);
      setNotes('');
      setIsNotesOpen(false);
      setRatingFolders(getResolvedRatingFolders(undefined, true));
      setSelectedArtistIds([]);
      setArtistRoles({});
      setArtistPerformances({});
      setSingleChoices({});
      setMultiChoices({});
      setCustomTextFields({});
    }
    setFetchError(null);
  }, [initialVideo, isOpen]);

  // Recalculate overall rating whenever folders change
  useEffect(() => {
    const computed = calculateOverallRating(ratingFolders);
    setOverallRating(computed);
  }, [ratingFolders]);

  // Handle Fetch Link Metadata
  const handleFetchMetadata = async (inputUrl?: string) => {
    const targetUrl = inputUrl || url;
    if (!targetUrl.trim()) return;

    setIsFetchingMeta(true);
    setFetchError(null);

    try {
      const meta = await fetchUrlMetadata(targetUrl);
      setMetadata(meta);
      if (!title || title.trim() === '') {
        if (meta.title) setTitle(meta.title);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat metadata tautan';
      setFetchError(msg);
    } finally {
      setIsFetchingMeta(false);
    }
  };

  // Score Rating Operation (Clean, dedicated to evaluating values 0-100)
  const handleUpdateItemScore = (folderId: string, itemId: string, score: number) => {
    setRatingFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folderId) return f;
        return {
          ...f,
          items: f.items.map((it) => (it.id === itemId ? { ...it, score } : it)),
        };
      })
    );
  };

  const toggleFolderAccordion = (folderId: string) => {
    setOpenFolderIds((prev) => ({
      ...prev,
      [folderId]: prev[folderId] === undefined ? false : !prev[folderId],
    }));
  };

  // Artist multi-select
  const toggleArtist = (artistId: string) => {
    if (selectedArtistIds.includes(artistId)) {
      setSelectedArtistIds(selectedArtistIds.filter((id) => id !== artistId));
    } else {
      setSelectedArtistIds([...selectedArtistIds, artistId]);
      const defaultRole = 'Artis Utama';
      const weightS = getRoleWeightS(defaultRole);

      if (artistRoles[artistId] === undefined) {
        setArtistRoles((prev) => ({
          ...prev,
          [artistId]: defaultRole,
        }));
      }

      // Default slider Nilai Performa (P):
      // - Saat Create Video BARU: 0 (Aturan Default 0)
      // - Saat memilih artis dan status peran: slider diisi sebesar Bobot Status Peran (S)
      if (artistPerformances[artistId] === undefined) {
        setArtistPerformances((prev) => ({
          ...prev,
          [artistId]: initialVideo ? weightS : 0, // 0 for new video create
        }));
      }
    }
  };

  // Quick Add Artist
  const handleQuickAddArtist = () => {
    if (!newArtistName.trim()) return;
    if (onQuickCreateArtist) {
      onQuickCreateArtist(newArtistName.trim());
      setNewArtistName('');
    }
  };

  // MultiChoice toggle
  const toggleMultiChoice = (fieldId: string, option: string) => {
    const current = multiChoices[fieldId] || [];
    if (current.includes(option)) {
      setMultiChoices({
        ...multiChoices,
        [fieldId]: current.filter((o) => o !== option),
      });
    } else {
      setMultiChoices({
        ...multiChoices,
        [fieldId]: [...current, option],
      });
    }
  };

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Judul video wajib diisi');
      return;
    }

    const payload: Partial<Video> = {
      title: title.trim(),
      url: url.trim(),
      releaseDate: releaseDate || new Date().toISOString().slice(0, 10),
      fallbackThumbnailUrl: fallbackThumbnailUrl.trim(),
      metadata,
      notes: notes.trim(),
      ratingFolders,
      overallRating,
      artistIds: selectedArtistIds,
      artistRoles,
      artistPerformances,
      singleChoices,
      multiChoices,
      customFields: customTextFields,
      updatedAt: new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  if (!isOpen) return null;

  // Filter artists for bottom sheet search
  const filteredArtists = artists.filter((a) =>
    a.name.toLowerCase().includes(artistSearchQuery.toLowerCase())
  );

  // Sort fields according to order in Pengaturan
  const sortedFields = [...fieldDefinitions].sort((a, b) => a.order - b.order);

  return (
    <div
      id="video-form-modal"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/80 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {initialVideo ? 'Ubah Entri Video' : 'Tambah Video Baru'}
            </h2>
            <p className="text-xs text-slate-400">
              Isi parameter rating, tautan artis, dan metadata video
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Single-Column Body with min 16px spacing */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-6 pb-28"
        >
          {/* Real-time Overall Rating Floating Summary Card */}
          <div className="sticky top-0 z-20 -mx-5 -mt-5 px-5 py-3.5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RatingBadge score={overallRating} size="lg" showIcon />
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Kalkulasi Skor Real-Time
                </div>
                <div className="text-sm font-bold text-white">
                  {overallRating >= 80
                    ? 'Sangat Direkomendasikan'
                    : overallRating >= 50
                    ? 'Cukup Memuaskan'
                    : overallRating > 0
                    ? 'Perlu Peningkatan'
                    : 'Belum Dinilai'}
                </div>
              </div>
            </div>

            {/* Live Progress Bar */}
            <div className="w-32 hidden sm:block">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                <span>Skor</span>
                <span>{overallRating}/100</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    overallRating >= 80
                      ? 'bg-emerald-500'
                      : overallRating >= 50
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${overallRating}%` }}
                />
              </div>
            </div>
          </div>

          {/* Dynamic Field Renderer according to ordered field definitions */}
          {sortedFields.map((field) => {
            // 1. LINK FIELD
            if (field.type === 'link') {
              return (
                <div key={field.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-indigo-400" />
                      <span>{field.label}</span>
                      {field.required && <span className="text-rose-400">*</span>}
                    </label>
                  </div>
                  <p className="text-xs text-slate-400">{field.description}</p>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onBlur={() => {
                        if (url && !metadata) handleFetchMetadata();
                      }}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 min-h-[48px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleFetchMetadata()}
                      disabled={isFetchingMeta || !url}
                      className="min-h-[48px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isFetchingMeta ? 'animate-spin' : ''}`} />
                      <span>{isFetchingMeta ? 'Fetching...' : 'Fetch'}</span>
                    </button>
                  </div>

                  {fetchError && (
                    <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/50">
                      {fetchError}
                    </p>
                  )}

                  {/* Preview Embed / Thumbnail */}
                  {metadata && (
                    <div className="mt-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 animate-in fade-in">
                      <div className="text-[11px] font-semibold text-indigo-400 flex items-center justify-between">
                        <span>Preview Metadata Berhasil Diambil</span>
                        {metadata.domain && (
                          <span className="text-slate-400">{metadata.domain}</span>
                        )}
                      </div>

                      {metadata.embedUrl ? (
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                          <iframe
                            src={metadata.embedUrl}
                            title="Preview Embed"
                            className="w-full h-full"
                            allowFullScreen
                          />
                        </div>
                      ) : metadata.thumbnailUrl ? (
                        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900">
                          <img
                            src={metadata.thumbnailUrl}
                            alt="Preview Thumbnail"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-slate-300 font-medium truncate max-w-[200px]">
                          {metadata.title || 'Video Embed Siap'}
                        </span>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Buka Link</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // 2. TITLE FIELD & RELEASE DATE
            if (field.type === 'text' && field.key === 'title') {
              return (
                <div key={field.id} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                      <span>{field.label}</span>
                      {field.required && <span className="text-rose-400">*</span>}
                    </label>
                    <p className="text-xs text-slate-400">{field.description}</p>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Contoh: Oppenheimer Official Trailer (4K)"
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Mandatory Tanggal Rilis Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                      <span>Tanggal Rilis Video</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <p className="text-xs text-slate-400">Tanggal penayangan atau rilis resmi video ini.</p>
                    <input
                      type="date"
                      required
                      value={releaseDate}
                      onChange={(e) => setReleaseDate(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Fallback Manual Thumbnail Field (Poin 5) */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                      <span>URL Thumbnail Fallback (Manual)</span>
                    </label>
                    <p className="text-xs text-slate-400">Digunakan sebagai cadangan apabila auto-extract metadata link gagal/kosong.</p>
                    <input
                      type="url"
                      value={fallbackThumbnailUrl}
                      onChange={(e) => setFallbackThumbnailUrl(e.target.value)}
                      placeholder="https://... (URL gambar thumbnail manual)"
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              );
            }

            // 3. COLLAPSIBLE NOTES FIELD
            if (field.type === 'notes') {
              return (
                <div
                  key={field.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setIsNotesOpen(!isNotesOpen)}
                    className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between text-left hover:bg-slate-900/50 transition"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-200">{field.label}</div>
                      <div className="text-xs text-slate-400">{field.description}</div>
                    </div>
                    {isNotesOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isNotesOpen && (
                    <div className="p-4 pt-1 border-t border-slate-800/80 animate-in fade-in">
                      <textarea
                        rows={4}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Tuliskan ulasan mendalam, poin penting sinematografi, atau catatan khusus..."
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                      />
                    </div>
                  )}
                </div>
              );
            }

            // 4. RATING FOLDERS (Clean, dedicated purely to scoring)
            if (field.type === 'rating_folder') {
              return (
                <div key={field.id} className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{field.label}</span>
                        <span className="text-xs font-semibold text-indigo-400">
                          ({ratingFolders.length} Kategori)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Fokus menilai parameter di bawah. Konfigurasi struktur kategori diatur di Pengaturan.
                      </p>
                    </div>
                  </div>

                  {/* Folders List (Clean Evaluation View) */}
                  <div className="space-y-3">
                    {ratingFolders.map((folder, folderIdx) => {
                      const isFolderOpen = openFolderIds[folder.id] !== false; // default open
                      const folderItemsAvg =
                        folder.items.length > 0
                          ? Math.round(
                              folder.items.reduce((acc, it) => acc + (it.score || 0), 0) /
                                folder.items.length
                            )
                          : 0;

                      return (
                        <div
                          key={folder.id}
                          className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-sm"
                        >
                          {/* Folder Header Accordion (Clean - Title only) */}
                          <button
                            type="button"
                            onClick={() => toggleFolderAccordion(folder.id)}
                            className="w-full flex items-center justify-between p-3.5 bg-slate-900/90 hover:bg-slate-900 transition border-b border-slate-800 text-left"
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                              <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                                {folderIdx + 1}
                              </span>
                              <span className="font-bold text-sm text-white truncate">
                                {folder.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700/60">
                                Rerata: {folderItemsAvg}
                              </span>
                              <div className="p-1 rounded-lg text-slate-400">
                                {isFolderOpen ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Folder Items Container (Clean Evaluation Inputs) */}
                          {isFolderOpen && (
                            <div className="p-3.5 space-y-3 animate-in fade-in">
                              {folder.items.map((item, itemIdx) => (
                                <div
                                  key={item.id}
                                  className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/90 space-y-2.5"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-bold text-slate-200">
                                        {itemIdx + 1}. {item.name}
                                      </span>
                                      {item.description && (
                                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                    <span className="text-xs font-black text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/50 shrink-0">
                                      {item.score} / 100
                                    </span>
                                  </div>

                                  {/* Score Slider + Number Input (0-100) */}
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={item.score}
                                      onChange={(e) =>
                                        handleUpdateItemScore(
                                          folder.id,
                                          item.id,
                                          Number(e.target.value)
                                        )
                                      }
                                      className="flex-1 accent-indigo-500 h-2.5 bg-slate-800 rounded-lg cursor-pointer"
                                    />
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      min="0"
                                      max="100"
                                      value={item.score}
                                      onChange={(e) => {
                                        const val = Math.max(
                                          0,
                                          Math.min(100, Number(e.target.value) || 0)
                                        );
                                        handleUpdateItemScore(folder.id, item.id, val);
                                      }}
                                      className="w-16 min-h-[38px] px-2 text-center text-sm font-bold rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // 5. ARTIST MULTI-SELECT DROPDOWN / BOTTOM SHEET
            if (field.type === 'artist_select') {
              const selectedArtists = artists.filter((a) =>
                selectedArtistIds.includes(a.id)
              );

              return (
                <div key={field.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-200">
                      {field.label}
                    </label>
                    <span className="text-xs text-indigo-400 font-semibold">
                      {selectedArtistIds.length} dipilih
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{field.description}</p>

                  {/* Selected Artists Cards with Role Status and Slider Nilai Performa (P) */}
                  {selectedArtists.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      {selectedArtists.map((artist) => {
                        const currentRole = artistRoles[artist.id] !== undefined ? artistRoles[artist.id] : '';
                        const weightS = getRoleWeightS(currentRole);
                        // Default performance P
                        const currentP = artistPerformances[artist.id] !== undefined ? artistPerformances[artist.id] : (!initialVideo ? 0 : weightS);
                        const peranUtamaArtist =
                          artist.textFields?.['Peran Utama'] || 'Aktor / Seniman Film';

                        return (
                          <div
                            key={artist.id}
                            className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={artist.avatarUrl}
                                  alt={artist.name}
                                  className="w-8 h-8 rounded-full object-cover bg-slate-800 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white truncate">
                                    {artist.name}
                                  </div>
                                  <div className="text-[10px] text-indigo-400 font-semibold truncate">
                                    {peranUtamaArtist}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleArtist(artist.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition cursor-pointer"
                                title="Hapus artis ini"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Status Peran input (Poin 1A & 1B: Supports empty string / null without reverting) */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-300">
                                  Status Peran di Video Ini:
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  (S = {weightS}%)
                                </span>
                              </div>
                              <input
                                type="text"
                                list="role-history-datalist"
                                value={currentRole}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setArtistRoles((prev) => ({
                                    ...prev,
                                    [artist.id]: val, // Supports empty string!
                                  }));
                                  // Update performance slider default to new role's S weight if not customized
                                  const newS = getRoleWeightS(val);
                                  setArtistPerformances((prev) => ({
                                    ...prev,
                                    [artist.id]: newS,
                                  }));
                                }}
                                placeholder="Kosongkan atau ketik status peran..."
                                className="w-full min-h-[38px] px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />

                              {/* Quick Dynamic Role Suggestions */}
                              {roleSuggestions.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {roleSuggestions.map((sug) => (
                                    <button
                                      key={sug}
                                      type="button"
                                      onClick={() => {
                                        setArtistRoles((prev) => ({
                                          ...prev,
                                          [artist.id]: sug,
                                        }));
                                        const newS = getRoleWeightS(sug);
                                        setArtistPerformances((prev) => ({
                                          ...prev,
                                          [artist.id]: newS,
                                        }));
                                      }}
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition cursor-pointer ${
                                        currentRole.toLowerCase() === sug.toLowerCase()
                                          ? 'bg-indigo-600 text-white font-bold'
                                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-800'
                                      }`}
                                    >
                                      {sug}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Slider Nilai Performa (P) - Rentang 0-100 (Poin 1C & 1D) */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-200">
                                  Nilai Performa (P):
                                </span>
                                <span className="font-extrabold text-indigo-400 text-sm">
                                  {currentP}%
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={currentP}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setArtistPerformances((prev) => ({
                                      ...prev,
                                      [artist.id]: val,
                                    }));
                                  }}
                                  className="flex-1 accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                                />
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min="0"
                                  max="100"
                                  value={currentP}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                    setArtistPerformances((prev) => ({
                                      ...prev,
                                      [artist.id]: val,
                                    }));
                                  }}
                                  className="w-16 min-h-[36px] px-2 text-center text-xs font-bold rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Rumus Nilai Didapat: (V × (S + P)) / 200
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Datalist for autocomplete */}
                  <datalist id="role-history-datalist">
                    {roleSuggestions.map((sug) => (
                      <option key={sug} value={sug} />
                    ))}
                  </datalist>

                  {/* Open Bottom Sheet Button (min height 48px) */}
                  <button
                    type="button"
                    onClick={() => setIsArtistSheetOpen(true)}
                    className="w-full min-h-[48px] px-4 rounded-xl bg-slate-950 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-between transition cursor-pointer"
                  >
                    <span>Pilih Artis yang Terlibat...</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              );
            }

            // 6. MULTI CHOICE (e.g. Genre, Tag)
            if (field.type === 'multi_choice') {
              const selectedTags = multiChoices[field.id] || [];
              const options = field.options || [];

              // Real-time clicked option or last selected tag
              const activeOpt =
                activeOptionPerField[field.id] ||
                (selectedTags.length > 0 ? selectedTags[selectedTags.length - 1] : null);
              const activeOptDesc = activeOpt ? field.optionDescriptions?.[activeOpt] : null;

              return (
                <div key={field.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-200">
                      {field.label}
                    </label>
                    {selectedTags.length > 0 && (
                      <span className="text-xs text-indigo-400 font-semibold">
                        {selectedTags.length} dipilih
                      </span>
                    )}
                  </div>

                  {/* Description area: replaced in real-time by selected item description */}
                  {activeOptDesc ? (
                    <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 animate-in fade-in">
                      <p className="text-xs text-indigo-300 leading-relaxed">
                        <strong className="text-indigo-200 font-bold">{activeOpt}: </strong>
                        {activeOptDesc}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">{field.description}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {options.map((opt) => {
                      const isSelected = selectedTags.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            toggleMultiChoice(field.id, opt);
                            setActiveOptionPerField((prev) => ({ ...prev, [field.id]: opt }));
                          }}
                          className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // 7. SINGLE CHOICE (e.g. Status, Negara)
            if (field.type === 'single_choice') {
              const currentValue = singleChoices[field.id] || '';
              const options = field.options || [];

              const activeOpt = activeOptionPerField[field.id] || currentValue || null;
              const activeOptDesc = activeOpt ? field.optionDescriptions?.[activeOpt] : null;

              return (
                <div key={field.id} className="space-y-2">
                  <label className="text-sm font-bold text-slate-200">
                    {field.label}
                  </label>

                  {/* Description area: replaced in real-time by selected item description */}
                  {activeOptDesc ? (
                    <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 animate-in fade-in">
                      <p className="text-xs text-indigo-300 leading-relaxed">
                        <strong className="text-indigo-200 font-bold">{activeOpt}: </strong>
                        {activeOptDesc}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">{field.description}</p>
                  )}

                  {/* Visual fast-tap pills for options */}
                  {options.length <= 8 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {options.map((opt) => {
                        const isSelected = currentValue === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              const nextVal = isSelected ? '' : opt;
                              setSingleChoices({ ...singleChoices, [field.id]: nextVal });
                              setActiveOptionPerField((prev) => ({ ...prev, [field.id]: nextVal }));
                            }}
                            className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 border ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <select
                    value={currentValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSingleChoices({ ...singleChoices, [field.id]: val });
                      setActiveOptionPerField((prev) => ({ ...prev, [field.id]: val }));
                    }}
                    className="w-full min-h-[48px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih {field.label} --</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            // 8. Custom Arbitrary Text Field
            if (field.type === 'custom_text') {
              return (
                <div key={field.id} className="space-y-2">
                  <label className="text-sm font-bold text-slate-200">
                    {field.label}
                  </label>
                  <p className="text-xs text-slate-400">{field.description}</p>
                  <input
                    type="text"
                    required={!!field.is_required}
                    value={customTextFields[field.id] || ''}
                    onChange={(e) =>
                      setCustomTextFields({
                        ...customTextFields,
                        [field.id]: e.target.value,
                      })
                    }
                    placeholder={`Masukkan ${field.label}...`}
                    className="w-full min-h-[48px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              );
            }

            return null;
          })}

          {/* Sticky Save Button at the Bottom with High Contrast & Min 48px height */}
          <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-30">
            <button
              type="submit"
              id="btn-save-video-entry"
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/20 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 stroke-[3px]" />
              <span>Simpan Entri Video</span>
            </button>
          </div>
        </form>

        {/* Multi-Select Artist Bottom Sheet */}
        {isArtistSheetOpen && (
          <div className="fixed inset-0 z-60 flex flex-col justify-end bg-black/80 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-lg mx-auto bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom">
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-white">
                  Pilih Artis yang Terlibat
                </h3>
                <button
                  type="button"
                  onClick={() => setIsArtistSheetOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Quick Add */}
              <div className="p-4 space-y-3 border-b border-slate-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={artistSearchQuery}
                    onChange={(e) => setArtistSearchQuery(e.target.value)}
                    placeholder="Cari nama artis..."
                    className="w-full min-h-[44px] pl-9 pr-4 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {onQuickCreateArtist && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newArtistName}
                      onChange={(e) => setNewArtistName(e.target.value)}
                      placeholder="+ Tambah profil artis baru..."
                      className="flex-1 min-h-[40px] px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddArtist}
                      disabled={!newArtistName.trim()}
                      className="min-h-[40px] px-3 rounded-xl bg-indigo-600 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Buat</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Artists Checklist */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-800/40">
                {filteredArtists.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6">
                    Tidak ada artis yang cocok. Tambahkan baru di atas!
                  </p>
                ) : (
                  filteredArtists.map((artist) => {
                    const isSelected = selectedArtistIds.includes(artist.id);
                    return (
                      <button
                        key={artist.id}
                        type="button"
                        onClick={() => toggleArtist(artist.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition text-left ${
                          isSelected ? 'bg-indigo-950/50' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={artist.avatarUrl}
                            alt={artist.name}
                            className="w-10 h-10 rounded-full object-cover bg-slate-800"
                          />
                          <div>
                            <div className="text-sm font-bold text-white">
                              {artist.name}
                            </div>
                            <div className="text-xs font-semibold text-indigo-400 line-clamp-1">
                              {artist.textFields?.['Peran Utama'] || 'Aktor / Seniman Film'}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-400 text-white'
                              : 'border-slate-700 bg-slate-950'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Bottom Sheet Done Button */}
              <div className="p-4 border-t border-slate-800 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setIsArtistSheetOpen(false)}
                  className="w-full min-h-[48px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition"
                >
                  Selesai ({selectedArtistIds.length} Terpilih)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
