import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, ArrowUpDown, Film, User, Search, Sparkles } from 'lucide-react';
import { Artist, Video, CustomFieldDefinition } from '../types';
import { calculateArtistAggregatedRating, getStoredArtistFields } from '../utils/storage';
import { RatingBadge } from './RatingBadge';
import { DynamicRankFilterBar } from './DynamicRankFilterBar';
import {
  computeDynamicFilterSchemaForArtists,
  matchArtistAgainstDynamicFilter,
  useStorageRealtimeSync,
} from '../utils/dynamicFilterSchema';

interface ArtistRankViewProps {
  artists: Artist[];
  videos: Video[];
  fieldDefinitions?: CustomFieldDefinition[];
  artistFieldDefinitions?: CustomFieldDefinition[];
  onSelectArtist: (artistId: string) => void;
  initialFieldId?: string | null;
  initialOption?: string | null;
}

export const ArtistRankView: React.FC<ArtistRankViewProps> = ({
  artists,
  videos,
  fieldDefinitions = [],
  artistFieldDefinitions,
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

  // Real-time storage synchronization trigger
  const storageVersion = useStorageRealtimeSync();

  useEffect(() => {
    if (initialFieldId) {
      setActiveFieldId(initialFieldId);
      setSelectedOption(initialOption || null);
    }
  }, [initialFieldId, initialOption]);

  // Resolve artist fields definitions with fallback to localStorage
  const currentArtistFields = useMemo(() => {
    if (artistFieldDefinitions && artistFieldDefinitions.length > 0) {
      return artistFieldDefinitions;
    }
    return getStoredArtistFields();
  }, [artistFieldDefinitions, storageVersion]);

  // Dynamic Filtering Schema with Auto-Pruning:
  // - Integrates custom Text and Number fields from "Struktur & Urutan Field Artis"
  // - Auto-prunes any fields or options with null/empty records
  const { activeFields, dynamicOptionsByField } = useMemo(() => {
    return computeDynamicFilterSchemaForArtists(
      artists,
      videos,
      currentArtistFields,
      fieldDefinitions
    );
  }, [artists, videos, currentArtistFields, fieldDefinitions, storageVersion]);

  // Extract unique "Peran Utama" values from all active artists for quick chip filter with Auto-Pruning
  const uniqueRoles = useMemo(() => {
    const roleMap = new Map<string, number>();
    artists.forEach((a) => {
      const rawRole =
        a.textFields?.['Peran Utama'] ??
        a.textFields?.['Peran / Profesi Utama'];
      if (rawRole && typeof rawRole === 'string' && rawRole.trim().length > 0) {
        const role = rawRole.trim();
        roleMap.set(role, (roleMap.get(role) || 0) + 1);
      }
    });

    // Auto-Pruning: Only keep roles with at least 1 active artist record (pruning orphaned/unused values)
    return Array.from(roleMap.entries())
      .filter(([, count]) => count > 0)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => a.role.localeCompare(b.role, 'id', { sensitivity: 'base' }));
  }, [artists]);

  // Auto-prune active role filter if the selected role no longer exists in any active artist
  useEffect(() => {
    if (selectedRoleFilter !== 'all') {
      const roleExists = uniqueRoles.some((r) => r.role.toLowerCase() === selectedRoleFilter.toLowerCase());
      if (!roleExists) {
        setSelectedRoleFilter('all');
      }
    }
  }, [uniqueRoles, selectedRoleFilter]);

  // Auto-prune dynamic filter selected option if it no longer exists in dynamicOptionsByField
  useEffect(() => {
    if (activeFieldId && selectedOption) {
      const availableOptions = dynamicOptionsByField[activeFieldId] || [];
      if (!availableOptions.includes(selectedOption)) {
        setSelectedOption(null);
      }
    }
  }, [activeFieldId, selectedOption, dynamicOptionsByField]);

  // Compute aggregated scores and sort
  const rankedArtists = useMemo(() => {
    return artists
      .map((artist) => {
        // Linked videos for this artist
        const artistVideos = videos.filter(
          (v) => v.artistIds && v.artistIds.includes(artist.id)
        );

        // Dynamic Filtering Schema evaluation
        if (activeFieldId && selectedOption) {
          const matched = matchArtistAgainstDynamicFilter(
            artist,
            activeFieldId,
            selectedOption,
            activeFields,
            artistVideos
          );
          if (!matched) return null;
        }

        // Role filter with robust check
        if (selectedRoleFilter !== 'all') {
          const rawRole =
            artist.textFields?.['Peran Utama'] ??
            artist.textFields?.['Peran / Profesi Utama'];
          const artistRole = rawRole && typeof rawRole === 'string' ? rawRole.trim() : '';
          if (artistRole.toLowerCase() !== selectedRoleFilter.toLowerCase()) return null;
        }

        // Relevant videos that contribute to this artist's aggregated rating
        let relevantVideos = artistVideos;
        if (activeFieldId && selectedOption) {
          const currentField = activeFields.find((f) => f.id === activeFieldId);
          if (currentField?.type === 'single_choice' || currentField?.type === 'multi_choice') {
            relevantVideos = artistVideos.filter((vid) => {
              if (currentField.type === 'single_choice') {
                return vid.singleChoices?.[activeFieldId] === selectedOption;
              }
              const tags = vid.multiChoices?.[activeFieldId] || [];
              return tags.includes(selectedOption);
            });
          }
        }

        // Calculate aggregated rating from relevant videos based on role weights
        const { rating: aggregatedRating, totalPoints } = calculateArtistAggregatedRating(
          artist.id,
          relevantVideos.length > 0 ? relevantVideos : artistVideos
        );

        return {
          ...artist,
          aggregatedRating,
          totalPoints,
          videoCount: relevantVideos.length > 0 ? relevantVideos.length : artistVideos.length,
          totalLinkedCount: artistVideos.length,
        };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)
      .filter((a) => {
        // Filter by Peran Utama chip if set
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
        if (sortCriterion === 'rating') {
          const diff = (b.aggregatedRating || 0) - (a.aggregatedRating || 0);
          return sortOrder === 'desc' ? diff : -diff;
        }
        if (sortCriterion === 'videos') {
          const diff = (b.videoCount || 0) - (a.videoCount || 0);
          return sortOrder === 'desc' ? diff : -diff;
        }
        if (sortCriterion === 'role') {
          const roleA = a.textFields?.['Peran Utama'] || '';
          const roleB = b.textFields?.['Peran Utama'] || '';
          const cmp = roleA.localeCompare(roleB);
          return sortOrder === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
  }, [
    artists,
    videos,
    activeFieldId,
    selectedOption,
    activeFields,
    selectedRoleFilter,
    searchQuery,
    sortCriterion,
    sortOrder,
  ]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

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

      {/* Dynamic Filtering Tabs & Chips (with Auto-Pruning) */}
      <DynamicRankFilterBar
        fieldDefinitions={activeFields}
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

      {/* Search & Sort Bar */}
      <div className="flex items-center gap-2 px-0.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
          <input
            type="text"
            placeholder="Cari artis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded bg-[#111319] border border-[#30363D] text-[#F0F6FC] text-xs placeholder-[#8B949E]/60 focus:outline-none focus:border-[#E5A93C] transition"
          />
        </div>

        {/* Sort Criterion Selector */}
        <select
          value={sortCriterion}
          onChange={(e) => setSortCriterion(e.target.value as 'rating' | 'role' | 'videos')}
          className="py-1.5 px-2 rounded bg-[#111319] border border-[#30363D] text-[#8B949E] text-xs focus:outline-none focus:border-[#E5A93C] transition cursor-pointer"
        >
          <option value="rating">Nilai Agregat</option>
          <option value="videos">Jml Video</option>
          <option value="role">Peran</option>
        </select>

        {/* Sort Order Toggle */}
        <button
          type="button"
          onClick={toggleSortOrder}
          className="p-1.5 rounded bg-[#111319] border border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] hover:border-[#8B949E]/40 transition cursor-pointer"
          title={sortOrder === 'desc' ? 'Urutan: Tinggi ke Rendah' : 'Urutan: Rendah ke Tinggi'}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List / Leaderboard */}
      {rankedArtists.length === 0 ? (
        <div className="text-center py-12 text-[#8B949E] text-xs">
          Tidak ada artis yang sesuai dengan filter.
        </div>
      ) : (
        <div className="space-y-1.5">
          {rankedArtists.map((artist, idx) => {
            const rank = idx + 1;
            const primaryRole = artist.textFields?.['Peran Utama'] || 'Aktor / Seniman Film';

            return (
              <div
                key={artist.id}
                onClick={() => onSelectArtist(artist.id)}
                className="flex items-center gap-3 p-2.5 rounded bg-[#111319] border border-[#30363D] hover:border-[#8B949E]/40 hover:bg-[#181B22] transition cursor-pointer group"
              >
                {/* Rank Position */}
                <div
                  className={`w-7 h-7 rounded flex items-center justify-center text-xs shrink-0 ${getRankBadgeStyle(
                    rank
                  )}`}
                >
                  #{rank}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded overflow-hidden bg-[#181B22] border border-[#30363D] shrink-0">
                  {artist.avatarUrl ? (
                    <img
                      src={artist.avatarUrl}
                      alt={artist.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#8B949E]">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-[#F0F6FC] truncate group-hover:text-[#E5A93C] transition">
                    {artist.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#8B949E]">
                    <span className="truncate">{primaryRole}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 shrink-0">
                      <Film className="w-2.5 h-2.5" />
                      {artist.videoCount} video
                    </span>
                  </div>
                </div>

                {/* Aggregated Rating Badge */}
                <div className="shrink-0 flex flex-col items-end">
                  <RatingBadge rating={artist.aggregatedRating || 0} size="sm" />
                  <span className="text-[9px] text-[#8B949E] mt-0.5">
                    {artist.totalPoints} poin
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
