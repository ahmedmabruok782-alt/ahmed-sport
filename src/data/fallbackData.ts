import type {
  MatchDetailsPayload,
  MatchItem,
  NewsItem,
  ScorerRow,
  StandingRow,
  TournamentSummary,
} from '../types/koora';

export const FALLBACK_COMPETITIONS: Record<'ar' | 'en', TournamentSummary[]> = {
  ar: [
    { id: '943983', key: 'afc-champions-league', name: 'دوري أبطال آسيا للنخبة', logo: '', rank: 1, standings_available: true },
    { id: '939110', key: 'saudi-pro-league', name: 'دوري روشن السعودي', logo: '', rank: 2, standings_available: true },
    { id: '935982', key: 'uefa-champions-league', name: 'دوري أبطال أوروبا', logo: '', rank: 3, standings_available: true },
    { id: '938411', key: 'premier-league', name: 'الدوري الإنجليزي الممتاز', logo: '', rank: 4, standings_available: true },
    { id: '938652', key: 'la-liga', name: 'الدوري الإسباني', logo: '', rank: 5, standings_available: true },
    { id: '936357', key: 'serie-a', name: 'الدوري الإيطالي', logo: '', rank: 6, standings_available: true },
    { id: '938769', key: 'bundesliga', name: 'الدوري الألماني', logo: '', rank: 7, standings_available: true },
  ],
  en: [
    { id: '943983', key: 'afc-champions-league', name: 'AFC Champions League Elite', logo: '', rank: 1, standings_available: true },
    { id: '939110', key: 'saudi-pro-league', name: 'Saudi Pro League', logo: '', rank: 2, standings_available: true },
    { id: '935982', key: 'uefa-champions-league', name: 'UEFA Champions League', logo: '', rank: 3, standings_available: true },
    { id: '938411', key: 'premier-league', name: 'Premier League', logo: '', rank: 4, standings_available: true },
    { id: '938652', key: 'la-liga', name: 'La Liga', logo: '', rank: 5, standings_available: true },
    { id: '936357', key: 'serie-a', name: 'Serie A', logo: '', rank: 6, standings_available: true },
    { id: '938769', key: 'bundesliga', name: 'Bundesliga', logo: '', rank: 7, standings_available: true },
  ],
};

