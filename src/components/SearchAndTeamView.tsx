import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import type {
  Language,
  MatchItem,
  NewsItem,
  TeamSummary,
  TournamentSummary,
} from '../types/koora';
import type { TranslationKey } from '../i18n/translations';
import { kooraApi } from '../utils/api';
import { MatchCard } from './MatchCard';
import { SmartImage } from './SmartImage';

interface SearchViewProps {
  lang: Language;
  nowMs: number;
  notifiedMatchIds: Set<string>;
  t: (key: TranslationKey) => string;
  onSelectMatch: (match: MatchItem) => void;
  onToggleNotify: (match: MatchItem) => void;
  onSelectCompetition: (id: string) => void;
  onSelectTeam: (id: string, name: string) => void;
}

export function SearchView({
  lang,
  nowMs,
  notifiedMatchIds,
  t,
  onSelectMatch,
  onToggleNotify,
  onSelectCompetition,
  onSelectTeam,
}: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [competitions, setCompetitions] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setMatches([]);
      setTeams([]);
      setCompetitions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      kooraApi
        .search(trimmed, lang)
        .then((res) => {
          if (cancelled) return;
          setMatches(res.matches || []);
          setTeams(res.teams || []);
          setCompetitions(res.competitions || []);
        })
        .catch(() => {
          if (!cancelled) {
            setMatches([]);
            setTeams([]);
            setCompetitions([]);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, lang]);

  const quickTerms =
    lang === 'ar'
      ? ['الهلال', 'القادسية', 'الاتحاد', 'برشلونة', 'ريال مدريد', 'دوري روشن']
      : ['Barcelona', 'Real Madrid', 'Al Hilal', 'Milan', 'Liverpool'];

  return (
    <div className="space-y-5">
      <div className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl p-5 space-y-4">
        <h1 className="text-xl font-bold text-[var(--mk-text)]">{t('search')}</h1>
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--mk-muted)] absolute top-1/2 -translate-y-1/2 start-4" />
          <input
            type="search"
            maxLength={80}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            autoFocus
            className="w-full ps-11 pe-4 py-3 rounded-xl bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] text-sm text-[var(--mk-text)] placeholder:text-[var(--mk-muted)] focus:outline-2 focus:outline-[var(--mk-accent)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {quickTerms.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => setQuery(term)}
              className="px-3 py-1 rounded-lg bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] text-xs font-semibold text-[var(--mk-muted)] hover:text-[var(--mk-text)] transition-colors cursor-pointer"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl p-6 text-center text-sm text-[var(--mk-muted)]">
          {t('loading')}
        </div>
      )}

      {!loading && teams.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--mk-muted)]">{t('team')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {teams.map((club) => (
              <button
                key={club.id}
                type="button"
                onClick={() => onSelectTeam(club.id, club.name)}
                className="p-3.5 rounded-xl bg-[var(--mk-surface)] border border-[var(--mk-line)] hover:border-[var(--mk-line-strong)] flex items-center gap-3 text-start cursor-pointer"
              >
                <SmartImage
                  src={club.logo}
                  alt={club.name}
                  kind="team"
                  className="w-8 h-8 object-contain rounded-full"
                />
                <span className="text-sm font-semibold text-[var(--mk-text)] truncate">
                  {club.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!loading && competitions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--mk-muted)]">{t('competitions')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {competitions.map((comp) => (
              <button
                key={comp.id}
                type="button"
                onClick={() => onSelectCompetition(comp.id)}
                className="p-3.5 rounded-xl bg-[var(--mk-surface)] border border-[var(--mk-line)] hover:border-[var(--mk-line-strong)] flex items-center gap-3 text-start cursor-pointer"
              >
                <SmartImage
                  src={comp.logo}
                  alt={comp.name}
                  kind="league"
                  className="w-7 h-7 object-contain"
                />
                <span className="text-sm font-semibold text-[var(--mk-text)] truncate">
                  {comp.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!loading && matches.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--mk-muted)]">{t('matches')}</h2>
          <div className="space-y-2.5">
            {matches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                nowMs={nowMs}
                isNotified={notifiedMatchIds.has(String(m.id))}
                t={t}
                onSelectMatch={onSelectMatch}
                onToggleNotify={onToggleNotify}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface TeamProfileViewProps {
  teamId: string;
  fallbackName: string;
  lang: Language;
  nowMs: number;
  notifiedMatchIds: Set<string>;
  t: (key: TranslationKey) => string;
  onBack: () => void;
  onSelectMatch: (match: MatchItem) => void;
  onToggleNotify: (match: MatchItem) => void;
  onSelectArticle: (item: NewsItem) => void;
}

export function TeamProfileView({
  teamId,
  fallbackName,
  lang,
  nowMs,
  notifiedMatchIds,
  t,
  onBack,
  onSelectMatch,
  onToggleNotify,
  onSelectArticle,
}: TeamProfileViewProps) {
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([kooraApi.getTeam(teamId, lang), kooraApi.getNews(1, lang, teamId)])
      .then(([teamRes, newsRes]) => {
        if (cancelled) return;
        if (teamRes.team) setTeam(teamRes.team);
        setMatches(teamRes.matches || []);
        setNews((newsRes.news || []).slice(0, 4));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, lang]);

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--mk-surface)] border border-[var(--mk-line)] text-xs sm:text-sm font-semibold text-[var(--mk-text)] hover:border-[var(--mk-line-strong)] transition-colors cursor-pointer"
      >
        <BackIcon className="w-4 h-4" />
        <span>{t('back')}</span>
      </button>

      <div className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl p-5 flex items-center gap-4">
        <SmartImage
          src={team?.logo}
          alt={team?.name || fallbackName}
          kind="team"
          className="w-16 h-16 object-contain rounded-full"
        />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--mk-text)]">
            {team?.name || fallbackName}
          </h1>
          <p className="text-xs text-[var(--mk-muted)] mt-1">{t('riyadhScheduleNotice')}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 rounded-xl bg-[var(--mk-surface)] border border-[var(--mk-line)] animate-pulse" />
          <div className="h-24 rounded-xl bg-[var(--mk-surface)] border border-[var(--mk-line)] animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-base font-bold text-[var(--mk-text)]">{t('matches')}</h2>
            {matches.length > 0 ? (
              matches.slice(0, 10).map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  nowMs={nowMs}
                  isNotified={notifiedMatchIds.has(String(m.id))}
                  t={t}
                  onSelectMatch={onSelectMatch}
                  onToggleNotify={onToggleNotify}
                />
              ))
            ) : (
              <div className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-xl p-6 text-sm text-[var(--mk-muted)]">
                {t('noMatchesTitle')}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-[var(--mk-text)]">{t('latestNews')}</h2>
            <div className="space-y-3">
              {news.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectArticle(item)}
                  className="w-full text-start bg-[var(--mk-surface)] border border-[var(--mk-line)] hover:border-[var(--mk-line-strong)] rounded-xl p-3 flex items-start gap-3 cursor-pointer"
                >
                  <SmartImage
                    src={item.image}
                    alt={item.title}
                    kind="news"
                    fallbackIndex={idx}
                    className="w-20 h-16 rounded-lg object-cover shrink-0"
                  />
                  <span className="text-xs font-bold text-[var(--mk-text)] line-clamp-3 leading-snug">
                    {item.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
