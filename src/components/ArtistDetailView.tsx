import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Edit,
  ExternalLink,
  Film,
  User,
  Star,
  Globe,
  Tags,
  X,
  ZoomIn,
  Trophy,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
  TrendingUp,
  ArrowUpDown,
  Calendar,
  Award,
  LayoutGrid,
  List as ListIcon,
} from 'lucide-react';
import { Artist, Video, CustomFieldDefinition, VideoArtistPivot } from '../types';
import {
  calculateArtistAggregatedRating,
  getArtistTagRankDetail,
  getStoredArtists,
  getStoredVideos,
  getStoredPivots,
  getStoredRoleWeights,
  recalculateAllVideoPivots,
  getStoredGalleryNotes,
  saveGalleryNotes,
} from '../utils/storage';
import { GalleryNoteModal } from './GalleryNoteModal';
import { GalleryNote } from '../types';
import { RatingBadge } from './RatingBadge';

interface ArtistDetailViewProps {
  artist: Artist;
  videos: Video[];
  fieldDefinitions?: CustomFieldDefinition[];
  allArtists?: Artist[];
  pivots?: VideoArtistPivot[];
  onBack: () => void;
  onEditArtist: (artist: Artist) => void;
  onDeleteArtist?: (artist: Artist) => void;
  onSelectVideo?: (video: Video) => void;
  onSelectFilterTag?: (fieldId: string, option: string) => void;
  onFilterByRole?: (role: string) => void;
  onNavigateToArtistRank?: () => void;
  onNavigateToVideoRank?: () => void;
}

