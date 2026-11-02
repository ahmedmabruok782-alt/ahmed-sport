export type Language = 'ar' | 'en';

export type PageView =
  | 'home'
  | 'match-details'
  | 'standings'
  | 'scorers'
  | 'predictions'
  | 'news'
  | 'news-detail'
  | 'search'
  | 'team';

export interface TeamSummary {
  id: string;
  name: string;
  logo: string;
  score?: number;
}

export interface TournamentSummary {
  id: string;
  key?: string;
  name: string;
  logo: string;
  rank?: number;
  standings_available?: boolean;
  cup_format?: boolean;
}

export interface BroadcastInfo {
  channel: string;
  commentator: string;
}

export type MatchState =
  | 'live'
  | 'halftime'
  | 'finished'
  | 'upcoming'
  | 'soon'
  | 'postponed'
  | 'cancelled';

export interface MatchItem {
  id: string;
  date: string;
  time: string;
  start_at?: string;
  timestamp?: number;
  state: MatchState | string;
  state_text?: string;
  elapsed_seconds?: number;
  clock_synced_at?: number;
  added_minutes?: number;
  round?: string;
  stadium?: string;
  home_team: TeamSummary;
  away_team: TeamSummary;
  tournament: TournamentSummary;
  broadcast?: BroadcastInfo;
}

export interface MatchEventItem {
  id: string;
  team_id: string;
  type: number;
  status?: number;
  name: string;
  status_name?: string;
  minute: number;
  added?: number;
  video_url?: string;
  player?: {
    id: string;
    name: string;
    number?: number;
    position?: string;
    image?: string;
  };
  assist?: {
    id: string;
    name: string;
    number?: number;
    position?: string;
    image?: string;
  };
}

export interface LineupPlayer {
  id: string;
  name: string;
  number: number;
  position: string;
  image?: string;
  line?: string;
  formation_position?: number;
  rating?: string;
  captain?: boolean;
  man_of_match?: boolean;
  goals?: number;
  assists?: number;
  yellow?: number;
  red?: number;
  substituted?: boolean;
}

export interface TeamLineup {
  team: TeamSummary;
  formation: string;
  coach?: {
    id: string;
    name: string;
    image?: string;
  };
  starters: LineupPlayer[];
  substitutes?: LineupPlayer[];
}

export interface MatchStatisticsSide {
  ball_possession?: number;
  total_shots?: number;
  shots_on_goal?: number;
  shots_off_goal?: number;
  blocked_shots?: number;
  total_passes?: number;
  passes_accurate?: number;
  passes_percentage?: number;
  corner_kicks?: number;
  fouls?: number;
  offsides?: number;
  goalkeeper_saves?: number;
  yellow_cards?: number;
  red_cards?: number;
  freekick?: number;
  xg?: number;
}

export interface MatchDetailsPayload {
  match: MatchItem;
  referee?: {
    id: string;
    name: string;
    role?: string;
    image?: string;
  };
  stadium?: {
    id: string;
    name: string;
  };
  events?: MatchEventItem[];
  lineup?: {
    home?: TeamLineup;
    away?: TeamLineup;
  };
  statistics?: {
    home?: MatchStatisticsSide;
    away?: MatchStatisticsSide;
  };
  head_to_head?: MatchItem[];
  recent?: {
    home?: MatchItem[];
    away?: MatchItem[];
  };
}

export interface StandingRow {
  rank: number;
  group?: string;
  team: TeamSummary;
  played: number;
  remaining?: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  color?: string;
  note?: string;
}

export interface ScorerRow {
  player: {
    id: string;
    name: string;
    image?: string;
    team_name: string;
    position?: string;
    number?: number;
  };
  goals: number;
  assists?: number;
  penalty_goals?: number;
  missed_penalties?: number;
}

export interface NewsItem {
  id: string;
  title: string;
  slug?: string;
  summary?: string;
  content?: string;
  body?: string;
  paragraphs?: string[];
  image?: string;
  created_at?: string;
  tournament_name?: string;
}

export interface UserPrediction {
  matchId: string;
  homeScore: number;
  awayScore: number;
  savedAt: number;
  homeName: string;
  awayName: string;
  tournamentName: string;
}
