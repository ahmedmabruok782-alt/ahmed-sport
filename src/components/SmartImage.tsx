import { useState } from 'react';
import { Shield, Trophy, User } from 'lucide-react';
import stadiumNightImg from '../assets/images/hero_stadium_night_1793480150104.jpg';
import footballPitchImg from '../assets/images/news_football_pitch_1793480150789.jpg';
import tacticalArenaImg from '../assets/images/news_tactical_arena_1793480151533.jpg';

export const EDITORIAL_IMAGES = {
  stadiumNight: stadiumNightImg,
  footballPitch: footballPitchImg,
  tacticalArena: tacticalArenaImg,
};

interface SmartImageProps {
  src?: string;
  alt: string;
  kind?: 'team' | 'league' | 'player' | 'news';
  fallbackIndex?: number;
  className?: string;
}

export function SmartImage({
  src,
  alt,
  kind = 'team',
  fallbackIndex = 0,
  className = '',
}: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  const cleanSrc = (src || '').trim();
  const hasValidSrc =
    !failed &&
    cleanSrc.length > 0 &&
    (cleanSrc.startsWith('/') || cleanSrc.startsWith('http://') || cleanSrc.startsWith('https://') || cleanSrc.startsWith('data:'));

  if (hasValidSrc) {
    return (
      <img
        src={cleanSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={className}
      />
    );
  }

  if (kind === 'news') {
    const editorialPool = [footballPitchImg, tacticalArenaImg, stadiumNightImg];
    const chosen = editorialPool[Math.abs(fallbackIndex) % editorialPool.length];
    return (
      <img
        src={chosen}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={className}
      />
    );
  }

  const initial = (alt || 'M').trim().charAt(0).toUpperCase();

  return (
    <span
      className={`inline-flex items-center justify-center bg-[var(--mk-surface-strong)] text-[var(--mk-muted)] select-none shrink-0 ${className}`}
      aria-label={alt}
    >
      {kind === 'league' ? (
        <Trophy className="w-3/5 h-3/5 text-[var(--mk-accent)]" strokeWidth={1.8} />
      ) : kind === 'player' ? (
        <User className="w-3/5 h-3/5" strokeWidth={1.8} />
      ) : initial ? (
        <span className="text-xs font-bold text-[var(--mk-text)]">{initial}</span>
      ) : (
        <Shield className="w-3/5 h-3/5" strokeWidth={1.8} />
      )}
    </span>
  );
}
