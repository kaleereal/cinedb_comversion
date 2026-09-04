import React, { useState } from 'react';
import { Play, Edit2, Trash2, ExternalLink, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { Video, Artist } from '../types';
import { RatingBadge } from './RatingBadge';

interface VideoCardProps {
  video: Video;
  artists: Artist[];
  onEdit: (video: Video) => void;
  onDelete: (video: Video) => void;
  onSelectArtist: (artistId: string) => void;
  onOpenDetail?: (video: Video) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  artists,
  onEdit,
  onDelete,
  onSelectArtist,
  onOpenDetail,
}) => {
  const [isPlayingEmbed, setIsPlayingEmbed] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Match involved artists
  const involvedArtists = artists.filter((a) => video.artistIds && video.artistIds.includes(a.id));

  // Genre tags
  const genreTags = video.multiChoices?.field_genre || [];
  const statusValue = video.singleChoices?.field_status;

  const thumbnail =
    video.metadata?.thumbnailUrl ||
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80';

  return (
    <article
      id={`video-card-${video.id}`}
      className="group relative bg-[#181B22] border border-[#30363D] hover:border-[#8B949E]/40 rounded-lg overflow-hidden transition duration-150"
    >
      {/* 16:9 Thumbnail Area */}
      <div className="relative aspect-video w-full bg-[#0F1117] overflow-hidden border-b border-[#30363D]">
        {isPlayingEmbed && video.metadata?.embedUrl ? (
          <div className="relative w-full h-full">
            <iframe
              src={video.metadata.embedUrl}
              title={video.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <button
              onClick={() => setIsPlayingEmbed(false)}
              className="absolute top-2 left-2 z-20 bg-[#111319]/90 text-[#F0F6FC] text-xs font-mono px-2 py-0.5 rounded border border-[#30363D]"
            >
              Tutup Video
            </button>
          </div>
        ) : (
          <>
            <img
              src={thumbnail}
              alt={video.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&auto=format&fit=crop&q=80';
              }}
            />

            {/* Gradient Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1117]/80 via-transparent to-black/20 pointer-events-none" />

            {/* Play Button Overlay */}
            <button
              onClick={() => setIsPlayingEmbed(true)}
              aria-label={`Putar ${video.title}`}
              className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-[#E5A93C] text-[#0F1117] flex items-center justify-center shadow-lg transition transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </button>

            {/* Domain Tag */}
            {video.metadata?.domain && (
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#111319]/80 backdrop-blur-xs text-[9px] font-mono text-[#8B949E] border border-[#30363D]">
                <Globe className="w-2.5 h-2.5 text-[#E5A93C]" />
                <span>{video.metadata.domain}</span>
              </div>
            )}
          </>
        )}

        {/* Overall Rating Badge */}
        <div className="absolute top-2 right-2 z-10">
          <RatingBadge score={video.overallRating} size="md" showIcon />
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3 space-y-2.5">
        {/* Status Chip & Genre Tags */}
        <div className="flex flex-wrap items-center gap-1">
          {statusValue && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#212631] text-[#E5A93C] border border-[#30363D]">
              {statusValue}
            </span>
          )}
          {genreTags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#111319] text-[#8B949E] border border-[#30363D]/60"
            >
              {tag}
            </span>
          ))}
          {genreTags.length > 3 && (
            <span className="text-[10px] font-mono text-[#57606A]">
              +{genreTags.length - 3}
            </span>
          )}
        </div>

        {/* Video Title */}
        <h3
          title={video.title}
          onClick={() => (onOpenDetail ? onOpenDetail(video) : onEdit(video))}
          className="text-sm font-semibold text-[#F0F6FC] tracking-tight line-clamp-2 leading-snug group-hover:text-[#E5A93C] transition-colors cursor-pointer hover:underline"
        >
          {video.title}
        </h3>

        {/* Involved Artists */}
        {involvedArtists.length > 0 && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="text-[10px] font-mono text-[#8B949E]">Artis:</span>
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {involvedArtists.map((artist) => (
                <button
                  key={artist.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectArtist(artist.id);
                  }}
                  title={`${artist.name} (Buka Profil)`}
                  className="relative ring-1 ring-[#181B22] rounded-full hover:z-20 hover:scale-110 transition-transform cursor-pointer"
                >
                  <img
                    src={artist.avatarUrl}
                    alt={artist.name}
                    className="w-5 h-5 rounded-full object-cover bg-[#212631]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80';
                    }}
                  />
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 text-[11px] text-[#F0F6FC] font-medium line-clamp-1">
              {involvedArtists.map((a, i) => (
                <button
                  key={a.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectArtist(a.id);
                  }}
                  className="hover:underline hover:text-[#E5A93C] text-left cursor-pointer"
                >
                  {a.name}{i < involvedArtists.length - 1 ? ',' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rating Breakdown */}
        {video.ratingFolders && video.ratingFolders.length > 0 && (
          <div className="pt-1.5 border-t border-[#30363D]/60">
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
              {video.ratingFolders.slice(0, 4).map((folder) => {
                const folderAvg = folder.items.length > 0
                  ? Math.round(folder.items.reduce((s, it) => s + (it.score || 0), 0) / folder.items.length)
                  : 0;
                return (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between px-1.5 py-0.5 rounded bg-[#111319] border border-[#30363D]/60"
                  >
                    <span className="text-[#8B949E] truncate pr-1">{folder.name}</span>
                    <span className="font-semibold text-[#F0F6FC] shrink-0">{folderAvg}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes Preview */}
        {video.notes && (
          <div className="pt-0.5">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center justify-between w-full text-[10px] font-mono text-[#8B949E] hover:text-[#F0F6FC] py-0.5 transition cursor-pointer"
            >
              <span>Catatan Ulasan</span>
              {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showNotes && (
              <p className="mt-1 p-2 rounded bg-[#111319] text-[#E2E2EB] text-[11px] leading-relaxed border border-[#30363D]">
                {video.notes}
              </p>
            )}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between pt-1.5 border-t border-[#30363D]/60">
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-mono text-[#E5A93C] hover:underline transition py-1 px-1.5"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Tautan</span>
          </a>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(video)}
              className="flex items-center gap-1 h-7 px-2 rounded bg-[#212631] hover:bg-[#2A303C] text-[#F0F6FC] text-xs font-medium transition active:scale-95 border border-[#30363D] cursor-pointer"
              title="Edit Video"
            >
              <Edit2 className="w-3 h-3 text-[#E5A93C]" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => onDelete(video)}
              className="flex items-center justify-center w-7 h-7 rounded bg-[#212631] hover:bg-rose-950/50 text-[#8B949E] hover:text-rose-400 text-xs transition active:scale-95 border border-[#30363D] hover:border-rose-900/60 cursor-pointer"
              title="Hapus Video"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
