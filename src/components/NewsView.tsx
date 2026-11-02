import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Language, NewsItem } from '../types/koora';
import type { TranslationKey } from '../i18n/translations';
import { formatNewsDate, kooraApi } from '../utils/api';
import { SmartImage } from './SmartImage';

interface NewsListViewProps {
  lang: Language;
  t: (key: TranslationKey) => string;
  onSelectArticle: (item: NewsItem) => void;
}

export function NewsListView({ lang, t, onSelectArticle }: NewsListViewProps) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    kooraApi
      .getNews(page, lang)
      .then((res) => {
        if (cancelled) return;
        setItems(res.news || []);
        setHasNext(Boolean(res.has_next));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, lang]);

  return (
    <div className="space-y-5">
      <div className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl p-5">
        <h1 className="text-xl font-bold text-[var(--mk-text)]">{t('newsTitle')}</h1>
        <p className="text-xs text-[var(--mk-muted)] mt-1">{t('riyadhScheduleNotice')}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-[var(--mk-surface)] border border-[var(--mk-line)] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectArticle(item)}
              className="group text-start bg-[var(--mk-surface)] border border-[var(--mk-line)] hover:border-[var(--mk-line-strong)] rounded-2xl overflow-hidden flex flex-col transition-colors cursor-pointer"
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-[var(--mk-surface-soft)]">
                <SmartImage
                  src={item.image}
                  alt={item.title}
                  kind="news"
                  fallbackIndex={idx}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <h2 className="text-sm sm:text-base font-bold text-[var(--mk-text)] group-hover:text-[var(--mk-accent)] transition-colors line-clamp-2 leading-snug">
                    {item.title}
                  </h2>
                  {item.summary && (
                    <p className="text-xs text-[var(--mk-muted)] line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>
                  )}
                </div>
                <time className="text-[11px] text-[var(--mk-muted)] mk-mono">
                  {formatNewsDate(item.created_at, lang)}
                </time>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-3 pt-2">
        {page > 1 && (
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-xl bg-[var(--mk-surface)] border border-[var(--mk-line)] text-xs font-semibold text-[var(--mk-text)] cursor-pointer"
          >
            {lang === 'ar' ? 'الصفحة السابقة' : 'Previous Page'}
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl bg-[var(--mk-accent)] text-[var(--mk-on-accent)] text-xs font-semibold cursor-pointer"
          >
            {lang === 'ar' ? 'المزيد من الأخبار' : 'Load More News'}
          </button>
        )}
      </div>
    </div>
  );
}

interface NewsDetailViewProps {
  articleId: string;
  initialArticle?: NewsItem | null;
  lang: Language;
  t: (key: TranslationKey) => string;
  onBack: () => void;
}

export function NewsDetailView({
  articleId,
  initialArticle,
  lang,
  t,
  onBack,
}: NewsDetailViewProps) {
  const [article, setArticle] = useState<NewsItem | null>(initialArticle || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    kooraApi
      .getNewsDetail(articleId, lang)
      .then((res) => {
        if (cancelled) return;
        const found = res.article || res.news;
        if (found) setArticle(found);
      })
      .catch(() => {
        // Keep initialArticle fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [articleId, lang]);

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  const rawBody = article?.content || article?.body || '';
  const decodeEntities = (str: string) =>
    str
      .replace(/&nbsp;/gi, ' ')
      .replace(/&quot;/gi, '"')
      .replace(/&#0*39;|&apos;/gi, "'")
      .replace(/&laquo;/gi, '«')
      .replace(/&raquo;/gi, '»')
      .replace(/&amp;/gi, '&');

  const cleanParagraphs =
    article?.paragraphs && article.paragraphs.length > 0
      ? article.paragraphs
      : rawBody
      ? decodeEntities(rawBody.replace(/<[^>]+>/g, '\n'))
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
      : article?.summary
      ? [decodeEntities(article.summary)]
      : [];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--mk-surface)] border border-[var(--mk-line)] text-xs sm:text-sm font-semibold text-[var(--mk-text)] hover:border-[var(--mk-line-strong)] transition-colors cursor-pointer"
      >
        <BackIcon className="w-4 h-4" />
        <span>{t('back')}</span>
      </button>

      {article ? (
        <article className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl overflow-hidden">
          <div className="aspect-[16/9] w-full bg-[var(--mk-surface-soft)] overflow-hidden">
            <SmartImage
              src={article.image}
              alt={article.title}
              kind="news"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-5 sm:p-8 space-y-5">
            <div className="space-y-2">
              <div className="text-xs text-[var(--mk-muted)] flex items-center gap-2">
                {article.tournament_name && (
                  <>
                    <span className="font-semibold text-[var(--mk-accent)]">
                      {article.tournament_name}
                    </span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <time className="mk-mono">{formatNewsDate(article.created_at, lang)}</time>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--mk-text)] leading-snug [text-wrap:balance]">
                {article.title}
              </h1>
            </div>

            {loading && cleanParagraphs.length <= 1 ? (
              <div className="space-y-2.5">
                <div className="h-4 rounded bg-[var(--mk-surface-soft)] animate-pulse" />
                <div className="h-4 rounded bg-[var(--mk-surface-soft)] animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-[var(--mk-surface-soft)] animate-pulse" />
              </div>
            ) : (
              <div className="space-y-4 text-sm sm:text-base text-[var(--mk-text)]/90 leading-relaxed">
                {cleanParagraphs.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            )}
          </div>
        </article>
      ) : (
        <div className="bg-[var(--mk-surface)] border border-[var(--mk-line)] rounded-2xl p-10 text-center text-sm text-[var(--mk-muted)]">
          {t('loading')}
        </div>
      )}
    </div>
  );
}
