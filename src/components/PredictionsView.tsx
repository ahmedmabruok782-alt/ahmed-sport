import { useEffect, useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import type { Language, MatchItem, UserPrediction } from '../types/koora';
import type { TranslationKey } from '../i18n/translations';
import { getRiyadhDateString, kooraApi } from '../utils/api';
import { formatTeamScorePair } from './PushNotificationBanner';
import { SmartImage } from './SmartImage';

interface PredictionsViewProps {
  lang: Language;
  t: (key: TranslationKey) => string;
  onShowToast: (msg: string) => void;
  onSelectMatch: (match: MatchItem) => void;
}

const STORAGE_KEY = 'ahmedSportPredictionsV1';

export function PredictionsView({
  lang,
  t,
  onShowToast,
  onSelectMatch,
}: PredictionsViewProps) {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { home: number; away: number }>>({});
  const [saved, setSaved] = useState<Record<string, UserPrediction>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const today = getRiyadhDateString(0);
    const tomorrow = getRiyadhDateString(1);

    Promise.all([
      kooraApi.getMatches(today, 'all', lang),
      kooraApi.getMatches(tomorrow, 'all', lang),
    ])
      .then(([resToday, resTom]) => {
        if (cancelled) return;
        const combined = [...(resToday.matches || []), ...(resTom.matches || [])];
        const unique = Array.from(new Map(combined.map((m) => [m.id, m])).values());
        setMatches(unique.slice(0, 16));
      })
      .catch(() => {
        if (!cancelled) setMatches([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lang]);

  const getDraft = (matchId: string) => {
    if (drafts[matchId]) return drafts[matchId];
    if (saved[matchId]) {
      return { home: saved[matchId].homeScore, away: saved[matchId].awayScore };
    }
    return { home: 1, away: 1 };
  };

  const adjustScore = (matchId: string, side: 'home' | 'away', delta: number) => {
    const current = getDraft(matchId);
    const nextVal = Math.max(0, Math.min(15, current[side] + delta));
    setDrafts((prev) => ({
      ...prev,
      [matchId]: { ...current, [side]: nextVal },
    }));
  };

  const savePick = (match: MatchItem) => {
    const current = getDraft(match.id);
    const entry: UserPrediction = {
      matchId: match.id,
      homeScore: current.home,
      awayScore: current.away,
      savedAt: Date.now(),
      homeName: match.home_team.name,
      awayName: match.away_team.name,
      tournamentName: match.tournament?.name || '',
    };
    const next = { ...saved, [match.id]: entry };
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
    const pair = formatTeamScorePair(
      match.home_team.name,
      current.home,
      match.away_team.name,
      current.away
    );
    onShowToast(
      lang === 'ar' ? `تم حفظ توقعك: ${pair}` : `Prediction saved: ${pair}`
    );
  };

  const totalPoints = matches.reduce((sum, m) => {
    const pick = saved[m.id];
    if (!pick || m.state !== 'finished') return sum;
    const realH = Number(m.home_team.score ?? 0);
    const realA = Number(m.away_team.score ?? 0);
    if (pick.homeScore === realH && pick.awayScore === realA) return sum + 3;
    const realSign = Math.sign(realH - realA);
    const pickSign = Math.sign(pick.homeScore - pick.awayScore);
    if (realSign === pickSign) return sum + 1;
    return sum;
  }, 0);

  return (
    <div className="space-y-5">
      <div className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--mk-text)]">{t('predictionsTitle')}</h1>
          <p className="text-xs sm:text-sm text-[var(--mk-muted)] mt-1 max-w-2xl">
            {t('predictionsSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-6 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[var(--mk-line)]">
          <div>
            <span className="block text-xs text-[var(--mk-muted)]">{t('predictionsSavedCount')}</span>
            <span dir="ltr" className="mk-mono text-xl font-bold text-[var(--mk-text)]">
              {Object.keys(saved).length}
            </span>
          </div>
          <div>
            <span className="block text-xs text-[var(--mk-muted)]">{t('yourPoints')}</span>
            <span dir="ltr" className="mk-mono text-xl font-bold text-[var(--mk-accent)]">
              {totalPoints}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-[var(--mk-surface)] border border-[var(--mk-line)] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((match) => {
            const draft = getDraft(match.id);
            const existing = saved[match.id];
            const isLocked =
              match.state === 'live' || match.state === 'halftime' || match.state === 'finished';
            const isExactSave =
              existing && existing.homeScore === draft.home && existing.awayScore === draft.away;

            const realHome = Number(match.home_team.score ?? 0);
            const realAway = Number(match.away_team.score ?? 0);

            return (
              <div
                key={match.id}
                className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-center justify-between text-xs text-[var(--mk-muted)]">
                  <span className="font-semibold text-[var(--mk-text)] truncate">
                    {match.tournament?.name}
                  </span>
                  <button
                    type="button"
                    dir="ltr"
                    onClick={() => onSelectMatch(match)}
                    className="mk-mono hover:text-[var(--mk-accent)] transition-colors cursor-pointer"
                  >
                    {match.date} · {match.time}
                  </button>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  {/* Home */}
                  <div className="flex flex-col items-center gap-2 text-center">
                    <SmartImage
                      src={match.home_team.logo}
                      alt={match.home_team.name}
                      kind="team"
                      className="w-11 h-11 object-contain rounded-full"
                    />
                    <span className="text-xs sm:text-sm font-bold text-[var(--mk-text)] line-clamp-1">
                      {match.home_team.name}
                    </span>
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => adjustScore(match.id, 'home', -1)}
                        aria-label="تقليل أهداف المضيف"
                        className="w-7 h-7 rounded-lg bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] flex items-center justify-center disabled:opacity-40 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span dir="ltr" className="mk-mono w-7 text-center text-base font-bold text-[var(--mk-text)]">
                        {draft.home}
                      </span>
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => adjustScore(match.id, 'home', 1)}
                        aria-label="زيادة أهداف المضيف"
                        className="w-7 h-7 rounded-lg bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] flex items-center justify-center disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-[var(--mk-muted)]">VS</div>

                  {/* Away */}
                  <div className="flex flex-col items-center gap-2 text-center">
                    <SmartImage
                      src={match.away_team.logo}
                      alt={match.away_team.name}
                      kind="team"
                      className="w-11 h-11 object-contain rounded-full"
                    />
                    <span className="text-xs sm:text-sm font-bold text-[var(--mk-text)] line-clamp-1">
                      {match.away_team.name}
                    </span>
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => adjustScore(match.id, 'away', -1)}
                        aria-label="تقليل أهداف الضيف"
                        className="w-7 h-7 rounded-lg bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] flex items-center justify-center disabled:opacity-40 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span dir="ltr" className="mk-mono w-7 text-center text-base font-bold text-[var(--mk-text)]">
                        {draft.away}
                      </span>
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => adjustScore(match.id, 'away', 1)}
                        aria-label="زيادة أهداف الضيف"
                        className="w-7 h-7 rounded-lg bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] flex items-center justify-center disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--mk-line)] flex items-center justify-between gap-3">
                  {isLocked ? (
                    <span className="text-xs text-[var(--mk-muted)] inline-flex items-center gap-1.5">
                      <span>{lang === 'ar' ? 'النتيجة الفعلية:' : 'Actual score:'}</span>
                      <span className="mk-mono font-bold text-[var(--mk-text)] inline-flex items-center gap-1">
                        <span dir="ltr">{realHome}</span>
                        <span>-</span>
                        <span dir="ltr">{realAway}</span>
                      </span>
                    </span>
                  ) : existing ? (
                    <span className="text-xs text-[var(--mk-muted)] inline-flex items-center gap-1.5">
                      <span>{t('savedPrediction')}:</span>
                      <span className="mk-mono font-bold text-[var(--mk-text)] inline-flex items-center gap-1">
                        <span dir="ltr">{existing.homeScore}</span>
                        <span>-</span>
                        <span dir="ltr">{existing.awayScore}</span>
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--mk-muted)]">
                      {lang === 'ar' ? 'مفتوح للتوقع قبل صافرة البداية' : 'Open until kickoff'}
                    </span>
                  )}

                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => savePick(match)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        isExactSave
                          ? 'bg-[var(--mk-surface-soft)] text-[var(--mk-success)] border border-[var(--mk-line)]'
                          : 'bg-[var(--mk-accent)] text-[var(--mk-on-accent)] hover:bg-[var(--mk-accent-hover)]'
                      }`}
                    >
                      {isExactSave && <Check className="w-3.5 h-3.5" />}
                      <span>{isExactSave ? t('savedPrediction') : t('savePrediction')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
