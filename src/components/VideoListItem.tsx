import React, { useState } from 'react';
import { Play, Edit2, Trash2, ExternalLink, Globe } from 'lucide-react';
import { Video, Artist } from '../types';
import { RatingBadge } from './RatingBadge';

interface VideoListItemProps {
  video: Video;
  artists: Artist[];
  onEdit: (video: Video) => void;
  onDelete: (video: Video) => void;
  onSelectArtist: (artistId: string) => void;
  onOpenDetail?: (video: Video) => void;
}

export const VideoListItem: React.FC<VideoListItemProps> = ({
  video,
  artists,
  onEdit,
  onDelete,
  onSelectArtist,
  onOpenDetail,
}) => {
  const [isPlayingEmbed, setIsPlayingEmbed] = useState(false);

  const involvedArtists = artists.filter(
    (a) => video.artistIds && video.artistIds.includes(a.id)
  );
  const genreTags = video.multiChoices?.field_genre || [];
  const statusValue = video.singleChoices?.field_status;
  const thumbnail =
    video.metadata?.thumbnailUrl ||
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80';

  return (
    <div
      id={`video-list-item-${video.id}`}
      className="group relative bg-[#181B22] border border-[#30363D] hover:border-[#8B949E]/40 rounded-md p-2 shadow-sm transition duration-150 space-y-1.5"
    >
      {/* Top Section: Media preview + Info */}
      <div className="flex gap-2.5">
        {/* Thumbnail Preview */}
        <div className="relative w-24 aspect-video rounded bg-[#0F1117] overflow-hidden shrink-0 border border-[#30363D]">
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
                type="button"
                onClick={() => setIsPlayingEmbed(false)}
                className="absolute top-0.5 left-0.5 z-10 bg-black/90 text-[9px] font-mono text-white px-1 rounded border border-[#30363D]"
              >
                Tutup
              </button>
            </div>
          ) : (
            <>
              <img
                src={thumbnail}
                alt={video.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&auto=format&fit=crop&q=80';
                }}
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setIsPlayingEmbed(true)}
                  aria-label={`Putar ${video.title}`}
                  className="w-6 h-6 rounded-full bg-[#E5A93C] text-[#0F1117] flex items-center justify-center shadow-md transition active:scale-95 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </button>
              </div>

              {video.metadata?.domain && (
                <div className="absolute bottom-0.5 left-0.5 flex items-center gap-0.5 px-1 py-0.2 rounded bg-[#0F1117]/80 text-[8px] font-mono text-[#8B949E]">
                  <Globe className="w-2 h-2 text-[#E5A93C]" />
                  <span className="truncate max-w-[45px]">{video.metadata.domain}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info Area */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-1.5">
              <h4
                title={video.title}
                onClick={() => (onOpenDetail ? onOpenDetail(video) : onEdit(video))}
                className="text-xs font-semibold text-[#F0F6FC] leading-snug line-clamp-2 group-hover:text-[#E5A93C] transition-colors cursor-pointer hover:underline"
              >
                {video.title}
              </h4>
              <div className="shrink-0">
                <RatingBadge score={video.overallRating} size="sm" showIcon />
              </div>
            </div>

            {/* Status & Genre Chips */}
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {statusValue && (
                <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-[#212631] text-[#E5A93C] border border-[#30363D]">
                  {statusValue}
                </span>
              )}
              {genreTags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-1 py-0.2 rounded text-[9px] font-mono bg-[#111319] text-[#8B949E] border border-[#30363D]/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Involved Artists */}
          {involvedArtists.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-[#8B949E] truncate mt-1">
              <span className="font-mono text-[#57606A]">Artis:</span>
              <span className="truncate text-[#F0F6FC]">
                {involvedArtists.map((a) => a.name).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Strip */}
      <div className="flex items-center justify-between pt-1 border-t border-[#30363D]/60 text-[11px]">
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-mono text-[#E5A93C] hover:underline"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          <span>Tautan</span>
        </a>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(video)}
            className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-[#212631] text-[#F0F6FC] hover:text-[#E5A93C] border border-[#30363D] text-[10px] font-mono transition"
          >
            <Edit2 className="w-2.5 h-2.5 text-[#E5A93C]" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(video)}
            className="p-1 rounded bg-[#212631] text-[#8B949E] hover:text-rose-400 hover:bg-rose-950/40 border border-[#30363D] transition"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
