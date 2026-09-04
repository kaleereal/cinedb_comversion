import React, { useState, useMemo, useEffect } from 'react';
import { Zap, ArrowUpDown, Film, Play, ExternalLink, Sparkles } from 'lucide-react';
import { Video, Artist, CustomFieldDefinition, FilterCriteria } from '../types';
import { RatingBadge } from './RatingBadge';
import { FilterBottomSheet } from './FilterBottomSheet';
import { DynamicRankFilterBar } from './DynamicRankFilterBar';

interface VideoRankViewProps {
  videos: Video[];
  artists: Artist[];
  fieldDefinitions: CustomFieldDefinition[];
  onSelectVideo?: (video: Video) => void;
  onSelectArtist?: (artistId: string) => void;
  initialFieldId?: string | null;
  initialOption?: string | null;
}

export const VideoRankView: React.FC<VideoRankViewProps> = ({
  videos,
  artists,
  fieldDefinitions,
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

  // Extract unique artist roles from all videos
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

  // Extract any dynamic options present in data
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

        // Dynamic Quick Tab & Chip Filter (Feature 1)
        if (activeFieldId && selectedOption) {
          const fieldDef = fieldDefinitions.find((f) => f.id === activeFieldId);
          if (fieldDef?.type === 'single_choice') {
            if (video.singleChoices?.[activeFieldId] !== selectedOption) {
              return false;
            }
          } else if (fieldDef?.type === 'multi_choice') {
            const tags = video.multiChoices?.[activeFieldId] || [];
            if (!tags.includes(selectedOption)) {
              return false;
            }
          }
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
  }, [videos, criteria, sortOrder, sortCriterion, selectedRoleFilter, activeFieldId, selectedOption, fieldDefinitions, artists]);

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

      {/* Dynamic Filtering Tabs & Chips */}
      <DynamicRankFilterBar
        fieldDefinitions={fieldDefinitions}
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
              className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer ${
                sortCriterion === 'rating'
                  ? 'bg-[#212631] text-[#E5A93C] border border-[#30363D]'
                  : 'bg-[#111319] text-[#8B949E] hover:text-[#F0F6FC]'
              }`}
            >
              Skor
            </button>
            <button
              type="button"
              onClick={() => setSortCriterion('title')}
              className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer ${
                sortCriterion === 'title'
                  ? 'bg-[#212631] text-[#E5A93C] border border-[#30363D]'
                  : 'bg-[#111319] text-[#8B949E] hover:text-[#F0F6FC]'
              }`}
            >
              Judul
            </button>
            <button
              type="button"
              onClick={() => setSortCriterion('artist')}
              className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer ${
                sortCriterion === 'artist'
                  ? 'bg-[#212631] text-[#E5A93C] border border-[#30363D]'
                  : 'bg-[#111319] text-[#8B949E] hover:text-[#F0F6FC]'
              }`}
            >
              Artis
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

      {/* Leaderboard List */}
      {rankedVideos.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-md bg-[#181B22] border border-[#30363D]">
          <Film className="w-7 h-7 text-[#57606A] mx-auto mb-1.5" />
          <p className="text-xs text-[#F0F6FC]">Tidak ada video yang cocok</p>
          <p className="text-[10px] text-[#8B949E] mt-0.5">Coba sesuaikan atau reset filter kategori.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {rankedVideos.map((video, index) => {
            const rank = index + 1;
            const thumb =
              video.metadata?.thumbnailUrl ||
              'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80';

            const videoArtists = artists.filter(
              (a) => video.artistIds && video.artistIds.includes(a.id)
            );

            return (
              <div
                key={video.id}
                onClick={() => onSelectVideo && onSelectVideo(video)}
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

                {/* Thumbnail */}
                <div className="relative w-14 aspect-video rounded overflow-hidden bg-[#0F1117] shrink-0 border border-[#30363D]">
                  <img
                    src={thumb}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>

                {/* Judul & Artis */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-sans font-medium text-[#F0F6FC] truncate group-hover:text-[#E5A93C] transition">
                    {video.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1 text-[10px] text-[#8B949E] mt-0.5 truncate font-mono">
                    {videoArtists.length > 0 ? (
                      videoArtists.map((a, i) => {
                        const role = video.artistRoles?.[a.id] || a.textFields?.['Peran Utama'] || 'Artis Utama';
                        return (
                          <span key={a.id} className="truncate inline-flex items-center gap-0.5">
                            <span className="text-[#C9D1D9]">{a.name}</span>
                            <span className="text-[#E5A93C] text-[9px]">({role})</span>
                            {i < videoArtists.length - 1 ? <span className="text-[#57606A] mr-0.5">,</span> : null}
                          </span>
                        );
                      })
                    ) : (
                      <span>{video.metadata?.domain || 'Video'}</span>
                    )}
                  </div>
                </div>

                {/* Skor Rating */}
                <div className="shrink-0 text-right">
                  <RatingBadge score={video.overallRating} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        criteria={criteria}
        onApply={(newCrit) => setCriteria(newCrit)}
        fieldDefinitions={fieldDefinitions}
      />
    </div>
  );
};
