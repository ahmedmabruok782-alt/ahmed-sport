import express from 'express';
import {
  FALLBACK_COMPETITIONS,
  FALLBACK_NEWS,
  FALLBACK_SCORERS,
  FALLBACK_STANDINGS,
  buildFallbackMatchDetails,
  buildFallbackMatches,
} from '../data/fallbackData';

const UPSTREAM_ORIGIN = 'https://majed-koora.live';
const MAX_CACHE_ENTRIES = 300;
const MAX_MEDIA_BYTES = 5 * 1024 * 1024; // 5 MB max proxied image size

interface CacheEntry {
  expiresAt: number;
  data: unknown;
}

const jsonCache = new Map<string, CacheEntry>();

function setBoundedCache(key: string, entry: CacheEntry) {
  if (jsonCache.size >= MAX_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of jsonCache.entries()) {
      if (v.expiresAt <= now) jsonCache.delete(k);
    }
    if (jsonCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = jsonCache.keys().next().value;
      if (oldestKey) jsonCache.delete(oldestKey);
    }
  }
  jsonCache.set(key, entry);
}

// Lightweight per-IP sliding window rate limiter (240 requests / 60s)
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 240;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets.entries()) {
      if (v.resetAt <= now) rateBuckets.delete(k);
    }
  }
  const current = rateBuckets.get(ip);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_MAX_REQUESTS) {
    return false;
  }
  current.count += 1;
  return true;
}

// Strict parameter validators
function cleanLang(raw?: string): 'ar' | 'en' {
  return raw === 'en' ? 'en' : 'ar';
}

function cleanScope(raw?: string): 'all' | 'live' {
  return raw === 'live' ? 'live' : 'all';
}

function cleanDate(raw?: string): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date().toISOString().slice(0, 10);
}

function cleanId(raw?: string, fallback = ''): string {
  if (raw && /^[a-zA-Z0-9_-]{1,32}$/.test(raw)) return raw;
  return fallback;
}

function cleanPage(raw?: string): string {
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1 && n <= 500) return String(n);
  return '1';
}

function cleanSearchQuery(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 80);
}

// Strip untrusted third-party streaming/ad redirect URLs recursively from match payloads
function sanitizePayload<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map(sanitizePayload) as unknown as T;
  }
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      if (
        key === 'watch_url' ||
        key === 'watch_ready' ||
        key === 'site_watch_enabled' ||
        key === 'watch_available' ||
        key === 'watch_availability_code' ||
        key === 'watch_opens_at'
      ) {
        continue;
      }
      if (key === 'video_url' && typeof val === 'string') {
        try {
          const parsed = new URL(val);
          if (
            parsed.protocol === 'https:' &&
            (parsed.hostname === 'x.com' ||
              parsed.hostname === 'www.x.com' ||
              parsed.hostname === 'twitter.com' ||
              parsed.hostname === 'www.twitter.com')
          ) {
            out[key] = val;
          }
        } catch {
          // Drop malformed URLs
        }
        continue;
      }
      out[key] = sanitizePayload(val);
    }
    return out as T;
  }
  return input;
}

