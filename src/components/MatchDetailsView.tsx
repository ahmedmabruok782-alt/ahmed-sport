import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  MapPin,
  Mic,
  Radio,
  Tv,
  UserCheck,
} from 'lucide-react';
import type {
  Language,
  LineupPlayer,
  MatchDetailsPayload,
  MatchItem,
} from '../types/koora';
import type { TranslationKey } from '../i18n/translations';
import { computeLiveClockText, kooraApi } from '../utils/api';
import { EDITORIAL_IMAGES, SmartImage } from './SmartImage';

interface MatchDetailsViewProps {
  matchId: string;
  initialMatch?: MatchItem | null;
  lang: Language;
  nowMs: number;
  t: (key: TranslationKey) => string;
  onBack: () => void;
  onSelectTeam: (teamId: string, teamName: string) => void;
  onSelectCompetition: (compId: string) => void;
}

type DetailTab = 'events' | 'lineup' | 'statistics' | 'details';

function isSafeClipUrl(raw?: string): boolean {
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'x.com' ||
        parsed.hostname === 'www.x.com' ||
        parsed.hostname === 'twitter.com' ||
        parsed.hostname === 'www.twitter.com')
    );
  } catch {
    return false;
  }
}

export function MatchDetailsView({
  matchId,
  initialMatch,
  lang,
  nowMs,
  t,
  onBack,
  onSelectTeam,
  onSelectCompetition,
}: MatchDetailsViewProps) {
  const [payload, setPayload] = useState<MatchDetailsPayload | null>(
    initialMatch ? { match: initialMatch } : null
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('events');
  const [showPitchRadar, setShowPitchRadar] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const res = await kooraApi.getMatchDetails(matchId, lang);
        if (!cancelled && res.details) {
          setPayload(res.details);
          if (
            (!res.details.events || res.details.events.length === 0) &&
            res.details.lineup?.home?.starters?.length
          ) {
            setActiveTab('lineup');
          }
        }
      } catch {
        // Keep initialMatch fallback if request fails
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 25_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [matchId, lang]);

  const match = payload?.match || initialMatch;
  if (!match) {
    return (
      <div className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl p-8 text-center">
        <p className="text-sm text-[var(--mk-muted)]">{t('loading')}</p>
      </div>
    );
  }

  const state = (match.state || '').toLowerCase();
  const isLive = state === 'live';
  const isHalftime = state === 'halftime';
  const isFinished = state === 'finished';
  const hasScore = isLive || isHalftime || isFinished;
  const homeScore = Number(match.home_team.score ?? 0);
  const awayScore = Number(match.away_team.score ?? 0);
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  const statusText = isLive
    ? t('live')
    : isHalftime
    ? t('halftime')
    : isFinished
    ? t('finished')
    : t('upcoming');

  const events = payload?.events || [];
  const homeLineup = payload?.lineup?.home;
  const awayLineup = payload?.lineup?.away;
  const statsHome = payload?.statistics?.home;
  const statsAway = payload?.statistics?.away;

  const groupPlayersByLine = (players: LineupPlayer[] = []) => {
    const gk = players.filter((p) => p.line === 'G' || p.position === 'GK');
    const def = players.filter((p) => p.line === 'D');
    const mid = players.filter((p) => p.line === 'M');
    const fwd = players.filter((p) => p.line === 'F');
    const categorizedIds = new Set([...gk, ...def, ...mid, ...fwd].map((p) => p.id));
    const rest = players.filter((p) => !categorizedIds.has(p.id));
    if (rest.length > 0 && mid.length === 0) {
      return [players.slice(0, 1), players.slice(1, 5), players.slice(5, 8), players.slice(8, 11)].filter(
        (r) => r.length > 0
      );
    }
    return [gk, def, mid, fwd].filter((row) => row.length > 0);
  };

  const statRows: { label: string; homeVal: number; awayVal: number; suffix?: string }[] =
    statsHome && statsAway
      ? [
          {
            label: t('possession'),
            homeVal: Number(statsHome.ball_possession ?? 50),
            awayVal: Number(statsAway.ball_possession ?? 50),
            suffix: '%',
          },
          {
            label: t('totalShots'),
            homeVal: Number(statsHome.total_shots ?? 0),
            awayVal: Number(statsAway.total_shots ?? 0),
          },
          {
            label: t('shotsOnTarget'),
            homeVal: Number(statsHome.shots_on_goal ?? 0),
            awayVal: Number(statsAway.shots_on_goal ?? 0),
          },
          {
            label: t('totalPasses'),
            homeVal: Number(statsHome.total_passes ?? 0),
            awayVal: Number(statsAway.total_passes ?? 0),
          },
          {
            label: t('passAccuracy'),
            homeVal: Number(statsHome.passes_percentage ?? 0),
            awayVal: Number(statsAway.passes_percentage ?? 0),
            suffix: '%',
          },
          {
            label: t('corners'),
            homeVal: Number(statsHome.corner_kicks ?? 0),
            awayVal: Number(statsAway.corner_kicks ?? 0),
          },
          {
            label: t('fouls'),
            homeVal: Number(statsHome.fouls ?? 0),
            awayVal: Number(statsAway.fouls ?? 0),
          },
          {
            label: t('offsides'),
            homeVal: Number(statsHome.offsides ?? 0),
            awayVal: Number(statsAway.offsides ?? 0),
          },
          {
            label: t('saves'),
            homeVal: Number(statsHome.goalkeeper_saves ?? 0),
            awayVal: Number(statsAway.goalkeeper_saves ?? 0),
          },
          {
            label: t('yellowCards'),
            homeVal: Number(statsHome.yellow_cards ?? 0),
            awayVal: Number(statsAway.yellow_cards ?? 0),
          },
        ]
      : [];

  return (
    <div className="space-y-5">
      {/* Top Action Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--mk-surface)] border border-[var(--mk-line)] text-xs sm:text-sm font-semibold text-[var(--mk-text)] hover:border-[var(--mk-line-strong)] transition-colors cursor-pointer"
        >
          <BackIcon className="w-4 h-4" />
          <span>{t('backToMatches')}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowPitchRadar((prev) => !prev)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
            showPitchRadar
              ? 'bg-[var(--mk-surface-strong)] text-[var(--mk-text)] border border-[var(--mk-line-strong)]'
              : 'bg-[var(--mk-accent)] text-[var(--mk-on-accent)] hover:bg-[var(--mk-accent-hover)]'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>{t('liveCenter')}</span>
        </button>
      </div>

      {/* Match Scoreboard Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--mk-line)] text-white">
        <img
          src={EDITORIAL_IMAGES.stadiumNight}
          alt={match.stadium || match.tournament?.name || 'Stadium'}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/78 to-slate-950/68" />

        <div className="relative p-5 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <button
              type="button"
              onClick={() => match.tournament?.id && onSelectCompetition(match.tournament.id)}
              className="inline-flex items-center gap-2 hover:text-white transition-colors cursor-pointer"
            >
              <SmartImage
                src={match.tournament?.logo}
                alt={match.tournament?.name || ''}
                kind="league"
                className="w-4 h-4 object-contain"
              />
              <span className="font-semibold text-white">{match.tournament?.name}</span>
              {match.round && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{match.round}</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span>{payload?.stadium?.name || match.stadium || ''}</span>
              <span aria-hidden="true">·</span>
              <span dir="ltr" className="mk-mono">
                {match.date}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 items-center gap-3 sm:gap-6">
            {/* Home Club */}
            <button
              type="button"
              onClick={() => onSelectTeam(match.home_team.id, match.home_team.name)}
              className="flex flex-col items-center gap-3 group cursor-pointer"
            >
              <SmartImage
                src={match.home_team.logo}
                alt={match.home_team.name}
                kind="team"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full bg-white/10 p-2 backdrop-blur-xs"
              />
              <span className="text-sm sm:text-lg font-bold text-white group-hover:underline text-center">
                {match.home_team.name}
              </span>
            </button>

            {/* Score & Clock: inline-flex keeps homeScore adjacent to home_team and awayScore adjacent to away_team */}
            <div className="flex flex-col items-center justify-center text-center">
              {hasScore ? (
                <div className="mk-mono inline-flex items-center justify-center gap-2.5 sm:gap-3.5 text-3xl sm:text-5xl font-bold tracking-tight text-white">
                  <span dir="ltr">{homeScore}</span>
                  <span className="text-slate-400 font-normal">-</span>
                  <span dir="ltr">{awayScore}</span>
                </div>
              ) : (
                <div dir="ltr" className="mk-mono text-2xl sm:text-4xl font-bold text-white">
                  {match.time}
                </div>
              )}

              {isLive ? (
                <div
                  dir="ltr"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-rose-300 mk-mono"
                >
                  <Clock className="w-4 h-4" />
                  <span>{computeLiveClockText(match, nowMs)}</span>
                </div>
              ) : (
                <div className="mt-2 text-xs sm:text-sm font-semibold text-slate-200">
                  {statusText}
                </div>
              )}
            </div>

            {/* Away Club */}
            <button
              type="button"
              onClick={() => onSelectTeam(match.away_team.id, match.away_team.name)}
              className="flex flex-col items-center gap-3 group cursor-pointer"
            >
              <SmartImage
                src={match.away_team.logo}
                alt={match.away_team.name}
                kind="team"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full bg-white/10 p-2 backdrop-blur-xs"
              />
              <span className="text-sm sm:text-lg font-bold text-white group-hover:underline text-center">
                {match.away_team.name}
              </span>
            </button>
          </div>

          <div className="pt-4 border-t border-white/15 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {t('channel')}: {match.broadcast?.channel || t('channelUnknown')}
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {t('commentator')}: {match.broadcast?.commentator || t('commentatorUnknown')}
              </span>
            </span>
            {payload?.referee?.name && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {t('referee')}: {payload.referee.name}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Clean Safe Live Pitch Radar (No third-party external ad stream links) */}
      {showPitchRadar && (
        <section className="rounded-2xl bg-[var(--mk-surface)] border border-[var(--mk-line)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--mk-line)] flex items-center gap-2">
            <Radio className="w-4 h-4 text-[var(--mk-live)]" />
            <span className="text-sm font-bold text-[var(--mk-text)]">{t('liveCenter')}</span>
          </div>

          <div className="aspect-video w-full bg-emerald-950 relative flex flex-col items-center justify-center p-6 text-white overflow-hidden">
            <svg
              viewBox="0 0 800 450"
              className="absolute inset-0 w-full h-full opacity-35"
              aria-hidden="true"
            >
              <rect x="30" y="25" width="740" height="400" fill="none" stroke="#ffffff" strokeWidth="3" />
              <line x1="400" y1="25" x2="400" y2="425" stroke="#ffffff" strokeWidth="2.5" />
              <circle cx="400" cy="225" r="62" fill="none" stroke="#ffffff" strokeWidth="2.5" />
              <rect x="30" y="120" width="110" height="210" fill="none" stroke="#ffffff" strokeWidth="2.5" />
              <rect x="660" y="120" width="110" height="210" fill="none" stroke="#ffffff" strokeWidth="2.5" />
            </svg>

            <div className="relative z-10 max-w-lg w-full bg-slate-950/85 backdrop-blur-md border border-white/15 rounded-2xl p-5 text-center space-y-3">
              <p className="text-xs text-emerald-300 font-semibold">
                {match.tournament?.name} · {statusText}
              </p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <span className="font-bold text-sm sm:text-base truncate text-end">
                  {match.home_team.name}
                </span>
                {hasScore ? (
                  <div className="mk-mono inline-flex items-center justify-center gap-2 text-xl sm:text-2xl font-bold px-3 py-1 rounded-lg bg-white/10">
                    <span dir="ltr">{homeScore}</span>
                    <span>-</span>
                    <span dir="ltr">{awayScore}</span>
                  </div>
                ) : (
                  <span dir="ltr" className="mk-mono text-lg font-bold px-3 py-1 rounded-lg bg-white/10">
                    {match.time}
                  </span>
                )}
                <span className="font-bold text-sm sm:text-base truncate text-start">
                  {match.away_team.name}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {events.length > 0
                  ? `${lang === 'ar' ? 'آخر حدث مسجّل:' : 'Latest event:'} ${events[0].name} (${
                      events[0].player?.name || ''
                    })`
                  : `${t('channel')}: ${match.broadcast?.channel || t('channelUnknown')}`}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Segmented Match Center Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[var(--mk-surface)] border border-[var(--mk-line)] overflow-x-auto no-scrollbar">
        {(
          [
            { key: 'events', label: t('events') },
            { key: 'lineup', label: t('lineup') },
            { key: 'statistics', label: t('statistics') },
            { key: 'details', label: t('details') },
          ] as { key: DetailTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.key
                ? 'bg-[var(--mk-accent)] text-[var(--mk-on-accent)]'
                : 'text-[var(--mk-muted)] hover:text-[var(--mk-text)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Panel */}
      <div className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl p-4 sm:p-6">
        {loading && !payload?.events && !payload?.lineup ? (
          <div className="space-y-3 py-6">
            <div className="h-10 rounded-lg bg-[var(--mk-surface-soft)] animate-pulse" />
            <div className="h-10 rounded-lg bg-[var(--mk-surface-soft)] animate-pulse" />
            <div className="h-10 rounded-lg bg-[var(--mk-surface-soft)] animate-pulse" />
          </div>
        ) : activeTab === 'events' ? (
          events.length > 0 ? (
            <div className="divide-y divide-[var(--mk-line)]">
              {events.map((ev) => {
                const isHomeEvent = String(ev.team_id) === String(match.home_team.id);
                const safeClip = isSafeClipUrl(ev.video_url) ? ev.video_url : undefined;
                return (
                  <div
                    key={ev.id}
                    className="py-3.5 flex items-center justify-between gap-4 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        dir="ltr"
                        className="mk-mono text-xs font-bold px-2.5 py-1 rounded-md bg-[var(--mk-surface-soft)] text-[var(--mk-accent)] shrink-0"
                      >
                        {ev.minute}&apos;{ev.added ? `+${ev.added}` : ''}
                      </span>
                      <SmartImage
                        src={ev.player?.image}
                        alt={ev.player?.name || ev.name}
                        kind="player"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--mk-text)] truncate">
                          {ev.player?.name || ev.name}
                        </p>
                        <p className="text-xs text-[var(--mk-muted)] truncate">
                          {ev.name}
                          {ev.assist?.name ? ` · ${ev.assist.name}` : ''}
                          {' · '}
                          {isHomeEvent ? match.home_team.name : match.away_team.name}
                        </p>
                      </div>
                    </div>

                    {safeClip && (
                      <a
                        href={safeClip}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[var(--mk-accent)] hover:underline whitespace-nowrap shrink-0"
                      >
                        {lang === 'ar' ? 'مشاهدة اللقطة' : 'Watch Clip'}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-[var(--mk-muted)]">
              {lang === 'ar'
                ? 'لا توجد أحداث مسجلة لهذه المباراة حتى الآن.'
                : 'No match events recorded yet.'}
            </div>
          )
        ) : activeTab === 'lineup' ? (
          homeLineup?.starters?.length || awayLineup?.starters?.length ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[homeLineup, awayLineup].map((side, idx) => {
                  if (!side) return null;
                  const rows = groupPlayersByLine(side.starters);
                  return (
                    <div
                      key={side.team?.id || idx}
                      className="rounded-xl overflow-hidden border border-[var(--mk-line)]"
                    >
                      <div className="px-4 py-3 bg-[var(--mk-surface-soft)] border-b border-[var(--mk-line)] flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <SmartImage
                            src={side.team?.logo}
                            alt={side.team?.name || ''}
                            kind="team"
                            className="w-5 h-5 object-contain"
                          />
                          <span className="text-[var(--mk-text)]">{side.team?.name}</span>
                        </div>
                        <span dir="ltr" className="mk-mono text-[var(--mk-accent)]">
                          {side.formation || '4-3-3'}
                        </span>
                      </div>

                      <div className="bg-emerald-900/95 p-4 space-y-4 text-white min-h-[290px] flex flex-col justify-between">
                        {rows.map((row, rIdx) => (
                          <div
                            key={rIdx}
                            className="flex items-center justify-around gap-1.5"
                          >
                            {row.map((player) => (
                              <div
                                key={player.id}
                                className="flex flex-col items-center text-center max-w-[74px]"
                              >
                                <div className="relative">
                                  <span
                                    dir="ltr"
                                    className="mk-mono w-8 h-8 rounded-full bg-slate-950/85 border border-white/40 flex items-center justify-center text-xs font-bold"
                                  >
                                    {player.number || '—'}
                                  </span>
                                  {player.rating && Number(player.rating) > 0 && (
                                    <span
                                      dir="ltr"
                                      className="mk-mono absolute -top-1.5 -end-2 px-1 rounded bg-amber-400 text-slate-950 text-[10px] font-bold"
                                    >
                                      {player.rating}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] font-semibold mt-1 truncate w-full">
                                  {player.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>

                      {side.coach?.name && (
                        <div className="px-4 py-2.5 bg-[var(--mk-surface-soft)] border-t border-[var(--mk-line)] text-xs text-[var(--mk-muted)] flex items-center justify-between">
                          <span>{t('coach')}</span>
                          <span className="font-semibold text-[var(--mk-text)]">
                            {side.coach.name}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-[var(--mk-muted)]">
              {lang === 'ar'
                ? 'لم تُعلن التشكيلة الرسمية للمباراة بعد.'
                : 'Official starting lineups have not been announced yet.'}
            </div>
          )
        ) : activeTab === 'statistics' ? (
          statRows.length > 0 ? (
            <div className="space-y-4">
              {statRows.map((row) => {
                const total = row.homeVal + row.awayVal;
                const homePct = total > 0 ? Math.round((row.homeVal / total) * 100) : 50;
                const awayPct = 100 - homePct;
                return (
                  <div key={row.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span dir="ltr" className="mk-mono font-bold text-[var(--mk-text)]">
                        {row.homeVal}
                        {row.suffix || ''}
                      </span>
                      <span className="text-[var(--mk-muted)] font-medium">{row.label}</span>
                      <span dir="ltr" className="mk-mono font-bold text-[var(--mk-text)]">
                        {row.awayVal}
                        {row.suffix || ''}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--mk-surface-strong)] overflow-hidden flex gap-0.5">
                      <div
                        className="h-full bg-[var(--mk-accent)] transition-opacity"
                        style={{ width: `${homePct}%` }}
                      />
                      <div className="h-full bg-slate-300" style={{ width: `${awayPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-[var(--mk-muted)]">
              {lang === 'ar'
                ? 'تتوفر إحصائيات المباراة فور انطلاق اللقاء.'
                : 'Match statistics become available after kickoff.'}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] flex items-center justify-between">
              <span className="text-[var(--mk-muted)] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--mk-accent)]" />
                {t('stadium')}
              </span>
              <span className="font-semibold text-[var(--mk-text)]">
                {payload?.stadium?.name || match.stadium || '—'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] flex items-center justify-between">
              <span className="text-[var(--mk-muted)] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[var(--mk-accent)]" />
                {t('referee')}
              </span>
              <span className="font-semibold text-[var(--mk-text)]">
                {payload?.referee?.name || '—'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] flex items-center justify-between">
              <span className="text-[var(--mk-muted)] flex items-center gap-2">
                <Tv className="w-4 h-4 text-[var(--mk-accent)]" />
                {t('channel')}
              </span>
              <span className="font-semibold text-[var(--mk-text)]">
                {match.broadcast?.channel || t('channelUnknown')}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] flex items-center justify-between">
              <span className="text-[var(--mk-muted)] flex items-center gap-2">
                <Mic className="w-4 h-4 text-[var(--mk-accent)]" />
                {t('commentator')}
              </span>
              <span className="font-semibold text-[var(--mk-text)]">
                {match.broadcast?.commentator || t('commentatorUnknown')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
