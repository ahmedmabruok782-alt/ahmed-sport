import type { KeyboardEvent, MouseEvent } from 'react';
import { Bell, BellRing, Clock, Mic, Tv } from 'lucide-react';
import type { MatchItem } from '../types/koora';
import type { TranslationKey } from '../i18n/translations';
import { computeLiveClockText } from '../utils/api';
import { SmartImage } from './SmartImage';

interface MatchCardProps {
  match: MatchItem;
  nowMs: number;
  showTournamentHeader?: boolean;
  isNotified?: boolean;
  t: (key: TranslationKey) => string;
  onSelectMatch: (match: MatchItem) => void;
  onToggleNotify?: (match: MatchItem) => void;
}

export function MatchCard({
  match,
  nowMs,
  showTournamentHeader = true,
  isNotified = false,
  t,
  onSelectMatch,
  onToggleNotify,
}: MatchCardProps) {
  const state = (match.state || '').toLowerCase();
  const isLive = state === 'live';
  const isHalftime = state === 'halftime';
  const isFinished = state === 'finished';
  const hasScore = isLive || isHalftime || isFinished;

  const homeScore = Number(match.home_team.score ?? 0);
  const awayScore = Number(match.away_team.score ?? 0);

  const statusText = (() => {
    if (isLive) return t('live');
    if (isHalftime) return t('halftime');
    if (isFinished) return t('finished');
    if (state === 'postponed') return t('postponed');
    if (state === 'cancelled') return t('cancelled');
    if (state === 'soon') return t('soon');
    return t('upcoming');
  })();

  const channelName = match.broadcast?.channel?.trim() || t('channelUnknown');
  const commentatorName = match.broadcast?.commentator?.trim() || t('commentatorUnknown');

  const handleCardKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectMatch(match);
    }
  };

  const handleNotifyClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onToggleNotify?.(match);
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelectMatch(match)}
      onKeyDown={handleCardKeyDown}
      className="group w-full text-start bg-[var(--mk-surface)] hover:bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] hover:border-[var(--mk-line-strong)] rounded-xl px-4 sm:px-5 py-3.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--mk-accent)]"
    >
      {/* Clean Unboxed Top Metadata Line */}
      {showTournamentHeader && (
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[var(--mk-line)] text-xs text-[var(--mk-muted)]">
          <div className="flex items-center gap-2 min-w-0">
            <SmartImage
              src={match.tournament?.logo}
              alt={match.tournament?.name || ''}
              kind="league"
              className="w-4 h-4 object-contain shrink-0"
            />
            <span className="font-semibold text-[var(--mk-text)] truncate">
              {match.tournament?.name}
            </span>
            {match.round && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{match.round}</span>
              </>
            )}
          </div>
          <span
            className={`text-xs font-semibold shrink-0 ${
              isLive
                ? 'text-[var(--mk-live)]'
                : isHalftime
                ? 'text-[var(--mk-warning)]'
                : 'text-[var(--mk-muted)]'
            }`}
          >
            {statusText}
          </span>
        </div>
      )}

      {/* Main Matchup Grid:
          Col 1 (inline-start: Right in RTL, Left in LTR) = home_team
          Col 2 (center flex: item 1 is homeScore next to home_team, item 3 is awayScore next to away_team)
          Col 3 (inline-end: Left in RTL, Right in LTR) = away_team */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
        {/* Home Team */}
        <div className="flex flex-col sm:flex-row items-center sm:justify-end gap-2 sm:gap-3 min-w-0 text-center sm:text-end">
          <span className="order-2 sm:order-1 font-bold text-sm sm:text-base text-[var(--mk-text)] group-hover:text-[var(--mk-accent)] transition-colors line-clamp-1">
            {match.home_team.name}
          </span>
          <SmartImage
            src={match.home_team.logo}
            alt={match.home_team.name}
            kind="team"
            className="order-1 sm:order-2 w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-full p-0.5"
          />
        </div>

        {/* Score / Kickoff Center */}
        <div className="flex flex-col items-center justify-center min-w-[108px] sm:min-w-[128px] px-2">
          {hasScore ? (
            <div
              className={`mk-mono inline-flex items-center justify-center gap-2 text-xl sm:text-2xl font-bold tracking-tight ${
                isLive ? 'text-[var(--mk-live)]' : 'text-[var(--mk-score)]'
              }`}
            >
              <span dir="ltr">{homeScore}</span>
              <span className="text-[var(--mk-muted)] font-normal">-</span>
              <span dir="ltr">{awayScore}</span>
            </div>
          ) : (
            <time
              dir="ltr"
              dateTime={match.start_at || ''}
              className="mk-mono text-base sm:text-lg font-bold text-[var(--mk-text)]"
            >
              {match.time || '—'}
            </time>
          )}

          {isLive ? (
            <div
              dir="ltr"
              className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-[var(--mk-live)] mk-mono"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{computeLiveClockText(match, nowMs)}</span>
              {Number(match.added_minutes || 0) > 0 && (
                <span>+{match.added_minutes}</span>
              )}
            </div>
          ) : !showTournamentHeader ? (
            <span
              className={`text-xs mt-1 font-medium ${
                isHalftime ? 'text-[var(--mk-warning)]' : 'text-[var(--mk-muted)]'
              }`}
            >
              {statusText}
            </span>
          ) : hasScore ? (
            <span dir="ltr" className="text-[11px] text-[var(--mk-muted)] mt-0.5 mk-mono">
              {match.time}
            </span>
          ) : (
            <span className="text-[11px] text-[var(--mk-muted)] mt-0.5">{statusText}</span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex flex-col sm:flex-row items-center sm:justify-start gap-2 sm:gap-3 min-w-0 text-center sm:text-start">
          <SmartImage
            src={match.away_team.logo}
            alt={match.away_team.name}
            kind="team"
            className="w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-full p-0.5"
          />
          <span className="font-bold text-sm sm:text-base text-[var(--mk-text)] group-hover:text-[var(--mk-accent)] transition-colors line-clamp-1">
            {match.away_team.name}
          </span>
        </div>
      </div>

      {/* Footer Metadata + Notify Me Button */}
      <div className="mt-3 pt-2.5 border-t border-[var(--mk-line)] flex items-center justify-between gap-3 text-xs text-[var(--mk-muted)]">
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <span className="inline-flex items-center gap-1.5 truncate">
            <Tv className="w-3.5 h-3.5 text-[var(--mk-accent)] shrink-0" />
            <span>{channelName}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5 truncate">
            <Mic className="w-3.5 h-3.5 shrink-0" />
            <span>{commentatorName}</span>
          </span>
          {match.stadium && (
            <>
              <span aria-hidden="true" className="hidden md:inline">
                ·
              </span>
              <span className="hidden md:inline truncate text-[11px]">{match.stadium}</span>
            </>
          )}
        </div>

        {onToggleNotify && (
          <button
            type="button"
            onClick={handleNotifyClick}
            aria-pressed={isNotified}
            aria-label={`${isNotified ? t('notifying') : t('notifyMe')} — ${match.home_team.name} / ${match.away_team.name}`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[34px] focus-visible:outline-2 focus-visible:outline-[var(--mk-accent)] ${
              isNotified
                ? 'bg-[var(--mk-accent-soft)] border-[var(--mk-accent)] text-[var(--mk-accent)]'
                : 'bg-[var(--mk-surface-soft)] border-[var(--mk-line)] text-[var(--mk-muted)] hover:text-[var(--mk-text)] hover:border-[var(--mk-line-strong)]'
            }`}
          >
            {isNotified ? (
              <BellRing className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Bell className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{isNotified ? t('notifying') : t('notifyMe')}</span>
          </button>
        )}
      </div>
    </article>
  );
}
