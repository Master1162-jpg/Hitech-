import type {
  AccountMode,
  AiOrderPrediction,
  AiPredictionFactor,
  AiPredictionHistoryItem,
  AiSignalMode,
  AiSignalStrength,
  BotConfig,
  BotStrategy,
  Candle,
  GaugeSignalLabel,
  IndicatorGaugeReading,
  IndicatorGaugesSummary,
  PrizePoolWinner,
  QuickInvestCalendarDay,
  QuickInvestPeriod,
  QuickInvestPeriodStats,
  StreakRecord,
  TechnicalIndicators,
  TradeDashboardStats,
  TradeDirection,
  TradeOrder,
  UserAccount,
  UserStreakSummary,
} from '../types';

const FIB_SEQUENCE = [1, 1, 2, 3, 5, 8, 13, 21, 34];

/**
 * Computes Exponential Moving Average series for a price array.
 */
export function calculateEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    ema.push(values[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

/**
 * Computes RSI(14) from closing prices. Returns a number in [0, 100].
 */
export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < 2) return 50;
  const lookback = Math.min(period, closes.length - 1);
  let gains = 0;
  let losses = 0;
  const start = closes.length - lookback;
  for (let i = start; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / lookback;
  const avgLoss = losses / lookback;
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

/**
 * Derives full technical indicator bundle matching Kaizenfin's chart & Indicators tab.
 */
export function computeIndicators(candles: Candle[]): TechnicalIndicators {
  const closes = candles.map((c) => c.close);
  const ema5 = calculateEMA(closes, 5);
  const ema10 = calculateEMA(closes, 10);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);

  const lastIdx = Math.max(0, closes.length - 1);
  const macdLine = closes.map((_, idx) => (ema12[idx] ?? 0) - (ema26[idx] ?? 0));
  const macdSignalSeries = calculateEMA(macdLine, 9);
  const macd = Number((macdLine[lastIdx] ?? 0).toFixed(2));
  const macdSignal = Number((macdSignalSeries[lastIdx] ?? 0).toFixed(2));

  const rsi14 = calculateRSI(closes, 14);

  const slice20 = closes.slice(-20);
  const mean20 =
    slice20.length > 0 ? slice20.reduce((a, b) => a + b, 0) / slice20.length : 95000;
  const variance =
    slice20.length > 0
      ? slice20.reduce((acc, p) => acc + Math.pow(p - mean20, 2), 0) / slice20.length
      : 0;
  const stdDev = Math.sqrt(variance);
  const bollingerUpper = Number((mean20 + 2 * stdDev).toFixed(2));
  const bollingerLower = Number((mean20 - 2 * stdDev).toFixed(2));

  const lastEma5 = ema5[lastIdx] ?? 0;
  const lastEma10 = ema10[lastIdx] ?? 0;
  let score = 0;
  if (lastEma5 > lastEma10) score += 1;
  else if (lastEma5 < lastEma10) score -= 1;

  if (rsi14 >= 55) score += 1;
  else if (rsi14 <= 45) score -= 1;

  if (macd > macdSignal) score += 1;
  else if (macd < macdSignal) score -= 1;

  const signal: 'BUY' | 'SELL' | 'NEUTRAL' =
    score >= 1 ? 'BUY' : score <= -1 ? 'SELL' : 'NEUTRAL';

  const sentimentBuyPct = Math.min(82, Math.max(18, Math.round(50 + score * 8 + (rsi14 - 50) * 0.25)));
  const sentimentSellPct = 100 - sentimentBuyPct;

  return {
    ema5,
    ema10,
    rsi14,
    macd,
    macdSignal,
    bollingerUpper,
    bollingerLower,
    signal,
    sentimentBuyPct,
    sentimentSellPct,
  };
}

function buildGaugeReading(buyCount: number, neutralCount: number, sellCount: number): IndicatorGaugeReading {
  const total = buyCount + neutralCount + sellCount;
  const rawScore = total > 0 ? (buyCount - sellCount) / total : 0;
  const score = Number(Math.max(-1, Math.min(1, rawScore)).toFixed(3));
  const angleDeg = Number((score * 72).toFixed(1));

  let label: GaugeSignalLabel = 'NEUTRAL';
  if (score <= -0.6) label = 'STRONG SELL';
  else if (score <= -0.18) label = 'SELL';
  else if (score >= 0.6) label = 'STRONG BUY';
  else if (score >= 0.18) label = 'BUY';

  return {
    buyCount,
    neutralCount,
    sellCount,
    score,
    angleDeg,
    label,
  };
}

function calculateSMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-Math.min(period, values.length));
  return slice.reduce((acc, v) => acc + v, 0) / slice.length;
}

/**
 * Computes Kaizenfin-style 3-speedometer indicator gauges:
 * Oscillators, Moving Averages, and combined Summary from live candle data.
 */
