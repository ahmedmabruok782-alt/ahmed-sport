import { BellRing, Sparkles, X } from 'lucide-react';
import type { Language, MatchItem } from '../types/koora';
import type { TranslationKey } from '../i18n/translations';
import { SmartImage } from './SmartImage';

export interface PushAlertItem {
  id: string;
  match: MatchItem;
  title: string;
  body: string;
  timestamp: string;
  browserNativeUsed: boolean;
  canSimulateFollowUp?: boolean;
}

export async function triggerBrowserNotification(
  title: string,
  body: string
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission === 'granted') {
      new Notification(title, {
        body,
        silent: false,
      });
      return true;
    }
  } catch {
    // Sandboxed iframe environments may disallow native Notification constructor or permission prompts
  }
  return false;
}

export function formatTeamScorePair(
  homeName: string,
  homeScore: number,
  awayName: string,
  awayScore: number
): string {
  // Pairing each club name directly with its own score avoids any RTL/LTR Bidi reversal
  return `${homeName} (${homeScore}) — ${awayName} (${awayScore})`;
}

export function buildSimulatedMatchUpdate(
  match: MatchItem,
  lang: Language
): {
  title: string;
  body: string;
} {
  const state = (match.state || '').toLowerCase();
  const home = match.home_team.name;
  const away = match.away_team.name;
  const hScore = Number(match.home_team.score ?? 0);
  const aScore = Number(match.away_team.score ?? 0);

  if (state === 'live') {
    const pair = formatTeamScorePair(home, hScore, away, aScore);
    return lang === 'ar'
      ? {
          title: `تحديث مباشر · ${pair}`,
          body: `متابعة لحظية لمجريات لقاء ${home} و${away} ضمن ${match.tournament?.name || ''}.`,
        }
      : {
          title: `Live Match Update · ${pair}`,
          body: `Live match coverage for ${home} vs ${away} (${match.tournament?.name || ''}).`,
        };
  }

  if (state === 'halftime') {
    const pair = formatTeamScorePair(home, hScore, away, aScore);
    return lang === 'ar'
      ? {
          title: `استراحة ما بين الشوطين · ${pair}`,
          body: `الشوط الثاني ينطلق قريباً عبر قناة ${match.broadcast?.channel || 'البث الناقل'}.`,
        }
      : {
          title: `Half-Time · ${pair}`,
          body: `Second half starting soon on ${match.broadcast?.channel || 'broadcast channel'}.`,
        };
  }

  if (state === 'finished') {
    const pair = formatTeamScorePair(home, hScore, away, aScore);
    return lang === 'ar'
      ? {
          title: `النتيجة النهائية · ${pair}`,
          body: `انتهت المواجهة ضمن ${match.tournament?.name || ''}. افتح المباراة لمراجعة الأحداث والإحصائيات.`,
        }
      : {
          title: `Full-Time · ${pair}`,
          body: `Final whistle in ${match.tournament?.name || ''}. Open match center for full stats.`,
        };
  }

  return lang === 'ar'
    ? {
        title: `تذكير بالموعد · ${home} ضد ${away}`,
        body: `تنطلق المباراة الساعة ${match.time} بتوقيت الرياض عبر ${
          match.broadcast?.channel || 'القنوات الناقلة'
        }.`,
      }
    : {
        title: `Kickoff Reminder · ${home} vs ${away}`,
        body: `Match starts at ${match.time} (Riyadh Time) on ${
          match.broadcast?.channel || 'scheduled broadcast'
        }.`,
      };
}

interface PushNotificationBannerProps {
  alerts: PushAlertItem[];
  t: (key: TranslationKey) => string;
  onDismiss: (id: string) => void;
  onOpenMatch: (match: MatchItem, alertId: string) => void;
  onSimulateUpdate: (match: MatchItem) => void;
}

export function PushNotificationBanner({
  alerts,
  t,
  onDismiss,
  onOpenMatch,
  onSimulateUpdate,
}: PushNotificationBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-20 end-4 z-50 w-[calc(100vw-2rem)] max-w-sm space-y-2.5 pointer-events-none"
    >
      {alerts.map((alert) => (
        <div
          key={alert.id}
          role="status"
          className="pointer-events-auto rounded-2xl bg-[var(--mk-surface)] border border-[var(--mk-line-strong)] shadow-xl p-4 space-y-3 transition-all duration-200"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 text-xs text-[var(--mk-muted)]">
            <div className="flex items-center gap-1.5 min-w-0">
              <BellRing className="w-3.5 h-3.5 text-[var(--mk-accent)] shrink-0" />
              <span className="font-bold text-[var(--mk-text)] truncate">
                {t('pushHeader')}
              </span>
              <span aria-hidden="true">·</span>
              <span dir="ltr" className="mk-mono shrink-0">
                {alert.timestamp}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(alert.id)}
              aria-label={t('close')}
              className="p-1 rounded-md text-[var(--mk-muted)] hover:text-[var(--mk-text)] hover:bg-[var(--mk-surface-soft)] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Match Teams + Alert Copy */}
          <div className="flex items-start gap-3">
            <div className="flex items-center -space-x-2 rtl:space-x-reverse shrink-0 pt-0.5">
              <SmartImage
                src={alert.match.home_team.logo}
                alt={alert.match.home_team.name}
                kind="team"
                className="w-8 h-8 rounded-full object-contain bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] p-0.5"
              />
              <SmartImage
                src={alert.match.away_team.logo}
                alt={alert.match.away_team.name}
                kind="team"
                className="w-8 h-8 rounded-full object-contain bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] p-0.5"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs sm:text-sm font-bold text-[var(--mk-text)] leading-snug">
                {alert.title}
              </p>
              <p className="text-xs text-[var(--mk-muted)] leading-relaxed">
                {alert.body}
              </p>
              <p className="text-[11px] text-[var(--mk-muted)]">
                {alert.browserNativeUsed ? t('browserNotifyActive') : t('inAppNotifyActive')}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="pt-2 border-t border-[var(--mk-line)] flex items-center justify-end gap-2">
            {alert.canSimulateFollowUp && (
              <button
                type="button"
                onClick={() => onSimulateUpdate(alert.match)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--mk-surface-soft)] border border-[var(--mk-line)] hover:border-[var(--mk-line-strong)] text-xs font-semibold text-[var(--mk-text)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--mk-accent)]" />
                <span>{t('simulateUpdate')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenMatch(alert.match, alert.id)}
              className="px-3 py-1.5 rounded-lg bg-[var(--mk-accent)] text-[var(--mk-on-accent)] hover:bg-[var(--mk-accent-hover)] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t('openMatch')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