export function buildFallbackMatches(dateStr: string, lang: 'ar' | 'en' = 'ar'): MatchItem[] {
  const now = Date.now();
  const isEn = lang === 'en';
  return [
    {
      id: '6050092',
      date: dateStr,
      time: '21:15',
      start_at: `${dateStr}T21:15:00+03:00`,
      state: 'live',
      state_text: isEn ? 'Live Now' : 'مباشر الآن',
      elapsed_seconds: 1855,
      clock_synced_at: now,
      added_minutes: 0,
      round: isEn ? 'Round 4' : 'الجولة 4',
      stadium: isEn ? 'Thani bin Jassim Stadium' : 'استاد ثاني بن جاسم',
      home_team: { id: '101897', name: isEn ? 'Al-Gharafa' : 'الغرافة', logo: '', score: 0 },
      away_team: { id: '101919', name: isEn ? 'Al-Qadsiah' : 'القادسية', logo: '', score: 2 },
      tournament: { id: '943983', name: isEn ? 'AFC Champions League Elite' : 'دوري أبطال آسيا للنخبة', logo: '' },
      broadcast: { channel: 'beIN Sports 1', commentator: isEn ? 'Hassan Al-Aidarous' : 'حسن العيدروس' },
    },
    {
      id: '6050093',
      date: dateStr,
      time: '21:15',
      start_at: `${dateStr}T21:15:00+03:00`,
      state: 'live',
      state_text: isEn ? 'Live Now' : 'مباشر الآن',
      elapsed_seconds: 1853,
      clock_synced_at: now,
      added_minutes: 0,
      round: isEn ? 'Round 4' : 'الجولة 4',
      stadium: isEn ? 'Al-Inma Stadium' : 'ملعب الإنماء',
      home_team: { id: '8577', name: isEn ? 'Al-Ittihad' : 'الاتحاد', logo: '', score: 0 },
      away_team: { id: '102117', name: isEn ? 'Al-Ain' : 'العين', logo: '', score: 1 },
      tournament: { id: '943983', name: isEn ? 'AFC Champions League Elite' : 'دوري أبطال آسيا للنخبة', logo: '' },
      broadcast: { channel: 'beIN Sports 3', commentator: isEn ? 'Ahmed Al-Balushi' : 'أحمد البلوشي' },
    },
    {
      id: '5868190',
      date: dateStr,
      time: '23:00',
      start_at: `${dateStr}T23:00:00+03:00`,
      state: 'upcoming',
      state_text: isEn ? 'Not Started' : 'لم تبدأ بعد',
      round: isEn ? 'Round 11' : 'الجولة 11',
      stadium: isEn ? 'Spotify Camp Nou' : 'سبوتيفاي كامب نو',
      home_team: { id: '8634', name: isEn ? 'Barcelona' : 'برشلونة', logo: '', score: 0 },
      away_team: { id: '9866', name: isEn ? 'Real Sociedad' : 'ريال سوسيداد', logo: '', score: 0 },
      tournament: { id: '938652', name: isEn ? 'La Liga' : 'الدوري الإسباني', logo: '' },
      broadcast: { channel: 'beIN Sports HD 1', commentator: isEn ? 'Hafid Derradji' : 'حفيظ دراجي' },
    },
    {
      id: '5868204',
      date: dateStr,
      time: '23:30',
      start_at: `${dateStr}T23:30:00+03:00`,
      state: 'upcoming',
      state_text: isEn ? 'Not Started' : 'لم تبدأ بعد',
      round: isEn ? 'Round 10' : 'الجولة 10',
      stadium: isEn ? 'Anfield' : 'أنفيلد',
      home_team: { id: '8650', name: isEn ? 'Liverpool' : 'ليفربول', logo: '', score: 0 },
      away_team: { id: '9825', name: isEn ? 'Arsenal' : 'آرسنال', logo: '', score: 0 },
      tournament: { id: '938411', name: isEn ? 'Premier League' : 'الدوري الإنجليزي الممتاز', logo: '' },
      broadcast: { channel: 'beIN Sports HD 2', commentator: isEn ? 'Issam Chawali' : 'عصام الشوالي' },
    },
  ];
}

