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
} from 'lucide-react';
import { Artist, ArtistLink, GalleryNote, CustomFieldDefinition } from '../types';
import { getStoredGalleryNotes, saveGalleryNotes, getStoredArtistFields } from '../utils/storage';
import { GalleryNoteModal } from './GalleryNoteModal';

interface ArtistFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (artistData: Partial<Artist>) => void;
  initialArtist?: Artist | null;
}

export const ArtistFormModal: React.FC<ArtistFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialArtist,
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
  const [isCreatingDirectNote, setIsCreatingDirectNote] = useState(false);

  // New Feature: Note Preview modal state when clicking "Buka" in CATATAN GALERI TERTAUT
  const [previewingNote, setPreviewingNote] = useState<GalleryNote | null>(null);
  const [editingNoteFromPreview, setEditingNoteFromPreview] = useState<GalleryNote | null>(null);

  useEffect(() => {
    setAvailableGalleryNotes(getStoredGalleryNotes());
    const fields = getStoredArtistFields();
    setArtistFields(fields);

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
      setAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80');
      setCoverUrl('https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1000&auto=format&fit=crop&q=80');
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
  }, [initialArtist, isOpen]);

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
      avatarUrl:
        avatarUrl.trim() ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
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

        {/* Form Body - Compact & Minimalist */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5 pb-24 bg-[#111319]/20">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
              Nama Artis *
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

          {/* Month/Year Birth */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
                Bulan &amp; Tahun Lahir
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

          {/* ========================================================================= */}
          {/* FITUR BARU: CATATAN GALERI TERTAUT (Dengan Tombol "Buka" & Pratinjau)   */}
          {/* ========================================================================= */}
          <div className="space-y-2 p-3 rounded-md bg-[#181B22] border border-[#30363D]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#E5A93C]" />
                <label className="text-xs font-semibold text-[#F0F6FC]">
                  CATATAN GALERI TERTAUT
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
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {availableGalleryNotes.map((note) => {
                  const isChecked = selectedGalleryNoteIds.includes(note.id);
                  return (
                    <div
                      key={note.id}
                      className={`flex items-center justify-between p-2 rounded-md transition border ${
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
                        className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition shrink-0 ${
                            isChecked
                              ? 'bg-[#E5A93C] border-[#E5A93C] text-[#0F1117]'
                              : 'border-[#30363D] bg-[#181B22]'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="truncate text-xs font-medium">{note.title}</span>
                        <span className="text-[10px] font-mono text-[#8B949E] shrink-0">
                          ({note.blocks?.length || 0} blok)
                        </span>
                      </button>

                      {/* Tombol Buka Catatan untuk Preview */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewingNote(note);
                        }}
                        className="px-2 py-0.5 rounded bg-[#181B22] hover:bg-[#2A303C] text-[#E5A93C] hover:text-[#F0B854] border border-[#30363D] hover:border-[#E5A93C]/60 text-[11px] font-mono flex items-center gap-1 shrink-0 ml-2 transition cursor-pointer active:scale-95 shadow-2xs"
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

          {/* Custom Fields */}
          {artistFields
            .filter((f) => !['galleryNoteIds', 'birthMonthYear', 'links'].includes(f.key))
            .map((field) => {
              if (field.key === 'Peran Utama') {
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={roleText}
                      onChange={(e) => setRoleText(e.target.value)}
                      placeholder="Contoh: Aktor Utama / Sutradara"
                      className="w-full min-h-[36px] px-3 rounded-md bg-[#181B22] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C] transition"
                    />
                  </div>
                );
              }

              if (field.type === 'number') {
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
                      {field.label}
                    </label>
                    <input
                      type="number"
                      value={customNumberFields[field.label] ?? ''}
                      onChange={(e) =>
                        setCustomNumberFields({
                          ...customNumberFields,
                          [field.label]: e.target.value !== '' ? Number(e.target.value) : 0,
                        })
                      }
                      placeholder={`Nilai ${field.label}...`}
                      className="w-full min-h-[36px] px-3 rounded-md bg-[#181B22] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C] transition"
                    />
                  </div>
                );
              }

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
            })}

          {/* Bio */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
              Biografi / Catatan Ringkas
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tulis riwayat karier atau catatan artis..."
              className="w-full px-3 py-2 rounded-md bg-[#181B22] border border-[#30363D] text-[#F0F6FC] text-xs focus:outline-none focus:border-[#E5A93C] transition leading-relaxed"
            />
          </div>

          {/* Links Portofolio */}
          <div className="space-y-2 p-3 rounded-md bg-[#181B22] border border-[#30363D]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#F0F6FC] flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-[#E5A93C]" />
                <span>Tautan &amp; Portofolio</span>
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
                      className="p-1.5 text-[#8B949E] hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Foto Profil & Cover */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Avatar */}
            <div className="p-2.5 rounded-md bg-[#181B22] border border-[#30363D] space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-[#8B949E]">Foto Profil</label>
              <div className="flex items-center gap-2">
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border border-[#30363D] shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80';
                  }}
                />
                <label className="px-2 py-1 rounded bg-[#212631] hover:bg-[#2A303C] text-[#F0F6FC] border border-[#30363D] text-[11px] font-mono cursor-pointer flex items-center gap-1 transition">
                  <Upload className="w-3 h-3 text-[#E5A93C]" />
                  <span>Unggah</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'avatar')}
                  />
                </label>
              </div>
              <input
                type="text"
                value={avatarUrl.startsWith('data:') ? '[Berkas Terunggah]' : avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="URL Foto..."
                className="w-full px-2 py-1 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-[10px] focus:outline-none focus:border-[#E5A93C]"
              />
            </div>

            {/* Cover */}
            <div className="p-2.5 rounded-md bg-[#181B22] border border-[#30363D] space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-[#8B949E]">Foto Cover</label>
              <div className="flex items-center gap-2">
                <div className="w-16 h-10 rounded bg-[#0F1117] border border-[#30363D] overflow-hidden shrink-0">
                  <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                </div>
                <label className="px-2 py-1 rounded bg-[#212631] hover:bg-[#2A303C] text-[#F0F6FC] border border-[#30363D] text-[11px] font-mono cursor-pointer flex items-center gap-1 transition">
                  <Upload className="w-3 h-3 text-[#E5A93C]" />
                  <span>Unggah</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'cover')}
                  />
                </label>
              </div>
              <input
                type="text"
                value={coverUrl.startsWith('data:') ? '[Berkas Terunggah]' : coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="URL Cover..."
                className="w-full px-2 py-1 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-[10px] focus:outline-none focus:border-[#E5A93C]"
              />
            </div>
          </div>

          {/* Embed Images */}
          <div className="space-y-2 p-3 rounded-md bg-[#181B22] border border-[#30363D]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#F0F6FC] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#E5A93C]" />
                <span>Galeri Foto Artis</span>
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
                      className="absolute top-1 right-1 p-0.5 rounded bg-black/70 text-rose-300 hover:text-white transition opacity-80 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                <div className="border-b border-[#30363D] pb-3 space-y-1">
                  <div className="text-[10px] font-mono text-[#8B949E] flex items-center gap-2">
                    <span className="text-[#E5A93C] uppercase">ARCHIVE PREVIEW</span>
                    <span>•</span>
                    <span>Diperbarui: {new Date(previewingNote.updatedAt).toLocaleDateString('id-ID')}</span>
                  </div>
                  <h2 className="text-base font-semibold text-[#F0F6FC]">
                    {previewingNote.title}
                  </h2>
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

              {/* Preview Footer Actions with Option: "Buka Catatan" */}
              <div className="px-4 py-2.5 border-t border-[#30363D] bg-[#111319] shrink-0 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewingNote(null)}
                  className="px-3 py-1.5 rounded-md bg-[#212631] text-[#8B949E] hover:text-[#F0F6FC] border border-[#30363D] text-xs font-mono transition cursor-pointer"
                >
                  Tutup Pratinjau
                </button>

                {/* TOMBOL OPSI UNTUK BUKA CATATAN */}
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
            artists={[]}
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
            artists={[]}
          />
        )}
      </div>
    </div>
  );
};
