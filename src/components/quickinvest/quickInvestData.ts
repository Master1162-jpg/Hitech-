import type { BotStrategy, QuickInvestStrategyItem } from '../../types';

export interface TopPackageItem {
  id: string;
  rank: 1 | 2 | 3;
  name: string;
  subtitle?: string;
  pnl24hPct: string;
  pnl24hUsd: string;
  strategy: BotStrategy;
  strategyName: string;
  method: string;
  baseAmount: number;
  takeProfit: number;
  stopLoss: number;
  maxSteps: number;
  shareCode: string;
  copiers: number;
}

export interface DailyInvestorRank {
  rank: number;
  username: string;
  pnlPctLabel: string;
  locked?: boolean;
  crown?: boolean;
  tier?: 'silver' | 'gold' | 'emerald';
  strategy: BotStrategy;
  baseAmount: number;
}

export const QUICKINVEST_TOP_PACKAGES: TopPackageItem[] = [
  {
    id: 'pkg_rank_1',
    rank: 1,
    name: 'CHÂU ANH - BOT ĐỘC QUYỀN F2',
    pnl24hPct: '+2432000%',
    pnl24hUsd: '$24320100',
    strategy: 'ai_predict',
    strategyName: 'AI Dự Đoán Đa Tầng',
    method: 'AI Quant',
    baseAmount: 10,
    takeProfit: 150,
    stopLoss: 50,
    maxSteps: 4,
    shareCode: 'QI-CA-F2',
    copiers: 1842,
  },
  {
    id: 'pkg_rank_2',
    rank: 2,
    name: 'CHÂU ANH VIP @chauanh_ai',
    pnl24hPct: '+1845000%',
    pnl24hUsd: '$2354890',
    strategy: 'martingale',
    strategyName: 'Martingale Cơ Bản',
    method: 'String Method',
    baseAmount: 10,
    takeProfit: 120,
    stopLoss: 60,
    maxSteps: 4,
    shareCode: 'QI-CA-VIP',
    copiers: 1295,
  },
  {
    id: 'pkg_rank_3',
    rank: 3,
    name: 'QUICKINVEST QUANT PRO V3',
    pnl24hPct: '+964200%',
    pnl24hUsd: '$1284500',
    strategy: 'trend_2_1',
    strategyName: 'Theo Xu Hướng 2-1',
    method: 'String Method',
    baseAmount: 20,
    takeProfit: 200,
    stopLoss: 80,
    maxSteps: 5,
    shareCode: 'QI-QUANT-V3',
    copiers: 948,
  },
];

export const QUICKINVEST_DAILY_LEADERBOARD: DailyInvestorRank[] = [
  {
    rank: 1,
    username: 'kaizenfin01',
    pnlPctLabel: '55.4%',
    tier: 'silver',
    strategy: 'ai_predict',
    baseAmount: 10,
  },
  {
    rank: 2,
    username: 'kaizenfin01',
    pnlPctLabel: '100.0%',
    tier: 'gold',
    crown: true,
    strategy: 'reverse_2',
    baseAmount: 15,
  },
  {
    rank: 3,
    username: 'kaizenfin01',
    pnlPctLabel: '100.0%',
    tier: 'emerald',
    strategy: 'trend_2_1',
    baseAmount: 10,
  },
  { rank: 4, username: 'dangcarter1', pnlPctLabel: '100.0 %', locked: true, strategy: 'martingale', baseAmount: 10 },
  { rank: 5, username: 'dangcarter1', pnlPctLabel: '100.0 %', locked: true, strategy: 'martingale', baseAmount: 10 },
  { rank: 6, username: 'dangcarter1', pnlPctLabel: '100.0 %', locked: true, strategy: 'reverse_2', baseAmount: 10 },
  { rank: 7, username: 'dangcarter1', pnlPctLabel: '100.0 %', locked: true, strategy: 'reverse_3', baseAmount: 10 },
  { rank: 8, username: 'elia8888', pnlPctLabel: '45.4 %', strategy: 'ema_rsi', baseAmount: 10 },
  { rank: 9, username: 'kiemtien2027', pnlPctLabel: '29.6 %', strategy: 'zigzag', baseAmount: 10 },
  { rank: 10, username: 'yeuchauanh1', pnlPctLabel: '52.4 %', strategy: 'trend_2_1', baseAmount: 10 },
  { rank: 11, username: 'yeuchauanh2', pnlPctLabel: '49.0 %', strategy: 'bottom_top', baseAmount: 10 },
  { rank: 12, username: 'khanhdubai', pnlPctLabel: '51.3 %', strategy: 'ai_predict', baseAmount: 20 },
  { rank: 13, username: 'quocvn', pnlPctLabel: '52.0 %', strategy: 'fibonacci', baseAmount: 10 },
];