export function buildFallbackMatchDetails(id: string, lang: 'ar' | 'en' = 'ar'): MatchDetailsPayload {
  const today = new Date().toISOString().slice(0, 10);
  const matches = buildFallbackMatches(today, lang);
  const match = matches.find((m) => m.id === id) || matches[0];
  const isEn = lang === 'en';

  return {
    match,
    referee: {
      id: '193896',
      name: isEn ? 'International Referee' : 'حكم دولي',
      role: isEn ? 'Main Referee' : 'حكم الساحة',
    },
    stadium: {
      id: '73',
      name: match.stadium || (isEn ? 'International Arena' : 'الملعب الدولي'),
    },
    events: [
      {
        id: 'ev-1',
        team_id: match.away_team.id,
        type: 1,
        name: isEn ? 'Goal' : 'هدف',
        minute: 14,
        player: { id: 'p1', name: isEn ? 'Aubameyang' : 'أوباميانغ', number: 10 },
      },
      {
        id: 'ev-2',
        team_id: match.away_team.id,
        type: 1,
        name: isEn ? 'Goal' : 'هدف',
        minute: 27,
        player: { id: 'p2', name: isEn ? 'Julian Quinones' : 'خوليان كينونيس', number: 33 },
      },
    ],
    lineup: {
      home: {
        team: match.home_team,
        formation: '4-2-3-1',
        coach: { id: 'c1', name: isEn ? 'Pedro Martins' : 'بيدرو مارتينز' },
        starters: [
          { id: 'h1', name: isEn ? 'Rico' : 'ريكو', number: 1, position: 'GK', line: 'G', rating: '6.8' },
          { id: 'h2', name: isEn ? 'Sano' : 'سانو', number: 2, position: 'RB', line: 'D', rating: '6.9' },
          { id: 'h3', name: isEn ? 'Nani' : 'ناني', number: 4, position: 'CB', line: 'D', rating: '6.7' },
          { id: 'h4', name: isEn ? 'Yousif' : 'يوسف', number: 5, position: 'CB', line: 'D', rating: '6.8' },
          { id: 'h5', name: isEn ? 'Hamed' : 'حامد', number: 3, position: 'LB', line: 'D', rating: '6.9' },
          { id: 'h6', name: isEn ? 'Sassi' : 'فرجاني ساسي', number: 13, position: 'CM', line: 'M', rating: '7.1' },
          { id: 'h7', name: isEn ? 'Diaz' : 'دياز', number: 6, position: 'CM', line: 'M', rating: '7.0' },
          { id: 'h8', name: isEn ? 'Brahimi' : 'ياسين براهيمي', number: 8, position: 'LW', line: 'M', rating: '7.4', captain: true },
          { id: 'h9', name: isEn ? 'Coman' : 'كومان', number: 7, position: 'AM', line: 'M', rating: '7.0' },
          { id: 'h10', name: isEn ? 'Al-Ganehi' : 'الجانحي', number: 11, position: 'RW', line: 'M', rating: '6.9' },
          { id: 'h11', name: isEn ? 'Joselu' : 'خوسيلو', number: 9, position: 'ST', line: 'F', rating: '7.1' },
        ],
      },
      away: {
        team: match.away_team,
        formation: '4-3-3',
        coach: { id: 'c2', name: isEn ? 'Michel' : 'ميتشيل' },
        starters: [
          { id: 'a1', name: isEn ? 'Casteels' : 'كاستيلس', number: 1, position: 'GK', line: 'G', rating: '7.5' },
          { id: 'a2', name: isEn ? 'Al-Shamat' : 'الشامات', number: 2, position: 'RB', line: 'D', rating: '7.2' },
          { id: 'a3', name: isEn ? 'Nacho' : 'ناتشو', number: 6, position: 'CB', line: 'D', rating: '7.6', captain: true },
          { id: 'a4', name: isEn ? 'Thakri' : 'ذكري', number: 4, position: 'CB', line: 'D', rating: '7.1' },
          { id: 'a5', name: isEn ? 'Al-menaif' : 'المنيف', number: 12, position: 'LB', line: 'D', rating: '7.1' },
          { id: 'a6', name: isEn ? 'Fernandez' : 'إيكي فيرنانديز', number: 5, position: 'CM', line: 'M', rating: '7.7' },
          { id: 'a7', name: isEn ? 'Nandez' : 'ناهيتان نانديز', number: 8, position: 'CM', line: 'M', rating: '7.5' },
          { id: 'a8', name: isEn ? 'Puertas' : 'بويرتاس', number: 10, position: 'CM', line: 'M', rating: '7.8' },
          { id: 'a9', name: isEn ? 'Al-Ammar' : 'العمار', number: 7, position: 'LW', line: 'F', rating: '7.3' },
          { id: 'a10', name: isEn ? 'Aubameyang' : 'أوباميانغ', number: 17, position: 'ST', line: 'F', rating: '8.3', goals: 1 },
          { id: 'a11', name: isEn ? 'Quinones' : 'كينونيس', number: 33, position: 'RW', line: 'F', rating: '8.4', goals: 1 },
        ],
      },
    },
    statistics: {
      home: {
        ball_possession: 48,
        total_shots: 7,
        shots_on_goal: 2,
        total_passes: 245,
        passes_percentage: 84,
        corner_kicks: 3,
        fouls: 6,
        offsides: 1,
        goalkeeper_saves: 3,
        yellow_cards: 1,
        red_cards: 0,
      },
      away: {
        ball_possession: 52,
        total_shots: 11,
        shots_on_goal: 5,
        total_passes: 274,
        passes_percentage: 88,
        corner_kicks: 5,
        fouls: 7,
        offsides: 2,
        goalkeeper_saves: 2,
        yellow_cards: 0,
        red_cards: 0,
      },
    },
  };
}

