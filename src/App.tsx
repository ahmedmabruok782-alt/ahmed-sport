import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Calendar,
  Layers,
  ListOrdered,
  Newspaper,
  Search,
  Trophy,
  Tv,
} from 'lucide-react';
import type {
  Language,
  MatchItem,
  NewsItem,
  PageView,
  TournamentSummary,
} from './types/koora';
import { createTranslator } from './i18n/translations';
import {
  formatNewsDate,
  formatRiyadhTimeNow,
  formatScheduleDateLabel,
  getRiyadhDateString,
  kooraApi,
} from './utils/api';
import { FALLBACK_COMPETITIONS } from './data/fallbackData';
import { Header } from './components/Header';
import { MatchCard } from './components/MatchCard';
import { MatchDetailsView } from './components/MatchDetailsView';
import { StandingsView } from './components/StandingsView';
import { ScorersView } from './components/ScorersView';
import { PredictionsView } from './components/PredictionsView';
import { NewsDetailView, NewsListView } from './components/NewsView';
import { SearchView, TeamProfileView } from './components/SearchAndTeamView';
import { SmartImage } from './components/SmartImage';
import { BrandLogo } from './components/BrandLogo';
import {
  PushNotificationBanner,
  buildSimulatedMatchUpdate,
  formatTeamScorePair,
  triggerBrowserNotification,
  type PushAlertItem,
} from './components/PushNotificationBanner';

const LANG_STORAGE_KEY = 'ahmedSportLanguage';
const NOTIFIED_STORAGE_KEY = 'ahmedSportNotifiedMatchesV1';

