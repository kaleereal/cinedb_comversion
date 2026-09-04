import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Check,
  Image as ImageIcon,
  Link as LinkIcon,
  Info,
  Upload,
  AlertCircle,
  ExternalLink,
  Edit3,
  FileText,
  Calendar,
  Sparkles,
  Users,
} from 'lucide-react';
import { Artist, ArtistLink, GalleryNote, CustomFieldDefinition } from '../types';
import { getStoredGalleryNotes, saveGalleryNotes, getStoredArtistFields, getStoredArtists } from '../utils/storage';
import { GalleryNoteModal } from './GalleryNoteModal';

interface ArtistFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (artistData: Partial<Artist>) => void;
  initialArtist?: Artist | null;
  allArtists?: Artist[];
  onOpenFullNotePage?: (noteId: string) => void;
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
const DEFAULT_COVER_FALLBACK =
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1000&auto=format&fit=crop&q=80';

export const ArtistFormModal: React.FC<ArtistFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialArtist,
  allArtists,
  onOpenFullNotePage,
}) => {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [bio, setBio] = useState('');
  const [birthMonthYear, setBirthMonthYear] = useState('');
  const [selectedGalleryNoteIds, setSelectedGalleryNoteIds] = useState<string[]>([]);
  const [links, setLinks] = useState<ArtistLink[]>([]);
  const [embedImages, setEmbedImages] = useState<string[]>([]);
  const [newEmbedUrl, setNewEmbedUrl] = useState('');
  const [embedUrlError, setEmbedUrlError] = useState('');
  const [formError, setFormError] = useState('');
  const [roleText, setRoleText] = useState('');
  const [artistFields, setArtistFields] = useState<CustomFieldDefinition[]>([]);
  const [customTextFields, setCustomTextFields] = useState<Record<string, string>>({});
  const [customNumberFields, setCustomNumberFields] = useState<Record<string, number>>({});

  const [availableGalleryNotes, setAvailableGalleryNotes] = useState<GalleryNote[]>([]);
  const [allArtistsList, setAllArtistsList] = useState<Artist[]>(allArtists || []);
  const [isCreatingDirectNote, setIsCreatingDirectNote] = useState(false);

  // New Feature: Note Preview modal state when clicking "Buka" in CATATAN GALERI TERTAUT
  const [previewingNote, setPreviewingNote] = useState<GalleryNote | null>(null);
  const [editingNoteFromPreview, setEditingNoteFromPreview] = useState<GalleryNote | null>(null);

  useEffect(() => {
    setAvailableGalleryNotes(getStoredGalleryNotes());
    const fields = getStoredArtistFields();
    setArtistFields(fields);
    if (allArtists && allArtists.length > 0) {
      setAllArtistsList(allArtists);
    } else {
      setAllArtistsList(getStoredArtists());
    }

    if (initialArtist) {
      setName(initialArtist.name || '');
      setAvatarUrl(initialArtist.avatarUrl || '');
      setCoverUrl(initialArtist.coverUrl || '');
      setBio(initialArtist.bio || '');
      setBirthMonthYear(initialArtist.birthMonthYear || '');
      setSelectedGalleryNoteIds(initialArtist.galleryNoteIds || []);
      setLinks(initialArtist.links || []);
      setEmbedImages(initialArtist.embedImages || []);
      setRoleText(initialArtist.textFields?.['Peran Utama'] || '');
      setCustomTextFields(initialArtist.textFields || {});
      setCustomNumberFields(initialArtist.numberFields || {});
    } else {
      setName('');
      setAvatarUrl(DEFAULT_AVATAR);
      setCoverUrl(DEFAULT_COVER_FALLBACK);
      setBio('');
      setBirthMonthYear('');
      setSelectedGalleryNoteIds([]);
      setLinks([]);
      setEmbedImages([]);
      setRoleText('');
      setCustomTextFields({});
      setCustomNumberFields({});
    }
    setNewEmbedUrl('');
    setEmbedUrlError('');
    setFormError('');
    setPreviewingNote(null);
    setEditingNoteFromPreview(null);
  }, [initialArtist, isOpen, allArtists]);

  // Helper untuk mendapatkan nama-nama artis yang tertaut ke catatan galeri
  const getLinkedArtistsForNote = (noteId: string, noteLinkedIds?: string[]): string[] => {
    const linkedNames: string[] = [];
    allArtistsList.forEach((a) => {
      const isDirect = noteLinkedIds?.includes(a.id);
      const isReverse = a.galleryNoteIds?.includes(noteId);
      if (isDirect || isReverse) {
        if (initialArtist && a.id === initialArtist.id) {
          linkedNames.push(`${a.name} (Artis ini)`);
        } else {
          linkedNames.push(a.name);
        }
      }
    });
    return linkedNames;
  };

  // Handle local image file upload -> Base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'avatar' | 'cover' | 'embed') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (target === 'avatar') setAvatarUrl(base64);
      else if (target === 'cover') setCoverUrl(base64);
      else if (target === 'embed') {
        setEmbedImages((prev) => [...prev, base64]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddLink = () => {
    setLinks([...links, { id: `link_${Date.now()}`, label: 'Website / Portofolio', url: 'https://' }]);
  };

  const handleUpdateLink = (id: string, updates: Partial<ArtistLink>) => {
    setLinks(links.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const handleDeleteLink = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
  };

  // Helper to extract URLs from multi-line text input
  const extractImageUrls = (rawInput: string): string[] => {
    return rawInput
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://') || line.startsWith('data:image')));
  };

  const handleAddEmbedUrl = () => {
    if (!newEmbedUrl.trim()) return;

    const urls = extractImageUrls(newEmbedUrl.trim());
    if (urls.length === 0) {
      setEmbedUrlError('Format URL gambar tidak valid.');
      return;
    }

    setEmbedImages((prev) => [...prev, ...urls]);
    setNewEmbedUrl('');
    setEmbedUrlError('');
  };

  const handleDeleteEmbedImage = (index: number) => {
    setEmbedImages(embedImages.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Nama artis wajib diisi.');
      return;
    }

    let finalEmbedImages = [...embedImages];
    if (newEmbedUrl.trim()) {
      const pendingUrls = extractImageUrls(newEmbedUrl.trim());
      if (pendingUrls.length > 0) {
        finalEmbedImages = [...finalEmbedImages, ...pendingUrls];
      }
    }

    const payload: Partial<Artist> = {
      name: name.trim(),
      avatarUrl: avatarUrl.trim() || DEFAULT_AVATAR,
      coverUrl: coverUrl.trim(),
      bio: bio.trim(),
      birthMonthYear,
      galleryNoteIds: selectedGalleryNoteIds,
      links,
      embedImages: finalEmbedImages,
      textFields: {
        ...customTextFields,
        'Peran Utama': roleText.trim() || customTextFields['Peran Utama'] || 'Aktor / Seniman Film',
      },
      numberFields: customNumberFields,
      updatedAt: new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  // Sort artist fields according to user-configured layout in Settings (Form Layout Builder)
  const sortedFields = [...artistFields].sort((a, b) => a.order - b.order);

  // Sub-renderers for resilient image inputs with live fallback and error-free state resetting
  const renderAvatarBox = () => {
    const isDataUri = avatarUrl.startsWith('data:');
    return (
      <div className="p-2.5 rounded-md bg-[#181B22] border border-[#30363D] space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono uppercase text-[#8B949E] font-semibold">
            Foto Profil (Avatar)
          </label>
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setAvatarUrl('')}
              className="text-[9px] font-mono text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
              title="Kosongkan foto profil"
            >
              Kosongkan
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-11 h-11 rounded-full overflow-hidden border border-[#30363D] bg-[#111319] shrink-0">
            <img
              src={avatarUrl.trim() || DEFAULT_AVATAR}
              alt="Avatar Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
          </div>

          <div className="flex-1 flex flex-wrap items-center gap-1.5">
            <label className="px-2.5 py-1 rounded bg-[#212631] hover:bg-[#2A303C] text-[#F0F6FC] border border-[#30363D] text-[11px] font-mono cursor-pointer flex items-center gap-1 transition">
              <Upload className="w-3 h-3 text-[#E5A93C]" />
              <span>Unggah</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'avatar')}
              />
            </label>

            <button
              type="button"
              onClick={() => setAvatarUrl(DEFAULT_AVATAR)}
              className="px-2 py-1 rounded bg-[#111319] hover:bg-[#212631] text-[#8B949E] hover:text-[#E5A93C] border border-[#30363D] text-[10px] font-mono transition cursor-pointer"
            >
              Default
            </button>
          </div>
        </div>

        {isDataUri ? (
          <div className="flex items-center justify-between px-2 py-1 rounded bg-[#111319] border border-[#30363D] text-[10px] font-mono">
            <span className="text-[#E5A93C] truncate">✓ Berkas Gambar Diunggah</span>
            <button
              type="button"
              onClick={() => setAvatarUrl('')}
              className="text-rose-400 hover:underline ml-2 shrink-0 cursor-pointer"
            >
              Hapus
            </button>
          </div>
        ) : (
          <div className="relative flex items-center">
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://... URL Foto Profil"
              className="w-full pr-6 px-2 py-1 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-[10px] font-mono focus:outline-none focus:border-[#E5A93C]"
            />
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl('')}
                className="absolute right-1.5 text-[#8B949E] hover:text-[#F0F6FC] p-0.5 cursor-pointer"
                title="Bersihkan URL foto profil"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCoverBox = () => {
    const isDataUri = coverUrl.startsWith('data:');
    return (
      <div className="p-2.5 rounded-md bg-[#181B22] border border-[#30363D] space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono uppercase text-[#8B949E] font-semibold">
            Foto Cover (Latar)
          </label>
          {coverUrl && (
            <button
              type="button"
              onClick={() => setCoverUrl('')}
              className="text-[9px] font-mono text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
              title="Kosongkan foto cover"
            >
              Kosongkan
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-16 h-11 rounded bg-[#0F1117] border border-[#30363D] overflow-hidden shrink-0 flex items-center justify-center">
            {coverUrl.trim() ? (
              <img
                src={coverUrl.trim()}
                alt="Cover Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_COVER_FALLBACK;
                }}
              />
            ) : (
              <ImageIcon className="w-4 h-4 text-[#484F58]" />
            )}
          </div>

          <div className="flex-1 flex flex-wrap items-center gap-1.5">
            <label className="px-2.5 py-1 rounded bg-[#212631] hover:bg-[#2A303C] text-[#F0F6FC] border border-[#30363D] text-[11px] font-mono cursor-pointer flex items-center gap-1 transition">
              <Upload className="w-3 h-3 text-[#E5A93C]" />
              <span>Unggah</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'cover')}
              />
            </label>

            <button
              type="button"
              onClick={() => setCoverUrl(DEFAULT_COVER_FALLBACK)}
              className="px-2 py-1 rounded bg-[#111319] hover:bg-[#212631] text-[#8B949E] hover:text-[#E5A93C] border border-[#30363D] text-[10px] font-mono transition cursor-pointer"
            >
              Default
            </button>
          </div>
        </div>

        {isDataUri ? (
          <div className="flex items-center justify-between px-2 py-1 rounded bg-[#111319] border border-[#30363D] text-[10px] font-mono">
            <span className="text-[#E5A93C] truncate">✓ Berkas Cover Diunggah</span>
            <button
              type="button"
              onClick={() => setCoverUrl('')}
              className="text-rose-400 hover:underline ml-2 shrink-0 cursor-pointer"
            >
              Hapus
            </button>
          </div>
        ) : (
          <div className="relative flex items-center">
            <input
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://... URL Foto Cover"
              className="w-full pr-6 px-2 py-1 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-[10px] font-mono focus:outline-none focus:border-[#E5A93C]"
            />
            {coverUrl && (
              <button
                type="button"
                onClick={() => setCoverUrl('')}
                className="absolute right-1.5 text-[#8B949E] hover:text-[#F0F6FC] p-0.5 cursor-pointer"
                title="Bersihkan URL cover"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Renderer for individual form field according to Form Layout Builder definition
  const renderField = (field: CustomFieldDefinition) => {
    // 1. Nama Artis
    if (field.key === 'name' || field.id === 'art_field_name') {
      return (
        <div key={field.id} className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
            {field.label} <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (formError) setFormError('');
            }}
            placeholder="Contoh: Reza Rahadian / Christopher Nolan"
            className="w-full min-h-[36px] px-3 rounded-md bg-[#181B22] border border-[#30363D] text-[#F0F6FC] text-xs font-semibold focus:outline-none focus:border-[#E5A93C] transition"
          />
        </div>
      );
    }

    // 2. Peran / Profesi Utama (System Reserved Field)
    if (field.key === 'Peran Utama' || field.id === 'art_field_peran_utama') {
      return (
        <div key={field.id} className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
              {field.label}
            </label>
            <span className="text-[9px] font-mono text-[#E5A93C] bg-[#212631] px-1.5 py-0.2 rounded border border-[#30363D]">
              Dynamic Filtering Scheme
            </span>
          </div>
          <input
            type="text"
            value={roleText}
            onChange={(e) => setRoleText(e.target.value)}
            placeholder="Contoh: Aktor Utama / Sutradara"
            className="w-full min-h-[36px] px-3 rounded-md bg-[#181B22] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C] transition"
          />
          <p className="text-[10px] font-mono text-[#57606A]">
            {field.description || 'Status profesi atau peran utama pada entri artis.'}
          </p>
        </div>
      );
    }

    // 3. Bulan & Tahun Lahir
    if (field.key === 'birthMonthYear' || field.id === 'art_field_birth') {
      return (
        <div key={field.id} className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
              {field.label}
            </label>
            <span className="text-[10px] font-mono text-[#E5A93C]">Wajib</span>
          </div>
          <input
            type="month"
            value={birthMonthYear}
            onChange={(e) => setBirthMonthYear(e.target.value)}
            className="w-full min-h-[36px] px-3 rounded-md bg-[#181B22] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C] transition"
          />
          <p className="text-[10px] font-mono text-[#57606A]">
            Umur artis dihitung otomatis berdasarkan tanggal ini.
          </p>
        </div>
      );
    }

    // 4. Foto Profil & Foto Cover (combined atau individual)
    if (field.key === 'photos' || field.id === 'art_field_photos') {
      return (
        <div key={field.id} className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
            {field.label}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {renderAvatarBox()}
            {renderCoverBox()}
          </div>
        </div>
      );
    }

    if (field.key === 'avatarUrl' || field.id === 'art_field_avatar') {
      return (
        <div key={field.id} className="space-y-1">
          {renderAvatarBox()}
        </div>
      );
    }

    if (field.key === 'coverUrl' || field.id === 'art_field_cover') {
      return (
        <div key={field.id} className="space-y-1">
          {renderCoverBox()}
        </div>
      );
    }

    // 5. Biografi / Catatan Ringkas
    if (field.key === 'bio' || field.id === 'art_field_bio') {
      return (
        <div key={field.id} className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
            {field.label}
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={field.description || "Tulis riwayat karier atau catatan artis..."}
            className="w-full px-3 py-2 rounded-md bg-[#181B22] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C] transition leading-relaxed"
          />
        </div>
      );
    }

    // 6. Catatan Galeri Tertaut
    if (field.key === 'galleryNoteIds' || field.id === 'art_field_notes') {
      return (
        <div key={field.id} className="space-y-2 p-3 rounded-md bg-[#181B22] border border-[#30363D]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#E5A93C]" />
              <label className="text-xs font-semibold text-[#F0F6FC]">
                {field.label.toUpperCase()}
              </label>
              <span className="text-[10px] font-mono text-[#8B949E]">
                ({selectedGalleryNoteIds.length} tertaut)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCreatingDirectNote(true)}
              className="text-[11px] font-mono text-[#E5A93C] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>+ Buat Baru</span>
            </button>
          </div>

          {availableGalleryNotes.length === 0 ? (
            <p className="text-[11px] font-mono text-[#57606A] italic py-1">
              Belum ada Catatan Galeri. Klik "+ Buat Baru" di atas untuk membuat.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {availableGalleryNotes.map((note) => {
                const isChecked = selectedGalleryNoteIds.includes(note.id);
                const linkedArtistNames = getLinkedArtistsForNote(note.id, note.linkedArtistIds);
                return (
                  <div
                    key={note.id}
                    className={`flex items-center justify-between p-2 rounded-md transition border gap-2 ${
                      isChecked
                        ? 'bg-[#212631] border-[#E5A93C]/60 text-[#F0F6FC]'
                        : 'bg-[#111319] border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC]'
                    }`}
                  >
                    {/* Checkbox toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setSelectedGalleryNoteIds(selectedGalleryNoteIds.filter((id) => id !== note.id));
                        } else {
                          setSelectedGalleryNoteIds([...selectedGalleryNoteIds, note.id]);
                        }
                      }}
                      className="flex items-start gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition shrink-0 mt-0.5 ${
                          isChecked
                            ? 'bg-[#E5A93C] border-[#E5A93C] text-[#0F1117]'
                            : 'border-[#30363D] bg-[#181B22]'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-medium text-[#F0F6FC]">{note.title}</span>
                          <span className="text-[10px] font-mono text-[#8B949E] shrink-0">
                            ({note.blocks?.length || 0} blok)
                          </span>
                        </div>

                        {/* Atribut Informasi Artis yang Tertaut */}
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          {linkedArtistNames.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#E5A93C] bg-[#181B22] px-1.5 py-0.5 rounded border border-[#30363D] max-w-full truncate">
                              <Users className="w-2.5 h-2.5 shrink-0 text-[#E5A93C]" />
                              <span className="truncate">Tertaut: {linkedArtistNames.join(', ')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#57606A] bg-[#0F1117] px-1.5 py-0.5 rounded border border-[#30363D]">
                              <Users className="w-2.5 h-2.5 shrink-0 text-[#57606A]" />
                              <span>Belum tertaut ke artis manapun</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Tombol Buka Catatan untuk Preview */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewingNote(note);
                      }}
                      className="px-2 py-1 rounded bg-[#181B22] hover:bg-[#2A303C] text-[#E5A93C] hover:text-[#F0B854] border border-[#30363D] hover:border-[#E5A93C]/60 text-[11px] font-mono flex items-center gap-1 shrink-0 transition cursor-pointer active:scale-95 shadow-2xs self-start"
                      title="Buka pratinjau catatan galeri"
                    >
                      <span>Buka</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // 7. Tautan & Portofolio
    if (field.key === 'links' || field.id === 'art_field_button') {
      return (
        <div key={field.id} className="space-y-2 p-3 rounded-md bg-[#181B22] border border-[#30363D]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#F0F6FC] flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span>{field.label}</span>
            </label>
            <button
              type="button"
              onClick={handleAddLink}
              className="text-[11px] font-mono text-[#E5A93C] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>+ Tambah Link</span>
            </button>
          </div>

          {links.length === 0 ? (
            <p className="text-[10px] font-mono text-[#57606A] italic">Belum ada link portofolio.</p>
          ) : (
            <div className="space-y-1.5">
              {links.map((link) => (
                <div key={link.id} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => handleUpdateLink(link.id, { label: e.target.value })}
                    placeholder="Label"
                    className="w-1/3 min-h-[32px] px-2 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-[11px] focus:outline-none focus:border-[#E5A93C]"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => handleUpdateLink(link.id, { url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 min-h-[32px] px-2 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-[11px] focus:outline-none focus:border-[#E5A93C]"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteLink(link.id)}
                    className="p-1.5 text-[#8B949E] hover:text-rose-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 8. Galeri Foto Artis (Embed)
    if (field.key === 'embedImages' || field.id === 'art_field_embed_images') {
      return (
        <div key={field.id} className="space-y-2 p-3 rounded-md bg-[#181B22] border border-[#30363D]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#F0F6FC] flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span>{field.label}</span>
            </label>
            <label className="px-2 py-1 rounded bg-[#212631] hover:bg-[#2A303C] text-[#F0F6FC] border border-[#30363D] text-[11px] font-mono cursor-pointer flex items-center gap-1">
              <Upload className="w-3 h-3 text-[#E5A93C]" />
              <span>+ Unggah</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'embed')}
              />
            </label>
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              value={newEmbedUrl}
              onChange={(e) => setNewEmbedUrl(e.target.value)}
              placeholder="Tempel URL gambar..."
              className="flex-1 px-2.5 py-1.5 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C]"
            />
            <button
              type="button"
              onClick={handleAddEmbedUrl}
              className="px-2.5 py-1.5 rounded bg-[#212631] text-[#F0F6FC] text-xs font-mono border border-[#30363D] hover:border-[#8B949E]/60 transition cursor-pointer"
            >
              Tambah
            </button>
          </div>
          {embedUrlError && <p className="text-[10px] text-rose-400">{embedUrlError}</p>}

          {embedImages.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
              {embedImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded bg-[#0F1117] border border-[#30363D] overflow-hidden group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleDeleteEmbedImage(idx)}
                    className="absolute top-1 right-1 p-0.5 rounded bg-black/70 text-rose-300 hover:text-white transition opacity-80 group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 9. Custom Number Field with Input Affixes (Prefix & Suffix)
    if (field.type === 'number') {
      const hasPrefix = Boolean(field.prefix && field.prefix.trim());
      const hasSuffix = Boolean(field.suffix && field.suffix.trim());

      return (
        <div key={field.id} className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
              {field.label}
            </label>
            <span className="text-[9px] font-mono text-[#E5A93C] bg-[#212631] px-1.5 py-0.2 rounded border border-[#30363D]">
              Dynamic Filter (Angka)
              {(hasPrefix || hasSuffix) && ` [${field.prefix || ''}#${field.suffix ? ' ' + field.suffix.trim() : ''}]`}
            </span>
          </div>
          <div className="relative flex items-center">
            {hasPrefix && (
              <span className="inline-flex items-center px-2.5 min-h-[36px] rounded-l-md border border-r-0 border-[#30363D] bg-[#212631] text-xs text-[#8B949E] font-mono select-none">
                {field.prefix}
              </span>
            )}
            <input
              type="number"
              value={
                customNumberFields[field.label] !== undefined &&
                customNumberFields[field.label] !== null
                  ? customNumberFields[field.label]
                  : ''
              }
              onChange={(e) =>
                setCustomNumberFields({
                  ...customNumberFields,
                  [field.label]: e.target.value !== '' ? Number(e.target.value) : 0,
                })
              }
              placeholder={field.description || `Nilai ${field.label}...`}
              className={`w-full min-h-[36px] px-3 bg-[#181B22] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C] transition font-mono ${
                hasPrefix && hasSuffix
                  ? 'rounded-none border-x-0'
                  : hasPrefix
                  ? 'rounded-r-md rounded-l-none'
                  : hasSuffix
                  ? 'rounded-l-md rounded-r-none'
                  : 'rounded-md'
              }`}
            />
            {hasSuffix && (
              <span className="inline-flex items-center px-2.5 min-h-[36px] rounded-r-md border border-l-0 border-[#30363D] bg-[#212631] text-xs text-[#8B949E] font-mono select-none">
                {field.suffix}
              </span>
            )}
          </div>
        </div>
      );
    }

    // 10. Custom Text Dynamic Filter
    if (field.type === 'text_dynamic_filter') {
      return (
        <div key={field.id} className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
              {field.label}
            </label>
            <span className="text-[9px] font-mono text-[#E5A93C] bg-[#212631] px-1.5 py-0.2 rounded border border-[#30363D]">
              Dynamic Filter Tag
            </span>
          </div>
          <input
            type="text"
            value={customTextFields[field.label] || ''}
            onChange={(e) =>
              setCustomTextFields({
                ...customTextFields,
                [field.label]: e.target.value,
              })
            }
            placeholder={`Nilai filter ${field.label} (misal: Agensi A, Jakarta, dll)...`}
            className="w-full min-h-[36px] px-3 rounded-md bg-[#181B22] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C] transition"
          />
        </div>
      );
    }

    // 11. Generic Custom Field Fallback
    return (
      <div key={field.id} className="space-y-1">
        <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
          {field.label}
        </label>
        <input
          type="text"
          value={customTextFields[field.label] || ''}
          onChange={(e) =>
            setCustomTextFields({
              ...customTextFields,
              [field.label]: e.target.value,
            })
          }
          placeholder={`Masukkan ${field.label}...`}
          className="w-full min-h-[36px] px-3 rounded-md bg-[#181B22] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C] transition"
        />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      id="artist-form-modal"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/85 backdrop-blur-xs animate-in fade-in p-0 sm:p-4"
    >
      <div className="relative w-full max-w-xl mx-auto bg-[#181B22] border border-[#30363D] rounded-t-xl sm:rounded-xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
        {/* Compact Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#30363D] bg-[#111319] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E5A93C]" />
            <h2 className="text-xs font-semibold text-[#F0F6FC]">
              {initialArtist ? 'Ubah Profil Artis' : 'Tambah Profil Artis'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#212631] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && (
          <div className="mx-4 mt-2 p-2 rounded-md bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-1.5 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Form Body - Dynamic Layout Ordered by Form Layout Builder */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5 pb-24 bg-[#111319]/20">
          {sortedFields.map((field) => renderField(field))}
        </form>

        {/* Modal Footer */}
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
            className="px-4 py-1.5 rounded-md bg-[#E5A93C] hover:bg-[#F0B854] text-[#0F1117] font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-98 shadow-sm"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Simpan Profil Artis</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* PREVIEW CATATAN GALERI (Saat tombol "Buka" ditekan)                     */}
        {/* Dengan Tombol Opsi: "Buka Catatan"                                      */}
        {/* ========================================================================= */}
        {previewingNote && (
          <div
            className="fixed inset-0 z-60 flex flex-col justify-end sm:justify-center bg-black/85 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in"
            onClick={() => setPreviewingNote(null)}
          >
            <div
              className="w-full max-w-xl mx-auto bg-[#181B22] border border-[#30363D] rounded-t-xl sm:rounded-xl shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[82vh] overflow-hidden animate-in slide-in-from-bottom-2 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Preview Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#30363D] bg-[#111319] shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#212631] border border-[#30363D] flex items-center justify-center text-[#E5A93C]">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#F0F6FC]">
                      Pratinjau Catatan Galeri
                    </span>
                    <span className="text-[10px] font-mono text-[#8B949E] ml-2">
                      [{previewingNote.blocks?.length || 0} blok]
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewingNote(null)}
                  className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#212631] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#111319]/40">
                <div className="border-b border-[#30363D] pb-3 space-y-1.5">
                  <div className="text-[10px] font-mono text-[#8B949E] flex items-center gap-2 flex-wrap">
                    <span className="text-[#E5A93C] uppercase font-bold">ARCHIVE PREVIEW</span>
                    <span>•</span>
                    <span>Diperbarui: {new Date(previewingNote.updatedAt).toLocaleDateString('id-ID')}</span>
                  </div>
                  <h2 className="text-base font-semibold text-[#F0F6FC]">
                    {previewingNote.title}
                  </h2>

                  {/* Informasi Artis yang Tertaut di Pratinjau */}
                  {(() => {
                    const linkedInPreview = getLinkedArtistsForNote(previewingNote.id, previewingNote.linkedArtistIds);
                    return (
                      <div className="pt-1">
                        {linkedInPreview.length > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#212631] text-[#E5A93C] text-[10px] font-mono border border-[#30363D]">
                            <Users className="w-3 h-3 text-[#E5A93C]" />
                            <span>Artis Tertaut: {linkedInPreview.join(', ')}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#111319] text-[#57606A] text-[10px] font-mono border border-[#30363D]">
                            <Users className="w-3 h-3 text-[#57606A]" />
                            <span>Belum tertaut ke artis manapun</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Rendered Blocks Preview */}
                <div className="space-y-2.5">
                  {previewingNote.blocks?.map((block) => {
                    if (block.type === 'heading') {
                      return (
                        <h3 key={block.id} className="text-sm font-semibold text-[#F0F6FC] pt-1 border-b border-[#30363D]/60 pb-1">
                          {block.content}
                        </h3>
                      );
                    }
                    if (block.type === 'image') {
                      return (
                        <div key={block.id} className="rounded bg-[#0F1117] border border-[#30363D] overflow-hidden my-1.5">
                          {block.content ? (
                            <img
                              src={block.content}
                              alt=""
                              className="max-h-52 w-auto mx-auto object-contain"
                            />
                          ) : (
                            <div className="p-3 text-center text-xs font-mono text-[#57606A]">
                              [Gambar kosong]
                            </div>
                          )}
                        </div>
                      );
                    }
                    if (block.type === 'quote') {
                      return (
                        <blockquote key={block.id} className="pl-3 py-1 border-l-2 border-[#E5A93C] bg-[#212631]/40 rounded-r text-xs text-[#E2E2EB] italic">
                          "{block.content}"
                        </blockquote>
                      );
                    }
                    if (block.type === 'bullet_list') {
                      return (
                        <div key={block.id} className="flex items-start gap-1.5 text-xs text-[#E2E2EB]">
                          <span className="text-[#E5A93C] font-mono leading-none mt-1">•</span>
                          <span>{block.content}</span>
                        </div>
                      );
                    }
                    return (
                      <p key={block.id} className="text-xs text-[#E2E2EB] leading-relaxed whitespace-pre-wrap">
                        {block.content}
                      </p>
                    );
                  })}
                </div>
              </div>

              {/* Preview Footer Actions with Options: "Buka Halaman Penuh" & "Buka Catatan" */}
              <div className="px-4 py-2.5 border-t border-[#30363D] bg-[#111319] shrink-0 flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPreviewingNote(null)}
                  className="px-3 py-1.5 rounded-md bg-[#212631] text-[#8B949E] hover:text-[#F0F6FC] border border-[#30363D] text-xs font-mono transition cursor-pointer"
                >
                  Tutup Pratinjau
                </button>

                <div className="flex items-center gap-2">
                  {/* TOMBOL BUKA HALAMAN PENUH */}
                  <button
                    type="button"
                    onClick={() => {
                      const noteId = previewingNote.id;
                      setPreviewingNote(null);
                      if (onOpenFullNotePage) {
                        onOpenFullNotePage(noteId);
                      } else {
                        onClose();
                        window.location.hash = `#/gallery_note/${noteId}`;
                      }
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#212631] hover:bg-[#2A303C] text-[#E5A93C] hover:text-[#F0B854] border border-[#30363D] font-mono font-medium text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-98"
                    title="Buka halaman catatan ini secara penuh"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Halaman Penuh</span>
                  </button>

                  {/* TOMBOL OPSI UNTUK BUKA CATATAN / EDITOR */}
                  <button
                    type="button"
                    onClick={() => {
                      const noteToOpen = previewingNote;
                      setPreviewingNote(null);
                      setEditingNoteFromPreview(noteToOpen);
                    }}
                    className="px-3.5 py-1.5 rounded-md bg-[#E5A93C] hover:bg-[#F0B854] text-[#0F1117] font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-98 shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Buka Catatan</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Editor / Full View Catatan (Dibuka melalui opsi "Buka Catatan") */}
        {editingNoteFromPreview && (
          <GalleryNoteModal
            isOpen={!!editingNoteFromPreview}
            onClose={() => setEditingNoteFromPreview(null)}
            onSave={(savedNote) => {
              const currentNotes = getStoredGalleryNotes();
              const updatedList = currentNotes.map((n) => (n.id === savedNote.id ? savedNote : n));
              saveGalleryNotes(updatedList);
              setAvailableGalleryNotes(updatedList);
              setEditingNoteFromPreview(null);
            }}
            initialNote={editingNoteFromPreview}
            artists={allArtistsList}
            readOnlyInitial={false}
          />
        )}

        {/* Direct Note Creation Modal */}
        {isCreatingDirectNote && (
          <GalleryNoteModal
            isOpen={isCreatingDirectNote}
            onClose={() => setIsCreatingDirectNote(false)}
            onSave={(newNote) => {
              const currentNotes = getStoredGalleryNotes();
              const updatedList = [newNote, ...currentNotes];
              saveGalleryNotes(updatedList);
              setAvailableGalleryNotes(updatedList);
              setSelectedGalleryNoteIds((prev) => [...prev, newNote.id]);
              setIsCreatingDirectNote(false);
            }}
            initialNote={null}
            artists={allArtistsList}
          />
        )}
      </div>
    </div>
  );
};
