import { Globe, Search } from 'lucide-react';
import type { Language, PageView, TournamentSummary } from '../types/koora';
import type { TranslationKey } from '../i18n/translations';
import { BrandLogo } from './BrandLogo';
import { SmartImage } from './SmartImage';

interface HeaderProps {
  lang: Language;
  t: (key: TranslationKey) => string;
  activePage: PageView;
  competitions: TournamentSummary[];
  selectedCompetitionId?: string;
  onNavigate: (page: PageView) => void;
  onSelectCompetition: (id: string) => void;
  onToggleLanguage: () => void;
}

export function Header({
  t,
  activePage,
  competitions,
  selectedCompetitionId,
  onNavigate,
  onSelectCompetition,
  onToggleLanguage,
}: HeaderProps) {
  const navItems: { page: PageView; labelKey: TranslationKey }[] = [
    { page: 'home', labelKey: 'matches' },
    { page: 'standings', labelKey: 'competitions' },
    { page: 'scorers', labelKey: 'scorers' },
    { page: 'predictions', labelKey: 'predictions' },
    { page: 'news', labelKey: 'news' },
  ];

  const isNavActive = (page: PageView) => {
    if (page === 'home' && (activePage === 'home' || activePage === 'match-details')) return true;
    if (page === 'news' && (activePage === 'news' || activePage === 'news-detail')) return true;
    return activePage === page;
  };

  return (
    <div className="w-full">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[var(--mk-surface)]/95 backdrop-blur-md border-b border-[var(--mk-line)]">
        <div className="max-w-[1320px] mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 h-16">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2.5 text-lg sm:text-xl font-bold tracking-tight text-[var(--mk-text)] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--mk-accent)] rounded-md"
          >
            <BrandLogo size={36} className="shrink-0" />
            <span>{t('siteName')}</span>
          </button>

          {/* Zone 2: 5 Single-Line Navigation Links */}
          <nav
            aria-label="التنقل الرئيسي"
            className="hidden md:flex items-center gap-7 text-sm font-semibold text-[var(--mk-muted)]"
          >
            {navItems.map((item) => {
              const active = isNavActive(item.page);
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => onNavigate(item.page)}
                  className={`relative py-5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active ? 'text-[var(--mk-accent)]' : 'hover:text-[var(--mk-text)]'
                  }`}
                >
                  {t(item.labelKey)}
                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--mk-accent)] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action (Search) */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('search')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-[var(--mk-accent)] text-[var(--mk-on-accent)] hover:bg-[var(--mk-accent-hover)] transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span>{t('search')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Global Top Leagues & Language Switch Strip */}
      <div className="bg-[var(--mk-surface-soft)] border-b border-[var(--mk-line)]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <div
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
            aria-label={t('topLeagues')}
          >
            {competitions.slice(0, 7).map((comp) => {
              const isSelected = activePage === 'standings' && selectedCompetitionId === comp.id;
              return (
                <button
                  key={comp.id || comp.key || comp.name}
                  type="button"
                  onClick={() => onSelectCompetition(comp.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-[var(--mk-accent-soft)] border-[var(--mk-accent)] text-[var(--mk-accent)]'
                      : 'bg-[var(--mk-surface)] border-[var(--mk-line)] text-[var(--mk-text)] hover:border-[var(--mk-line-strong)]'
                  }`}
                >
                  <SmartImage
                    src={comp.logo}
                    alt={comp.name}
                    kind="league"
                    className="w-4 h-4 object-contain rounded-sm"
                  />
                  <span>{comp.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onToggleLanguage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--mk-surface)] border border-[var(--mk-line)] text-[var(--mk-muted)] hover:text-[var(--mk-text)] transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[36px]"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t('switchLang')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