export const DEFAULT_QUICKINVEST_STRATEGIES: QuickInvestStrategyItem[] = [
  {
    id: 'str_martingale_basic',
    name: 'Martingale Cơ Bản',
    method: 'String Method',
    category: 'Chiến lược mặc định',
    strategyKey: 'martingale',
    patternCode: '1-2-4-8',
    winRateRef: 74.2,
    usersCount: 1842,
    createdAt: '17/11/2026, 06:11:11',
    isDefault: true,
    telegramChannel: '@QuickInvest_Martingale',
  },
  {
    id: 'str_reverse_2',
    name: 'Đảo Chiều Sau 2 Lệnh',
    method: 'String Method',
    category: 'Chiến lược mặc định',
    strategyKey: 'reverse_2',
    patternCode: 'B-B->S / S-S->B',
    winRateRef: 71.8,
    usersCount: 1290,
    createdAt: '17/11/2026, 06:11:11',
    isDefault: true,
  },
  {
    id: 'str_reverse_3',
    name: 'Đảo Chiều Sau 3 Lệnh',
    method: 'String Method',
    category: 'Chiến lược mặc định',
    strategyKey: 'reverse_3',
    patternCode: 'B-B-B->S / S-S-S->B',
    winRateRef: 76.5,
    usersCount: 1105,
    createdAt: '17/11/2026, 06:11:11',
    isDefault: true,
  },
  {
    id: 'str_trend_2_1',
    name: 'Theo Xu Hướng 2-1',
    method: 'String Method',
    category: 'Chiến lược mặc định',
    strategyKey: 'trend_2_1',
    patternCode: 'B-B->B / S-S->S',
    winRateRef: 73.0,
    usersCount: 984,
    createdAt: '17/11/2026, 06:11:11',
    isDefault: true,
    telegramChannel: '@QuickInvest_Trend_VIP',
  },
  {
    id: 'str_bottom_top',
    name: 'Bắt Đáy Đỉnh',
    method: 'String Method',
    category: 'Chiến lược mặc định',
    strategyKey: 'bottom_top',
    patternCode: 'BB(20) + RSI(14)',
    winRateRef: 69.4,
    usersCount: 876,
    createdAt: '17/11/2026, 06:11:11',
    isDefault: true,
  },
  {
    id: 'str_zigzag',
    name: 'Zigzag Pattern',
    method: 'String Method',
    category: 'Chiến lược mặc định',
    strategyKey: 'zigzag',
    patternCode: 'B-S-B-S-B-S',
    winRateRef: 68.9,
    usersCount: 760,
    createdAt: '17/11/2026, 06:11:11',
    isDefault: true,
  },
  {
    id: 'str_ai_quant',
    name: 'AI Dự Đoán Đa Tầng',
    method: 'AI Quant',
    category: 'Chiến lược AI',
    strategyKey: 'ai_predict',
    patternCode: '5-Factor + Gemini',
    winRateRef: 81.4,
    usersCount: 2410,
    createdAt: '17/11/2026, 06:11:11',
    isDefault: true,
    telegramChannel: '@QuickInvest_AI_Signals',
  },
  {
    id: 'str_ema_rsi',
    name: 'EMA + RSI Momentum',
    method: 'AI Quant',
    category: 'Chiến lược AI',
    strategyKey: 'ema_rsi',
    patternCode: 'EMA5/10 + RSI14',
    winRateRef: 75.6,
    usersCount: 1532,
    createdAt: '17/11/2026, 06:11:11',
    isDefault: true,
    telegramChannel: '@QuickInvest_EMA_Signal',
  },
  {
    id: 'str_fibonacci',
    name: 'Fibonacci Quản Trị Vốn',
    method: 'Signal Matrix',
    category: 'Chiến lược mặc định',
    strategyKey: 'fibonacci',
    patternCode: '1-1-2-3-5-8',
    winRateRef: 72.1,
    usersCount: 695,
    createdAt: '17/11/2026, 06:11:11',
    isDefault: true,
  },
];

export const STRATEGY_KEY_TO_LABEL: Record<BotStrategy, string> = {
  ai_predict: 'AI Dự Đoán Đa Tầng',
  ema_rsi: 'EMA + RSI Momentum',
  martingale: 'Martingale Cơ Bản',
  fibonacci: 'Fibonacci Quản Trị Vốn',
  trend_follow: 'Bắt Chuỗi Xu Hướng',
  reverse_2: 'Đảo Chiều Sau 2 Lệnh',
  reverse_3: 'Đảo Chiều Sau 3 Lệnh',
  trend_2_1: 'Theo Xu Hướng 2-1',
  bottom_top: 'Bắt Đáy Đỉnh',
  zigzag: 'Zigzag Pattern',
};
