import React from 'react';
import { Star } from 'lucide-react';

interface RatingBadgeProps {
  score: number | null | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
  className?: string;
}

export const getRatingColorInfo = (score: number | null | undefined) => {
  if (score === null || score === undefined || isNaN(score)) {
    return {
      bg: 'bg-slate-800/90',
      text: 'text-slate-400',
      border: 'border-slate-700',
      glow: 'shadow-none',
      label: 'N/A',
      desc: 'Belum Dinilai',
    };
  }

  if (score >= 80) {
    return {
      bg: 'bg-emerald-500',
      text: 'text-emerald-950 font-black',
      border: 'border-emerald-300',
      glow: 'shadow-md shadow-emerald-500/30',
      label: `${Math.round(score)}`,
      desc: 'Luar Biasa',
    };
  }

  if (score >= 50) {
    return {
      bg: 'bg-amber-500',
      text: 'text-amber-950 font-black',
      border: 'border-amber-300',
      glow: 'shadow-md shadow-amber-500/30',
      label: `${Math.round(score)}`,
      desc: 'Cukup Bagus',
    };
  }

  return {
    bg: 'bg-rose-500',
    text: 'text-white font-black',
    border: 'border-rose-300',
    glow: 'shadow-md shadow-rose-500/30',
    label: `${Math.round(score)}`,
    desc: 'Di Bawah Standar',
  };
};

export const RatingBadge: React.FC<RatingBadgeProps> = ({
  score,
  size = 'md',
  showIcon = false,
  className = '',
}) => {
  const color = getRatingColorInfo(score);

  const sizeClasses = {
    xs: 'h-6 min-w-6 px-1.5 text-[11px] rounded-md font-bold',
    sm: 'h-7 min-w-7 px-2 text-xs rounded-lg font-bold',
    md: 'h-8 min-w-8 px-2.5 text-xs sm:text-sm rounded-xl font-black',
    lg: 'h-11 min-w-11 px-3 text-base rounded-2xl font-black',
    xl: 'h-14 min-w-14 px-4 text-xl rounded-2xl font-black',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5',
  };

  return (
    <div
      className={`inline-flex items-center justify-center gap-1 border ${color.bg} ${color.text} ${color.border} ${color.glow} ${sizeClasses[size]} ${className} select-none transition-all`}
    >
      {showIcon && score !== null && score !== undefined && (
        <Star className={`${iconSizes[size]} fill-current`} />
      )}
      <span>{color.label}</span>
    </div>
  );
};