export function computeIndicatorGauges(candles: Candle[]): IndicatorGaugesSummary {
  const base = computeIndicators(candles);
  const closes = candles.map((c) => c.close);
  const lastIdx = Math.max(0, closes.length - 1);
  const currentClose = closes[lastIdx] ?? 0;

  // --- 1. Oscillators (6 independent signals) ---
  let oscBuy = 0;
  let oscNeutral = 0;
  let oscSell = 0;
  const voteOsc = (v: -1 | 0 | 1) => {
    if (v > 0) oscBuy += 1;
    else if (v < 0) oscSell += 1;
    else oscNeutral += 1;
  };

  // (a) RSI(14)
  voteOsc(base.rsi14 > 54 ? 1 : base.rsi14 < 46 ? -1 : 0);

  // (b) MACD vs Signal
  const macdDiff = base.macd - base.macdSignal;
  voteOsc(macdDiff > 0.2 ? 1 : macdDiff < -0.2 ? -1 : 0);

  // (c) Stochastic %K(14) & (d) Williams %R(14)
  const lookback14 = candles.slice(-14);
  const high14 = lookback14.length > 0 ? Math.max(...lookback14.map((c) => c.high)) : currentClose;
  const low14 = lookback14.length > 0 ? Math.min(...lookback14.map((c) => c.low)) : currentClose;
  const range14 = high14 - low14;
  const stochK = range14 > 1e-6 ? ((currentClose - low14) / range14) * 100 : 50;
  voteOsc(stochK > 58 ? 1 : stochK < 42 ? -1 : 0);

  const williamsR = range14 > 1e-6 ? ((high14 - currentClose) / range14) * -100 : -50;
  voteOsc(williamsR > -40 ? 1 : williamsR < -60 ? -1 : 0);

  // (e) Momentum(10)
  const prev10 = closes[Math.max(0, closes.length - 11)] ?? currentClose;
  const mom10 = currentClose - prev10;
  voteOsc(mom10 > 2 ? 1 : mom10 < -2 ? -1 : 0);

  // (f) CCI(14)
  const typicals = lookback14.map((c) => (c.high + c.low + c.close) / 3);
  const tpMean = typicals.length > 0 ? typicals.reduce((a, b) => a + b, 0) / typicals.length : currentClose;
  const meanDev =
    typicals.length > 0
      ? typicals.reduce((a, tp) => a + Math.abs(tp - tpMean), 0) / typicals.length
      : 0;
  const cci = meanDev > 1e-6 ? (typicals[typicals.length - 1] - tpMean) / (0.015 * meanDev) : 0;
  voteOsc(cci > 40 ? 1 : cci < -40 ? -1 : 0);

  const oscillators = buildGaugeReading(oscBuy, oscNeutral, oscSell);

  // --- 2. Moving Averages (6 independent signals: EMA 5/10/20 & SMA 5/10/20) ---
  const ema20Series = calculateEMA(closes, 20);
  const ema5Val = Number((base.ema5[lastIdx] ?? currentClose).toFixed(2));
  const ema10Val = Number((base.ema10[lastIdx] ?? currentClose).toFixed(2));
  const ema20Val = Number((ema20Series[lastIdx] ?? currentClose).toFixed(2));
  const sma5Val = calculateSMA(closes, 5);
  const sma10Val = calculateSMA(closes, 10);
  const sma20Val = calculateSMA(closes, 20);

  let maBuy = 0;
  let maNeutral = 0;
  let maSell = 0;
  const maRefs = [ema5Val, ema10Val, ema20Val, sma5Val, sma10Val, sma20Val];
  for (const ma of maRefs) {
    const diff = currentClose - ma;
    if (diff > 0.5) maBuy += 1;
    else if (diff < -0.5) maSell += 1;
    else maNeutral += 1;
  }

  const movingAverages = buildGaugeReading(maBuy, maNeutral, maSell);

  // --- 3. Combined Summary ---
  const summary = buildGaugeReading(
    oscBuy + maBuy,
    oscNeutral + maNeutral,
    oscSell + maSell
  );

  return {
    oscillators,
    summary,
    movingAverages,
    rsi14: base.rsi14,
    macd: base.macd,
    macdSignal: base.macdSignal,
    ema5: ema5Val,
    ema10: ema10Val,
    ema20: ema20Val,
  };
}

/**
 * Evaluates a binary option order settlement against round result.
 * Returns status and PnL:
 * - DRAW (closePrice === entryPrice): refunds stake (pnl = 0, totalReturn = amount)
 * - WON: profit = +amount * payoutRate, totalReturn = amount + profit
 * - LOST: pnl = -amount, totalReturn = 0
 */
export function settleTradeOrder(
  direction: TradeDirection,
  amount: number,
  payoutRate: number,
  entryPrice: number,
  closePrice: number
): { status: 'WON' | 'LOST' | 'DRAW'; pnl: number; totalReturn: number } {
  if (Math.abs(closePrice - entryPrice) < 1e-6) {
    return {
      status: 'DRAW',
      pnl: 0,
      totalReturn: Number(amount.toFixed(2)),
    };
  }
  const candleDirection: TradeDirection = closePrice > entryPrice ? 'BUY' : 'SELL';
  const isWin = direction === candleDirection;
  if (isWin) {
    const profit = Number((amount * payoutRate).toFixed(2));
    return {
      status: 'WON',
      pnl: profit,
      totalReturn: Number((amount + profit).toFixed(2)),
    };
  }
  return {
    status: 'LOST',
    pnl: -Number(amount.toFixed(2)),
    totalReturn: 0,
  };
}

/**
 * Filters trade orders by optional account mode and inclusive YYYY-MM-DD date range.
 */
export function filterOrdersByCriteria(
  orders: TradeOrder[],
  criteria?: {
    accountMode?: AccountMode | 'all';
    startDate?: string;
    endDate?: string;
  }
): TradeOrder[] {
  if (!criteria) return orders;
  const { accountMode, startDate, endDate } = criteria;
  return orders.filter((o) => {
    if (accountMode && accountMode !== 'all' && o.accountMode !== accountMode) {
      return false;
    }
    if (startDate || endDate) {
      const d = new Date(o.createdAt);
      if (Number.isNaN(d.getTime())) return false;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const orderDay = `${yyyy}-${mm}-${dd}`;
      if (startDate && orderDay < startDate) return false;
      if (endDate && orderDay > endDate) return false;
    }
    return true;
  });
}

/**
 * Computes pure Trading Dashboard statistics from orders:
 * - totalOrders = wins + losses + draws (settled rounds)
 * - totalVolume = sum of stake amounts on settled orders
 * - totalRevenue = sum of gross payouts returned to wallet (WON: amount + pnl, DRAW: amount, LOST: 0)
 * - netProfit = sum of pnl across settled orders (= totalRevenue - totalVolume)
 * - buyPct / sellPct = BUY vs SELL split across settled orders
 */
