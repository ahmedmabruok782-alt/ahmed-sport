import { useEffect, useState } from 'react';
import type { Language, StandingRow, TournamentSummary } from '../types/koora';
import type { TranslationKey } from '../i18n/translations';
import { kooraApi } from '../utils/api';
import { SmartImage } from './SmartImage';

interface StandingsViewProps {
  competitions: TournamentSummary[];
  selectedCompetitionId: string;
  lang: Language;
  t: (key: TranslationKey) => string;
  onChangeCompetition: (id: string) => void;
  onSelectTeam: (teamId: string, teamName: string) => void;
}

export function StandingsView({
  competitions,
  selectedCompetitionId,
  lang,
  t,
  onChangeCompetition,
  onSelectTeam,
}: StandingsViewProps) {
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [compTitle, setCompTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const activeId = selectedCompetitionId || competitions[0]?.id || '938652';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    kooraApi
      .getStandings(activeId, lang)
      .then((res) => {
        if (cancelled) return;
        const sorted = [...(res.standings || [])].sort(
          (a, b) => b.points - a.points || b.goal_difference - a.goal_difference
        );
        setRows(sorted);
        setCompTitle(res.competition_name || '');
      })
      .catch(() => {
        if (!cancelled) setRows([]);
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
          <h1 className="text-xl font-bold text-[var(--mk-text)]">
            {compTitle || t('standingsTitle')}
          </h1>
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

      {/* Standings Table */}
      <div className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-[var(--mk-surface-soft)] animate-pulse" />
            ))}
          </div>
        ) : rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[var(--mk-surface-soft)] border-b border-[var(--mk-line)] text-xs text-[var(--mk-muted)]">
                  <th className="py-3 px-3 text-center w-12 font-semibold">{t('rank')}</th>
                  <th className="py-3 px-3 text-start font-semibold">{t('team')}</th>
                  <th className="py-3 px-2.5 text-center font-semibold">{t('played')}</th>
                  <th className="py-3 px-2.5 text-center font-semibold hidden sm:table-cell">{t('wins')}</th>
                  <th className="py-3 px-2.5 text-center font-semibold hidden sm:table-cell">{t('draws')}</th>
                  <th className="py-3 px-2.5 text-center font-semibold hidden sm:table-cell">{t('losses')}</th>
                  <th className="py-3 px-2.5 text-center font-semibold hidden md:table-cell">{t('goalsFor')}</th>
                  <th className="py-3 px-2.5 text-center font-semibold hidden md:table-cell">{t('goalsAgainst')}</th>
                  <th className="py-3 px-2.5 text-center font-semibold">{t('goalDiff')}</th>
                  <th className="py-3 px-3.5 text-center font-bold text-[var(--mk-text)]">{t('points')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--mk-line)]">
                {rows.map((row, index) => {
                  const displayRank = index + 1;
                  return (
                    <tr
                      key={`${row.team.id}-${index}`}
                      className="hover:bg-[var(--mk-surface-soft)] transition-colors"
                    >
                      <td dir="ltr" className="py-3 px-3 text-center mk-mono text-xs font-bold text-[var(--mk-muted)]">
                        {displayRank}
                      </td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => onSelectTeam(row.team.id, row.team.name)}
                          className="flex items-center gap-2.5 text-start group cursor-pointer"
                        >
                          <SmartImage
                            src={row.team.logo}
                            alt={row.team.name}
                            kind="team"
                            className="w-6 h-6 object-contain rounded-full"
                          />
                          <span className="font-semibold text-[var(--mk-text)] group-hover:text-[var(--mk-accent)] transition-colors">
                            {row.team.name}
                          </span>
                          {row.group && (
                            <span className="text-xs text-[var(--mk-muted)]">· {row.group}</span>
                          )}
                        </button>
                      </td>
                      <td dir="ltr" className="py-3 px-2.5 text-center mk-mono text-xs">
                        {row.played}
                      </td>
                      <td dir="ltr" className="py-3 px-2.5 text-center mk-mono text-xs hidden sm:table-cell">
                        {row.wins}
                      </td>
                      <td dir="ltr" className="py-3 px-2.5 text-center mk-mono text-xs hidden sm:table-cell">
                        {row.draws}
                      </td>
                      <td dir="ltr" className="py-3 px-2.5 text-center mk-mono text-xs hidden sm:table-cell">
                        {row.losses}
                      </td>
                      <td dir="ltr" className="py-3 px-2.5 text-center mk-mono text-xs hidden md:table-cell">
                        {row.goals_for}
                      </td>
                      <td dir="ltr" className="py-3 px-2.5 text-center mk-mono text-xs hidden md:table-cell">
                        {row.goals_against}
                      </td>
                      <td dir="ltr" className="py-3 px-2.5 text-center mk-mono text-xs font-medium">
                        {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                      </td>
                      <td dir="ltr" className="py-3 px-3.5 text-center mk-mono text-sm font-bold text-[var(--mk-accent)]">
                        {row.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-[var(--mk-muted)]">
            {lang === 'ar'
              ? 'هذه البطولة بنظام الأدوار الإقصائية أو لم يبدأ جدول ترتيبها بعد.'
              : 'Standings are not available for knockout-only tournaments.'}
          </div>
        )}
      </div>
    </div>
  );
}