async function fetchUpstreamJson(
  upstreamPath: string,
  query: Record<string, string>,
  ttlMs: number
): Promise<unknown> {
  const url = new URL(upstreamPath, UPSTREAM_ORIGIN);
  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== '') {
      url.searchParams.set(key, val);
    }
  });

  const cacheKey = url.toString();
  const cached = jsonCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7500);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AhmedSportWeb/1.0)',
        Referer: `${UPSTREAM_ORIGIN}/`,
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Upstream HTTP ${res.status}`);
    }

    const rawBody = await res.json();
    if (rawBody && rawBody.success !== false) {
      const sanitized = sanitizePayload(rawBody);
      setBoundedCache(cacheKey, {
        expiresAt: Date.now() + ttlMs,
        data: sanitized,
      });
      return sanitized;
    }
    throw new Error(rawBody?.message || 'Upstream returned success:false');
  } finally {
    clearTimeout(timeout);
  }
}

function getQueryString(req: express.Request, name: string): string | undefined {
  const val = req.query[name];
  if (typeof val === 'string') return val;
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
  return undefined;
}

const ALLOWED_MEDIA_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export function createApiApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Global HTTP Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
    );
    next();
  });

  app.use(express.json({ limit: '32kb' }));

  // Normalize Vercel Serverless rewrite paths when routed through /api/index
  app.use((req, _res, next) => {
    const mediaParam = getQueryString(req, '__mediapath');
    if (mediaParam && !req.path.startsWith('/media/')) {
      const cleanMedia = mediaParam.replace(/^\/+/, '');
      req.url = `/media/${cleanMedia}`;
      next();
      return;
    }

    const endpointParam = getQueryString(req, '__endpoint');
    if (endpointParam && !req.path.startsWith('/api/v1/')) {
      const parsed = new URL(req.url, 'http://localhost');
      parsed.searchParams.delete('__endpoint');
      const qs = parsed.searchParams.toString();
      req.url = `/api/v1/${endpointParam.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
      next();
      return;
    }

    const apiPathParam = getQueryString(req, '__apipath');
    if (apiPathParam && (req.path === '/api' || req.path === '/api/index')) {
      const parsed = new URL(req.url, 'http://localhost');
      parsed.searchParams.delete('__apipath');
      const qs = parsed.searchParams.toString();
      req.url = `/api/${apiPathParam.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
    }

    next();
  });

  // Rate limiting on API & Media proxy routes
  app.use(['/api', '/media'], (req, res, next) => {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';

    if (!checkRateLimit(clientIp)) {
      res.status(429).json({
        success: false,
        message: 'عدد الطلبات مرتفع جداً، يرجى المحاولة بعد قليل.',
      });
      return;
    }
    next();
  });

  // Hardened /media/* image proxy (strict path whitelist + MIME check + size cap + sandbox CSP)
  app.get('/media/*', async (req, res) => {
    let decodedPath = '';
    try {
      decodedPath = decodeURIComponent(req.path);
    } catch {
      res.status(400).end();
      return;
    }

    if (
      decodedPath.includes('..') ||
      decodedPath.includes('\\') ||
      !/^\/media\/[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp|gif|avif)$/i.test(decodedPath)
    ) {
      res.status(400).end();
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const targetUrl = new URL(decodedPath, UPSTREAM_ORIGIN).toString();
      const upstream = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AhmedSportWeb/1.0)',
          Referer: `${UPSTREAM_ORIGIN}/`,
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      if (!upstream.ok) {
        res.status(404).end();
        return;
      }

      const rawType = (upstream.headers.get('content-type') || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      if (!ALLOWED_MEDIA_MIME.has(rawType)) {
        res.status(415).end();
        return;
      }

      const contentLength = Number(upstream.headers.get('content-length') || 0);
      if (contentLength > MAX_MEDIA_BYTES) {
        res.status(413).end();
        return;
      }

      const arrayBuffer = await upstream.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_MEDIA_BYTES) {
        res.status(413).end();
        return;
      }

      res.setHeader('Content-Type', rawType);
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, immutable');
      res.send(Buffer.from(arrayBuffer));
    } catch {
      res.status(404).end();
    } finally {
      clearTimeout(timeout);
    }
  });

  // Competitions
  app.get('/api/v1/competitions', async (req, res) => {
    const lang = cleanLang(getQueryString(req, 'lang'));
    try {
      const data = await fetchUpstreamJson(
        '/api/v1/competitions',
        { lang, v: '20260814' },
        300_000
      );
      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
      res.json(data);
    } catch {
      res.json({
        success: true,
        competitions: FALLBACK_COMPETITIONS[lang],
      });
    }
  });

  // Matches Schedule
  app.get('/api/v1/matches', async (req, res) => {
    const lang = cleanLang(getQueryString(req, 'lang'));
    const scope = cleanScope(getQueryString(req, 'scope'));
    const dateStr = cleanDate(getQueryString(req, 'date'));
    try {
      const data = await fetchUpstreamJson(
        '/api/v1/matches',
        { date: dateStr, scope, lang },
        25_000
      );
      res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=40');
      res.json(data);
    } catch {
      let matches = buildFallbackMatches(dateStr, lang);
      if (scope === 'live') {
        matches = matches.filter((m) => m.state === 'live' || m.state === 'halftime');
      }
      res.json({
        success: true,
        date: dateStr,
        scope,
        matches,
      });
    }
  });

  // Match Details
  app.get('/api/v1/match-details', async (req, res) => {
    const lang = cleanLang(getQueryString(req, 'lang'));
    const id = cleanId(getQueryString(req, 'id'), '6050092');
    try {
      const data = await fetchUpstreamJson('/api/v1/match-details', { id, lang }, 20_000);
      res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30');
      res.json(data);
    } catch {
      res.json({
        success: true,
        details: buildFallbackMatchDetails(id, lang),
      });
    }
  });

  // Standings
  app.get('/api/v1/standings', async (req, res) => {
    const lang = cleanLang(getQueryString(req, 'lang'));
    const competitionId = cleanId(getQueryString(req, 'competition_id'), '938652');
    try {
      const data = await fetchUpstreamJson(
        '/api/v1/standings',
        { competition_id: competitionId, type: 'auto', lang },
        180_000
      );
      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
      res.json(data);
    } catch {
      res.json({
        success: true,
        competition_id: competitionId,
        competition_name: lang === 'en' ? 'League Standings' : 'جدول الترتيب',
        standings: FALLBACK_STANDINGS,
      });
    }
  });

  // Top Scorers
  app.get('/api/v1/scorers', async (req, res) => {
    const lang = cleanLang(getQueryString(req, 'lang'));
    const competitionId = cleanId(getQueryString(req, 'competition_id'), '938652');
    try {
      const data = await fetchUpstreamJson(
        '/api/v1/scorers',
        { competition_id: competitionId, lang },
        180_000
      );
      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
      res.json(data);
    } catch {
      res.json({
        success: true,
        competition_id: competitionId,
        scorers: FALLBACK_SCORERS,
      });
    }
  });

  // News List
  app.get('/api/v1/news', async (req, res) => {
    const lang = cleanLang(getQueryString(req, 'lang'));
    const page = cleanPage(getQueryString(req, 'page'));
    const teamId = cleanId(getQueryString(req, 'team_id'), '');
    try {
      const data = await fetchUpstreamJson(
        '/api/v1/news',
        { page, team_id: teamId, lang },
        120_000
      );
      res.setHeader('Cache-Control', 'public, s-maxage=90, stale-while-revalidate=180');
      res.json(data);
    } catch {
      res.json({
        success: true,
        page: 1,
        has_next: false,
        news: FALLBACK_NEWS,
      });
    }
  });

  // News Article Detail
  app.get('/api/v1/news-detail', async (req, res) => {
    const lang = cleanLang(getQueryString(req, 'lang'));
    const id = cleanId(getQueryString(req, 'id'), '14084817');
    try {
      const data = await fetchUpstreamJson('/api/v1/news-detail', { id, lang }, 300_000);
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      res.json(data);
    } catch {
      const article = FALLBACK_NEWS.find((n) => n.id === id) || FALLBACK_NEWS[0];
      res.json({
        success: true,
        article,
      });
    }
  });

  // Tournament Overview
  app.get('/api/v1/tournament', async (req, res) => {
    const lang = cleanLang(getQueryString(req, 'lang'));
    const competitionId = cleanId(getQueryString(req, 'competition_id'), '938652');
    try {
      const data = await fetchUpstreamJson(
        '/api/v1/tournament',
        { competition_id: competitionId, lang },
        180_000
      );
      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
      res.json(data);
    } catch {
      res.json({
        success: true,
        standings: FALLBACK_STANDINGS,
        matches: buildFallbackMatches(new Date().toISOString().slice(0, 10), lang),
      });
    }
  });

  // Team Profile
  app.get('/api/v1/team', async (req, res) => {
    const lang = cleanLang(getQueryString(req, 'lang'));
    const teamId = cleanId(getQueryString(req, 'team_id'), '101919');
    try {
      const data = await fetchUpstreamJson('/api/v1/team', { team_id: teamId, lang }, 180_000);
      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
      res.json(data);
    } catch {
      const matches = buildFallbackMatches(new Date().toISOString().slice(0, 10), lang);
      res.json({
        success: true,
        team: matches[0].away_team,
        matches,
      });
    }
  });

  // Global Search
  app.get('/api/v1/search', async (req, res) => {
    const lang = cleanLang(getQueryString(req, 'lang'));
    const q = cleanSearchQuery(getQueryString(req, 'q'));
    if (q.length < 2) {
      res.json({ success: true, matches: [], competitions: [], teams: [] });
      return;
    }
    try {
      const data = await fetchUpstreamJson('/api/v1/search', { q, lang }, 60_000);
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      res.json(data);
    } catch {
      const term = q.toLowerCase();
      const matches = buildFallbackMatches(new Date().toISOString().slice(0, 10), lang).filter(
        (m) =>
          m.home_team.name.toLowerCase().includes(term) ||
          m.away_team.name.toLowerCase().includes(term) ||
          m.tournament.name.toLowerCase().includes(term)
      );
      const competitions = FALLBACK_COMPETITIONS[lang].filter((c) =>
        c.name.toLowerCase().includes(term)
      );
      res.json({
        success: true,
        matches,
        competitions,
        teams: [],
      });
    }
  });

  // Block unknown /api/* routes cleanly
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, message: 'واجهة البيانات غير موجودة' });
  });

  return app;
}
