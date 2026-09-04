import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, ArrowUpDown, Film, User, Search, Sparkles } from 'lucide-react';
import { Artist, Video, CustomFieldDefinition } from '../types';
import { calculateArtistAggregatedRating } from '../utils/storage';
import { RatingBadge } from './RatingBadge';
import { DynamicRankFilterBar } from './DynamicRankFilterBar';

interface ArtistRankViewProps {
  artists: Artist[];
  videos: Video[];
  fieldDefinitions?: CustomFieldDefinition[];
  onSelectArtist: (artistId: string) => void;
  initialFieldId?: string | null;
  initialOption?: string | null;
}

export const ArtistRankView: React.FC<ArtistRankViewProps> = ({
  artists,
  videos,
  fieldDefinitions = [],
  onSelectArtist,
  initialFieldId,
  initialOption,
}) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [sortCriterion, setSortCriterion] = useState<'rating' | 'role' | 'videos'>('rating');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFieldId, setActiveFieldId] = useState<string | null>(initialFieldId || null);
  const [selectedOption, setSelectedOption] = useState<string | null>(initialOption || null);

  useEffect(() => {
    if (initialFieldId) {
      setActiveFieldId(initialFieldId);
      setSelectedOption(initialOption || null);
    }
  }, [initialFieldId, initialOption]);

  // Extract unique "Peran Utama" values from all artists
  const uniqueRoles = useMemo(() => {
    const roleMap = new Map<string, number>();
    artists.forEach((a) => {
      const role = (a.textFields?.['Peran Utama'] || 'Aktor / Seniman Film').trim();
      roleMap.set(role, (roleMap.get(role) || 0) + 1);
    });
    return Array.from(roleMap.entries()).map(([role, count]) => ({ role, count }));
  }, [artists]);

  // Extract dynamic options present in data for artists' videos
  const dynamicOptionsByField = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const field of fieldDefinitions) {
      if (field.type === 'single_choice' || field.type === 'multi_choice') {
        const set = new Set<string>();
        for (const vid of videos) {
          if (field.type === 'single_choice') {
            const v = vid.singleChoices?.[field.id];
            if (v && typeof v === 'string' && v.trim()) set.add(v.trim());
          } else {
            const list = vid.multiChoices?.[field.id];
            if (Array.isArray(list)) {
              for (const item of list) {
                if (item && typeof item === 'string' && item.trim()) set.add(item.trim());
              }
            }
          }
        }
        map[field.id] = Array.from(set);
      }
    }
    return map;
  }, [fieldDefinitions, videos]);

  // Compute aggregated scores and sort
  const rankedArtists = useMemo(() => {
    return artists
      .map((artist) => {
        // Linked videos for this artist
        const artistVideos = videos.filter(
          (v) => v.artistIds && v.artistIds.includes(artist.id)
        );

        // Filter linked videos if category/tag filter is active
        let relevantVideos = artistVideos;
        if (activeFieldId && selectedOption) {
          const fieldDef = fieldDefinitions.find((f) => f.id === activeFieldId);
          relevantVideos = artistVideos.filter((vid) => {
            if (fieldDef?.type === 'single_choice') {
              return vid.singleChoices?.[activeFieldId] === selectedOption;
            } else if (fieldDef?.type === 'multi_choice') {
              const tags = vid.multiChoices?.[activeFieldId] || [];
              return tags.includes(selectedOption);
            }
            return true;
          });

          // If artist has no videos in this category/tag, exclude from this specific rank
          if (relevantVideos.length === 0) {
            return null;
          }
        }

        // Calculate aggregated rating from relevant videos based on role weights
        const { rating: aggregatedRating, totalPoints } = calculateArtistAggregatedRating(
          artist.id,
          relevantVideos
        );

        return {
          ...artist,
          aggregatedRating,
          totalPoints,
          videoCount: relevantVideos.length,
          totalLinkedCount: artistVideos.length,
        };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)
      .filter((a) => {
        // Filter by Peran Utama
        if (selectedRoleFilter !== 'all') {
          const role = (a.textFields?.['Peran Utama'] || 'Aktor / Seniman Film').trim();
          if (role !== selectedRoleFilter) return false;
        }

        // Filter by search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const role = (a.textFields?.['Peran Utama'] || '').toLowerCase();
        return a.name.toLowerCase().includes(q) || role.includes(q);
      })
      .sort((a, b) => {
        if (sortCriterion === 'role') {
          const roleA = (a.textFields?.['Peran Utama'] || 'Aktor / Seniman Film').toLowerCase();
          const roleB = (b.textFields?.['Peran Utama'] || 'Aktor / Seniman Film').toLowerCase();
          const cmp = roleA.localeCompare(roleB);
          return sortOrder === 'desc' ? -cmp : cmp;
        }

        if (sortCriterion === 'videos') {
          const vA = a.videoCount || 0;
          const vB = b.videoCount || 0;
          return sortOrder === 'desc' ? vB - vA : vA - vB;
        }

        // Default: Sort by rating
        const scoreA = a.aggregatedRating ?? -1;
        const scoreB = b.aggregatedRating ?? -1;
        return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      });
  }, [artists, videos, sortOrder, sortCriterion, selectedRoleFilter, searchQuery, activeFieldId, selectedOption, fieldDefinitions]);

  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return 'bg-[#E5A93C] text-[#0D1117] font-bold border border-[#E5A93C]';
    if (rank === 2) return 'bg-[#C9D1D9] text-[#0D1117] font-bold border border-[#8B949E]';
    if (rank === 3) return 'bg-[#8B5E3C] text-[#F0F6FC] font-bold border border-[#A26D45]';
    return 'bg-[#181B22] text-[#8B949E] border border-[#30363D] font-mono';
  };

  return (
    <div id="artist-rank-view" className="space-y-3 pb-24 animate-in fade-in font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#E5A93C]" />
          <span className="text-sm font-bold text-[#F0F6FC] tracking-tight">Peringkat Artis</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#181B22] border border-[#30363D] text-[#E5A93C]">
            {rankedArtists.length}
          </span>
        </div>
      </div>

      {/* Dynamic Filtering Tabs & Chips */}
      <DynamicRankFilterBar
        fieldDefinitions={fieldDefinitions}
        activeFieldId={activeFieldId}
        onSelectField={setActiveFieldId}
        selectedOption={selectedOption}
        onSelectOption={setSelectedOption}
        dynamicOptionsByField={dynamicOptionsByField}
      />

      {/* Filter Chips: Peran Utama */}
      {uniqueRoles.length > 0 && (
        <div className="space-y-1 px-0.5">
          <div className="flex items-center gap-1 text-[10px] text-[#8B949E]">
            <Sparkles className="w-3 h-3 text-[#E5A93C]" />
            <span>Peran Utama:</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('all')}
              className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition cursor-pointer shrink-0 ${
                selectedRoleFilter === 'all'
                  ? 'bg-[#212631] text-[#E5A93C] border border-[#30363D]'
                  : 'bg-[#181B22] border border-[#30363D]/60 text-[#8B949E] hover:text-[#F0F6FC]'
              }`}
            >
              Semua ({artists.length})
            </button>
            {uniqueRoles.map(({ role, count }) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRoleFilter(selectedRoleFilter === role ? 'all' : role)}
                className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1 ${
                  selectedRoleFilter === role
                    ? 'bg-[#E5A93C] text-[#0D1117] font-semibold'
                    : 'bg-[#181B22] border border-[#30363D]/60 text-[#8B949E] hover:text-[#F0F6FC]'
                }`}
              >
                <span>{role}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-[#111319]/40">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar & Sort Toggle */}
      <div className="space-y-1.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari artis atau peran utama..."
            className="w-full h-8 pl-8 pr-3 rounded-md bg-[#181B22] border border-[#30363D] text-[#F0F6FC] text-xs placeholder-[#57606A] focus:outline-none focus:border-[#E5A93C]"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1.5 p-1.5 rounded-md bg-[#181B22] border border-[#30363D] text-xs">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#8B949E]">Urut:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSortCriterion('rating')}
                className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer ${
                  sortCriterion === 'rating'
                    ? 'bg-[#212631] text-[#E5A93C] border border-[#30363D]'
                    : 'bg-[#111319] text-[#8B949E] hover:text-[#F0F6FC]'
                }`}
              >
                Rating
              </button>
              <button
                type="button"
                onClick={() => setSortCriterion('role')}
                className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer ${
                  sortCriterion === 'role'
                    ? 'bg-[#212631] text-[#E5A93C] border border-[#30363D]'
                    : 'bg-[#111319] text-[#8B949E] hover:text-[#F0F6FC]'
                }`}
              >
                Peran
              </button>
              <button
                type="button"
                onClick={() => setSortCriterion('videos')}
                className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer ${
                  sortCriterion === 'videos'
                    ? 'bg-[#212631] text-[#E5A93C] border border-[#30363D]'
                    : 'bg-[#111319] text-[#8B949E] hover:text-[#F0F6FC]'
                }`}
              >
                Video
              </button>
            </div>
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#111319] text-[#8B949E] hover:text-[#F0F6FC] text-[10px] border border-[#30363D] transition active:scale-95 cursor-pointer ml-auto"
          >
            <ArrowUpDown className="w-3 h-3 text-[#E5A93C]" />
            <span>{sortOrder === 'desc' ? 'Tertinggi' : 'Terendah'}</span>
          </button>
        </div>
      </div>

      {/* Leaderboard List */}
      {rankedArtists.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-md bg-[#181B22] border border-[#30363D]">
          <User className="w-7 h-7 text-[#57606A] mx-auto mb-1.5" />
          <p className="text-xs text-[#F0F6FC]">Tidak ada artis ditemukan</p>
          <p className="text-[10px] text-[#8B949E] mt-0.5">Coba sesuaikan filter atau kata kunci pencarian.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {rankedArtists.map((artist, index) => {
            const rank = index + 1;
            const mainRole = artist.textFields?.['Peran Utama'] || 'Aktor / Seniman';

            return (
              <div
                key={artist.id}
                onClick={() => onSelectArtist(artist.id)}
                className="group flex items-center gap-2.5 p-2 rounded-md bg-[#181B22] border border-[#30363D] hover:border-[#30363D]/90 hover:bg-[#212631]/60 transition cursor-pointer"
              >
                {/* Nomor Peringkat */}
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center text-[10px] shrink-0 select-none ${getRankBadgeStyle(
                    rank
                  )}`}
                >
                  {rank}
                </div>

                {/* Avatar Bulat */}
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-[#111319] border border-[#30363D] shrink-0">
                  <img
                    src={artist.avatarUrl}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>

                {/* Nama Artis & Info Peran Utama */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-sans font-medium text-[#F0F6FC] truncate group-hover:text-[#E5A93C] transition">
                    {artist.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#8B949E] mt-0.5 font-mono">
                    <span className="flex items-center gap-0.5 shrink-0">
                      <Film className="w-2.5 h-2.5 text-[#E5A93C]" />
                      <span>{artist.videoCount} vid</span>
                    </span>
                    <span className="px-1 py-0.2 rounded bg-[#111319] border border-[#30363D] text-[#C9D1D9] text-[9px] truncate max-w-[130px] sm:max-w-none">
                      {mainRole}
                    </span>
                  </div>
                </div>

                {/* Skor Rating */}
                <div className="shrink-0 text-right">
                  <RatingBadge score={artist.aggregatedRating} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
