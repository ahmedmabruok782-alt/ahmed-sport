import type {
  Language,
  MatchDetailsPayload,
  MatchItem,
  NewsItem,
  ScorerRow,
  StandingRow,
  TeamSummary,
  TournamentSummary,
} from '../types/koora';

export function getRiyadhDateString(offsetDays = 0): string {
  const base = new Date(Date.now() + offsetDays * 86_400_000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(base);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
}

export function formatScheduleDateLabel(dateStr: string, lang: Language): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  try {
    const locale = lang === 'en' ? 'en-GB-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn';
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Riyadh',
    }).format(new Date(`${dateStr}T12:00:00+03:00`));
  } catch {
    return dateStr;
  }
}

export function formatNewsDate(value?: string, lang: Language = 'ar'): string {
  if (!value) return '';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return value.slice(0, 16);
  const locale = lang === 'en' ? 'en-GB-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Riyadh',
  }).format(d);
}

export function formatRiyadhTimeNow(lang: Language = 'ar'): string {
  const locale = lang === 'en' ? 'en-GB-u-nu-latn' : 'ar-SA-u-ca-gregory-nu-latn';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Riyadh',
  }).format(new Date());
}

export function computeLiveClockText(match: MatchItem, nowMs: number): string {
  const baseSeconds = Math.max(0, Number(match.elapsed_seconds || 0));
  const syncedAt = Number(match.clock_synced_at || nowMs);
  const deltaSeconds =
    match.state === 'live' && syncedAt > 0
      ? Math.max(0, Math.floor((nowMs - syncedAt) / 1000))
      : 0;
  const total = baseSeconds + deltaSeconds;
  const mins = String(Math.floor(total / 60)).padStart(2, '0');
  const secs = String(total % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

async function apiGet<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  lang: Language
): Promise<T> {
  const url = new URL(path, window.location.origin);
  url.searchParams.set('lang', lang);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') {
      url.searchParams.set(k, String(v));
    }
  });

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const kooraApi = {
  getCompetitions: (lang: Language) =>
    apiGet<{ success: boolean; competitions: TournamentSummary[] }>('/api/v1/competitions', {}, lang),

  getMatches: (date: string, scope: string, lang: Language) =>
    apiGet<{ success: boolean; date: string; matches: MatchItem[] }>(
      '/api/v1/matches',
      { date, scope },
      lang
    ),

  getMatchDetails: (id: string, lang: Language) =>
    apiGet<{ success: boolean; details: MatchDetailsPayload }>('/api/v1/match-details', { id }, lang),

  getStandings: (competitionId: string, lang: Language) =>
    apiGet<{
      success: boolean;
      competition_id: string;
      competition_name?: string;
      standings: StandingRow[];
    }>('/api/v1/standings', { competition_id: competitionId, type: 'auto' }, lang),

  getScorers: (competitionId: string, lang: Language) =>
    apiGet<{
      success: boolean;
      competition_id: string;
      scorers: ScorerRow[];
    }>('/api/v1/scorers', { competition_id: competitionId }, lang),

  getNews: (page: number, lang: Language, teamId?: string) =>
    apiGet<{
      success: boolean;
      page: number;
      has_next?: boolean;
      news: NewsItem[];
    }>('/api/v1/news', { page, team_id: teamId }, lang),

  getNewsDetail: (id: string, lang: Language) =>
    apiGet<{
      success: boolean;
      article?: NewsItem;
      news?: NewsItem;
      related?: NewsItem[];
    }>('/api/v1/news-detail', { id }, lang),

  getTeam: (teamId: string, lang: Language) =>
    apiGet<{
      success: boolean;
      team?: TeamSummary;
      matches?: MatchItem[];
    }>('/api/v1/team', { team_id: teamId }, lang),

  search: (query: string, lang: Language) =>
    apiGet<{
      success: boolean;
      matches?: MatchItem[];
      teams?: TeamSummary[];
      competitions?: TournamentSummary[];
    }>('/api/v1/search', { q: query }, lang),
};