type MatchStatusFilter = 'all' | 'live' | 'upcoming' | 'finished';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      return saved === 'en' ? 'en' : 'ar';
    } catch {
      return 'ar';
    }
  });

  const [page, setPage] = useState<PageView>('home');
  const [toastMessage, setToastMessage] = useState('');

  // Schedule state
  const [dateOffset, setDateOffset] = useState<number>(0);
  const [customDate, setCustomDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>('all');
  const [quickQuery, setQuickQuery] = useState('');
  const [groupedByLeague, setGroupedByLeague] = useState(true);

  // Domain Data
  const [competitions, setCompetitions] = useState<TournamentSummary[]>(
    FALLBACK_COMPETITIONS[lang]
  );
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [sidebarNews, setSidebarNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  // Selected entity state for drill-downs
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('938652');
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string } | null>(null);

  // Match Notification Subscriptions & Push Banner Stack
  const [notifiedMatchIds, setNotifiedMatchIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(NOTIFIED_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch {
      return new Set();
    }
  });
  const [pushAlerts, setPushAlerts] = useState<PushAlertItem[]>([]);
  const notifiedIdsRef = useRef(notifiedMatchIds);
  const matchSnapshotsRef = useRef<
    Map<string, { state: string; homeScore: number; awayScore: number }>
  >(new Map());
  const simTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    notifiedIdsRef.current = notifiedMatchIds;
    try {
      localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify(Array.from(notifiedMatchIds)));
    } catch {
      // Ignore storage errors
    }
  }, [notifiedMatchIds]);

  useEffect(() => {
    return () => {
      simTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      simTimersRef.current.clear();
    };
  }, []);

  // Live 1-second clock ticker
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const t = useMemo(() => createTranslator(lang), [lang]);

  // Sync HTML attributes for RTL/LTR
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    root.classList.remove('dark');
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors
    }
  }, [lang]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(''), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const activeDate = customDate || getRiyadhDateString(dateOffset);

  // Load Competitions & Sidebar News
  useEffect(() => {
    let cancelled = false;
    kooraApi
      .getCompetitions(lang)
      .then((res) => {
        if (!cancelled && res.competitions?.length) {
          setCompetitions(res.competitions);
          if (!selectedCompetitionId && res.competitions[0]?.id) {
            setSelectedCompetitionId(res.competitions[0].id);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setCompetitions(FALLBACK_COMPETITIONS[lang]);
      });

    setNewsLoading(true);
    kooraApi
      .getNews(1, lang)
      .then((res) => {
        if (!cancelled) setSidebarNews((res.news || []).slice(0, 7));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setNewsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lang]);

  const enqueuePushAlert = useCallback(
    async (
      match: MatchItem,
      title: string,
      body: string,
      canSimulateFollowUp = false
    ) => {
      const nativeDelivered = await triggerBrowserNotification(title, body);
      const nowLabel = formatRiyadhTimeNow(lang);

      const id = `${match.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const item: PushAlertItem = {
        id,
        match,
        title,
        body,
        timestamp: nowLabel,
        browserNativeUsed: nativeDelivered,
        canSimulateFollowUp,
      };

      setPushAlerts((prev) => [item, ...prev].slice(0, 3));
      setTimeout(() => {
        setPushAlerts((prev) => prev.filter((a) => a.id !== id));
      }, 9500);
    },
    [lang]
  );

  const handleSimulateMatchAlert = useCallback(
    (match: MatchItem) => {
      const sim = buildSimulatedMatchUpdate(match, lang);
      void enqueuePushAlert(match, sim.title, sim.body, false);
    },
    [enqueuePushAlert, lang]
  );

  const handleToggleNotify = useCallback(
    (match: MatchItem) => {
      const id = String(match.id);
      const currentlyEnabled = notifiedIdsRef.current.has(id);

      if (currentlyEnabled) {
        const existingTimer = simTimersRef.current.get(id);
        if (existingTimer) {
          clearTimeout(existingTimer);
          simTimersRef.current.delete(id);
        }
        setNotifiedMatchIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setPushAlerts((prev) => prev.filter((a) => String(a.match.id) !== id));
        showToast(t('notifyDisabledToast'));
        return;
      }

      setNotifiedMatchIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });

      const bodyText =
        lang === 'ar'
          ? `سيصلك إشعار فوري عند انطلاق اللقاء، تسجيل الأهداف، ونهاية مباراة ${match.home_team.name} و${match.away_team.name}.`
          : `You will receive instant alerts for kickoff, goals, and full-time in ${match.home_team.name} vs ${match.away_team.name}.`;

      void enqueuePushAlert(match, t('notifyEnabledTitle'), bodyText, true);

      const prevTimer = simTimersRef.current.get(id);
      if (prevTimer) clearTimeout(prevTimer);
      const timerId = setTimeout(() => {
        simTimersRef.current.delete(id);
        if (!notifiedIdsRef.current.has(id)) return;
        const sim = buildSimulatedMatchUpdate(match, lang);
        void enqueuePushAlert(match, sim.title, sim.body, false);
      }, 4500);
      simTimersRef.current.set(id, timerId);
    },
    [enqueuePushAlert, lang, t]
  );

  // Load Matches for selected Riyadh date + periodic live refresh with score-diff push alerts
  useEffect(() => {
    let cancelled = false;

    const loadMatches = async (silent = false) => {
      if (!silent) setMatchesLoading(true);
      try {
        const res = await kooraApi.getMatches(activeDate, 'all', lang);
        if (!cancelled) {
          const nextMatches = res.matches || [];
          setMatches(nextMatches);

          for (const m of nextMatches) {
            const id = String(m.id);
            const nextSnap = {
              state: String(m.state || '').toLowerCase(),
              homeScore: Number(m.home_team.score ?? 0),
              awayScore: Number(m.away_team.score ?? 0),
            };
            const prevSnap = matchSnapshotsRef.current.get(id);
            if (
              silent &&
              prevSnap &&
              notifiedIdsRef.current.has(id) &&
              (prevSnap.homeScore !== nextSnap.homeScore ||
                prevSnap.awayScore !== nextSnap.awayScore ||
                prevSnap.state !== nextSnap.state)
            ) {
              const pair = formatTeamScorePair(
                m.home_team.name,
                nextSnap.homeScore,
                m.away_team.name,
                nextSnap.awayScore
              );
              const title =
                lang === 'ar'
                  ? `تحديث النتيجة · ${pair}`
                  : `Live Score Update · ${pair}`;
              const body =
                lang === 'ar'
                  ? `تغيّر جديد في مجريات المباراة ضمن ${m.tournament?.name || ''}.`
                  : `New match event recorded in ${m.tournament?.name || ''}.`;
              void enqueuePushAlert(m, title, body, false);
            }
            matchSnapshotsRef.current.set(id, nextSnap);
          }
        }
      } catch {
        if (!cancelled && !silent) setMatches([]);
      } finally {
        if (!cancelled && !silent) setMatchesLoading(false);
      }
    };

    loadMatches(false);
    const refreshId = setInterval(() => loadMatches(true), 25_000);
    return () => {
      cancelled = true;
      clearInterval(refreshId);
    };
  }, [activeDate, lang, enqueuePushAlert]);

  // Filter & Group Matches
  const counts = useMemo(() => {
    let live = 0;
    let upcoming = 0;
    let finished = 0;
    for (const m of matches) {
      const s = (m.state || '').toLowerCase();
      if (s === 'live' || s === 'halftime') live++;
      else if (s === 'finished') finished++;
      else upcoming++;
    }
    return { all: matches.length, live, upcoming, finished };
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const q = quickQuery.trim().toLowerCase();
    return matches.filter((m) => {
      const s = (m.state || '').toLowerCase();
      if (statusFilter === 'live' && s !== 'live' && s !== 'halftime') return false;
      if (statusFilter === 'finished' && s !== 'finished') return false;
      if (
        statusFilter === 'upcoming' &&
        (s === 'live' || s === 'halftime' || s === 'finished')
      ) {
        return false;
      }
      if (q) {
        const hay = `${m.home_team.name} ${m.away_team.name} ${m.tournament?.name || ''} ${
          m.broadcast?.channel || ''
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [matches, statusFilter, quickQuery]);

  const groupedMatches = useMemo(() => {
    const map = new Map<string, { tournament: TournamentSummary; items: MatchItem[] }>();
    for (const m of filteredMatches) {
      const key = m.tournament?.id || m.tournament?.name || 'other';
      const existing = map.get(key);
      if (existing) {
        existing.items.push(m);
      } else {
        map.set(key, {
          tournament: m.tournament || { id: 'other', name: '', logo: '' },
          items: [m],
        });
      }
    }
    return Array.from(map.values());
  }, [filteredMatches]);

  // Navigation Handlers
  const handleNavigate = (target: PageView) => {
    setPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenMatch = (match: MatchItem) => {
    setSelectedMatch(match);
    setPage('match-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCompetition = (compId: string) => {
    if (compId) setSelectedCompetitionId(compId);
    setPage('standings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenArticle = (article: NewsItem) => {
    setSelectedArticle(article);
    setPage('news-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTeam = (id: string, name: string) => {
    setSelectedTeam({ id, name });
    setPage('team');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const dayHeadingLabel = customDate
    ? activeDate
    : dateOffset === -1
    ? t('yesterday')
    : dateOffset === 1
    ? t('tomorrow')
    : t('today');

  return (
    <div className="min-h-screen flex flex-col bg-[var(--mk-bg)] text-[var(--mk-text)] pb-16 md:pb-0">
      <Header
        lang={lang}
        t={t}
        activePage={page}
        competitions={competitions}
        selectedCompetitionId={selectedCompetitionId}
        onNavigate={handleNavigate}
        onSelectCompetition={handleSelectCompetition}
        onToggleLanguage={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
      />

      {/* Main Content Container */}
      <main id="main" className="flex-1 w-full max-w-[1320px] mx-auto px-4 sm:px-6 py-5 sm:py-6">
        {page === 'home' ? (
          <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)_290px] gap-6 items-start">
            {/* Right Sidebar (RTL Start): Top Leagues */}
            <aside
              aria-label={t('topLeagues')}
              className="hidden lg:block bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl p-4"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--mk-line)]">
                <h2 className="text-sm font-bold text-[var(--mk-text)]">{t('topLeagues')}</h2>
                <button
                  type="button"
                  onClick={() => handleNavigate('standings')}
                  className="text-xs font-semibold text-[var(--mk-accent)] hover:underline cursor-pointer"
                >
                  {t('more')}
                </button>
              </div>

              <div className="space-y-1">
                {competitions.slice(0, 10).map((comp) => (
                  <button
                    key={comp.id || comp.name}
                    type="button"
                    onClick={() => handleSelectCompetition(comp.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[var(--mk-text)] hover:bg-[var(--mk-surface-soft)] transition-colors text-start cursor-pointer"
                  >
                    <SmartImage
                      src={comp.logo}
                      alt={comp.name}
                      kind="league"
                      className="w-5 h-5 object-contain shrink-0"
                    />
                    <span className="truncate">{comp.name}</span>
                  </button>
                ))}
              </div>
            </aside>

            {/* Center Schedule Column (Clean, zero ads or player banners) */}
            <section aria-labelledby="matchesTitle" className="space-y-4 min-w-0">
              {/* Schedule Header & Controls */}
              <div className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[var(--mk-muted)]">
                      {t('riyadhScheduleNotice')}
                    </p>
                    <h1
                      id="matchesTitle"
                      className="text-xl sm:text-2xl font-bold text-[var(--mk-text)] mt-0.5"
                    >
                      {t('importantMatches')}{' '}
                      <span dir={customDate ? 'ltr' : undefined}>{dayHeadingLabel}</span>
                    </h1>
                    <p className="text-xs text-[var(--mk-muted)] mt-0.5">
                      {formatScheduleDateLabel(activeDate, lang)}
                    </p>
                  </div>

                  {/* Grouping Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => setGroupedByLeague((g) => !g)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] text-xs font-semibold text-[var(--mk-text)] hover:border-[var(--mk-line-strong)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {groupedByLeague ? (
                      <>
                        <Layers className="w-3.5 h-3.5 text-[var(--mk-accent)]" />
                        <span>{t('groupByTournament')}</span>
                      </>
                    ) : (
                      <>
                        <ListOrdered className="w-3.5 h-3.5 text-[var(--mk-accent)]" />
                        <span>{t('chronologicalOrder')}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Day Selector Tabs + Custom Calendar Picker */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div
                    className="inline-flex items-center p-1 rounded-xl bg-[var(--mk-surface-soft)] border border-[var(--mk-line)]"
                    role="tablist"
                    aria-label="اختيار اليوم"
                  >
                    {[
                      { offset: -1, label: t('yesterday') },
                      { offset: 0, label: t('today') },
                      { offset: 1, label: t('tomorrow') },
                    ].map((d) => {
                      const active = !customDate && dateOffset === d.offset;
                      return (
                        <button
                          key={d.offset}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => {
                            setCustomDate('');
                            setDateOffset(d.offset);
                          }}
                          className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-[var(--mk-accent)] text-[var(--mk-on-accent)]'
                              : 'text-[var(--mk-muted)] hover:text-[var(--mk-text)]'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>

                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] text-xs font-semibold text-[var(--mk-text)] cursor-pointer">
                    <Calendar className="w-3.5 h-3.5 text-[var(--mk-accent)]" />
                    <input
                      type="date"
                      dir="ltr"
                      value={activeDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="bg-transparent text-xs mk-mono focus:outline-none cursor-pointer"
                    />
                  </label>
                </div>

                {/* Status Filter Segmented Controls + Quick Filter Input */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {(
                      [
                        { key: 'all', label: t('allMatches'), count: counts.all },
                        { key: 'live', label: t('liveOnly'), count: counts.live },
                        { key: 'upcoming', label: t('upcomingOnly'), count: counts.upcoming },
                        { key: 'finished', label: t('finishedOnly'), count: counts.finished },
                      ] as { key: MatchStatusFilter; label: string; count: number }[]
                    ).map((f) => {
                      const active = statusFilter === f.key;
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setStatusFilter(f.key)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-[var(--mk-accent-soft)] border-[var(--mk-accent)] text-[var(--mk-accent)]'
                              : 'bg-[var(--mk-surface-soft)] border-[var(--mk-line)] text-[var(--mk-muted)] hover:text-[var(--mk-text)]'
                          }`}
                        >
                          <span>{f.label}</span>
                          <span dir="ltr" className="mk-mono opacity-80">
                            ({f.count})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative sm:w-56">
                    <Search className="w-3.5 h-3.5 text-[var(--mk-muted)] absolute top-1/2 -translate-y-1/2 start-3" />
                    <input
                      type="search"
                      maxLength={80}
                      value={quickQuery}
                      onChange={(e) => setQuickQuery(e.target.value)}
                      placeholder={t('filterDayPlaceholder')}
                      className="w-full ps-8 pe-3 py-1.5 rounded-lg bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] text-xs text-[var(--mk-text)] placeholder:text-[var(--mk-muted)] focus:outline-2 focus:outline-[var(--mk-accent)]"
                    />
                  </div>
                </div>
              </div>

              {/* Matches Feed */}
              {matchesLoading ? (
                <div className="space-y-3" aria-live="polite">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-32 rounded-xl bg-[var(--mk-surface)] border border-[var(--mk-line)] animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredMatches.length === 0 ? (
                <div className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl p-10 text-center space-y-3">
                  <strong className="block text-base font-bold text-[var(--mk-text)]">
                    {t('noMatchesTitle')}
                  </strong>
                  <p className="text-xs sm:text-sm text-[var(--mk-muted)] max-w-md mx-auto">
                    {t('noMatchesDesc')}
                  </p>
                  {(statusFilter !== 'all' || quickQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('all');
                        setQuickQuery('');
                      }}
                      className="inline-flex items-center px-4 py-2 rounded-xl bg-[var(--mk-accent)] text-[var(--mk-on-accent)] text-xs font-semibold cursor-pointer"
                    >
                      {t('showAllMatches')}
                    </button>
                  )}
                </div>
              ) : groupedByLeague ? (
                <div className="space-y-5" aria-live="polite">
                  {groupedMatches.map((group) => (
                    <div key={group.tournament.id || group.tournament.name} className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <button
                          type="button"
                          onClick={() => handleSelectCompetition(group.tournament.id)}
                          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--mk-text)] hover:text-[var(--mk-accent)] transition-colors cursor-pointer"
                        >
                          <SmartImage
                            src={group.tournament.logo}
                            alt={group.tournament.name}
                            kind="league"
                            className="w-5 h-5 object-contain"
                          />
                          <span>{group.tournament.name}</span>
                        </button>
                        <span dir="ltr" className="mk-mono text-xs text-[var(--mk-muted)]">
                          {group.items.length}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {group.items.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            nowMs={nowMs}
                            showTournamentHeader={false}
                            isNotified={notifiedMatchIds.has(String(match.id))}
                            t={t}
                            onSelectMatch={handleOpenMatch}
                            onToggleNotify={handleToggleNotify}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5" aria-live="polite">
                  {filteredMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      nowMs={nowMs}
                      showTournamentHeader
                      isNotified={notifiedMatchIds.has(String(match.id))}
                      t={t}
                      onSelectMatch={handleOpenMatch}
                      onToggleNotify={handleToggleNotify}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Left Sidebar (RTL End): Latest Football News */}
            <aside
              aria-label={t('latestNews')}
              className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--mk-line)]">
                <h2 className="text-sm font-bold text-[var(--mk-text)]">{t('latestNews')}</h2>
                <button
                  type="button"
                  onClick={() => handleNavigate('news')}
                  className="text-xs font-semibold text-[var(--mk-accent)] hover:underline cursor-pointer"
                >
                  {t('more')}
                </button>
              </div>

              {newsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-20 rounded-xl bg-[var(--mk-surface-soft)] animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-[var(--mk-line)]">
                  {sidebarNews.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleOpenArticle(item)}
                      className="group w-full py-3 first:pt-0 last:pb-0 flex items-start gap-3 text-start cursor-pointer"
                    >
                      <SmartImage
                        src={item.image}
                        alt={item.title}
                        kind="news"
                        fallbackIndex={idx}
                        className="w-20 h-16 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 space-y-1">
                        <h3 className="text-xs font-bold text-[var(--mk-text)] group-hover:text-[var(--mk-accent)] transition-colors line-clamp-2 leading-snug">
                          {item.title}
                        </h3>
                        <time className="block text-[11px] text-[var(--mk-muted)] mk-mono">
                          {formatNewsDate(item.created_at, lang)}
                        </time>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </aside>
          </div>
        ) : page === 'match-details' && selectedMatch ? (
          <MatchDetailsView
            matchId={selectedMatch.id}
            initialMatch={selectedMatch}
            lang={lang}
            nowMs={nowMs}
            t={t}
            onBack={() => handleNavigate('home')}
            onSelectTeam={handleOpenTeam}
            onSelectCompetition={handleSelectCompetition}
          />
        ) : page === 'standings' ? (
          <StandingsView
            competitions={competitions}
            selectedCompetitionId={selectedCompetitionId}
            lang={lang}
            t={t}
            onChangeCompetition={setSelectedCompetitionId}
            onSelectTeam={handleOpenTeam}
          />
        ) : page === 'scorers' ? (
          <ScorersView
            competitions={competitions}
            selectedCompetitionId={selectedCompetitionId}
            lang={lang}
            t={t}
            onChangeCompetition={setSelectedCompetitionId}
          />
        ) : page === 'predictions' ? (
          <PredictionsView
            lang={lang}
            t={t}
            onShowToast={showToast}
            onSelectMatch={handleOpenMatch}
          />
        ) : page === 'news' ? (
          <NewsListView lang={lang} t={t} onSelectArticle={handleOpenArticle} />
        ) : page === 'news-detail' && selectedArticle ? (
          <NewsDetailView
            articleId={selectedArticle.id}
            initialArticle={selectedArticle}
            lang={lang}
            t={t}
            onBack={() => handleNavigate('news')}
          />
        ) : page === 'team' && selectedTeam ? (
          <TeamProfileView
            teamId={selectedTeam.id}
            fallbackName={selectedTeam.name}
            lang={lang}
            nowMs={nowMs}
            notifiedMatchIds={notifiedMatchIds}
            t={t}
            onBack={() => handleNavigate('home')}
            onSelectMatch={handleOpenMatch}
            onToggleNotify={handleToggleNotify}
            onSelectArticle={handleOpenArticle}
          />
        ) : (
          <SearchView
            lang={lang}
            nowMs={nowMs}
            notifiedMatchIds={notifiedMatchIds}
            t={t}
            onSelectMatch={handleOpenMatch}
            onToggleNotify={handleToggleNotify}
            onSelectCompetition={handleSelectCompetition}
            onSelectTeam={handleOpenTeam}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="mt-10 border-t border-[var(--mk-line)] bg-[var(--mk-surface)]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--mk-muted)]">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={26} />
            <span className="font-bold text-[var(--mk-text)]">{t('siteName')}</span>
            <span aria-hidden="true">·</span>
            <span>
              ©{' '}
              <span dir="ltr" className="mk-mono">
                {new Date().getFullYear()}
              </span>{' '}
              {t('footerRights')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-semibold">
            <button
              type="button"
              onClick={() => handleNavigate('standings')}
              className="hover:text-[var(--mk-text)] transition-colors cursor-pointer"
            >
              {t('competitions')}
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('scorers')}
              className="hover:text-[var(--mk-text)] transition-colors cursor-pointer"
            >
              {t('scorers')}
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('predictions')}
              className="hover:text-[var(--mk-text)] transition-colors cursor-pointer"
            >
              {t('predictions')}
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('news')}
              className="hover:text-[var(--mk-text)] transition-colors cursor-pointer"
            >
              {t('news')}
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('search')}
              className="hover:text-[var(--mk-text)] transition-colors cursor-pointer"
            >
              {t('search')}
            </button>
          </div>
        </div>
      </footer>

      {/* Compact Mobile Bottom Quick Navigation */}
      <nav
        aria-label="التنقل السريع"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-[var(--mk-surface)]/95 backdrop-blur-md border-t border-[var(--mk-line)] grid grid-cols-5 items-center"
      >
        {[
          { p: 'home' as PageView, label: t('matches'), icon: Tv },
          { p: 'standings' as PageView, label: t('competitions'), icon: Trophy },
          { p: 'scorers' as PageView, label: t('scorers'), icon: Award },
          { p: 'news' as PageView, label: t('news'), icon: Newspaper },
          { p: 'search' as PageView, label: t('search'), icon: Search },
        ].map((item) => {
          const Icon = item.icon;
          const active = page === item.p;
          return (
            <button
              key={item.p}
              type="button"
              onClick={() => handleNavigate(item.p)}
              className={`flex flex-col items-center justify-center gap-0.5 h-full text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                active ? 'text-[var(--mk-accent)]' : 'text-[var(--mk-muted)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Push Notification Alert Stack */}
      <PushNotificationBanner
        alerts={pushAlerts}
        t={t}
        onDismiss={(id) => setPushAlerts((prev) => prev.filter((a) => a.id !== id))}
        onOpenMatch={(match, alertId) => {
          setPushAlerts((prev) => prev.filter((a) => a.id !== alertId));
          handleOpenMatch(match);
        }}
        onSimulateUpdate={handleSimulateMatchAlert}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
