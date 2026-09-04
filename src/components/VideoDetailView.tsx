import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  ExternalLink,
  Play,
  Film,
  Users,
  Award,
  ChevronDown,
  ChevronUp,
  Sliders,
  FileText,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Video, Artist, CustomFieldDefinition } from '../types';
import { RatingBadge } from './RatingBadge';
import { calculateOverallRating } from '../utils/storage';

interface VideoDetailViewProps {
  video: Video;
  artists: Artist[];
  fieldDefinitions: CustomFieldDefinition[];
  onBack: () => void;
  onEditVideo: (video: Video) => void;
  onDeleteVideo?: (videoId: string, title: string) => void;
  onSelectArtist: (artistId: string) => void;
  onSelectFilterTag: (fieldId: string, option: string) => void;
}

export const VideoDetailView: React.FC<VideoDetailViewProps> = ({
  video,
  artists,
  fieldDefinitions,
  onBack,
  onEditVideo,
  onDeleteVideo,
  onSelectArtist,
  onSelectFilterTag,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    (video.ratingFolders || []).forEach((f, idx) => {
      initial[f.id] = idx === 0; // Open first folder by default
    });
    return initial;
  });

  const overallScore =
    typeof video.overallRating === 'number'
      ? video.overallRating
      : calculateOverallRating(video.ratingFolders);
  const embedUrl = video.metadata?.embedUrl;
  const thumbnailUrl = video.metadata?.thumbnailUrl;

  // Resolve linked artists
  const linkedArtists = (video.artistIds || [])
    .map((id) => artists.find((a) => a.id === id))
    .filter(Boolean) as Artist[];

  // Filter choice fields
  const choiceFields = fieldDefinitions.filter(
    (f) => f.type === 'multi_choice' || f.type === 'single_choice'
  );

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  return (
    <div className="space-y-3.5 pb-24 animate-in fade-in duration-200">
      {/* Top Sticky Navigation Bar */}
      <div className="flex items-center justify-between gap-2 sticky top-0 z-30 bg-[#0D1117]/95 backdrop-blur-xs -mx-4 px-4 py-2 border-b border-[#30363D]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#181B22] hover:bg-[#212631] text-[#8B949E] hover:text-[#F0F6FC] text-xs font-mono border border-[#30363D] transition active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEditVideo(video)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#212631] hover:bg-[#2A303C] text-[#E5A93C] text-xs font-mono border border-[#30363D] hover:border-[#E5A93C]/50 transition active:scale-95 cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
            <span>Edit Video</span>
          </button>
          {onDeleteVideo && (
            <button
              type="button"
              onClick={() => onDeleteVideo(video.id, video.title)}
              className="p-1.5 rounded-md bg-[#181B22] hover:bg-rose-950/60 text-[#8B949E] hover:text-rose-300 border border-[#30363D] hover:border-rose-800 transition active:scale-95 cursor-pointer"
              title="Hapus Video"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Media Player / Thumbnail Hero */}
      <div className="relative aspect-video w-full rounded-md overflow-hidden bg-[#181B22] border border-[#30363D] shadow-sm group">
        {isPlaying && embedUrl ? (
          <iframe
            src={embedUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        ) : (
          <div className="relative w-full h-full">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={video.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#111319] text-[#57606A]">
                <Film className="w-10 h-10 stroke-1 mb-1.5 text-[#57606A]" />
                <span className="text-xs font-mono text-[#8B949E]">Media Preview</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117] via-[#0D1117]/20 to-transparent" />

            {/* Play overlay button if embedUrl exists */}
            {embedUrl && (
              <button
                type="button"
                onClick={() => setIsPlaying(true)}
                className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-[#E5A93C] hover:bg-[#D4982F] text-[#0D1117] flex items-center justify-center shadow-lg transition transform hover:scale-105 active:scale-95 z-10 cursor-pointer"
                aria-label="Putar Video"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>
            )}

            {/* Floating Overall Rating in Hero */}
            <div className="absolute bottom-2.5 right-2.5 z-10 font-mono">
              <RatingBadge score={overallScore} size="md" />
            </div>
          </div>
        )}
      </div>

      {/* Video Title & Source Link */}
      <div className="space-y-1.5">
        <h1 className="text-base sm:text-lg font-bold text-[#F0F6FC] tracking-tight leading-snug">
          {video.title}
        </h1>

        {video.url && (
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#181B22] hover:bg-[#212631] text-[#E5A93C] hover:text-[#F0F6FC] text-xs font-mono border border-[#30363D] transition max-w-full"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">Buka Sumber Asli</span>
          </a>
        )}
      </div>

      {/* Artis yang Terlibat */}
      <div className="p-3 rounded-md bg-[#181B22] border border-[#30363D] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#E5A93C]" />
            <h2 className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
              Artis yang Terlibat ({linkedArtists.length})
            </h2>
          </div>
        </div>

        {linkedArtists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {linkedArtists.map((artist) => (
              <button
                key={artist.id}
                type="button"
                onClick={() => onSelectArtist(artist.id)}
                className="flex items-center gap-2.5 p-2 rounded bg-[#111319] border border-[#30363D] hover:border-[#E5A93C]/50 hover:bg-[#212631] transition text-left group active:scale-98 cursor-pointer"
              >
                <img
                  src={artist.avatarUrl}
                  alt={artist.name}
                  className="w-8 h-8 rounded-full object-cover border border-[#30363D] shrink-0 group-hover:border-[#E5A93C] transition"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-medium text-[#F0F6FC] truncate group-hover:text-[#E5A93C] transition">
                    {artist.name}
                  </h3>
                  <p className="text-[10px] font-mono text-[#8B949E] truncate">
                    Buka Profil ➔
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] font-mono text-[#57606A] italic">Belum ada artis yang ditautkan ke video ini.</p>
        )}
      </div>

      {/* Kategori & Atribut Pilihan */}
      {choiceFields.length > 0 && (
        <div className="p-3 rounded-md bg-[#181B22] border border-[#30363D] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E5A93C]" />
              <h2 className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
                Kategori &amp; Tag Pilihan
              </h2>
            </div>
            <span className="text-[9px] font-mono text-[#57606A]">
              Ketuk untuk Rank
            </span>
          </div>

          <div className="space-y-2">
            {choiceFields.map((field) => {
              let selectedOptions: string[] = [];
              if (field.type === 'multi_choice') {
                selectedOptions = video.multiChoices?.[field.id] || [];
              } else if (field.type === 'single_choice') {
                const val = video.singleChoices?.[field.id];
                if (val && typeof val === 'string' && val.trim()) {
                  selectedOptions = [val.trim()];
                }
              }

              if (selectedOptions.length === 0) return null;

              return (
                <div key={field.id} className="space-y-1">
                  <span className="text-[10px] font-mono text-[#8B949E] block uppercase">
                    {field.label}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOptions.map((opt) => {
                      const desc = field.optionDescriptions?.[opt];
                      return (
                        <div key={opt} className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => onSelectFilterTag(field.id, opt)}
                            className="px-2 py-1 rounded bg-[#111319] hover:bg-[#212631] border border-[#30363D] hover:border-[#E5A93C]/50 text-[#F0F6FC] text-xs font-mono transition flex items-center gap-1 active:scale-95 group cursor-pointer"
                          >
                            <Trophy className="w-3 h-3 text-[#E5A93C]" />
                            <span>{opt}</span>
                            <span className="text-[10px] text-[#E5A93C]">
                              ➔
                            </span>
                          </button>
                          {desc && (
                            <p className="text-[10px] font-mono text-[#8B949E] pl-1 leading-relaxed max-w-sm">
                              {desc}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rincian Penilaian Folder & Parameter */}
      <div className="p-3 rounded-md bg-[#181B22] border border-[#30363D] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#E5A93C]" />
            <h2 className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
              Evaluasi &amp; Parameter
            </h2>
          </div>
          <div className="flex items-center gap-1 font-mono text-xs">
            <span className="text-[#8B949E]">Skor:</span>
            <span className="font-bold text-[#E5A93C]">{overallScore.toFixed(1)}</span>
          </div>
        </div>

        <div className="space-y-1.5 pt-0.5">
          {(video.ratingFolders || []).map((folder) => {
            const isFolderOpen = openFolders[folder.id];
            const folderAvg =
              folder.items.length > 0
                ? folder.items.reduce((sum, it) => sum + (it.score || 0), 0) / folder.items.length
                : 0;

            return (
              <div
                key={folder.id}
                className="rounded bg-[#111319] border border-[#30363D] overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => toggleFolder(folder.id)}
                  className="w-full flex items-center justify-between p-2 text-left hover:bg-[#212631] transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    <span className="font-medium text-xs text-[#F0F6FC] truncate">{folder.name}</span>
                    <span className="text-[10px] font-mono text-[#8B949E] shrink-0">
                      ({folder.items.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono">
                    <span className="text-xs font-bold text-[#E5A93C] bg-[#181B22] px-1.5 py-0.5 rounded border border-[#30363D]">
                      {folderAvg.toFixed(1)}
                    </span>
                    {isFolderOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#8B949E]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#8B949E]" />
                    )}
                  </div>
                </button>

                {isFolderOpen && (
                  <div className="p-2 bg-[#0F1117] border-t border-[#30363D] space-y-1.5 animate-in fade-in">
                    {folder.items.map((item, iIdx) => (
                      <div
                        key={item.id}
                        className="p-2 rounded bg-[#181B22] border border-[#30363D]/70 space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-medium text-[#F0F6FC]">
                              {iIdx + 1}. {item.name}
                            </h4>
                            {item.description && (
                              <p className="text-[10px] font-mono text-[#8B949E] leading-relaxed mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-mono font-bold text-[#E5A93C] shrink-0">
                            {item.score}/100
                          </span>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="w-full h-1 rounded-full bg-[#111319] overflow-hidden">
                          <div
                            className="h-full bg-[#E5A93C] rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Catatan / Catatan Ulasan */}
      {video.notes && (
        <div className="p-3 rounded-md bg-[#181B22] border border-[#30363D] space-y-1.5">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#E5A93C]" />
            <h2 className="text-[10px] font-mono uppercase tracking-wider text-[#8B949E]">
              Catatan &amp; Ulasan
            </h2>
          </div>
          <p className="text-xs text-[#E2E2EB] leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-[#E5A93C]/80">
            {video.notes}
          </p>
        </div>
      )}
    </div>
  );
};
