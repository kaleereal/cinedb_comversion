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
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/85 backdrop-blur-xs animate-in fade-in p-0 sm:p-4"
    >
      <div className="relative w-full max-w-xl mx-auto bg-[#181B22] border border-[#30363D] rounded-t-xl sm:rounded-xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
        {/* Compact Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#30363D] bg-[#111319] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E5A93C]" />
            <h2 className="text-xs font-semibold text-[#F0F6FC]">
              {initialVideo ? 'Ubah Entri Video' : 'Tambah Entri Video'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#212631] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Compact Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto bg-[#111319]/20"
        >
          {/* Real-time Overall Rating Sticky Compact Bar */}
          <div className="sticky top-0 z-20 px-4 py-2.5 bg-[#111319] border-b border-[#30363D] flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <RatingBadge score={overallRating} size="md" showIcon />
              <div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-[#8B949E]">
                  Kalkulasi Skor Real-Time
                </div>
                <div className="text-xs font-semibold text-[#F0F6FC]">
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
            <div className="w-28 hidden sm:block">
              <div className="flex justify-between text-[9px] font-mono text-[#8B949E] mb-1">
                <span>Skor</span>
                <span className="text-[#E5A93C] font-semibold">{overallRating}/100</span>
              </div>
              <div className="h-1.5 w-full bg-[#212631] rounded-full overflow-hidden border border-[#30363D]">
                <div
                  className={`h-full transition-all duration-300 ${
                    overallRating >= 80
                      ? 'bg-emerald-400'
                      : overallRating >= 50
                      ? 'bg-[#E5A93C]'
                      : overallRating > 0
                      ? 'bg-rose-400'
                      : 'bg-transparent'
                  }`}
                  style={{ width: `${overallRating}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3.5">
          {/* Dynamic Field Renderer according to ordered field definitions */}
          {sortedFields.map((field) => {
            // 1. LINK FIELD
            if (field.type === 'link') {
              return (
                <div key={field.id} className="space-y-1.5 p-3 rounded-md bg-[#181B22] border border-[#30363D]">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E] flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-[#E5A93C]" />
                      <span>{field.label}</span>
                      {field.required && <span className="text-rose-400">*</span>}
                    </label>
                  </div>
                  {field.description && <p className="text-[10px] font-mono text-[#57606A]">{field.description}</p>}

                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onBlur={() => {
                        if (url && !metadata) handleFetchMetadata();
                      }}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 min-h-[36px] px-3 rounded-md bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs placeholder:text-[#57606A] focus:outline-none focus:border-[#E5A93C] transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleFetchMetadata()}
                      disabled={isFetchingMeta || !url}
                      className="min-h-[36px] px-3 rounded-md bg-[#212631] hover:bg-[#2A303C] disabled:opacity-50 text-[#F0F6FC] border border-[#30363D] hover:border-[#E5A93C] text-xs font-mono flex items-center gap-1.5 transition active:scale-95 shrink-0 cursor-pointer"
                    >
                      <Sparkles className={`w-3.5 h-3.5 text-[#E5A93C] ${isFetchingMeta ? 'animate-spin' : ''}`} />
                      <span>{isFetchingMeta ? 'Fetching...' : 'Fetch'}</span>
                    </button>
                  </div>

                  {fetchError && (
                    <p className="text-[11px] font-mono text-rose-300 bg-rose-950/50 p-2 rounded-md border border-rose-800">
                      {fetchError}
                    </p>
                  )}

                  {/* Preview Embed / Thumbnail */}
                  {metadata && (
                    <div className="mt-2 p-2.5 rounded-md bg-[#111319] border border-[#30363D] space-y-2 animate-in fade-in">
                      <div className="text-[10px] font-mono text-[#E5A93C] flex items-center justify-between">
                        <span>Metadata Terambil</span>
                        {metadata.domain && (
                          <span className="text-[#8B949E]">{metadata.domain}</span>
                        )}
                      </div>

                      {metadata.embedUrl ? (
                        <div className="aspect-video w-full rounded-md overflow-hidden bg-[#0F1117] border border-[#30363D]">
                          <iframe
                            src={metadata.embedUrl}
                            title="Preview Embed"
                            className="w-full h-full"
                            allowFullScreen
                          />
                        </div>
                      ) : metadata.thumbnailUrl ? (
                        <div className="relative aspect-video w-full rounded-md overflow-hidden bg-[#0F1117] border border-[#30363D]">
                          <img
                            src={metadata.thumbnailUrl}
                            alt="Preview Thumbnail"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-xs text-[#F0F6FC] font-medium truncate max-w-[240px]">
                          {metadata.title || 'Video Embed Siap'}
                        </span>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono text-[#E5A93C] hover:underline flex items-center gap-1"
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
                <div key={field.id} className="space-y-3 p-3 rounded-md bg-[#181B22] border border-[#30363D]">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E] flex items-center gap-1">
                      <span>{field.label}</span>
                      {field.required && <span className="text-rose-400">*</span>}
                    </label>
                    {field.description && <p className="text-[10px] font-mono text-[#57606A]">{field.description}</p>}
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Contoh: Oppenheimer Official Trailer (4K)"
                      className="w-full min-h-[36px] px-3 rounded-md bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs font-semibold focus:outline-none focus:border-[#E5A93C] placeholder:text-[#57606A] transition"
                    />
                  </div>

                  {/* Mandatory Tanggal Rilis Field */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E] flex items-center gap-1">
                        <span>Tanggal Rilis Video</span>
                        <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] font-mono text-[#E5A93C]">Wajib</span>
                    </div>
                    <input
                      type="date"
                      required
                      value={releaseDate}
                      onChange={(e) => setReleaseDate(e.target.value)}
                      className="w-full min-h-[36px] px-3 rounded-md bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C] transition"
                    />
                  </div>

                  {/* Fallback Manual Thumbnail Field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
                      URL Thumbnail Fallback (Manual)
                    </label>
                    <p className="text-[10px] font-mono text-[#57606A]">Cadangan apabila auto-extract metadata link gagal atau kosong.</p>
                    <input
                      type="url"
                      value={fallbackThumbnailUrl}
                      onChange={(e) => setFallbackThumbnailUrl(e.target.value)}
                      placeholder="https://... (URL gambar thumbnail)"
                      className="w-full min-h-[36px] px-3 rounded-md bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C] placeholder:text-[#57606A] transition"
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
                  className="rounded-md border border-[#30363D] bg-[#181B22] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setIsNotesOpen(!isNotesOpen)}
                    className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-[#212631]/60 transition cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#F0F6FC]">{field.label}</div>
                      <div className="text-[10px] font-mono text-[#8B949E]">{field.description}</div>
                    </div>
                    {isNotesOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#8B949E]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#8B949E]" />
                    )}
                  </button>

                  {isNotesOpen && (
                    <div className="p-3 pt-0 border-t border-[#30363D] bg-[#111319]/50 animate-in fade-in">
                      <textarea
                        rows={4}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Tuliskan ulasan mendalam, poin sinematografi, atau catatan khusus..."
                        className="w-full p-2.5 mt-2 rounded-md bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs placeholder:text-[#57606A] focus:outline-none focus:border-[#E5A93C] resize-y transition"
                      />
                    </div>
                  )}
                </div>
              );
            }

            // 4. RATING FOLDERS
            if (field.type === 'rating_folder') {
              return (
                <div key={field.id} className="space-y-2 p-3 rounded-md bg-[#181B22] border border-[#30363D]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-[#F0F6FC] flex items-center gap-1.5">
                        <span>{field.label}</span>
                        <span className="text-[10px] font-mono text-[#E5A93C]">
                          ({ratingFolders.length} Kategori)
                        </span>
                      </h3>
                      <p className="text-[10px] font-mono text-[#57606A]">
                        Penilaian parameter skor per folder (0-100).
                      </p>
                    </div>
                  </div>

                  {/* Folders List */}
                  <div className="space-y-2 pt-1">
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
                          className="rounded-md border border-[#30363D] bg-[#111319] overflow-hidden"
                        >
                          {/* Folder Header Accordion */}
                          <button
                            type="button"
                            onClick={() => toggleFolderAccordion(folder.id)}
                            className="w-full flex items-center justify-between p-2.5 bg-[#181B22] hover:bg-[#212631] transition border-b border-[#30363D] text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                              <span className="w-5 h-5 rounded bg-[#212631] text-[#E5A93C] border border-[#30363D] flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                                {folderIdx + 1}
                              </span>
                              <span className="font-semibold text-xs text-[#F0F6FC] truncate">
                                {folder.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#111319] text-[#E5A93C] border border-[#30363D]">
                                Rerata: {folderItemsAvg}
                              </span>
                              <div className="p-0.5 rounded text-[#8B949E]">
                                {isFolderOpen ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Folder Items Container */}
                          {isFolderOpen && (
                            <div className="p-2.5 space-y-2 animate-in fade-in">
                              {folder.items.map((item, itemIdx) => (
                                <div
                                  key={item.id}
                                  className="p-2.5 rounded-md bg-[#181B22] border border-[#30363D] space-y-2"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-semibold text-[#F0F6FC]">
                                        {itemIdx + 1}. {item.name}
                                      </span>
                                      {item.description && (
                                        <p className="text-[10px] font-mono text-[#8B949E] mt-0.5 leading-relaxed">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                    <span className="text-xs font-mono font-bold text-[#E5A93C] bg-[#111319] px-2 py-0.5 rounded border border-[#30363D] shrink-0">
                                      {item.score} / 100
                                    </span>
                                  </div>

                                  {/* Score Slider + Number Input (0-100) */}
                                  <div className="flex items-center gap-2.5">
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
                                      className="flex-1 accent-[#E5A93C] h-2 bg-[#212631] rounded-md cursor-pointer"
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
                                      className="w-14 min-h-[32px] px-1 text-center text-xs font-mono font-bold rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] focus:outline-none focus:border-[#E5A93C]"
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
                <div key={field.id} className="space-y-2 p-3 rounded-md bg-[#181B22] border border-[#30363D]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#F0F6FC]">
                      {field.label}
                    </label>
                    <span className="text-[10px] font-mono text-[#E5A93C]">
                      {selectedArtistIds.length} dipilih
                    </span>
                  </div>
                  {field.description && <p className="text-[10px] font-mono text-[#57606A]">{field.description}</p>}

                  {/* Selected Artists Cards with Role Status and Slider Nilai Performa (P) */}
                  {selectedArtists.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {selectedArtists.map((artist) => {
                        const currentRole = artistRoles[artist.id] !== undefined ? artistRoles[artist.id] : '';
                        const weightS = getRoleWeightS(currentRole);
                        const currentP = artistPerformances[artist.id] !== undefined ? artistPerformances[artist.id] : (!initialVideo ? 0 : weightS);
                        const peranUtamaArtist =
                          artist.textFields?.['Peran Utama'] || 'Aktor / Seniman Film';

                        return (
                          <div
                            key={artist.id}
                            className="p-2.5 rounded-md bg-[#111319] border border-[#30363D] space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={artist.avatarUrl}
                                  alt={artist.name}
                                  className="w-7 h-7 rounded-full object-cover bg-[#0F1117] border border-[#30363D] shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-[#F0F6FC] truncate">
                                    {artist.name}
                                  </div>
                                  <div className="text-[10px] font-mono text-[#8B949E] truncate">
                                    {peranUtamaArtist}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleArtist(artist.id)}
                                className="p-1 rounded text-[#8B949E] hover:text-rose-400 hover:bg-[#212631] transition cursor-pointer"
                                title="Hapus artis ini"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Status Peran input */}
                            <div className="space-y-1 pt-1.5 border-t border-[#30363D]">
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-[#8B949E]">Status Peran di Video Ini:</span>
                                <span className="text-[#E5A93C] font-semibold">(S = {weightS}%)</span>
                              </div>
                              <input
                                type="text"
                                list="role-history-datalist"
                                value={currentRole}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setArtistRoles((prev) => ({
                                    ...prev,
                                    [artist.id]: val,
                                  }));
                                  const newS = getRoleWeightS(val);
                                  setArtistPerformances((prev) => ({
                                    ...prev,
                                    [artist.id]: newS,
                                  }));
                                }}
                                placeholder="Kosongkan atau ketik status peran..."
                                className="w-full min-h-[32px] px-2.5 rounded bg-[#181B22] border border-[#30363D] text-xs text-[#F0F6FC] placeholder:text-[#57606A] focus:outline-none focus:border-[#E5A93C]"
                              />

                              {/* Quick Dynamic Role Suggestions */}
                              {roleSuggestions.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
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
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition cursor-pointer ${
                                        currentRole.toLowerCase() === sug.toLowerCase()
                                          ? 'bg-[#E5A93C] text-[#0F1117] font-bold'
                                          : 'bg-[#181B22] text-[#8B949E] hover:text-[#F0F6FC] border border-[#30363D] hover:bg-[#212631]'
                                      }`}
                                    >
                                      {sug}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Slider Nilai Performa (P) - Rentang 0-100 */}
                            <div className="space-y-1 pt-1.5 border-t border-[#30363D]">
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-[#8B949E]">Nilai Performa (P):</span>
                                <span className="text-[#E5A93C] font-bold text-xs">{currentP}%</span>
                              </div>

                              <div className="flex items-center gap-2.5">
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
                                  className="flex-1 accent-[#E5A93C] h-2 bg-[#212631] rounded-md cursor-pointer"
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
                                  className="w-14 min-h-[30px] px-1 text-center text-xs font-mono font-bold rounded bg-[#181B22] border border-[#30363D] text-[#F0F6FC] focus:outline-none focus:border-[#E5A93C]"
                                />
                              </div>
                              <p className="text-[9px] font-mono text-[#57606A]">
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

                  {/* Open Bottom Sheet Button */}
                  <button
                    type="button"
                    onClick={() => setIsArtistSheetOpen(true)}
                    className="w-full min-h-[36px] px-3 rounded-md bg-[#111319] border border-[#30363D] hover:border-[#E5A93C] text-[#8B949E] hover:text-[#F0F6FC] text-xs font-mono flex items-center justify-between transition cursor-pointer"
                  >
                    <span>Pilih Artis yang Terlibat...</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#8B949E]" />
                  </button>
                </div>
              );
            }

            // 6. MULTI CHOICE (e.g. Genre, Tag)
            if (field.type === 'multi_choice') {
              const selectedTags = multiChoices[field.id] || [];
              const options = field.options || [];

              const activeOpt =
                activeOptionPerField[field.id] ||
                (selectedTags.length > 0 ? selectedTags[selectedTags.length - 1] : null);
              const activeOptDesc = activeOpt ? field.optionDescriptions?.[activeOpt] : null;

              return (
                <div key={field.id} className="space-y-1.5 p-3 rounded-md bg-[#181B22] border border-[#30363D]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#F0F6FC]">
                      {field.label}
                    </label>
                    {selectedTags.length > 0 && (
                      <span className="text-[10px] font-mono text-[#E5A93C]">
                        {selectedTags.length} dipilih
                      </span>
                    )}
                  </div>

                  {activeOptDesc ? (
                    <div className="p-2 rounded-md bg-[#111319] border border-[#30363D] animate-in fade-in">
                      <p className="text-[11px] font-mono text-[#E5A93C] leading-relaxed">
                        <strong className="text-[#F0F6FC]">{activeOpt}: </strong>
                        {activeOptDesc}
                      </p>
                    </div>
                  ) : field.description ? (
                    <p className="text-[10px] font-mono text-[#57606A]">{field.description}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-1 pt-0.5">
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
                          className={`min-h-[30px] px-2.5 rounded-md text-xs font-mono transition active:scale-95 flex items-center gap-1 border cursor-pointer ${
                            isSelected
                              ? 'bg-[#E5A93C] text-[#0F1117] border-[#E5A93C] font-semibold'
                              : 'bg-[#111319] text-[#8B949E] hover:text-[#F0F6FC] border-[#30363D] hover:bg-[#212631]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
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
                <div key={field.id} className="space-y-1.5 p-3 rounded-md bg-[#181B22] border border-[#30363D]">
                  <label className="text-xs font-semibold text-[#F0F6FC]">
                    {field.label}
                  </label>

                  {activeOptDesc ? (
                    <div className="p-2 rounded-md bg-[#111319] border border-[#30363D] animate-in fade-in">
                      <p className="text-[11px] font-mono text-[#E5A93C] leading-relaxed">
                        <strong className="text-[#F0F6FC]">{activeOpt}: </strong>
                        {activeOptDesc}
                      </p>
                    </div>
                  ) : field.description ? (
                    <p className="text-[10px] font-mono text-[#57606A]">{field.description}</p>
                  ) : null}

                  {/* Fast tap pills */}
                  {options.length <= 8 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
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
                            className={`min-h-[30px] px-2.5 rounded-md text-xs font-mono transition active:scale-95 flex items-center gap-1 border cursor-pointer ${
                              isSelected
                                ? 'bg-[#E5A93C] text-[#0F1117] border-[#E5A93C] font-semibold'
                                : 'bg-[#111319] text-[#8B949E] hover:text-[#F0F6FC] border-[#30363D] hover:bg-[#212631]'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
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
                    className="w-full min-h-[36px] px-2.5 rounded-md bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C] transition"
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
                <div key={field.id} className="space-y-1 p-3 rounded-md bg-[#181B22] border border-[#30363D]">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
                    {field.label}
                  </label>
                  {field.description && <p className="text-[10px] font-mono text-[#57606A]">{field.description}</p>}
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
                    className="w-full min-h-[36px] px-3 rounded-md bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C] transition"
                  />
                </div>
              );
            }

            return null;
          })}
          </div>
        </form>

        {/* Compact Modal Footer */}
        <div className="px-4 py-2.5 border-t border-[#30363D] bg-[#111319] shrink-0 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-[#212631] text-[#8B949E] hover:text-[#F0F6FC] border border-[#30363D] font-mono text-xs transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            id="btn-save-video-entry"
            className="px-4 py-1.5 rounded-md bg-[#E5A93C] hover:bg-[#F0B854] text-[#0F1117] font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-98 shadow-sm"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Simpan Entri Video</span>
          </button>
        </div>

        {/* Multi-Select Artist Sheet / Modal */}
        {isArtistSheetOpen && (
          <div className="fixed inset-0 z-60 flex flex-col justify-end sm:justify-center bg-black/85 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
            <div className="w-full max-w-xl mx-auto bg-[#181B22] border border-[#30363D] rounded-t-xl sm:rounded-xl max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#30363D] bg-[#111319]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E5A93C]" />
                  <h3 className="text-xs font-semibold text-[#F0F6FC]">
                    Pilih Artis yang Terlibat
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsArtistSheetOpen(false)}
                  className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#212631] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search & Quick Add */}
              <div className="p-3 space-y-2 border-b border-[#30363D] bg-[#111319]/40">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#57606A]" />
                  <input
                    type="text"
                    value={artistSearchQuery}
                    onChange={(e) => setArtistSearchQuery(e.target.value)}
                    placeholder="Cari nama artis..."
                    className="w-full min-h-[34px] pl-8 pr-3 rounded-md bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs placeholder:text-[#57606A] focus:outline-none focus:border-[#E5A93C]"
                  />
                </div>

                {onQuickCreateArtist && (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newArtistName}
                      onChange={(e) => setNewArtistName(e.target.value)}
                      placeholder="+ Tambah profil artis baru..."
                      className="flex-1 min-h-[34px] px-3 rounded-md bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs placeholder:text-[#57606A] focus:outline-none focus:border-[#E5A93C]"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddArtist}
                      disabled={!newArtistName.trim()}
                      className="min-h-[34px] px-3 rounded-md bg-[#E5A93C] hover:bg-[#F0B854] disabled:opacity-40 text-[#0F1117] text-xs font-semibold flex items-center gap-1 cursor-pointer transition active:scale-95 shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Buat</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Artists Checklist */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {filteredArtists.length === 0 ? (
                  <p className="text-center text-xs font-mono text-[#57606A] py-6">
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
                        className={`w-full flex items-center justify-between p-2 rounded-md transition text-left border cursor-pointer ${
                          isSelected
                            ? 'bg-[#212631] border-[#E5A93C]'
                            : 'bg-[#181B22] border-[#30363D] hover:border-[#8B949E]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={artist.avatarUrl}
                            alt={artist.name}
                            className="w-8 h-8 rounded-full object-cover bg-[#0F1117] border border-[#30363D] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#F0F6FC] truncate">
                              {artist.name}
                            </div>
                            <div className="text-[10px] font-mono text-[#8B949E] truncate">
                              {artist.textFields?.['Peran Utama'] || 'Aktor / Seniman Film'}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition shrink-0 ${
                            isSelected
                              ? 'bg-[#E5A93C] border-[#E5A93C] text-[#0F1117]'
                              : 'border-[#30363D] bg-[#111319]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Bottom Sheet Done Button */}
              <div className="p-3 border-t border-[#30363D] bg-[#111319] flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsArtistSheetOpen(false)}
                  className="px-4 py-1.5 rounded-md bg-[#E5A93C] hover:bg-[#F0B854] text-[#0F1117] font-semibold text-xs transition cursor-pointer"
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