export function computeTradeDashboardStats(
  orders: TradeOrder[],
  accountMode: AccountMode | 'all' = 'all'
): TradeDashboardStats {
  const scoped = filterOrdersByCriteria(orders, { accountMode });
  const openOrders = scoped.filter((o) => o.status === 'OPEN').length;
  const settled = scoped.filter((o) => o.status !== 'OPEN');

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let totalVolume = 0;
  let totalRevenue = 0;
  let netProfit = 0;
  let buyCount = 0;
  let sellCount = 0;

  for (const ord of settled) {
    totalVolume += ord.amount;
    netProfit += ord.pnl;

    if (ord.direction === 'BUY') buyCount += 1;
    else sellCount += 1;

    if (ord.status === 'WON') {
      wins += 1;
      totalRevenue += ord.amount + ord.pnl;
    } else if (ord.status === 'DRAW') {
      draws += 1;
      totalRevenue += ord.amount;
    } else {
      losses += 1;
    }
  }

  const totalOrders = wins + losses + draws;
  const winRatePct = totalOrders > 0 ? Number(((wins / totalOrders) * 100).toFixed(1)) : 0;
  const buyPct = totalOrders > 0 ? Math.round((buyCount / totalOrders) * 100) : 0;
  const sellPct = totalOrders > 0 ? 100 - buyPct : 0;

  return {
    totalOrders,
    openOrders,
    wins,
    losses,
    draws,
    winRatePct,
    totalVolume: Number(totalVolume.toFixed(2)),
    totalRevenue: Number(totalRevenue.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
    buyCount,
    sellCount,
    buyPct,
    sellPct,
  };
}

/**
 * Computes the user's consecutive Win / Lose Streak progress for Streak Challenge (Prize Pool).
 * Only settled orders with stake >= minStake (default $10) qualify. DRAW resets active streak.
 */
export function computeUserStreakStats(
  orders: TradeOrder[],
  prizePool: number,
  minStake = 10,
  targetStreak = 9
): UserStreakSummary {
  const qualifying = [...orders]
    .filter((o) => o.status !== 'OPEN' && o.amount >= minStake)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let currentWin = 0;
  let currentLose = 0;
  let bestWin = 0;
  let bestLose = 0;
  const records: StreakRecord[] = [];
  const prizeEstimate = Number((prizePool * 0.001).toFixed(6));

  for (const ord of qualifying) {
    if (ord.status === 'WON') {
      currentWin += 1;
      currentLose = 0;
      if (currentWin > bestWin) bestWin = currentWin;
      if (currentWin === targetStreak) {
        records.unshift({
          id: `stk_w_${ord.id}`,
          type: 'WIN',
          length: currentWin,
          estimatedPrize: prizeEstimate,
          date: ord.settledAt || ord.createdAt,
        });
      }
    } else if (ord.status === 'LOST') {
      currentLose += 1;
      currentWin = 0;
      if (currentLose > bestLose) bestLose = currentLose;
      if (currentLose === targetStreak) {
        records.unshift({
          id: `stk_l_${ord.id}`,
          type: 'LOSE',
          length: currentLose,
          estimatedPrize: prizeEstimate,
          date: ord.settledAt || ord.createdAt,
        });
      }
    } else {
      currentWin = 0;
      currentLose = 0;
    }
  }

  return {
    currentWinStreak: currentWin,
    currentLoseStreak: currentLose,
    bestWinStreak: bestWin,
    bestLoseStreak: bestLose,
    qualifyingOrdersCount: qualifying.length,
    targetStreak,
    minStake,
    records,
  };
}

/**
 * Deterministically generates 50 Streak Challenge leaderboard entries (5 pages x 10 rows)
 * scaled cleanly from the active Prize Pool amount.
 */
export function generatePrizePoolWinners(prizePool: number, count = 50): PrizePoolWinner[] {
  const handles = [
    'e*******',
    'e**********',
    'k***********',
    'k*******',
    'a*****',
    't***********',
    't**********',
    'b********',
    'b*******',
    'v************',
    'h********',
    'm**********',
    'n*********',
    'p*******',
    'd***********',
    'l********',
    'q*********',
    's*******',
    'c**********',
    'r********',
  ];
  const basePrize = Number((prizePool * 0.001).toFixed(6));
  const today = new Date();
  const list: PrizePoolWinner[] = [];

  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(i / 7);
    const d = new Date(today.getTime() - dayOffset * 86400000);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const isLose = i % 5 === 3 || i % 7 === 6;
    const poolScale = dayOffset === 0 ? 1 : 1 + ((dayOffset * 7 + (i % 3)) % 18) * 0.012;
    const prizeAmount = Number((basePrize * poolScale).toFixed(6));

    list.push({
      id: `pp_win_${i + 1}`,
      type: isLose ? 'LOSE' : 'WIN',
      streak: 9,
      prizeAmount,
      maskedUser: handles[i % handles.length],
      date: `${dd}/${mm}/${yyyy}`,
    });
  }

  return list;
}

/**
 * Multi-factor quantitative AI Order Prediction engine for BTC/USDT 60-second rounds.
 * Evaluates 5 responsive micro-structure factors (Fast EMA 3/7 & impulse, RSI(10) momentum/reversion,
 * MACD histogram acceleration, 14-candle Bollinger envelope, and Waterdrop streak pattern) to produce
 * balanced, calibrated two-way BUY (Green) and SELL (Red) probabilities (buyPct + sellPct = 100).
 */
