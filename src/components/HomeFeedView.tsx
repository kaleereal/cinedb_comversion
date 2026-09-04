import React, { useState, useMemo, useEffect } from 'react';
import { Search, Zap, Film, Plus, LayoutGrid, List } from 'lucide-react';
import { Video, Artist, CustomFieldDefinition, FilterCriteria } from '../types';
import { VideoCard } from './VideoCard';
import { VideoListItem } from './VideoListItem';
import { FilterBottomSheet } from './FilterBottomSheet';
import { getVideoViewMode, saveVideoViewMode } from '../utils/storage';

interface HomeFeedViewProps {
  videos: Video[];
  artists: Artist[];
  fieldDefinitions: CustomFieldDefinition[];
  onEditVideo: (video: Video) => void;
  onDeleteVideo: (video: Video) => void;
  onSelectArtist: (artistId: string) => void;
  onOpenCreateVideo: () => void;
  onSelectVideo?: (video: Video) => void;
}

export const HomeFeedView: React.FC<HomeFeedViewProps> = ({
  videos,
  artists,
  fieldDefinitions,
  onEditVideo,
  onDeleteVideo,
  onSelectArtist,
  onOpenCreateVideo,
  onSelectVideo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => getVideoViewMode());
  const [criteria, setCriteria] = useState<FilterCriteria>({
    searchQuery: '',
    sortOrder: 'desc',
    singleChoices: {},
    multiChoices: {},
    minRating: 0,
  });

  // Load view mode preference on mount
  useEffect(() => {
    setViewMode(getVideoViewMode());
  }, []);

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    saveVideoViewMode(mode);
  };

  // Filter videos according to search query and filter criteria
  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      // Search title, notes, or artist names
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = video.title.toLowerCase().includes(query);
        const notesMatch = video.notes?.toLowerCase().includes(query);
        const artistMatch = artists
          .filter((a) => video.artistIds && video.artistIds.includes(a.id))
          .some((a) => a.name.toLowerCase().includes(query));

        if (!titleMatch && !notesMatch && !artistMatch) {
          return false;
        }
      }

      // Min rating
      if (criteria.minRating && (video.overallRating || 0) < criteria.minRating) {
        return false;
      }

      // Single choices
      for (const [fieldId, chosen] of Object.entries(criteria.singleChoices || {})) {
        if (chosen && video.singleChoices?.[fieldId] !== chosen) {
          return false;
        }
      }

      // Multi choices
      for (const [fieldId, chosenList] of Object.entries(criteria.multiChoices || {})) {
        const list = chosenList as string[] | undefined;
        if (list && list.length > 0) {
          const vidTags = video.multiChoices?.[fieldId] || [];
          const hasMatch = list.some((tag) => vidTags.includes(tag));
          if (!hasMatch) return false;
        }
      }

      return true;
    });
  }, [videos, artists, searchQuery, criteria]);

  const multiChoiceCount = Object.values(criteria.multiChoices || {}).reduce<number>(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0
  );

  const activeFilterCount =
    Object.values(criteria.singleChoices || {}).filter(Boolean).length +
    multiChoiceCount +
    (criteria.minRating && criteria.minRating > 0 ? 1 : 0);

  return (
    <div id="home-feed-view" className="space-y-3 pb-24 animate-in fade-in">
      {/* Compact Search Bar & Quick Filter */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#57606A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul video, artis, sutradara..."
            className="w-full min-h-[36px] pl-8 pr-3 rounded-md bg-[#181B22] border border-[#30363D] text-[#F0F6FC] text-xs placeholder:text-[#57606A] focus:outline-none focus:border-[#E5A93C] transition"
          />
        </div>

        <button
          onClick={() => setIsFilterOpen(true)}
          className={`min-h-[36px] px-3 rounded-md border text-xs font-mono transition active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeFilterCount > 0
              ? 'bg-[#E5A93C]/15 border-[#E5A93C] text-[#E5A93C]'
              : 'bg-[#181B22] border-[#30363D] text-[#8B949E] hover:text-[#F0F6FC]'
          }`}
          title="Filter Kategori"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">Filter</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#E5A93C] text-[#0F1117] text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Result Count & View Mode Bar */}
      <div className="flex items-center justify-between px-0.5">
        <div className="text-[11px] font-mono text-[#8B949E]">
          <span className="text-[#F0F6FC] font-semibold">{filteredVideos.length}</span> Video
        </div>

        {/* Display Switcher */}
        <div className="flex items-center bg-[#181B22] border border-[#30363D] rounded-md p-0.5">
          <button
            type="button"
            onClick={() => handleSetViewMode('grid')}
            className={`p-1 rounded text-xs transition cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-[#212631] text-[#E5A93C]'
                : 'text-[#8B949E] hover:text-[#F0F6FC]'
            }`}
            title="Tampilan Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleSetViewMode('list')}
            className={`p-1 rounded text-xs transition cursor-pointer ${
              viewMode === 'list'
                ? 'bg-[#212631] text-[#E5A93C]'
                : 'text-[#8B949E] hover:text-[#F0F6FC]'
            }`}
            title="Tampilan List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video Feed Section */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-lg bg-[#181B22]/60 border border-[#30363D] space-y-2">
          <Film className="w-8 h-8 text-[#57606A] mx-auto" />
          <h3 className="text-xs font-semibold text-[#8B949E]">
            {videos.length === 0 ? 'Belum ada entri video' : 'Tidak ada video sesuai filter'}
          </h3>
          <button
            onClick={onOpenCreateVideo}
            className="text-xs font-mono text-[#E5A93C] hover:underline cursor-pointer"
          >
            + Tambah video baru
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="space-y-3">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              artists={artists}
              onEdit={onEditVideo}
              onDelete={onDeleteVideo}
              onSelectArtist={onSelectArtist}
              onOpenDetail={onSelectVideo}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredVideos.map((video) => (
            <VideoListItem
              key={video.id}
              video={video}
              artists={artists}
              onEdit={onEditVideo}
              onDelete={onDeleteVideo}
              onSelectArtist={onSelectArtist}
              onOpenDetail={onSelectVideo}
            />
          ))}
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