export const FALLBACK_STANDINGS: StandingRow[] = [
  { rank: 1, team: { id: '8634', name: 'برشلونة', logo: '' }, played: 11, wins: 10, draws: 0, losses: 1, goals_for: 37, goals_against: 10, goal_difference: 27, points: 30 },
  { rank: 2, team: { id: '8633', name: 'ريال مدريد', logo: '' }, played: 11, wins: 7, draws: 3, losses: 1, goals_for: 24, goals_against: 11, goal_difference: 13, points: 24 },
  { rank: 3, team: { id: '10205', name: 'فياريال', logo: '' }, played: 11, wins: 6, draws: 3, losses: 2, goals_for: 20, goals_against: 15, goal_difference: 5, points: 21 },
  { rank: 4, team: { id: '9906', name: 'أتلتيكو مدريد', logo: '' }, played: 11, wins: 5, draws: 5, losses: 1, goals_for: 17, goals_against: 7, goal_difference: 10, points: 20 },
  { rank: 5, team: { id: '8315', name: 'أتلتيك بلباو', logo: '' }, played: 11, wins: 5, draws: 3, losses: 3, goals_for: 18, goals_against: 12, goal_difference: 6, points: 18 },
  { rank: 6, team: { id: '8603', name: 'ريال بيتيس', logo: '' }, played: 11, wins: 5, draws: 3, losses: 3, goals_for: 14, goals_against: 10, goal_difference: 4, points: 18 },
];

export const FALLBACK_SCORERS: ScorerRow[] = [
  { player: { id: '696679', name: 'رافينيا', team_name: 'برشلونة', number: 11 }, goals: 15, penalty_goals: 3, missed_penalties: 0 },
  { player: { id: '701154', name: 'كيليان مبابي', team_name: 'ريال مدريد', number: 9 }, goals: 11, penalty_goals: 2, missed_penalties: 1 },
  { player: { id: '1467236', name: 'لامين يامال', team_name: 'برشلونة', number: 19 }, goals: 9, penalty_goals: 1, missed_penalties: 0 },
  { player: { id: '521100', name: 'روبرت ليفاندوفسكي', team_name: 'برشلونة', number: 9 }, goals: 8, penalty_goals: 1, missed_penalties: 0 },
  { player: { id: '802111', name: 'فينيسيوس جونيور', team_name: 'ريال مدريد', number: 7 }, goals: 8, penalty_goals: 2, missed_penalties: 0 },
];

export const FALLBACK_NEWS: NewsItem[] = [
  {
    id: '14084817',
    title: 'انطلاقة قوية للأندية العربية في الجولة الرابعة من دوري أبطال آسيا للنخبة',
    summary: 'تشهد ملاعب القارة الآسيوية مواجهات حاسمة لحجز بطاقات الصدارة والتأهل المبكر للأدوار الإقصائية.',
    paragraphs: [
      'دخلت منافسات دوري أبطال آسيا للنخبة منعطفاً حاسماً في جولتها الرابعة، وسط حضور جماهيري غفير ومستويات فنية عالية.',
      'وأكدت الأجهزة الفنية أهمية حصد النقاط الكاملة لتأمين المراكز المتقدمة في جدول الترتيب الموحد قبل جولات الحسم.',
    ],
    created_at: new Date().toISOString(),
    tournament_name: 'دوري أبطال آسيا للنخبة',
  },
  {
    id: '14084808',
    title: 'سباق الصدارة يحتدم في دوري روشن السعودي مع تقارب النقاط بين الكبار',
    summary: 'تواصل أندية المقدمة تقديم مستويات فنية رفيعة تزيد من إثارة الجولات المتتالية مع تقارب واضح في عدد النقاط.',
    paragraphs: [
      'تترقب الجماهير المواجهات المباشرة القادمة التي ستحدد ملامح صدارة جدول الترتيب وقائمة الهدافين.',
    ],
    created_at: new Date(Date.now() - 3600_000).toISOString(),
    tournament_name: 'دوري روشن السعودي',
  },
];