export function computeAiOrderPrediction(
  candles: Candle[],
  lastResults: TradeDirection[] = [],
  roundId = 0,
  mode: AiSignalMode = 'balanced'
): AiOrderPrediction {
  const indicators = computeIndicators(candles);
  const closes = candles.map((c) => c.close);
  const lastIdx = Math.max(0, closes.length - 1);
  const prevIdx = Math.max(0, lastIdx - 1);
  const currentClose = closes[lastIdx] ?? 95000;
  const lastCandle = candles[lastIdx];

  // Fast EMAs (3 / 7) react within 1-2 rounds instead of locking on slow multi-minute trends
  const ema3Series = calculateEMA(closes, 3);
  const ema7Series = calculateEMA(closes, 7);
  const ema3Cur = ema3Series[lastIdx] ?? currentClose;
  const ema7Cur = ema7Series[lastIdx] ?? currentClose;
  const ema3Prev = ema3Series[prevIdx] ?? ema3Cur;
  const emaSpread = ema3Cur - ema7Cur;
  const emaSlope = ema3Cur - ema3Prev;
  const candleImpulse = lastCandle ? (lastCandle.close - lastCandle.open) / 18 : 0;

  // Factor 1: Fast EMA 3/7 & Price Impulse
  let emaSignal = 0;
  if (emaSpread > 0.8 || (emaSpread > -1.5 && emaSlope > 1.2)) {
    emaSignal = Math.min(1, Math.max(0.35, emaSpread / 16 + emaSlope / 18 + candleImpulse * 0.25));
  } else if (emaSpread < -0.8 || (emaSpread < 1.5 && emaSlope < -1.2)) {
    emaSignal = Math.max(-1, Math.min(-0.35, emaSpread / 16 + emaSlope / 18 + candleImpulse * 0.25));
  } else if (Math.abs(candleImpulse) > 0.25) {
    emaSignal = Math.max(-0.5, Math.min(0.5, candleImpulse * 0.6));
  }
  const emaVote: 'BUY' | 'SELL' | 'NEUTRAL' =
    emaSignal > 0.14 ? 'BUY' : emaSignal < -0.14 ? 'SELL' : 'NEUTRAL';

  // Factor 2: Responsive RSI(10) Momentum & Extreme Reversion
  const rsi10 = calculateRSI(closes, 10);
  let rsiSignal = 0;
  let rsiNoteVi = 'RSI cân bằng quanh vùng trung tính';
  let rsiNoteEn = 'RSI balanced near neutral zone';
  const obThreshold = mode === 'reversal' ? 66 : 82;
  const osThreshold = mode === 'reversal' ? 34 : 18;
  if (rsi10 >= obThreshold) {
    rsiSignal = mode === 'reversal' ? -0.82 : -0.7;
    rsiNoteVi = `RSI quá mua (>=${obThreshold}), tín hiệu đảo chiều Đỏ (SELL)`;
    rsiNoteEn = `Overbought RSI (>=${obThreshold}), bearish pullback setup`;
  } else if (rsi10 <= osThreshold) {
    rsiSignal = mode === 'reversal' ? 0.82 : 0.7;
    rsiNoteVi = `RSI quá bán (<=${osThreshold}), lực bật hồi Xanh (BUY)`;
    rsiNoteEn = `Oversold RSI (<=${osThreshold}), bullish rebound setup`;
  } else if (rsi10 >= 53) {
    rsiSignal = Math.min(0.8, (rsi10 - 50) / 22);
    rsiNoteVi = 'Động lượng tăng Xanh đang chiếm ưu thế';
    rsiNoteEn = 'Bullish momentum leading';
  } else if (rsi10 <= 47) {
    rsiSignal = Math.max(-0.8, (rsi10 - 50) / 22);
    rsiNoteVi = 'Áp lực bán Đỏ chiếm ưu thế ngắn hạn';
    rsiNoteEn = 'Bearish pressure leading short-term';
  }
  const rsiVote: 'BUY' | 'SELL' | 'NEUTRAL' =
    rsiSignal > 0.14 ? 'BUY' : rsiSignal < -0.14 ? 'SELL' : 'NEUTRAL';

  // Factor 3: MACD Histogram + Acceleration (detects turning points immediately!)
  const ema12Series = calculateEMA(closes, 12);
  const ema26Series = calculateEMA(closes, 26);
  const macdLine = closes.map((_, idx) => (ema12Series[idx] ?? 0) - (ema26Series[idx] ?? 0));
  const macdSigSeries = calculateEMA(macdLine, 9);
  const macdHist = Number(((macdLine[lastIdx] ?? 0) - (macdSigSeries[lastIdx] ?? 0)).toFixed(2));
  const prevMacdHist = Number(((macdLine[prevIdx] ?? 0) - (macdSigSeries[prevIdx] ?? 0)).toFixed(2));
  const histAccel = Number((macdHist - prevMacdHist).toFixed(2));

  // Blend histogram direction with acceleration so turning points flip green/red promptly
  const levelComponent = Math.max(-1, Math.min(1, macdHist / 10));
  const accelComponent = Math.max(-1, Math.min(1, histAccel / 2.2));
  const macdSignalScore = Number(
    Math.max(-1, Math.min(1, levelComponent * 0.42 + accelComponent * 0.58)).toFixed(3)
  );
  const macdVote: 'BUY' | 'SELL' | 'NEUTRAL' =
    macdSignalScore > 0.14 ? 'BUY' : macdSignalScore < -0.14 ? 'SELL' : 'NEUTRAL';

  // Factor 4: Fast 14-Candle Bollinger Band Envelope (mean reversion at extremes)
  const slice14 = closes.slice(-14);
  const mean14 =
    slice14.length > 0 ? slice14.reduce((a, b) => a + b, 0) / slice14.length : currentClose;
  const std14 = Math.sqrt(
    slice14.length > 0
      ? slice14.reduce((acc, p) => acc + Math.pow(p - mean14, 2), 0) / slice14.length
      : 0
  );
  const bbUpper = mean14 + 2 * std14;
  const bbLower = mean14 - 2 * std14;
  const bbSpan = Math.max(1, bbUpper - bbLower);
  const bbPos = (currentClose - bbLower) / bbSpan;
  let bbSignal = 0;
  let bbNoteVi = 'Giá vận động cân bằng trong kênh Bollinger';
  let bbNoteEn = 'Price moving within mid Bollinger channel';
  if (bbPos <= 0.24) {
    bbSignal = 0.78;
    bbNoteVi = 'Chạm vùng dải dưới, xác suất bật Xanh (BUY) cao';
    bbNoteEn = 'Near lower Bollinger band, bounce BUY probability elevated';
  } else if (bbPos >= 0.76) {
    bbSignal = -0.78;
    bbNoteVi = 'Chạm vùng dải trên, dễ xuất hiện nhịp hồi Đỏ (SELL)';
    bbNoteEn = 'Near upper Bollinger band, SELL pullback risk';
  } else if (bbPos >= 0.54) {
    bbSignal = mode === 'reversal' ? -0.35 : 0.32;
    bbNoteVi =
      mode === 'reversal'
        ? 'Vùng nửa trên kênh giá, ưu tiên canh đảo chiều Đỏ'
        : 'Giá giữ trên đường trung bình 14 nến';
    bbNoteEn =
      mode === 'reversal'
        ? 'Upper channel half, watching for SELL fade'
        : 'Price holding above 14-candle mid-band';
  } else if (bbPos <= 0.46) {
    bbSignal = mode === 'reversal' ? 0.35 : -0.32;
    bbNoteVi =
      mode === 'reversal'
        ? 'Vùng nửa dưới kênh giá, ưu tiên canh bật hồi Xanh'
        : 'Giá nằm dưới đường trung bình 14 nến';
    bbNoteEn =
      mode === 'reversal'
        ? 'Lower channel half, watching for BUY bounce'
        : 'Price trading below 14-candle mid-band';
  }
  const bbVote: 'BUY' | 'SELL' | 'NEUTRAL' =
    bbSignal > 0.14 ? 'BUY' : bbSignal < -0.14 ? 'SELL' : 'NEUTRAL';

  // Factor 5: Waterdrop Streak Pattern (always consistent with displayed streak color)
  const recentDrops: TradeDirection[] =
    lastResults.length > 0 ? lastResults.slice(-6) : candles.slice(-6).map((c) => c.result);
  let streakCount = 0;
  const latestDrop = recentDrops[recentDrops.length - 1] ?? lastCandle?.result ?? 'BUY';
  for (let i = recentDrops.length - 1; i >= 0; i--) {
    if (recentDrops[i] === latestDrop) streakCount += 1;
    else break;
  }
  let dropSignal = 0;
  let dropNoteVi = `Nến gần nhất ${latestDrop === 'BUY' ? 'Xanh' : 'Đỏ'} (${streakCount} cây)`;
  let dropNoteEn = `Latest candle ${latestDrop} (${streakCount} in a row)`;
  const reversalStreakThreshold = mode === 'reversal' ? 2 : 4;
  if (streakCount >= reversalStreakThreshold) {
    dropSignal = latestDrop === 'BUY' ? -0.75 : 0.75;
    dropNoteVi = `Chuỗi ${streakCount} nến ${latestDrop === 'BUY' ? 'Xanh' : 'Đỏ'}, tín hiệu bẻ cầu sang ${latestDrop === 'BUY' ? 'Đỏ (SELL)' : 'Xanh (BUY)'}`;
    dropNoteEn = `${streakCount}-candle ${latestDrop} streak, reversal setup to ${latestDrop === 'BUY' ? 'SELL' : 'BUY'}`;
  } else if (streakCount >= 2) {
    dropSignal = latestDrop === 'BUY' ? 0.55 : -0.55;
    dropNoteVi = `Đà nối cầu ${streakCount} nến ${latestDrop === 'BUY' ? 'Xanh' : 'Đỏ'} liên tiếp`;
    dropNoteEn = `Continuation momentum (${streakCount}x ${latestDrop})`;
  } else {
    dropSignal = latestDrop === 'BUY' ? 0.36 : -0.36;
    dropNoteVi = `Nến gần nhất ${latestDrop === 'BUY' ? 'Xanh (BUY)' : 'Đỏ (SELL)'}, động lực ngắn hạn`;
    dropNoteEn = `Latest closed candle ${latestDrop}`;
  }
  const dropVote: 'BUY' | 'SELL' | 'NEUTRAL' =
    dropSignal > 0.14 ? 'BUY' : dropSignal < -0.14 ? 'SELL' : 'NEUTRAL';

  const weights =
    mode === 'reversal'
      ? { ema: 0.16, rsi: 0.24, macd: 0.18, bb: 0.2, drop: 0.22 }
      : { ema: 0.26, rsi: 0.22, macd: 0.18, bb: 0.17, drop: 0.17 };

  const factors: AiPredictionFactor[] = [
    {
      id: 'ema',
      nameVi: 'Giao cắt EMA 3/7',
      nameEn: 'Fast EMA 3/7 Cross',
      valueLabel: `${emaSpread >= 0 ? '+' : ''}${emaSpread.toFixed(1)}`,
      vote: emaVote,
      weight: weights.ema,
      noteVi:
        emaVote === 'BUY'
          ? 'EMA3 cắt trên EMA7, lực đẩy tăng Xanh ngắn hạn'
          : emaVote === 'SELL'
          ? 'EMA3 dưới EMA7, áp lực giảm Đỏ ngắn hạn'
          : 'EMA3 và EMA7 đang hội tụ đi ngang',
      noteEn:
        emaVote === 'BUY'
          ? 'EMA3 above EMA7, bullish short-term bias'
          : emaVote === 'SELL'
          ? 'EMA3 below EMA7, bearish short-term bias'
          : 'EMA3 & EMA7 converging flat',
    },
    {
      id: 'rsi',
      nameVi: 'Chỉ báo RSI (10)',
      nameEn: 'Fast RSI (10)',
      valueLabel: rsi10.toFixed(1),
      vote: rsiVote,
      weight: weights.rsi,
      noteVi: rsiNoteVi,
      noteEn: rsiNoteEn,
    },
    {
      id: 'macd',
      nameVi: 'Gia tốc MACD',
      nameEn: 'MACD Acceleration',
      valueLabel: `${histAccel >= 0 ? '+' : ''}${histAccel.toFixed(2)}`,
      vote: macdVote,
      weight: weights.macd,
      noteVi:
        macdVote === 'BUY'
          ? 'Gia tốc Histogram tăng, lực đẩy Xanh mở rộng'
          : macdVote === 'SELL'
          ? 'Gia tốc Histogram âm, xung lực Đỏ mở rộng'
          : 'Biên độ gia tốc MACD hẹp, chưa bứt phá',
      noteEn:
        macdVote === 'BUY'
          ? 'Positive histogram acceleration, bullish impulse expanding'
          : macdVote === 'SELL'
          ? 'Negative histogram acceleration, bearish impulse expanding'
          : 'Flat MACD acceleration near zero',
    },
    {
      id: 'bollinger',
      nameVi: 'Dải Bollinger (14)',
      nameEn: 'Bollinger (14)',
      valueLabel: `${Math.round(Math.max(0, Math.min(100, bbPos * 100)))}%`,
      vote: bbVote,
      weight: weights.bb,
      noteVi: bbNoteVi,
      noteEn: bbNoteEn,
    },
    {
      id: 'waterdrop',
      nameVi: 'Cầu Giọt nước',
      nameEn: 'Waterdrop Pattern',
      valueLabel: `${streakCount}x ${latestDrop === 'BUY' ? 'Xanh' : 'Đỏ'}`,
      vote: dropVote,
      weight: weights.drop,
      noteVi: dropNoteVi,
      noteEn: dropNoteEn,
    },
  ];

  const weightedScore = Number(
    (
      emaSignal * weights.ema +
      rsiSignal * weights.rsi +
      macdSignalScore * weights.macd +
      bbSignal * weights.bb +
      dropSignal * weights.drop
    ).toFixed(3)
  );

  const tieBreakDir: TradeDirection =
    histAccel !== 0
      ? histAccel > 0
        ? 'BUY'
        : 'SELL'
      : emaSpread !== 0
      ? emaSpread > 0
        ? 'BUY'
        : 'SELL'
      : latestDrop === 'BUY'
      ? 'SELL'
      : 'BUY';
  const direction: TradeDirection =
    weightedScore > 0.01 ? 'BUY' : weightedScore < -0.01 ? 'SELL' : tieBreakDir;

  const agreeingFactors = factors.filter((f) => f.vote === direction).length;
  const rawConf = 53 + Math.abs(weightedScore) * 34 + agreeingFactors * 2.2;
  const confidencePct = Math.min(94, Math.max(52, Math.round(rawConf)));
  const buyPct = direction === 'BUY' ? confidencePct : 100 - confidencePct;
  const sellPct = 100 - buyPct;

  const signalStrength: AiSignalStrength =
    confidencePct >= 76 ? 'STRONG' : confidencePct >= 63 ? 'MODERATE' : 'CAUTIOUS';

  const recommendedStakeMultiplier =
    signalStrength === 'STRONG' ? 1.5 : signalStrength === 'MODERATE' ? 1.0 : 0.75;

  const dirVi = direction === 'BUY' ? 'MUA (XANH)' : 'BÁN (ĐỎ)';
  const summaryVi =
    signalStrength === 'STRONG'
      ? `AI đồng thuận cao (${agreeingFactors}/5 chỉ báo · ${buyPct}% Xanh / ${sellPct}% Đỏ) nghiêng về ${dirVi}.`
      : signalStrength === 'MODERATE'
      ? `AI ghi nhận ưu thế ${dirVi} (${buyPct}% Xanh / ${sellPct}% Đỏ · ${agreeingFactors}/5 chỉ báo).`
      : `Thị trường giằng co (${buyPct}% Xanh / ${sellPct}% Đỏ), AI nghiêng nhẹ về ${dirVi}.`;

  const summaryEn =
    signalStrength === 'STRONG'
      ? `High AI consensus (${agreeingFactors}/5 factors · ${buyPct}% BUY / ${sellPct}% SELL) favoring ${direction}.`
      : signalStrength === 'MODERATE'
      ? `Moderate ${direction} edge (${buyPct}% BUY / ${sellPct}% SELL · ${agreeingFactors}/5 aligned).`
      : `Balanced tape (${buyPct}% BUY / ${sellPct}% SELL) with slight ${direction} lean.`;

  const recent20 = candles.slice(-20);
  const supportPrice = Number(
    (recent20.length > 0 ? Math.min(...recent20.map((c) => c.low)) : currentClose - 45).toFixed(2)
  );
  const resistancePrice = Number(
    (recent20.length > 0 ? Math.max(...recent20.map((c) => c.high)) : currentClose + 45).toFixed(2)
  );

  return {
    roundId,
    direction,
    confidencePct,
    buyPct,
    sellPct,
    signalStrength,
    score: weightedScore,
    recommendedStakeMultiplier,
    summaryVi,
    summaryEn,
    supportPrice,
    resistancePrice,
    factors,
  };
}

