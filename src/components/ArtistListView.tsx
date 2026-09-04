import React, { useState, useMemo, useEffect } from 'react';
import { Search, UserPlus, Film, Trash2, Users, LayoutGrid, List, FileText } from 'lucide-react';
import { Artist, Video } from '../types';
import { RatingBadge } from './RatingBadge';
import { calculateArtistAggregatedRating, getArtistViewMode, saveArtistViewMode, getStoredGalleryNotes } from '../utils/storage';

interface ArtistListViewProps {
  artists: Artist[];
  videos: Video[];
  onSelectArtist: (artistId: string) => void;
  onOpenCreateArtist: () => void;
  onDeleteArtist?: (artist: Artist) => void;
  filterRole?: string | null;
  onClearRoleFilter?: () => void;
}

export const ArtistListView: React.FC<ArtistListViewProps> = ({
  artists,
  videos,
  onSelectArtist,
  onOpenCreateArtist,
  onDeleteArtist,
  filterRole,
  onClearRoleFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => getArtistViewMode());

  useEffect(() => {
    setViewMode(getArtistViewMode());
  }, []);

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    saveArtistViewMode(mode);
  };

  // Hitung total catatan galeri yang tertaut ke masing-masing artis
  const galleryNotes = useMemo(() => getStoredGalleryNotes(), []);
  const artistNoteCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    artists.forEach((artist) => {
      const noteSet = new Set<string>(artist.galleryNoteIds || []);
      galleryNotes.forEach((note) => {
        if (note.linkedArtistIds && note.linkedArtistIds.includes(artist.id)) {
          noteSet.add(note.id);
        }
      });
      map[artist.id] = noteSet.size;
    });
    return map;
  }, [artists, galleryNotes]);

  const filteredArtists = useMemo(() => {
    return artists.filter((artist) => {
      const matchSearch =
        artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (artist.bio && artist.bio.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (filterRole) {
        const role = artist.textFields?.['Peran Utama'] || '';
        return role.toLowerCase() === filterRole.toLowerCase();
      }

      return true;
    });
  }, [artists, searchQuery, filterRole]);

  return (
    <div id="artist-list-view" className="space-y-3 pb-24 animate-in fade-in">
      {/* Role Filter Tag */}
      {filterRole && (
        <div className="flex items-center justify-between p-2 rounded-md bg-[#212631] border border-[#30363D] text-xs text-[#F0F6FC]">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-[#8B949E]">Filter Peran:</span>
            <span className="px-1.5 py-0.2 rounded bg-[#E5A93C] text-[#0F1117] font-bold">{filterRole}</span>
          </div>
          {onClearRoleFilter && (
            <button
              type="button"
              onClick={onClearRoleFilter}
              className="text-[11px] font-mono text-[#E5A93C] hover:underline cursor-pointer"
            >
              Hapus
            </button>
          )}
        </div>
      )}

      {/* Compact Search & Action Bar */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#57606A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari artis atau profil..."
            className="w-full min-h-[36px] pl-8 pr-3 rounded-md bg-[#181B22] border border-[#30363D] text-[#F0F6FC] text-xs placeholder:text-[#57606A] focus:outline-none focus:border-[#E5A93C] transition"
          />
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-[#181B22] border border-[#30363D] rounded-md p-0.5">
          <button
            type="button"
            onClick={() => handleSetViewMode('grid')}
            className={`p-1 rounded text-xs transition cursor-pointer ${
              viewMode === 'grid' ? 'bg-[#212631] text-[#E5A93C]' : 'text-[#8B949E] hover:text-[#F0F6FC]'
            }`}
            title="Tampilan Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleSetViewMode('list')}
            className={`p-1 rounded text-xs transition cursor-pointer ${
              viewMode === 'list' ? 'bg-[#212631] text-[#E5A93C]' : 'text-[#8B949E] hover:text-[#F0F6FC]'
            }`}
            title="Tampilan List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Add Button */}
        <button
          onClick={onOpenCreateArtist}
          className="min-h-[36px] px-3 rounded-md bg-[#E5A93C] hover:bg-[#F0B854] text-[#0F1117] text-xs font-semibold flex items-center gap-1 shrink-0 transition active:scale-95 cursor-pointer shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tambah</span>
        </button>
      </div>

      {/* Count Line */}
      <div className="text-[11px] font-mono text-[#8B949E] px-0.5">
        <span className="text-[#F0F6FC] font-semibold">{filteredArtists.length}</span> Profil Artis
      </div>

      {/* Artists List/Grid */}
      {filteredArtists.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-lg bg-[#181B22]/60 border border-[#30363D] space-y-2">
          <Users className="w-8 h-8 text-[#57606A] mx-auto" />
          <p className="text-xs font-semibold text-[#8B949E]">Tidak ada artis ditemukan</p>
          <button
            onClick={onOpenCreateArtist}
            className="text-xs font-mono text-[#E5A93C] hover:underline cursor-pointer"
          >
            + Tambah artis baru
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-2.5">
          {filteredArtists.map((artist) => {
            const { rating, videoCount } = calculateArtistAggregatedRating(artist.id, videos);

            return (
              <div
                key={artist.id}
                onClick={() => onSelectArtist(artist.id)}
                className="group relative rounded-md overflow-hidden bg-[#181B22] border border-[#30363D] hover:border-[#8B949E]/50 transition cursor-pointer flex flex-col"
              >
                {/* Square Photo */}
                <div className="relative aspect-square w-full bg-[#0F1117] overflow-hidden">
                  <img
                    src={artist.avatarUrl}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-103 transition duration-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F1117]/90 via-transparent to-black/20" />

                  {/* Delete Button */}
                  {onDeleteArtist && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteArtist(artist);
                      }}
                      className="absolute top-1.5 left-1.5 z-10 p-1 rounded bg-black/70 hover:bg-rose-950/90 text-[#8B949E] hover:text-rose-300 border border-[#30363D] transition active:scale-95 cursor-pointer"
                      title="Hapus Artis"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}

                  {/* Rating Badge */}
                  <div className="absolute top-1.5 right-1.5 z-10">
                    <RatingBadge score={rating} size="sm" showIcon />
                  </div>

                  {/* Video & Notes Count Tags */}
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#111319]/85 backdrop-blur-xs text-[9px] font-mono text-[#E5A93C] border border-[#30363D]">
                      <Film className="w-2.5 h-2.5" />
                      <span>{videoCount} vid</span>
                    </div>
                    <div
                      className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#111319]/85 backdrop-blur-xs text-[9px] font-mono text-[#F0F6FC] border border-[#30363D]"
                      title="Total Catatan Galeri Tertaut"
                    >
                      <FileText className="w-2.5 h-2.5 text-[#E5A93C]" />
                      <span>{artistNoteCountMap[artist.id] || 0} note</span>
                    </div>
                  </div>
                </div>

                {/* Name & Role */}
                <div className="p-2 bg-[#181B22] flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-[#F0F6FC] truncate group-hover:text-[#E5A93C] transition">
                      {artist.name}
                    </h3>
                    <p className="text-[10px] font-mono text-[#8B949E] truncate mt-0.5">
                      {artist.textFields?.['Peran Utama'] || 'Aktor / Seniman'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredArtists.map((artist) => {
            const { rating, videoCount } = calculateArtistAggregatedRating(artist.id, videos);
            const noteCount = artistNoteCountMap[artist.id] || 0;

            return (
              <div
                key={artist.id}
                onClick={() => onSelectArtist(artist.id)}
                className="group flex items-center gap-2.5 p-2 rounded-md bg-[#181B22] border border-[#30363D] hover:border-[#8B949E]/50 transition cursor-pointer"
              >
                <img
                  src={artist.avatarUrl}
                  alt={artist.name}
                  className="w-10 h-10 rounded-md object-cover bg-[#0F1117] ring-1 ring-[#30363D] shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80';
                  }}
                />

                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold text-[#F0F6FC] truncate group-hover:text-[#E5A93C] transition">
                    {artist.name}
                  </h3>
                  <p className="text-[10px] font-mono text-[#8B949E] truncate">
                    {artist.textFields?.['Peran Utama'] || artist.bio || 'Profil Artis'}
                  </p>
                  <div className="flex items-center gap-2 text-[9px] font-mono text-[#8B949E] mt-0.5">
                    <div className="flex items-center gap-1 text-[#E5A93C]">
                      <Film className="w-2.5 h-2.5" />
                      <span>{videoCount} video</span>
                    </div>
                    <span className="text-[#57606A]">•</span>
                    <div className="flex items-center gap-1 text-[#F0F6FC]" title="Total Catatan Galeri Tertaut">
                      <FileText className="w-2.5 h-2.5 text-[#E5A93C]" />
                      <span>{noteCount} catatan</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <RatingBadge score={rating} size="sm" />
                  {onDeleteArtist && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteArtist(artist);
                      }}
                      className="p-1 rounded bg-[#212631] text-[#8B949E] hover:text-rose-400 border border-[#30363D] transition cursor-pointer"
                      title="Hapus Artis"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
