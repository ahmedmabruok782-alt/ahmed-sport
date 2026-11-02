import { useEffect, useState } from 'react';
import type { Language, ScorerRow, TournamentSummary } from '../types/koora';
import type { TranslationKey } from '../i18n/translations';
import { kooraApi } from '../utils/api';
import { SmartImage } from './SmartImage';

interface ScorersViewProps {
  competitions: TournamentSummary[];
  selectedCompetitionId: string;
  lang: Language;
  t: (key: TranslationKey) => string;
  onChangeCompetition: (id: string) => void;
}

export function ScorersView({
  competitions,
  selectedCompetitionId,
  lang,
  t,
  onChangeCompetition,
}: ScorersViewProps) {
  const [scorers, setScorers] = useState<ScorerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const activeId = selectedCompetitionId || competitions[0]?.id || '938652';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    kooraApi
      .getScorers(activeId, lang)
      .then((res) => {
        if (!cancelled) setScorers(res.scorers || []);
      })
      .catch(() => {
        if (!cancelled) setScorers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId, lang]);

  return (
    <div className="space-y-5">
      <div className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--mk-text)]">{t('scorersTitle')}</h1>
          <p className="text-xs text-[var(--mk-muted)] mt-0.5">{t('riyadhScheduleNotice')}</p>
        </div>

        <select
          value={activeId}
          onChange={(e) => onChangeCompetition(e.target.value)}
          aria-label={t('competitions')}
          className="px-3.5 py-2.5 rounded-xl bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] text-sm font-semibold text-[var(--mk-text)] focus:outline-2 focus:outline-[var(--mk-accent)] cursor-pointer min-w-[220px]"
        >
          {competitions.map((comp) => (
            <option key={comp.id} value={comp.id}>
              {comp.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-[var(--mk-surface-soft)] animate-pulse" />
            ))}
          </div>
        ) : scorers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[var(--mk-surface-soft)] border-b border-[var(--mk-line)] text-xs text-[var(--mk-muted)]">
                  <th className="py-3 px-3 text-center w-12 font-semibold">{t('rank')}</th>
                  <th className="py-3 px-3 text-start font-semibold">{t('player')}</th>
                  <th className="py-3 px-3 text-start font-semibold">{t('team')}</th>
                  <th className="py-3 px-3 text-center font-semibold hidden sm:table-cell">{t('penalties')}</th>
                  <th className="py-3 px-4 text-center font-bold text-[var(--mk-text)]">{t('goals')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--mk-line)]">
                {scorers.map((row, idx) => (
                  <tr
                    key={`${row.player.id}-${idx}`}
                    className="hover:bg-[var(--mk-surface-soft)] transition-colors"
                  >
                    <td dir="ltr" className="py-3 px-3 text-center mk-mono text-xs font-bold text-[var(--mk-muted)]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <SmartImage
                          src={row.player.image}
                          alt={row.player.name}
                          kind="player"
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-bold text-[var(--mk-text)]">{row.player.name}</div>
                          {row.player.number ? (
                            <div dir="ltr" className="mk-mono text-[11px] text-[var(--mk-muted)] inline-block">
                              #{row.player.number}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs sm:text-sm font-medium text-[var(--mk-muted)]">
                      {row.player.team_name}
                    </td>
                    <td dir="ltr" className="py-3 px-3 text-center mk-mono text-xs text-[var(--mk-muted)] hidden sm:table-cell">
                      {row.penalty_goals ?? 0}
                    </td>
                    <td dir="ltr" className="py-3 px-4 text-center mk-mono text-base font-bold text-[var(--mk-accent)]">
                      {row.goals}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-[var(--mk-muted)]">
            {lang === 'ar'
              ? 'لا تتوفر قائمة هدافين لهذه البطولة حالياً.'
              : 'Top scorers data is not available for this competition right now.'}
          </div>
        )}
      </div>
    </div>
  );
}