/**
 * Evaluates deterministic walk-forward accuracy of computeAiOrderPrediction over the
 * most recent closed candles (excluding the currently forming live candle).
 */
export function evaluateHistoricalAiAccuracy(
  candles: Candle[],
  lookback = 8,
  mode: AiSignalMode = 'balanced'
): AiPredictionHistoryItem[] {
  // Need at least 16 prior candles so indicators warm up cleanly before evaluating closed rounds
  const closedCount = candles.length - 1; // exclude active forming candle
  if (closedCount < 16) return [];

  const evalCount = Math.min(lookback, closedCount - 14);
  const items: AiPredictionHistoryItem[] = [];

  for (let i = closedCount - evalCount; i < closedCount; i++) {
    const historySlice = candles.slice(0, i);
    const actualCandle = candles[i];
    const priorResults = historySlice.map((c) => c.result);
    const pred = computeAiOrderPrediction(historySlice, priorResults, actualCandle.id, mode);
    items.unshift({
      roundId: actualCandle.id,
      predicted: pred.direction,
      actual: actualCandle.result,
      confidencePct: pred.confidencePct,
      hit: pred.direction === actualCandle.result,
    });
  }

  return items;
}

/**
 * Calculates the next AI Bot order direction, stake, and rationale.
 */
export function computeNextBotOrder(
  config: BotConfig,
  candles: Candle[],
  consecutiveLosses: number,
  cumulativePnl: number
): {
  shouldTrade: boolean;
  stopReason?: string;
  direction: TradeDirection;
  amount: number;
  reason: string;
} {
  if (cumulativePnl >= config.takeProfit && config.takeProfit > 0) {
    return {
      shouldTrade: false,
      stopReason: 'Đã đạt mục tiêu Chốt lời (Take Profit)',
      direction: 'BUY',
      amount: config.baseAmount,
      reason: 'TP reached',
    };
  }
  if (cumulativePnl <= -Math.abs(config.stopLoss) && config.stopLoss > 0) {
    return {
      shouldTrade: false,
      stopReason: 'Đã chạm ngưỡng Cắt lỗ (Stop Loss)',
      direction: 'BUY',
      amount: config.baseAmount,
      reason: 'SL reached',
    };
  }

  const indicators = computeIndicators(candles);
  const stepIndex = Math.min(consecutiveLosses, Math.max(0, config.maxSteps - 1));

  let amount = config.baseAmount;
  if (config.strategy === 'martingale') {
    amount = Number((config.baseAmount * Math.pow(2, stepIndex)).toFixed(2));
  } else if (config.strategy === 'fibonacci') {
    const fibMult = FIB_SEQUENCE[Math.min(stepIndex, FIB_SEQUENCE.length - 1)];
    amount = Number((config.baseAmount * fibMult).toFixed(2));
  }

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const prev2Candle = candles[candles.length - 3];

  let direction: TradeDirection = 'BUY';
  let reason = '';

  const strategy: BotStrategy = config.strategy;
  if (strategy === 'ai_predict') {
    const pred = computeAiOrderPrediction(
      candles,
      candles.map((c) => c.result),
      lastCandle?.id ?? 0
    );
    direction = pred.direction;
    if (pred.signalStrength === 'STRONG' && consecutiveLosses === 0) {
      amount = Number((config.baseAmount * 1.25).toFixed(2));
    }
    reason = `AI Dự Đoán ${direction} (${pred.confidencePct}%) · RSI ${indicators.rsi14}`;
  } else if (strategy === 'ema_rsi') {
    if (indicators.signal === 'SELL') {
      direction = 'SELL';
      reason = `EMA5 < EMA10 & RSI(${indicators.rsi14}) tín hiệu BÁN`;
    } else {
      direction = 'BUY';
      reason = `EMA5 >= EMA10 & RSI(${indicators.rsi14}) tín hiệu MUA`;
    }
  } else if (strategy === 'trend_follow' || strategy === 'trend_2_1') {
    if (lastCandle && prevCandle && lastCandle.result === prevCandle.result) {
      direction = lastCandle.result;
      reason =
        strategy === 'trend_2_1'
          ? `Theo Xu Hướng 2-1 · nối đà ${direction}`
          : `Bắt chuỗi xu hướng ${direction} (2 nến liên tiếp)`;
    } else {
      direction = lastCandle?.result ?? 'BUY';
      reason =
        strategy === 'trend_2_1'
          ? `Theo Xu Hướng 2-1 · xác nhận ${direction}`
          : `Theo nến gần nhất (${direction})`;
    }
  } else if (strategy === 'reverse_2') {
    const flip = (d: TradeDirection): TradeDirection => (d === 'BUY' ? 'SELL' : 'BUY');
    if (lastCandle && prevCandle && lastCandle.result === prevCandle.result) {
      direction = flip(lastCandle.result);
      reason = `Đảo Chiều Sau 2 Lệnh ${lastCandle.result} -> ${direction}`;
    } else {
      direction = lastCandle?.result ?? 'BUY';
      reason = `Đảo Chiều Sau 2 Lệnh · chờ xác nhận theo ${direction}`;
    }
  } else if (strategy === 'reverse_3') {
    const flip = (d: TradeDirection): TradeDirection => (d === 'BUY' ? 'SELL' : 'BUY');
    if (
      lastCandle &&
      prevCandle &&
      prev2Candle &&
      lastCandle.result === prevCandle.result &&
      prevCandle.result === prev2Candle.result
    ) {
      direction = flip(lastCandle.result);
      reason = `Đảo Chiều Sau 3 Lệnh ${lastCandle.result} -> ${direction}`;
    } else {
      direction = lastCandle?.result ?? 'BUY';
      reason = `Đảo Chiều Sau 3 Lệnh · bám xu hướng ${direction}`;
    }
  } else if (strategy === 'bottom_top') {
    const close = lastCandle?.close ?? 95000;
    const mid = (indicators.bollingerUpper + indicators.bollingerLower) / 2;
    if (close <= indicators.bollingerLower || indicators.rsi14 <= 38) {
      direction = 'BUY';
      reason = `Bắt Đáy Đỉnh · chạm vùng đáy (RSI ${indicators.rsi14})`;
    } else if (close >= indicators.bollingerUpper || indicators.rsi14 >= 62) {
      direction = 'SELL';
      reason = `Bắt Đáy Đỉnh · chạm vùng đỉnh (RSI ${indicators.rsi14})`;
    } else {
      direction = close < mid ? 'BUY' : 'SELL';
      reason = `Bắt Đáy Đỉnh · hồi quy trung tuyến -> ${direction}`;
    }
  } else if (strategy === 'zigzag') {
    direction = lastCandle?.result === 'BUY' ? 'SELL' : 'BUY';
    reason = `Zigzag Pattern · xen kẽ ngược nến trước (${direction})`;
  } else if (strategy === 'martingale') {
    direction = indicators.signal === 'SELL' ? 'SELL' : 'BUY';
    reason =
      consecutiveLosses > 0
        ? `Gấp thếp bước ${stepIndex + 1} (x${Math.pow(2, stepIndex)}) theo tín hiệu ${direction}`
        : `Lệnh gốc Martingale theo tín hiệu ${direction}`;
  } else {
    direction = indicators.rsi14 > 52 ? 'BUY' : 'SELL';
    reason = `Fibonacci bước ${stepIndex + 1} · RSI ${indicators.rsi14}`;
  }

  return {
    shouldTrade: true,
    direction,
    amount,
    reason,
  };
}

