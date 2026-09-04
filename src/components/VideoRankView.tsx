import React, { useState, useMemo, useEffect } from 'react';
import { Zap, ArrowUpDown, Film, Play, ExternalLink, Sparkles } from 'lucide-react';
import { Video, Artist, CustomFieldDefinition, FilterCriteria } from '../types';
import { RatingBadge } from './RatingBadge';
import { FilterBottomSheet } from './FilterBottomSheet';
import { DynamicRankFilterBar } from './DynamicRankFilterBar';
import { getStoredArtistFields } from '../utils/storage';
import {
  computeDynamicFilterSchemaForVideos,
  matchVideoAgainstDynamicFilter,
  useStorageRealtimeSync,
} from '../utils/dynamicFilterSchema';

interface VideoRankViewProps {
  videos: Video[];
  artists: Artist[];
  fieldDefinitions: CustomFieldDefinition[];
  artistFieldDefinitions?: CustomFieldDefinition[];
  onSelectVideo?: (video: Video) => void;
  onSelectArtist?: (artistId: string) => void;
  initialFieldId?: string | null;
  initialOption?: string | null;
}

export const VideoRankView: React.FC<VideoRankViewProps> = ({
  videos,
  artists,
  fieldDefinitions,
  artistFieldDefinitions,
  onSelectVideo,
  onSelectArtist,
  initialFieldId,
  initialOption,
}) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [sortCriterion, setSortCriterion] = useState<'rating' | 'title' | 'artist'>('rating');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(initialFieldId || null);
  const [selectedOption, setSelectedOption] = useState<string | null>(initialOption || null);

  // Real-time reactive storage listener
  const storageVersion = useStorageRealtimeSync();

  useEffect(() => {
    if (initialFieldId) {
      setActiveFieldId(initialFieldId);
      setSelectedOption(initialOption || null);
    }
  }, [initialFieldId, initialOption]);

  const [criteria, setCriteria] = useState<FilterCriteria>({
    searchQuery: '',
    sortOrder: 'desc',
    singleChoices: {},
    multiChoices: {},
    minRating: 0,
  });

  // Resolve artist custom fields from props or storage
  const currentArtistFields = useMemo(() => {
    if (artistFieldDefinitions && artistFieldDefinitions.length > 0) {
      return artistFieldDefinitions;
    }
    return getStoredArtistFields();
  }, [artistFieldDefinitions, storageVersion]);

  // Dynamic Filtering Schema with Auto-Pruning for Video Rank:
  // - Integrates custom Text & Number fields from "Struktur & Urutan Field Artis"
  // - Maps field names as Tab Titles, values from linked artists/video data as Filter Options
  // - Automatically prunes (hides) any field or option with null/empty records
  const { activeFields, dynamicOptionsByField } = useMemo(() => {
    return computeDynamicFilterSchemaForVideos(
      videos,
      artists,
      fieldDefinitions,
      currentArtistFields
    );
  }, [videos, artists, fieldDefinitions, currentArtistFields, storageVersion]);

  // Extract unique artist roles from all videos for quick role filter
  const availableVideoRoles = useMemo(() => {
    const roleMap = new Map<string, number>();
    videos.forEach((v) => {
      const rolesInVid = new Set<string>();
      if (v.artistRoles) {
        Object.values(v.artistRoles).forEach((r) => {
          const roleStr = typeof r === 'string' ? r : String(r || '');
          const trimmed = roleStr.trim();
          if (trimmed) rolesInVid.add(trimmed);
        });
      }
      if (v.artistIds && v.artistIds.length > 0 && rolesInVid.size === 0) {
        rolesInVid.add('Artis Utama');
      }

      rolesInVid.forEach((r) => {
        roleMap.set(r, (roleMap.get(r) || 0) + 1);
      });
    });
    return Array.from(roleMap.entries()).map(([role, count]) => ({ role, count }));
  }, [videos]);

  // Filter and sort videos
  const rankedVideos = useMemo(() => {
    return videos
      .filter((video) => {
        // Filter by selected artist role
        if (selectedRoleFilter !== 'all') {
          let hasMatchingRole = false;
          if (video.artistRoles) {
            hasMatchingRole = Object.values(video.artistRoles).some((r) => {
              const roleStr = typeof r === 'string' ? r : String(r || '');
              return roleStr.trim().toLowerCase() === selectedRoleFilter.toLowerCase();
            });
          }
          if (!hasMatchingRole && selectedRoleFilter.toLowerCase() === 'artis utama') {
            hasMatchingRole = (video.artistIds && video.artistIds.length > 0 && !video.artistRoles);
          }
          if (!hasMatchingRole) return false;
        }

        // Dynamic Quick Tab & Chip Filter (Feature 1) - matches video fields & linked artist fields
        if (activeFieldId && selectedOption) {
          const matched = matchVideoAgainstDynamicFilter(
            video,
            activeFieldId,
            selectedOption,
            activeFields,
            artists
          );
          if (!matched) return false;
        }

        // Min rating filter
        if (criteria.minRating && (video.overallRating || 0) < criteria.minRating) {
          return false;
        }

        // Single choice filter from bottom sheet
        for (const [fieldId, chosen] of Object.entries(criteria.singleChoices || {})) {
          if (chosen && video.singleChoices?.[fieldId] !== chosen) {
            return false;
          }
        }

        // Multi choice filter from bottom sheet
        for (const [fieldId, chosenList] of Object.entries(criteria.multiChoices || {})) {
          const list = chosenList as string[] | undefined;
          if (list && list.length > 0) {
            const vidTags = video.multiChoices?.[fieldId] || [];
            const hasMatch = list.some((tag) => vidTags.includes(tag));
            if (!hasMatch) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortCriterion === 'title') {
          const cmp = a.title.localeCompare(b.title);
          return sortOrder === 'desc' ? -cmp : cmp;
        }

        if (sortCriterion === 'artist') {
          const aArtist = artists.find((art) => a.artistIds?.includes(art.id))?.name || '';
          const bArtist = artists.find((art) => b.artistIds?.includes(art.id))?.name || '';
          const cmp = aArtist.localeCompare(bArtist);
          return sortOrder === 'desc' ? -cmp : cmp;
        }

        const ratingA = a.overallRating || 0;
        const ratingB = b.overallRating || 0;
        return sortOrder === 'desc' ? ratingB - ratingA : ratingA - ratingB;
      });
  }, [
    videos,
    criteria,
    sortOrder,
    sortCriterion,
    selectedRoleFilter,
    activeFieldId,
    selectedOption,
    activeFields,
    artists,
  ]);

  const multiChoiceCount = Object.values(criteria.multiChoices || {}).reduce<number>(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0
  );

  const activeFilterCount =
    Object.values(criteria.singleChoices || {}).filter(Boolean).length +
    multiChoiceCount +
    (criteria.minRating && criteria.minRating > 0 ? 1 : 0);

  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return 'bg-[#E5A93C] text-[#0D1117] font-bold border border-[#E5A93C]';
    if (rank === 2) return 'bg-[#C9D1D9] text-[#0D1117] font-bold border border-[#8B949E]';
    if (rank === 3) return 'bg-[#8B5E3C] text-[#F0F6FC] font-bold border border-[#A26D45]';
    return 'bg-[#181B22] text-[#8B949E] border border-[#30363D] font-mono';
  };

  return (
    <div id="video-rank-view" className="space-y-3 pb-24 animate-in fade-in font-mono">
      {/* Top Header / Filter Bar */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#F0F6FC] tracking-tight">Peringkat Video</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#181B22] border border-[#30363D] text-[#E5A93C]">
            {rankedVideos.length}
          </span>
        </div>

        <button
          onClick={() => setIsFilterOpen(true)}
          className={`px-2 py-1 rounded border text-xs transition active:scale-95 flex items-center gap-1 cursor-pointer ${
            activeFilterCount > 0
              ? 'bg-[#E5A93C] text-[#0D1117] border-[#E5A93C] font-bold'
              : 'bg-[#181B22] border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC]'
          }`}
          title="Buka Filter Kategori"
        >
          <Zap className="w-3 h-3 fill-current" />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="w-3.5 h-3.5 rounded-full bg-[#0D1117] text-[#E5A93C] text-[9px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
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

      {/* Filter Peran / Peran Utama */}
      {availableVideoRoles.length > 0 && (
        <div className="space-y-1 px-0.5">
          <div className="flex items-center gap-1 text-[10px] text-[#8B949E]">
            <Sparkles className="w-3 h-3 text-[#E5A93C]" />
            <span>Peran Artis:</span>
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
              Semua ({videos.length})
            </button>
            {availableVideoRoles.map(({ role, count }) => (
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

      {/* Sort Toggle & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 p-1.5 rounded-md bg-[#181B22] border border-[#30363D] text-xs">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#8B949E]">Urut:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSortCriterion('rating')}
              className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                sortCriterion === 'rating'
                  ? 'bg-[#212631] text-[#E5A93C] border border-[#30363D]'
                  : 'text-[#8B949E] hover:text-[#F0F6FC]'
              }`}
            >
              Rating
            </button>
            <button
              type="button"
              onClick={() => setSortCriterion('title')}
              className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                sortCriterion === 'title'
                  ? 'bg-[#212631] text-[#E5A93C] border border-[#30363D]'
                  : 'text-[#8B949E] hover:text-[#F0F6FC]'
              }`}
            >
              Judul
            </button>
            <button
              type="button"
              onClick={() => setSortCriterion('artist')}
              className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                sortCriterion === 'artist'
                  ? 'bg-[#212631] text-[#E5A93C] border border-[#30363D]'
                  : 'text-[#8B949E] hover:text-[#F0F6FC]'
              }`}
            >
              Artis
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
          className="p-1 rounded hover:bg-[#212631] text-[#8B949E] hover:text-[#F0F6FC] transition flex items-center gap-1 text-[11px] cursor-pointer"
          title={sortOrder === 'desc' ? 'Urutan: Tinggi ke Rendah' : 'Urutan: Rendah ke Tinggi'}
        >
          <ArrowUpDown className="w-3 h-3" />
          <span>{sortOrder === 'desc' ? 'Turun' : 'Naik'}</span>
        </button>
      </div>

      {/* List / Leaderboard */}
      {rankedVideos.length === 0 ? (
        <div className="text-center py-12 text-[#8B949E] text-xs">
          Tidak ada video yang sesuai dengan kriteria filter.
        </div>
      ) : (
        <div className="space-y-1.5">
          {rankedVideos.map((video, idx) => {
            const rank = idx + 1;
            const primaryArtistId = video.artistIds?.[0];
            const primaryArtist = artists.find((a) => a.id === primaryArtistId);

            // Find artist role
            let artistRoleDisplay = '';
            if (video.artistRoles && primaryArtistId && video.artistRoles[primaryArtistId]) {
              artistRoleDisplay = video.artistRoles[primaryArtistId];
            } else if (primaryArtist?.textFields?.['Peran Utama']) {
              artistRoleDisplay = primaryArtist.textFields['Peran Utama'];
            }

            return (
              <div
                key={video.id}
                onClick={() => onSelectVideo && onSelectVideo(video)}
                className="flex items-center gap-2.5 p-2 rounded bg-[#111319] border border-[#30363D] hover:border-[#8B949E]/40 hover:bg-[#181B22] transition cursor-pointer group"
              >
                {/* Rank Position */}
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs shrink-0 ${getRankBadgeStyle(
                    rank
                  )}`}
                >
                  #{rank}
                </div>

                {/* Thumbnail */}
                <div className="w-14 h-9 rounded overflow-hidden bg-[#181B22] border border-[#30363D] shrink-0 relative">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#8B949E]">
                      <Film className="w-4 h-4" />
                    </div>
                  )}
                  {video.url && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-[#F0F6FC] truncate group-hover:text-[#E5A93C] transition">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#8B949E]">
                    {primaryArtist && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectArtist) onSelectArtist(primaryArtist.id);
                        }}
                        className="text-[#E5A93C] hover:underline truncate cursor-pointer"
                      >
                        {primaryArtist.name}
                      </span>
                    )}
                    {artistRoleDisplay && (
                      <>
                        <span>•</span>
                        <span className="truncate">{artistRoleDisplay}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Rating Badge */}
                <div className="shrink-0 flex items-center gap-2">
                  <RatingBadge rating={video.overallRating || 0} size="sm" />
                  {video.url && (
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#212631] transition"
                      title="Buka Tautan Video"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Sheet Filter */}
      <FilterBottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        fieldDefinitions={fieldDefinitions}
        criteria={criteria}
        onChangeCriteria={setCriteria}
        totalResults={rankedVideos.length}
      />
    </div>
  );
};