export const ArtistDetailView: React.FC<ArtistDetailViewProps> = ({
  artist,
  videos,
  fieldDefinitions = [],
  allArtists = [],
  pivots = [],
  onBack,
  onEditArtist,
  onDeleteArtist,
  onSelectVideo,
  onSelectFilterTag,
  onFilterByRole,
  onNavigateToArtistRank,
  onNavigateToVideoRank,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'videos' | 'performance' | 'notes'>('videos');
  const [videoListMode, setVideoListMode] = useState<'grid' | 'list'>('grid');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isFootnoteOpen, setIsFootnoteOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isAtributTerkaitOpen, setIsAtributTerkaitOpen] = useState(true);
  const [isTrenPerformaOpen, setIsTrenPerformaOpen] = useState(true);
  const [readingNote, setReadingNote] = useState<GalleryNote | null>(null);

  // Sorting state for Performance Table
  const [perfSortKey, setPerfSortKey] = useState<'performance' | 'score' | 'release' | 'title'>('performance');
  const [perfSortOrder, setPerfSortOrder] = useState<'desc' | 'asc'>('desc');

  // Fallback ke penyimpanan jika prop kosong
  const effectiveVideos = useMemo(
    () => (videos && videos.length > 0 ? videos : getStoredVideos()),
    [videos]
  );
  const effectiveArtists = useMemo(
    () => (allArtists && allArtists.length > 0 ? allArtists : getStoredArtists()),
    [allArtists]
  );

  // Filter linked videos
  const linkedVideos = useMemo(
    () => effectiveVideos.filter((v) => v.artistIds && v.artistIds.includes(artist.id)),
    [effectiveVideos, artist.id]
  );
  const { rating: aggregatedRating, videoCount } = calculateArtistAggregatedRating(
    artist.id,
    effectiveVideos
  );

  // Effective pivots (otomatis hitung jika belum ada snapshot tersimpan)
  const effectivePivots = useMemo(() => {
    if (pivots && pivots.length > 0) return pivots;
    const stored = getStoredPivots();
    if (stored && stored.length > 0) return stored;
    const weights = getStoredRoleWeights();
    const { updatedPivots } = recalculateAllVideoPivots(effectiveVideos, weights, []);
    return updatedPivots;
  }, [pivots, effectiveVideos]);

  const roleWeights = useMemo(() => getStoredRoleWeights(), []);

  // Rating Artis: Rata-rata nilai yang didapatkan artis dari semua video tertaut
  // berdasarkan aturan relasi nilai & bobot peran.
  const {
    rating: artistRating,
    totalPoints: totalPivotScore,
    videoOverallAverage: rawVideoAverage,
    videoScores,
  } = useMemo(() => {
    return calculateArtistAggregatedRating(
      artist.id,
      effectiveVideos,
      roleWeights,
      effectivePivots
    );
  }, [artist.id, effectiveVideos, roleWeights, effectivePivots]);

  // Dynamic Aggregated Attributes (Real-time aggregation query from linked videos)
  const dynamicAggregatedAttributes = useMemo(() => {
    // Only target choice fields (multi_choice & single_choice) from Master Settings
    const choiceFields = fieldDefinitions.filter(
      (f) => f.type === 'single_choice' || f.type === 'multi_choice'
    );

    const groups: {
      fieldId: string;
      fieldLabel: string;
      fieldType: string;
      values: string[];
    }[] = [];

    for (const field of choiceFields) {
      const valueSet = new Set<string>();

      for (const vid of linkedVideos) {
        if (field.type === 'single_choice') {
          const val = vid.singleChoices?.[field.id];
          if (val && typeof val === 'string' && val.trim()) {
            valueSet.add(val.trim());
          }
        } else if (field.type === 'multi_choice') {
          const list = vid.multiChoices?.[field.id];
          if (Array.isArray(list)) {
            for (const item of list) {
              if (item && typeof item === 'string' && item.trim()) {
                valueSet.add(item.trim());
              }
            }
          }
        }
      }

      if (valueSet.size > 0) {
        groups.push({
          fieldId: field.id,
          fieldLabel: field.label,
          fieldType: field.type,
          values: Array.from(valueSet).sort(),
        });
      }
    }

    return groups;
  }, [fieldDefinitions, linkedVideos]);

  // Collapsible Footnote descriptions for choice items (Req 7)
  const footnoteItems = useMemo(() => {
    const items: {
      fieldLabel: string;
      optionName: string;
      description: string;
    }[] = [];

    for (const group of dynamicAggregatedAttributes) {
      const fieldDef = fieldDefinitions.find((f) => f.id === group.fieldId);
      if (!fieldDef || !fieldDef.optionDescriptions) continue;

      for (const val of group.values) {
        const desc = fieldDef.optionDescriptions[val];
        if (desc && desc.trim()) {
          items.push({
            fieldLabel: group.fieldLabel,
            optionName: val,
            description: desc.trim(),
          });
        }
      }
    }

    return items;
  }, [dynamicAggregatedAttributes, fieldDefinitions]);

  // Calculate Artist Rank in Peran Utama based on aggregated ratings
  const mainRoleRankDetail = useMemo(() => {
    const mainRole = artist.textFields?.['Peran Utama']?.trim();
    if (!mainRole) return null;

    const sameRoleArtists = effectiveArtists.filter(
      (a) => (a.textFields?.['Peran Utama'] || '').trim().toLowerCase() === mainRole.toLowerCase()
    );

    if (sameRoleArtists.length === 0) return null;

    const artistScores = sameRoleArtists.map((art) => {
      const { rating, videoCount: count, totalPoints } = calculateArtistAggregatedRating(
        art.id,
        effectiveVideos,
        roleWeights,
        effectivePivots
      );
      return {
        id: art.id,
        rating: rating ?? 0,
        count,
        totalPoints,
      };
    });

    artistScores.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.count !== a.count) return b.count - a.count;
      return b.totalPoints - a.totalPoints;
    });

    const index = artistScores.findIndex((a) => a.id === artist.id);
    if (index === -1) return null;

    return {
      rank: index + 1,
      total: sameRoleArtists.length,
      roleName: mainRole,
    };
  }, [artist, effectiveArtists, effectiveVideos, roleWeights, effectivePivots]);

  // Overall Rating Rank among all artists
  const overallRatingRankDetail = useMemo(() => {
    if (effectiveArtists.length === 0) return null;

    const scores = effectiveArtists.map((art) => {
      const { rating, videoCount: count, totalPoints } = calculateArtistAggregatedRating(
        art.id,
        effectiveVideos,
        roleWeights,
        effectivePivots
      );
      return { id: art.id, rating: rating ?? 0, count, totalPoints };
    });

    scores.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.count !== a.count) return b.count - a.count;
      return b.totalPoints - a.totalPoints;
    });

    const index = scores.findIndex((a) => a.id === artist.id);
    if (index === -1) return null;

    return {
      rank: index + 1,
      total: effectiveArtists.length,
    };
  }, [artist.id, effectiveArtists, effectiveVideos, roleWeights, effectivePivots]);

  // Video Average Rank among all artists
  const videoAverageRankDetail = useMemo(() => {
    if (effectiveArtists.length === 0) return null;

    const scores = effectiveArtists.map((art) => {
      const { videoOverallAverage, videoCount: count, totalPoints } = calculateArtistAggregatedRating(
        art.id,
        effectiveVideos,
        roleWeights,
        effectivePivots
      );
      return { id: art.id, avg: videoOverallAverage ?? 0, count, totalPoints };
    });

    scores.sort((a, b) => {
      if (b.avg !== a.avg) return b.avg - a.avg;
      if (b.count !== a.count) return b.count - a.count;
      return b.totalPoints - a.totalPoints;
    });

    const index = scores.findIndex((a) => a.id === artist.id);
    if (index === -1) return null;

    return {
      rank: index + 1,
      total: effectiveArtists.length,
    };
  }, [artist.id, effectiveArtists, effectiveVideos, roleWeights, effectivePivots]);

  // Calculate Artist Age automatically from birthMonthYear (Poin 5A.3)
  const artistAge = useMemo(() => {
    if (!artist.birthMonthYear) return null;
    const [yearStr, monthStr] = artist.birthMonthYear.split('-');
    const birthYear = parseInt(yearStr, 10);
    const birthMonth = parseInt(monthStr, 10);

    if (isNaN(birthYear) || isNaN(birthMonth)) return null;

    const today = new Date();
    let age = today.getFullYear() - birthYear;
    if (today.getMonth() + 1 < birthMonth) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [artist.birthMonthYear]);

  // Performance Table List sorted dynamically
  const sortedPerformanceList = useMemo(() => {
    const list = linkedVideos.map((vid) => {
      const scoreInfo = videoScores?.find((vs) => vs.videoId === vid.id);
      const roleName = scoreInfo?.roleName || vid.artistRoles?.[artist.id] || 'Artis Utama';
      const performance = scoreInfo?.performance ?? scoreInfo?.weight ?? 100;
      const scoreObtained = scoreInfo?.scoreObtained ?? vid.overallRating;

      // Collaborator names in video
      const collaborators = (vid.artistIds || [])
        .filter((id) => id !== artist.id)
        .map((id) => effectiveArtists.find((a) => a.id === id)?.name)
        .filter(Boolean) as string[];

      return {
        video: vid,
        roleName,
        performance,
        scoreObtained,
        collaborators,
        releaseDate: vid.releaseDate || vid.createdAt,
      };
    });

    list.sort((a, b) => {
      let diff = 0;
      if (perfSortKey === 'performance') diff = b.performance - a.performance;
      else if (perfSortKey === 'score') diff = b.scoreObtained - a.scoreObtained;
      else if (perfSortKey === 'release') diff = new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
      else if (perfSortKey === 'title') diff = a.video.title.localeCompare(b.video.title);

      return perfSortOrder === 'desc' ? diff : -diff;
    });

    return list;
  }, [linkedVideos, videoScores, artist.id, effectiveArtists, perfSortKey, perfSortOrder]);

  // Linked Gallery Notes for this Artist (Poin 2)
  const linkedGalleryNotes = useMemo(() => {
    const allNotes = getStoredGalleryNotes();
    return allNotes.filter((note) => {
      if (note.linkedArtistIds?.includes(artist.id)) return true;
      if (artist.galleryNoteIds?.includes(note.id)) return true;
      return false;
    });
  }, [artist.id, artist.galleryNoteIds]);

  const coverUrl =
    artist.coverUrl ||
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1000&auto=format&fit=crop&q=80';

  return (
    <div id="artist-detail-view" className="space-y-3 pb-24 animate-in fade-in">
      {/* Top Bar with Back Button and Edit / Delete */}
      <div className="flex items-center justify-between px-0.5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#181B22] border border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC] text-xs font-mono active:scale-95 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>

        <div className="flex items-center gap-1.5">
          {onDeleteArtist && (
            <button
              onClick={() => onDeleteArtist(artist)}
              className="p-1.5 rounded-md bg-[#181B22] hover:bg-rose-950/60 border border-[#30363D] hover:border-rose-800 text-[#8B949E] hover:text-rose-300 text-xs transition cursor-pointer"
              title="Hapus Profil Artis"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => onEditArtist(artist)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#212631] border border-[#30363D] hover:border-[#E5A93C]/60 text-[#E5A93C] text-xs font-mono active:scale-95 transition cursor-pointer"
          >
            <Edit className="w-3 h-3" />
            <span>Edit Profil</span>
          </button>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="relative rounded-md overflow-hidden bg-[#181B22] border border-[#30363D] shadow-sm">
        {/* Compact Cover Banner */}
        <div className="relative h-28 w-full bg-[#0F1117] overflow-hidden">
          <img
            src={coverUrl}
            alt="Cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1000&auto=format&fit=crop&q=80';
            }}
            className="w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181B22] via-[#181B22]/40 to-transparent" />
        </div>

        {/* Profile Avatar Centered Overlapping Cover */}
        <div className="relative px-4 pb-4 -mt-10 flex flex-col items-center text-center">
          <div className="relative">
            <img
              src={artist.avatarUrl}
              alt={artist.name}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full object-cover ring-2 ring-[#181B22] shadow-md bg-[#212631]"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80';
              }}
            />
          </div>

          <h1 className="mt-2 text-base sm:text-lg font-bold text-[#F0F6FC] tracking-tight">
            {artist.name}
          </h1>

          {/* Age & Peran Utama Dynamic Filter Trigger */}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
            {artist.textFields?.['Peran Utama'] && (
              <button
                type="button"
                onClick={() => onFilterByRole && onFilterByRole(artist.textFields['Peran Utama'])}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#212631] hover:bg-[#2A303C] border border-[#30363D] text-[10px] font-mono text-[#E5A93C] transition cursor-pointer"
                title="Filter Peran Utama"
              >
                <span>{artist.textFields['Peran Utama']}</span>
                {mainRoleRankDetail && (
                  <span className="text-[9px] font-mono text-[#F0F6FC] bg-[#111319] px-1 rounded border border-[#30363D] flex items-center gap-0.5">
                    <Trophy className="w-2.5 h-2.5 text-[#E5A93C]" />
                    #{mainRoleRankDetail.rank}
                  </span>
                )}
              </button>
            )}

            {artistAge !== null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#111319] border border-[#30363D] text-[10px] font-mono text-[#8B949E]">
                <Calendar className="w-2.5 h-2.5 text-[#E5A93C]" />
                <span>{artistAge} Thn</span>
              </span>
            )}
          </div>

          {/* 3 Summary Cards (Rating, Rata-rata Video, Total Video) */}
          <div className="mt-3 p-2.5 w-full rounded bg-[#111319] border border-[#30363D]/70 grid grid-cols-3 divide-x divide-[#30363D]/70 font-mono">
            {/* Rating Card */}
            <div
              onClick={() => onNavigateToArtistRank && onNavigateToArtistRank()}
              className="flex flex-col items-center px-1 text-center cursor-pointer hover:bg-[#181B22] rounded transition py-0.5 group"
              title="Lihat Halaman Rank Artis"
            >
              <span className="text-[9px] uppercase tracking-wider text-[#8B949E] group-hover:text-[#E5A93C]">
                Rating Artis ➔
              </span>
              <div className="mt-0.5 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-[#E5A93C] fill-[#E5A93C]" />
                <span className="text-base font-bold text-[#E5A93C]">
                  {artistRating > 0
                    ? Number.isInteger(artistRating)
                      ? artistRating
                      : artistRating.toFixed(1)
                    : '-'}
                </span>
              </div>
              <span className="text-[9px] text-[#8B949E] mt-0.5">
                {overallRatingRankDetail ? `Peringkat #${overallRatingRankDetail.rank}` : '-'}
              </span>
            </div>

            {/* Rata-rata Video Card */}
            <div
              onClick={() => onNavigateToVideoRank && onNavigateToVideoRank()}
              className="flex flex-col items-center px-1 text-center cursor-pointer hover:bg-[#181B22] rounded transition py-0.5 group"
              title="Lihat Halaman Rank Video"
            >
              <span className="text-[9px] uppercase tracking-wider text-[#8B949E] group-hover:text-[#388BFD]">
                Rata Video ➔
              </span>
              <div className="mt-0.5 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span className="text-base font-bold text-emerald-300">
                  {rawVideoAverage > 0
                    ? Number.isInteger(rawVideoAverage)
                      ? rawVideoAverage
                      : rawVideoAverage.toFixed(1)
                    : '-'}
                </span>
              </div>
              <span className="text-[9px] text-[#8B949E] mt-0.5">
                {videoAverageRankDetail ? `Peringkat #${videoAverageRankDetail.rank}` : '-'}
              </span>
            </div>

            {/* Total Video Card */}
            <div className="flex flex-col items-center px-1 text-center py-0.5">
              <span className="text-[9px] uppercase tracking-wider text-[#8B949E]">
                Total Video
              </span>
              <div className="mt-0.5 flex items-center gap-1">
                <Film className="w-3.5 h-3.5 text-[#8B949E]" />
                <span className="text-base font-bold text-[#F0F6FC]">{videoCount}</span>
              </div>
              <span className="text-[9px] text-[#57606A] mt-0.5">
                Karya
              </span>
            </div>
          </div>

          {/* Dynamic Aggregated Attributes (Real-time Tag Heritage from Linked Videos) - Collapsible Accordion */}
          <div className="mt-2.5 w-full rounded-md bg-[#111319] border border-[#30363D]/70 text-left overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAtributTerkaitOpen(!isAtributTerkaitOpen)}
              className="w-full flex items-center justify-between p-2.5 bg-[#181B22]/60 hover:bg-[#212631] transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-1.5">
                <Tags className="w-3.5 h-3.5 text-[#E5A93C]" />
                <span className="text-[9px] uppercase tracking-wider text-[#8B949E] font-mono font-bold">
                  Atribut Terkait (Warisan Video)
                </span>
                <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-[#212631] text-[#E5A93C] border border-[#30363D] ml-1">
                  Real-time
                </span>
              </div>
              <div className="flex items-center gap-1 text-[#8B949E] text-xs font-mono">
                <span>{isAtributTerkaitOpen ? 'Tutup' : 'Buka'}</span>
                {isAtributTerkaitOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            {isAtributTerkaitOpen && (
              <div className="p-2.5 pt-1.5 border-t border-[#30363D]/50 space-y-2 animate-in fade-in">
                {dynamicAggregatedAttributes.length === 0 ? (
                  <p className="text-[10px] font-mono text-[#57606A] italic">
                    {linkedVideos.length === 0
                      ? 'Belum ada video tertaut untuk akumulasi atribut.'
                      : 'Video tertaut belum memilih opsi tag/kategori.'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {dynamicAggregatedAttributes.map((group) => (
                      <div key={group.fieldId} className="space-y-1">
                        <span className="text-[9px] font-mono text-[#8B949E] uppercase">
                          {group.fieldLabel}:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {group.values.map((val) => {
                            const rankDetail = getArtistTagRankDetail(
                              artist.id,
                              group.fieldId,
                              val,
                              effectiveArtists,
                              effectiveVideos,
                              effectivePivots
                            );
                            const rank = rankDetail ? rankDetail.rank : null;
                            const total = rankDetail ? rankDetail.total : null;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => onSelectFilterTag?.(group.fieldId, val)}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181B22] hover:bg-[#212631] border border-[#30363D] hover:border-[#E5A93C]/50 text-[#F0F6FC] transition flex items-center gap-1 active:scale-95 cursor-pointer"
                              >
                                <Trophy className="w-2.5 h-2.5 text-[#E5A93C]" />
                                <span>{val}</span>
                                <span className="text-[9px] text-[#E5A93C] bg-[#212631] px-1 rounded border border-[#30363D]">
                                  {rank
                                    ? `#${rank}${total && total > 1 ? `/${total}` : ''}`
                                    : '➔'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SEKSI BARU: TREN PERFORMA ARTIS - Collapsible Accordion */}
          <div className="mt-2.5 w-full rounded-md bg-[#111319] border border-[#30363D]/70 text-left overflow-hidden font-mono">
            <button
              type="button"
              onClick={() => setIsTrenPerformaOpen(!isTrenPerformaOpen)}
              className="w-full flex items-center justify-between p-2.5 bg-[#181B22]/60 hover:bg-[#212631] transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#E5A93C]" />
                <span className="text-[10px] uppercase tracking-wider text-[#8B949E] font-bold">
                  Tren Performa Artis
                </span>
                <span className="text-[8px] px-1.5 py-0.2 rounded bg-[#212631] text-[#E5A93C] border border-[#30363D] ml-1">
                  Kronologis
                </span>
              </div>
              <div className="flex items-center gap-1 text-[#8B949E] text-xs font-mono">
                <span>{isTrenPerformaOpen ? 'Tutup' : 'Buka'}</span>
                {isTrenPerformaOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            {isTrenPerformaOpen && (
              <div className="p-3 pt-2 border-t border-[#30363D]/50 space-y-3 animate-in fade-in">
                {(() => {
              // Get chronological list of video performance scores
              const chronologicalEntries = [...linkedVideos]
                .sort((a, b) => new Date(a.releaseDate || a.createdAt).getTime() - new Date(b.releaseDate || b.createdAt).getTime())
                .map((vid) => {
                  const scoreInfo = videoScores?.find((vs) => vs.videoId === vid.id);
                  const performance = scoreInfo?.performance ?? scoreInfo?.weight ?? 100;
                  const obtained = scoreInfo?.scoreObtained ?? vid.overallRating;
                  return {
                    id: vid.id,
                    title: vid.title,
                    date: vid.releaseDate || vid.createdAt.slice(0, 10),
                    performance,
                    obtained,
                  };
                });

              if (chronologicalEntries.length === 0) {
                return (
                  <p className="text-[10px] text-[#57606A] italic">
                    Belum ada entri video tertaut untuk menggambarkan tren performa.
                  </p>
                );
              }

              const scores = chronologicalEntries.map((e) => e.obtained);
              const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
              const maxScore = Math.max(...scores);
              const minScore = Math.min(...scores);

              // Calculate trend badge compared to previous entry
              const lastScore = scores[scores.length - 1];
              const prevScore = scores.length > 1 ? scores[scores.length - 2] : lastScore;
              const diff = Math.round((lastScore - prevScore) * 10) / 10;
              const isUp = diff >= 0;

              // Sparkline SVG Coordinates calculation
              const width = 300;
              const height = 60;
              const padding = 10;
              const minVal = Math.min(0, Math.min(...scores) - 10);
              const maxVal = Math.max(100, Math.max(...scores) + 5);

              const points = chronologicalEntries.map((entry, idx) => {
                const x =
                  chronologicalEntries.length === 1
                    ? width / 2
                    : padding + (idx / (chronologicalEntries.length - 1)) * (width - padding * 2);
                const y = height - padding - ((entry.obtained - minVal) / (maxVal - minVal)) * (height - padding * 2);
                return { x, y, val: entry.obtained, title: entry.title };
              });

              const pathD =
                points.length === 1
                  ? `M ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y}`
                  : points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');

              return (
                <div className="space-y-3">
                  {/* Summary Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded bg-[#181B22] border border-[#30363D]">
                      <span className="text-[8px] uppercase text-[#8B949E] block">Rata-Rata</span>
                      <span className="text-xs font-bold text-[#E5A93C]">{avgScore}</span>
                    </div>
                    <div className="p-2 rounded bg-[#181B22] border border-[#30363D]">
                      <span className="text-[8px] uppercase text-[#8B949E] block">Tertinggi</span>
                      <span className="text-xs font-bold text-emerald-400">{maxScore}</span>
                    </div>
                    <div className="p-2 rounded bg-[#181B22] border border-[#30363D]">
                      <span className="text-[8px] uppercase text-[#8B949E] block">Terendah</span>
                      <span className="text-xs font-bold text-rose-400">{minScore}</span>
                    </div>
                    <div className="p-2 rounded bg-[#181B22] border border-[#30363D]">
                      <span className="text-[8px] uppercase text-[#8B949E] block">Indikator Tren</span>
                      <div className="flex items-center justify-center gap-0.5 mt-0.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                            isUp
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                              : 'bg-rose-950/60 text-rose-400 border-rose-800/80'
                          }`}
                        >
                          {isUp ? `▲ +${diff}` : `▼ ${diff}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Line Chart / Sparkline Graph */}
                  <div className="p-2.5 rounded bg-[#181B22] border border-[#30363D] space-y-1.5">
                    <span className="text-[9px] text-[#8B949E] block">
                      Grafik Dinamika Performa ({chronologicalEntries.length} Karya)
                    </span>
                    <div className="w-full overflow-x-auto">
                      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16 overflow-visible">
                        {/* Background Grid Lines */}
                        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#30363D" strokeDasharray="2 2" strokeWidth="0.5" />
                        {/* Sparkline Path */}
                        <path d={pathD} fill="none" stroke="#E5A93C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Sparkline Data Points */}
                        {points.map((p, i) => (
                          <g key={i} className="group/pt cursor-pointer">
                            <circle cx={p.x} cy={p.y} r="3" fill="#111319" stroke="#E5A93C" strokeWidth="2" />
                            <title>{`${p.title}: ${p.val}`}</title>
                          </g>
                        ))}
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Switcher: "Video Terkait" | "Performa" | "Profil" */}
      <div className="flex rounded-md bg-[#181B22] p-0.5 border border-[#30363D]">
        <button
          onClick={() => setActiveSubTab('videos')}
          className={`flex-1 min-h-[34px] rounded text-xs font-mono transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'videos'
              ? 'bg-[#212631] text-[#E5A93C] font-semibold'
              : 'text-[#8B949E] hover:text-[#F0F6FC]'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Video ({linkedVideos.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('performance')}
          className={`flex-1 min-h-[34px] rounded text-xs font-mono transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'performance'
              ? 'bg-[#212631] text-[#E5A93C] font-semibold'
              : 'text-[#8B949E] hover:text-[#F0F6FC]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Performa</span>
        </button>
        <button
          onClick={() => setActiveSubTab('notes')}
          className={`flex-1 min-h-[34px] rounded text-xs font-mono transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'notes'
              ? 'bg-[#212631] text-[#E5A93C] font-semibold'
              : 'text-[#8B949E] hover:text-[#F0F6FC]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profil</span>
        </button>
      </div>

      {/* Tab 1: Video Terkait (Toggle Grid vs List - Requirement B.2) */}
      {activeSubTab === 'videos' && (
        <div className="space-y-3 animate-in fade-in">
          {/* Header Bar with Toggle Grid / Ringkas List Option (B.2) */}
          <div className="p-2 rounded-md bg-[#181B22] border border-[#30363D] flex items-center justify-between">
            <span className="text-xs font-medium text-[#F0F6FC] flex items-center gap-1.5 font-mono">
              <Film className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span>Daftar Video ({linkedVideos.length})</span>
            </span>

            <div className="flex items-center gap-0.5 bg-[#111319] p-0.5 rounded border border-[#30363D]">
              <button
                type="button"
                onClick={() => setVideoListMode('grid')}
                className={`p-1 rounded text-xs font-mono flex items-center gap-1 transition cursor-pointer ${
                  videoListMode === 'grid'
                    ? 'bg-[#212631] text-[#E5A93C]'
                    : 'text-[#8B949E] hover:text-[#F0F6FC]'
                }`}
                title="Tampilan Grid"
              >
                <LayoutGrid className="w-3 h-3" />
                <span className="text-[10px]">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setVideoListMode('list')}
                className={`p-1 rounded text-xs font-mono flex items-center gap-1 transition cursor-pointer ${
                  videoListMode === 'list'
                    ? 'bg-[#212631] text-[#E5A93C]'
                    : 'text-[#8B949E] hover:text-[#F0F6FC]'
                }`}
                title="Tampilan Ringkas"
              >
                <ListIcon className="w-3 h-3" />
                <span className="text-[10px]">Ringkas</span>
              </button>
            </div>
          </div>

          {linkedVideos.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-md bg-[#181B22] border border-[#30363D]">
              <Film className="w-7 h-7 text-[#57606A] mx-auto mb-1.5" />
              <p className="text-xs font-mono text-[#F0F6FC]">Belum ada video tertaut</p>
              <p className="text-[11px] font-mono text-[#8B949E] mt-0.5">
                Tautkan video ke artis ini saat membuat atau mengubah entri video.
              </p>
            </div>
          ) : videoListMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-3">
              {linkedVideos.map((vid) => {
                const thumb =
                  vid.metadata?.thumbnailUrl ||
                  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80';

                const scoreInfo = videoScores?.find((vs) => vs.videoId === vid.id);
                const roleName = scoreInfo?.roleName || vid.artistRoles?.[artist.id] || 'Artis Utama';
                const roleWeight = scoreInfo?.weight ?? 100;
                const nilaiDidapat = scoreInfo?.scoreObtained ?? vid.overallRating;
                const formattedScore = Number.isInteger(nilaiDidapat)
                  ? nilaiDidapat
                  : nilaiDidapat.toFixed(1);

                return (
                  <div
                    key={vid.id}
                    onClick={() => onSelectVideo && onSelectVideo(vid)}
                    className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md hover:border-slate-700 transition cursor-pointer flex flex-col"
                  >
                    {/* 16:9 Thumbnail with rating badge */}
                    <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                      <img
                        src={thumb}
                        alt={vid.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=600&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                      {/* Badge Rating di atas thumbnail */}
                      <div className="absolute top-2 right-2 z-10">
                        <RatingBadge score={vid.overallRating} size="sm" showIcon />
                      </div>
                    </div>

                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4
                          title={vid.title}
                          className="text-xs font-bold text-white line-clamp-2 leading-tight group-hover:text-indigo-300 transition"
                        >
                          {vid.title}
                        </h4>

                        {/* Format: Nilai didapat artis (status peran • bobot) */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-lg w-fit">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                          <span>{formattedScore} ({roleName}{roleWeight !== 100 ? ` • ${roleWeight}%` : ''})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                          <span>Nilai Video: {vid.overallRating}</span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{vid.singleChoices?.field_status || 'Koleksi'}</span>
                        <ExternalLink className="w-3 h-3 text-indigo-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* SIMPLE RINGKAS LIST VIEW (Requirement B.2) */
            <div className="space-y-2">
              {linkedVideos.map((vid) => {
                const scoreInfo = videoScores?.find((vs) => vs.videoId === vid.id);
                const roleName = scoreInfo?.roleName || vid.artistRoles?.[artist.id] || 'Artis Utama';
                const roleWeight = scoreInfo?.weight ?? 100;
                const performanceP = scoreInfo?.performance ?? 100;
                const nilaiDidapat = scoreInfo?.scoreObtained ?? vid.overallRating;
                const formattedScore = Number.isInteger(nilaiDidapat)
                  ? nilaiDidapat
                  : nilaiDidapat.toFixed(1);

                const thumb =
                  vid.metadata?.thumbnailUrl ||
                  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&auto=format&fit=crop&q=80';

                return (
                  <div
                    key={vid.id}
                    onClick={() => onSelectVideo && onSelectVideo(vid)}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 transition cursor-pointer flex items-center justify-between gap-3 shadow-sm group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={thumb}
                        alt={vid.title}
                        className="w-12 h-12 rounded-xl object-cover bg-slate-950 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=300&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition">
                          {vid.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          <span className="font-semibold text-indigo-300">{roleName} ({roleWeight}%)</span>
                          <span>•</span>
                          <span>Performa: {performanceP}%</span>
                          {vid.releaseDate && (
                            <>
                              <span>•</span>
                              <span>{vid.releaseDate}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-800/80">
                          Didapat: {formattedScore}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          Rating Video: <strong className="text-emerald-400">{vid.overallRating}</strong>
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Performa Table View */}
      {activeSubTab === 'performance' && (
        <div className="space-y-2 animate-in fade-in">
          {/* Table Control / Sort Bar */}
          <div className="p-2 rounded-md bg-[#181B22] border border-[#30363D] flex items-center justify-between gap-2 flex-wrap text-xs">
            <span className="font-mono text-[#F0F6FC] flex items-center gap-1.5 text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span>Performa Artis</span>
            </span>

            {/* Sort Buttons */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-[#8B949E]">Sort:</span>
              <button
                type="button"
                onClick={() => {
                  if (perfSortKey === 'performance') setPerfSortOrder(perfSortOrder === 'desc' ? 'asc' : 'desc');
                  else { setPerfSortKey('performance'); setPerfSortOrder('desc'); }
                }}
                className={`px-2 py-0.5 rounded font-mono text-[10px] transition cursor-pointer ${
                  perfSortKey === 'performance' ? 'bg-[#212631] text-[#E5A93C] border border-[#30363D]' : 'bg-[#111319] text-[#8B949E] hover:text-[#F0F6FC]'
                }`}
              >
                Nilai P {perfSortKey === 'performance' ? (perfSortOrder === 'desc' ? '↓' : '↑') : ''}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (perfSortKey === 'score') setPerfSortOrder(perfSortOrder === 'desc' ? 'asc' : 'desc');
                  else { setPerfSortKey('score'); setPerfSortOrder('desc'); }
                }}
                className={`px-2 py-0.5 rounded font-mono text-[10px] transition cursor-pointer ${
                  perfSortKey === 'score' ? 'bg-[#212631] text-[#E5A93C] border border-[#30363D]' : 'bg-[#111319] text-[#8B949E] hover:text-[#F0F6FC]'
                }`}
              >
                Didapat {perfSortKey === 'score' ? (perfSortOrder === 'desc' ? '↓' : '↑') : ''}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (perfSortKey === 'release') setPerfSortOrder(perfSortOrder === 'desc' ? 'asc' : 'desc');
                  else { setPerfSortKey('release'); setPerfSortOrder('desc'); }
                }}
                className={`px-2 py-0.5 rounded font-mono text-[10px] transition cursor-pointer ${
                  perfSortKey === 'release' ? 'bg-[#212631] text-[#E5A93C] border border-[#30363D]' : 'bg-[#111319] text-[#8B949E] hover:text-[#F0F6FC]'
                }`}
              >
                Rilis {perfSortKey === 'release' ? (perfSortOrder === 'desc' ? '↓' : '↑') : ''}
              </button>
            </div>
          </div>

          {/* Table Container */}
          {sortedPerformanceList.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-md bg-[#181B22] border border-[#30363D]">
              <Film className="w-7 h-7 text-[#57606A] mx-auto mb-1.5" />
              <p className="text-xs font-mono text-[#F0F6FC]">Belum ada video untuk menampilkan performa</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-[#30363D] bg-[#181B22]">
              <table className="w-full text-left text-xs text-[#E2E2EB]">
                <thead className="bg-[#111319] text-[10px] font-mono text-[#8B949E] uppercase tracking-wider border-b border-[#30363D]">
                  <tr>
                    <th className="p-2.5">Video</th>
                    <th className="p-2.5">Kolaborator</th>
                    <th className="p-2.5">Rilis</th>
                    <th className="p-2.5">Peran</th>
                    <th className="p-2.5 text-right">Nilai &amp; Performa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D]/60 font-mono text-[11px]">
                  {sortedPerformanceList.map((item) => {
                    const thumb = item.video.metadata?.thumbnailUrl || 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=300&auto=format&fit=crop&q=80';
                    const rilisText = item.releaseDate ? new Date(item.releaseDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }) : '-';

                    return (
                      <tr
                        key={item.video.id}
                        onClick={() => onSelectVideo && onSelectVideo(item.video)}
                        className="hover:bg-[#212631]/70 transition cursor-pointer"
                      >
                        {/* Thumbnail & Judul */}
                        <td className="p-2 min-w-[150px]">
                          <div className="flex items-center gap-2">
                            <img
                              src={thumb}
                              alt={item.video.title}
                              className="w-8 h-8 rounded object-cover bg-[#0F1117] shrink-0"
                            />
                            <span className="font-sans font-medium text-[#F0F6FC] line-clamp-2 text-xs leading-tight">
                              {item.video.title}
                            </span>
                          </div>
                        </td>

                        {/* Kolaborator */}
                        <td className="p-2 min-w-[100px] text-[#8B949E]">
                          {item.collaborators.length > 0 ? item.collaborators.join(', ') : 'Solo'}
                        </td>

                        {/* Tanggal Rilis */}
                        <td className="p-2 whitespace-nowrap text-[#8B949E]">
                          {rilisText}
                        </td>

                        {/* Peran */}
                        <td className="p-2 whitespace-nowrap text-[#E5A93C]">
                          {item.roleName}
                        </td>

                        {/* Nilai Performa (P) dan Nilai Didapat Artis */}
                        <td className="p-2 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-[#E5A93C]">
                              {item.scoreObtained}
                            </span>
                            <span className="text-[10px] text-[#8B949E]">
                              P: {item.performance}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Catatan & Profil */}
      {activeSubTab === 'notes' && (
        <div className="space-y-3 animate-in fade-in">
          {/* Bio Card */}
          <div className="p-3 rounded-md bg-[#181B22] border border-[#30363D] space-y-1.5">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
              Biografi &amp; Profil
            </h3>
            <p className="text-xs text-[#E2E2EB] leading-relaxed whitespace-pre-wrap">
              {artist.bio || 'Belum ada catatan atau biografi yang ditambahkan.'}
            </p>
          </div>

          {/* Akses Catatan Galeri Tertaut */}
          <div className="p-3 rounded-md bg-[#181B22] border border-[#30363D] space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#F0F6FC] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E5A93C]" />
                <span>Catatan Galeri Tertaut ({linkedGalleryNotes.length})</span>
              </h3>
            </div>

            {linkedGalleryNotes.length === 0 ? (
              <p className="text-[11px] font-mono text-[#57606A] italic">
                Belum ada Catatan Galeri yang ditautkan ke artis ini.
              </p>
            ) : (
              <div className="space-y-1.5">
                {linkedGalleryNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setReadingNote(note)}
                    className="w-full flex items-center justify-between p-2 rounded-md bg-[#111319] hover:bg-[#212631] border border-[#30363D] hover:border-[#E5A93C]/50 transition text-left cursor-pointer group"
                  >
                    <div>
                      <div className="text-xs font-medium text-[#F0F6FC] group-hover:text-[#E5A93C] transition">
                        {note.title}
                      </div>
                      <div className="text-[10px] font-mono text-[#8B949E] mt-0.5">
                        {note.blocks?.length || 0} blok komponen
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#E5A93C] bg-[#181B22] px-2 py-0.5 rounded border border-[#30363D] shrink-0">
                      Buka ➔
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Catatan Kaki: Deskripsi Item Pilihan */}
          {footnoteItems.length > 0 && (
            <div className="rounded-md bg-[#181B22] border border-[#30363D] overflow-hidden">
              <button
                type="button"
                onClick={() => setIsFootnoteOpen(!isFootnoteOpen)}
                className="w-full flex items-center justify-between p-2.5 text-left hover:bg-[#212631] transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B949E]">
                    Catatan Kaki &amp; Deskripsi Item ({footnoteItems.length})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[#8B949E]">
                  <span className="text-[10px] font-mono">
                    {isFootnoteOpen ? 'Tutup' : 'Lihat'}
                  </span>
                  {isFootnoteOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </div>
              </button>

              {isFootnoteOpen && (
                <div className="p-3.5 pt-0 border-t border-slate-800/80 space-y-2.5 animate-in fade-in">
                  <p className="text-[11px] text-slate-400 mt-2">
                    Deskripsi item-item dari field pilihan yang melekat pada karya dan entri artis ini:
                  </p>
                  <div className="space-y-2">
                    {footnoteItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-300">{item.optionName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                            {item.fieldLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Text Fields */}
          {artist.textFields && Object.keys(artist.textFields).length > 0 && (
            <div className="p-3 rounded-md bg-[#181B22] border border-[#30363D] space-y-2">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
                Informasi Tambahan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono">
                {Object.entries(artist.textFields).map(([k, v]) => (
                  <div key={k} className="p-2 rounded bg-[#111319] border border-[#30363D]">
                    <span className="text-[9px] text-[#8B949E] block uppercase">
                      {k}
                    </span>
                    <span className="text-xs text-[#F0F6FC] font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External Links */}
          {artist.links && artist.links.length > 0 && (
            <div className="p-3 rounded-md bg-[#181B22] border border-[#30363D] space-y-2">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E] flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-[#E5A93C]" />
                <span>Tautan &amp; Portofolio</span>
              </h3>
              <div className="space-y-1">
                {artist.links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded bg-[#111319] hover:bg-[#212631] border border-[#30363D] text-xs font-mono text-[#E5A93C] hover:text-[#F0F6FC] transition"
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="w-3 h-3 text-[#8B949E]" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Embed Images Gallery */}
          {artist.embedImages && artist.embedImages.length > 0 && (
            <div className="rounded-md bg-[#181B22] border border-[#30363D] overflow-hidden">
              <button
                type="button"
                onClick={() => setIsGalleryOpen(!isGalleryOpen)}
                className="w-full flex items-center justify-between p-2.5 text-left hover:bg-[#212631] transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#8B949E]">
                    Galeri Foto ({artist.embedImages.length})
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-[#8B949E] text-xs font-mono">
                  <span>{isGalleryOpen ? 'Tutup' : 'Buka'}</span>
                  {isGalleryOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </div>
              </button>

              {isGalleryOpen && (
                <div className="p-2.5 pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {artist.embedImages.map((img, i) => (
                      <div
                        key={i}
                        onClick={() => setPreviewImageUrl(img)}
                        className="group relative aspect-square rounded overflow-hidden bg-[#0F1117] border border-[#30363D] cursor-pointer hover:border-[#E5A93C]/60 transition shadow-sm active:scale-95"
                      >
                        <img
                          src={img}
                          alt={`Portofolio ${i + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Detail / Reader Catatan Galeri dalam Mode Read-Only (Poin 2) */}
      {readingNote && (
        <GalleryNoteModal
          isOpen={!!readingNote}
          onClose={() => setReadingNote(null)}
          onSave={(updatedNote) => {
            const allNotes = getStoredGalleryNotes();
            const updatedList = allNotes.map((n) => (n.id === updatedNote.id ? updatedNote : n));
            saveGalleryNotes(updatedList);
            setReadingNote(null);
          }}
          initialNote={readingNote}
          artists={effectiveArtists}
          readOnlyInitial={true}
          onOpenFullNotePage={(noteId) => {
            setReadingNote(null);
            window.location.hash = `#/gallery_note/${noteId}`;
          }}
        />
      )}

      {/* Lightbox Image Preview Modal */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-xl w-full max-h-[85vh] rounded-md overflow-hidden bg-[#181B22] border border-[#30363D] shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-[#111319] border-b border-[#30363D]">
              <span className="text-xs font-mono text-[#F0F6FC]">Preview Gambar</span>
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="p-1 rounded bg-[#212631] text-[#8B949E] hover:text-[#F0F6FC] transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-2 overflow-auto bg-[#0F1117]">
              <img
                src={previewImageUrl}
                alt="Full preview"
                referrerPolicy="no-referrer"
                className="max-h-[70vh] w-auto max-w-full rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80';
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