/**
 * Validates an internal transfer request between two HitechTrade accounts.
 */
export function validateInternalTransfer(params: {
  sender: UserAccount;
  recipient: UserAccount | null | undefined;
  amount: number;
}): { valid: boolean; error?: string } {
  const { sender, recipient, amount } = params;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: 'Số tiền chuyển phải lớn hơn 0 USDT.' };
  }
  if (amount < 1) {
    return { valid: false, error: 'Số tiền chuyển tối thiểu là 1 USDT.' };
  }
  if (amount > sender.liveBalance) {
    return { valid: false, error: 'Số dư Ví Thực (Live) không đủ để thực hiện giao dịch.' };
  }
  if (!recipient) {
    return { valid: false, error: 'Không tìm thấy người nhận trên hệ thống HitechTrade.' };
  }
  if (recipient.id === sender.id) {
    return { valid: false, error: 'Không thể tự chuyển tiền nội bộ cho chính mình.' };
  }
  if (recipient.isBanned) {
    return { valid: false, error: 'Tài khoản người nhận hiện đang bị khóa.' };
  }
  return { valid: true };
}

/**
 * Generates a deterministic BEP-20 style wallet address from a user ID/seed.
 */
export function generateDeterministicBep20Address(seed: string): string {
  let hash1 = 0x811c9dc5;
  let hash2 = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ ch, 0x01000193) >>> 0;
    hash2 = Math.imul(hash2 ^ (ch + i), 0x85ebca6b) >>> 0;
  }
  const part = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const raw = `${part(hash1)}${part(hash2)}${part(hash1 ^ 0xa5a5a5a5)}${part(hash2 ^ 0x5a5a5a5a)}${part(hash1 + hash2)}`;
  return `0x${raw.slice(0, 40).toUpperCase()}`;
}

/**
 * Resolves the active deposit wallet address displayed to users in the Deposit modal.
 * Prioritizes the Admin-configured master wallet address; falls back to the user's personal address only if unset.
 */
export function resolveDepositWalletAddress(
  masterWalletAddress?: string | null,
  fallbackUserWallet?: string | null
): string {
  const master = (masterWalletAddress ?? '').trim();
  if (master.length > 0) return master;
  return (fallbackUserWallet ?? '').trim();
}

/**
 * Validates the Admin master deposit wallet address before persisting settings.
 */
export function validateMasterWalletAddress(address?: string | null): {
  valid: boolean;
  address: string;
  error?: string;
} {
  const clean = (address ?? '').trim();
  if (!clean) {
    return { valid: false, address: '', error: 'Vui lòng nhập địa chỉ ví nhận nạp tiền.' };
  }
  if (clean.length < 10 || /\s/.test(clean)) {
    return {
      valid: false,
      address: clean,
      error: 'Địa chỉ ví không hợp lệ (tối thiểu 10 ký tự và không chứa khoảng trắng).',
    };
  }
  return { valid: true, address: clean };
}

/**
 * Validates a user password change request (requires 2FA enabled, >= 6 chars, matching confirmation).
 */
export function validatePasswordChange(params: {
  twoFactorEnabled: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): { valid: boolean; error?: string } {
  if (!params.twoFactorEnabled) {
    return { valid: false, error: 'Bạn phải bật 2FA để thay đổi mật khẩu.' };
  }
  if (!params.currentPassword) {
    return { valid: false, error: 'Vui lòng nhập mật khẩu hiện tại.' };
  }
  if (!params.newPassword || params.newPassword.length < 6) {
    return { valid: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' };
  }
  if (params.newPassword !== params.confirmPassword) {
    return { valid: false, error: 'Mật khẩu xác nhận không khớp.' };
  }
  if (params.newPassword === params.currentPassword) {
    return { valid: false, error: 'Mật khẩu mới phải khác mật khẩu hiện tại.' };
  }
  return { valid: true };
}

function formatLocalDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Computes QuickInvest Profit Statistics (Hôm nay / Tuần này / Tháng này)
 * from real trade orders with cumulative PnL & volume sparkline series.
 */
export function computeQuickInvestPeriodStats(
  orders: TradeOrder[],
  accountMode: AccountMode | 'all',
  period: QuickInvestPeriod,
  refDate: Date = new Date()
): QuickInvestPeriodStats {
  const start = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  if (period === 'week') {
    const dayOfWeek = (start.getDay() + 6) % 7; // Monday = 0
    start.setDate(start.getDate() - dayOfWeek);
  } else if (period === 'month') {
    start.setDate(1);
  }
  const end = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 23, 59, 59, 999);

  const scoped = orders
    .filter((o) => {
      if (o.status === 'OPEN') return false;
      if (accountMode !== 'all' && o.accountMode !== accountMode) return false;
      const dt = new Date(o.createdAt);
      if (Number.isNaN(dt.getTime())) return false;
      return dt.getTime() >= start.getTime() && dt.getTime() <= end.getTime();
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let totalPnl = 0;
  let totalVolume = 0;
  let wins = 0;
  let losses = 0;
  const pnlSeries: number[] = [];
  const volumeSeries: number[] = [];

  for (const ord of scoped) {
    totalPnl += ord.pnl;
    totalVolume += ord.amount;
    if (ord.status === 'WON') wins += 1;
    else if (ord.status === 'LOST') losses += 1;
    pnlSeries.push(Number(totalPnl.toFixed(2)));
    volumeSeries.push(Number(totalVolume.toFixed(2)));
  }

  const totalTrades = scoped.length;
  const winRatePct = totalTrades > 0 ? Number(((wins / totalTrades) * 100).toFixed(1)) : 0;

  return {
    totalPnl: Number(totalPnl.toFixed(2)),
    totalTrades,
    wins,
    losses,
    winRatePct,
    totalVolume: Number(totalVolume.toFixed(2)),
    pnlSeries,
    volumeSeries,
  };
}

/**
 * Builds a Monday-first (T2..CN) 42-cell monthly profit calendar grid for QuickInvest
 * Profit Statistics, aggregating daily PnL and volume (KLGD) per date.
 */
export function buildQuickInvestCalendar(
  orders: TradeOrder[],
  accountMode: AccountMode | 'all',
  year: number,
  monthIndex: number,
  todayRef: Date = new Date()
): QuickInvestCalendarDay[] {
  const dailyMap = new Map<string, { pnl: number; volume: number; tradesCount: number }>();

  for (const ord of orders) {
    if (ord.status === 'OPEN') continue;
    if (accountMode !== 'all' && ord.accountMode !== accountMode) continue;
    const dt = new Date(ord.createdAt);
    if (Number.isNaN(dt.getTime())) continue;
    const key = formatLocalDateKey(dt);
    const prev = dailyMap.get(key) ?? { pnl: 0, volume: 0, tradesCount: 0 };
    prev.pnl = Number((prev.pnl + ord.pnl).toFixed(2));
    prev.volume = Number((prev.volume + ord.amount).toFixed(2));
    prev.tradesCount += 1;
    dailyMap.set(key, prev);
  }

  const firstOfMonth = new Date(year, monthIndex, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Mon=0 .. Sun=6
  const gridStart = new Date(year, monthIndex, 1 - startOffset);
  const todayKey = formatLocalDateKey(todayRef);

  const cells: QuickInvestCalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i
    );
    const key = formatLocalDateKey(cellDate);
    const agg = dailyMap.get(key);
    cells.push({
      dateKey: key,
      dayNumber: cellDate.getDate(),
      inCurrentMonth: cellDate.getMonth() === monthIndex && cellDate.getFullYear() === year,
      isToday: key === todayKey,
      pnl: agg?.pnl ?? 0,
      volume: agg?.volume ?? 0,
      tradesCount: agg?.tradesCount ?? 0,
    });
  }

  return cells;
}



