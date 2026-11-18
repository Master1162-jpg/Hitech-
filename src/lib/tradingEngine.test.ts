import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuickInvestCalendar,
  calculateEMA,
  calculateRSI,
  computeAiOrderPrediction,
  computeIndicatorGauges,
  computeIndicators,
  computeNextBotOrder,
  computeQuickInvestPeriodStats,
  computeTradeDashboardStats,
  computeUserStreakStats,
  evaluateHistoricalAiAccuracy,
  filterOrdersByCriteria,
  generateDeterministicBep20Address,
  generatePrizePoolWinners,
  resolveDepositWalletAddress,
  settleTradeOrder,
  validateInternalTransfer,
  validateMasterWalletAddress,
  validatePasswordChange,
} from './tradingEngine';
import type { BotConfig, Candle, TradeOrder, UserAccount } from '../types';

function makeCandles(closes: number[]): Candle[] {
  return closes.map((close, idx) => {
    const open = idx === 0 ? close - 10 : closes[idx - 1];
    return {
      id: idx + 1,
      timestamp: 1700000000000 + idx * 30000,
      open,
      high: Math.max(open, close) + 15,
      low: Math.min(open, close) - 15,
      close,
      volume: 12 + idx,
      result: close >= open ? 'BUY' : 'SELL',
    };
  });
}

function makeOrder(overrides: Partial<TradeOrder> & { id: string }): TradeOrder {
  return {
    userId: 'u1',
    userEmail: 'trader@hitechtrade.io',
    pair: 'BTC/USDT',
    accountMode: 'live',
    direction: 'BUY',
    amount: 10,
    payoutRate: 0.95,
    entryPrice: 95100,
    closePrice: 95120,
    roundId: 1001,
    status: 'WON',
    pnl: 9.5,
    source: 'manual',
    createdAt: '2026-11-17T10:00:00.000Z',
    settledAt: '2026-11-17T10:01:00.000Z',
    ...overrides,
  };
}

test('calculateEMA and calculateRSI behave deterministically on rising prices', () => {
  const rising = [95000, 95020, 95040, 95060, 95080, 95100, 95130, 95160];
  const ema5 = calculateEMA(rising, 5);
  assert.equal(ema5.length, rising.length);
  assert.ok(ema5[ema5.length - 1] > ema5[0]);

  const rsi = calculateRSI(rising, 14);
  assert.equal(rsi, 100);
});

test('computeIndicators outputs valid sentiment bounds summing to 100', () => {
  const candles = makeCandles([
    95000, 95020, 95010, 95040, 95055, 95070, 95065, 95090, 95120, 95150, 95180, 95210, 95240, 95260,
  ]);
  const ind = computeIndicators(candles);
  assert.equal(ind.sentimentBuyPct + ind.sentimentSellPct, 100);
  assert.equal(ind.signal, 'BUY');
  assert.ok(ind.bollingerUpper > ind.bollingerLower);
});

test('computeIndicatorGauges outputs accurate bullish, bearish, and neutral gauge angles and totals', () => {
  const rising = makeCandles([
    95000, 95025, 95050, 95080, 95115, 95150, 95190, 95230, 95280, 95330, 95390, 95450, 95520, 95600,
  ]);
  const bull = computeIndicatorGauges(rising);
  assert.ok(bull.oscillators.angleDeg > 0);
  assert.ok(bull.movingAverages.angleDeg > 0);
  assert.ok(bull.summary.label === 'BUY' || bull.summary.label === 'STRONG BUY');
  assert.equal(bull.summary.buyCount, bull.oscillators.buyCount + bull.movingAverages.buyCount);
  assert.equal(bull.summary.sellCount, bull.oscillators.sellCount + bull.movingAverages.sellCount);

  const falling = makeCandles([
    95600, 95540, 95480, 95410, 95350, 95290, 95230, 95170, 95110, 95050, 94990, 94930, 94870, 94800,
  ]);
  const bear = computeIndicatorGauges(falling);
  assert.ok(bear.oscillators.angleDeg < 0);
  assert.ok(bear.movingAverages.angleDeg < 0);
  assert.ok(bear.summary.label === 'SELL' || bear.summary.label === 'STRONG SELL');

  const flat = makeCandles(Array(15).fill(95000));
  const neutral = computeIndicatorGauges(flat);
  assert.equal(neutral.summary.label, 'NEUTRAL');
  assert.equal(neutral.summary.angleDeg, 0);
});

test('settleTradeOrder calculates 95% payout on win, -stake on loss, and full refund on DRAW tie', () => {
  const win = settleTradeOrder('BUY', 100, 0.95, 95100, 95150);
  assert.equal(win.status, 'WON');
  assert.equal(win.pnl, 95);
  assert.equal(win.totalReturn, 195);

  const loss = settleTradeOrder('SELL', 50, 0.95, 95100, 95150);
  assert.equal(loss.status, 'LOST');
  assert.equal(loss.pnl, -50);
  assert.equal(loss.totalReturn, 0);

  const draw = settleTradeOrder('BUY', 40, 0.95, 95100, 95100);
  assert.equal(draw.status, 'DRAW');
  assert.equal(draw.pnl, 0);
  assert.equal(draw.totalReturn, 40);
});

test('computeTradeDashboardStats calculates wins, losses, draws, win rate, volume, net profit, and revenue accurately', () => {
  const orders: TradeOrder[] = [
    makeOrder({ id: 'o1', accountMode: 'live', direction: 'BUY', amount: 50, status: 'WON', pnl: 47.5 }),
    makeOrder({ id: 'o2', accountMode: 'live', direction: 'SELL', amount: 20, status: 'LOST', pnl: -20 }),
    makeOrder({ id: 'o3', accountMode: 'live', direction: 'BUY', amount: 10, status: 'DRAW', pnl: 0 }),
    makeOrder({ id: 'o4', accountMode: 'live', direction: 'BUY', amount: 15, status: 'OPEN', pnl: 0 }),
    makeOrder({ id: 'o5', accountMode: 'demo', direction: 'SELL', amount: 30, status: 'WON', pnl: 28.5 }),
  ];

  const liveStats = computeTradeDashboardStats(orders, 'live');
  assert.equal(liveStats.totalOrders, 3);
  assert.equal(liveStats.openOrders, 1);
  assert.equal(liveStats.wins, 1);
  assert.equal(liveStats.losses, 1);
  assert.equal(liveStats.draws, 1);
  assert.equal(liveStats.winRatePct, 33.3);
  assert.equal(liveStats.totalVolume, 80);
  assert.equal(liveStats.totalRevenue, 107.5);
  assert.equal(liveStats.netProfit, 27.5);
  assert.equal(Number((liveStats.totalRevenue - liveStats.totalVolume).toFixed(2)), liveStats.netProfit);
  assert.equal(liveStats.buyPct + liveStats.sellPct, 100);
  assert.equal(liveStats.buyCount, 2);
  assert.equal(liveStats.sellCount, 1);

  const emptyStats = computeTradeDashboardStats([], 'live');
  assert.equal(emptyStats.totalOrders, 0);
  assert.equal(emptyStats.netProfit, 0);
  assert.equal(emptyStats.totalRevenue, 0);
  assert.equal(emptyStats.buyPct, 0);
  assert.equal(emptyStats.sellPct, 0);
});

test('filterOrdersByCriteria filters accurately by accountMode and inclusive date range', () => {
  const orders: TradeOrder[] = [
    makeOrder({ id: 'd1', accountMode: 'live', createdAt: '2026-11-15T12:00:00.000Z' }),
    makeOrder({ id: 'd2', accountMode: 'live', createdAt: '2026-11-17T12:00:00.000Z' }),
    makeOrder({ id: 'd3', accountMode: 'demo', createdAt: '2026-11-17T14:00:00.000Z' }),
  ];

  const filtered = filterOrdersByCriteria(orders, {
    accountMode: 'live',
    startDate: '2026-11-17',
    endDate: '2026-11-17',
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'd2');
});

test('computeUserStreakStats tracks win/lose streaks >= $10 and records 9x challenge winners', () => {
  const orders: TradeOrder[] = [];
  for (let i = 0; i < 9; i++) {
    orders.push(
      makeOrder({
        id: `w${i}`,
        amount: 10,
        status: 'WON',
        pnl: 9.5,
        createdAt: new Date(1763360000000 + i * 60000).toISOString(),
      })
    );
  }
  // Sub-$10 order should not break qualifying count
  orders.push(
    makeOrder({
      id: 'tiny',
      amount: 5,
      status: 'LOST',
      pnl: -5,
      createdAt: new Date(1763360000000 + 10 * 60000).toISOString(),
    })
  );

  const summary = computeUserStreakStats(orders, 27680.5, 10, 9);
  assert.equal(summary.qualifyingOrdersCount, 9);
  assert.equal(summary.currentWinStreak, 9);
  assert.equal(summary.bestWinStreak, 9);
  assert.equal(summary.records.length, 1);
  assert.equal(summary.records[0].type, 'WIN');
  assert.equal(summary.records[0].estimatedPrize, 27.6805);
});

test('generatePrizePoolWinners creates 50 deterministic paginated leaderboard entries', () => {
  const winners = generatePrizePoolWinners(27335, 50);
  assert.equal(winners.length, 50);
  assert.equal(winners[0].streak, 9);
  assert.equal(winners[0].prizeAmount, 27.335);
});

test('computeNextBotOrder applies Martingale steps and respects Take Profit / Stop Loss', () => {
  const candles = makeCandles([95000, 95030, 95060, 95090, 95120]);
  const config: BotConfig = {
    enabled: true,
    accountMode: 'demo',
    strategy: 'martingale',
    baseAmount: 10,
    takeProfit: 100,
    stopLoss: 50,
    maxSteps: 4,
  };

  const step2 = computeNextBotOrder(config, candles, 2, -30);
  assert.equal(step2.shouldTrade, true);
  assert.equal(step2.amount, 40);

  const tpHit = computeNextBotOrder(config, candles, 0, 100);
  assert.equal(tpHit.shouldTrade, false);

  const slHit = computeNextBotOrder(config, candles, 3, -55);
  assert.equal(slHit.shouldTrade, false);
});

test('validateInternalTransfer prevents self-transfer, overdraft, and banned targets', () => {
  const baseUser: UserAccount = {
    id: 'u1',
    email: 'a@hitechtrade.io',
    nickname: 'TraderA',
    role: 'user',
    liveBalance: 500,
    demoBalance: 1000,
    walletAddress: generateDeterministicBep20Address('u1'),
    referralCode: 'HT111',
    referredBy: null,
    isVip: false,
    twoFactorEnabled: false,
    kycStatus: 'verified',
    isBanned: false,
    totalDeposited: 500,
    totalWithdrawn: 0,
    totalVolume: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const recipient: UserAccount = {
    ...baseUser,
    id: 'u2',
    email: 'b@hitechtrade.io',
    nickname: 'TraderB',
    walletAddress: generateDeterministicBep20Address('u2'),
    referralCode: 'HT222',
  };

  assert.equal(validateInternalTransfer({ sender: baseUser, recipient, amount: 100 }).valid, true);
  assert.equal(validateInternalTransfer({ sender: baseUser, recipient: baseUser, amount: 50 }).valid, false);
  assert.equal(validateInternalTransfer({ sender: baseUser, recipient, amount: 600 }).valid, false);
  assert.equal(
    validateInternalTransfer({ sender: baseUser, recipient: { ...recipient, isBanned: true }, amount: 25 }).valid,
    false
  );
  assert.match(baseUser.walletAddress, /^0x[0-9A-F]{40}$/);
});

test('resolveDepositWalletAddress prioritizes Admin master wallet and trims whitespace', () => {
  const userWallet = '0x1111111111111111111111111111111111111111';
  const adminWallet = '  0xAbC1234567890dEf1234567890AbCdEf12345678  ';

  assert.equal(
    resolveDepositWalletAddress(adminWallet, userWallet),
    '0xAbC1234567890dEf1234567890AbCdEf12345678'
  );
  assert.equal(resolveDepositWalletAddress('   ', userWallet), userWallet);
  assert.equal(resolveDepositWalletAddress(undefined, userWallet), userWallet);
});

test('validateMasterWalletAddress rejects empty/whitespace or malformed strings and accepts valid wallets', () => {
  assert.equal(validateMasterWalletAddress('').valid, false);
  assert.equal(validateMasterWalletAddress('   ').valid, false);
  assert.equal(validateMasterWalletAddress('0x123').valid, false);
  assert.equal(validateMasterWalletAddress('0x12345 67890abcdef').valid, false);

  const ok = validateMasterWalletAddress(' 0xAbC1234567890dEf1234567890AbCdEf12345678 ');
  assert.equal(ok.valid, true);
  assert.equal(ok.address, '0xAbC1234567890dEf1234567890AbCdEf12345678');
});

test('validatePasswordChange enforces 2FA, minimum length, confirmation match, and password change', () => {
  assert.equal(
    validatePasswordChange({
      twoFactorEnabled: false,
      currentPassword: 'oldpassword',
      newPassword: 'newpassword',
      confirmPassword: 'newpassword',
    }).valid,
    false
  );
  assert.equal(
    validatePasswordChange({
      twoFactorEnabled: true,
      currentPassword: 'oldpassword',
      newPassword: '123',
      confirmPassword: '123',
    }).valid,
    false
  );
  assert.equal(
    validatePasswordChange({
      twoFactorEnabled: true,
      currentPassword: 'oldpassword',
      newPassword: 'newpassword',
      confirmPassword: 'differentpassword',
    }).valid,
    false
  );
  assert.equal(
    validatePasswordChange({
      twoFactorEnabled: true,
      currentPassword: 'samepassword',
      newPassword: 'samepassword',
      confirmPassword: 'samepassword',
    }).valid,
    false
  );
  assert.equal(
    validatePasswordChange({
      twoFactorEnabled: true,
      currentPassword: 'oldpassword',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    }).valid,
    true
  );
});

test('computeAiOrderPrediction evaluates 5 factors with calibrated confidence and directional accuracy', () => {
  // Moderate steady uptrend (avoiding extreme RSI > 76 exhaustion)
  const bullCandles = makeCandles([
    95000, 95015, 95005, 95025, 95020, 95040, 95035, 95055,
    95050, 95070, 95065, 95085, 95080, 95100, 95095, 95115,
    95125, 95138,
  ]);
  const bullPred = computeAiOrderPrediction(bullCandles, ['SELL', 'BUY', 'BUY'], 6478801);
  assert.equal(bullPred.roundId, 6478801);
  assert.equal(bullPred.direction, 'BUY');
  assert.equal(bullPred.buyPct + bullPred.sellPct, 100);
  assert.equal(bullPred.buyPct, bullPred.confidencePct);
  assert.ok(bullPred.confidencePct >= 52 && bullPred.confidencePct <= 94);
  assert.equal(bullPred.factors.length, 5);
  assert.ok(bullPred.resistancePrice > bullPred.supportPrice);

  // Moderate steady downtrend
  const bearCandles = makeCandles([
    95300, 95285, 95295, 95275, 95280, 95260, 95265, 95245,
    95250, 95230, 95235, 95215, 95220, 95200, 95205, 95185,
    95175, 95162,
  ]);
  const bearPred = computeAiOrderPrediction(bearCandles, ['BUY', 'SELL', 'SELL'], 6478802);
  assert.equal(bearPred.direction, 'SELL');
  assert.equal(bearPred.buyPct + bearPred.sellPct, 100);
  assert.equal(bearPred.sellPct, bearPred.confidencePct);
  assert.ok(bearPred.confidencePct >= 52 && bearPred.confidencePct <= 94);

  // Bot ai_predict strategy delegates to AI prediction engine
  const aiConfig: BotConfig = {
    enabled: true,
    accountMode: 'demo',
    strategy: 'ai_predict',
    baseAmount: 10,
    takeProfit: 100,
    stopLoss: 50,
    maxSteps: 4,
  };
  const aiOrder = computeNextBotOrder(aiConfig, bearCandles, 0, 0);
  assert.equal(aiOrder.shouldTrade, true);
  assert.equal(aiOrder.direction, 'SELL');
  assert.match(aiOrder.reason, /AI Dự Đoán SELL/);

  // Historical walk-forward accuracy evaluation
  const longSeries = makeCandles([
    95000, 95015, 95010, 95030, 95025, 95045, 95040, 95060,
    95055, 95075, 95070, 95090, 95085, 95105, 95100, 95120,
    95115, 95135, 95130, 95150, 95145, 95165, 95160, 95180,
    95190,
  ]);
  const history = evaluateHistoricalAiAccuracy(longSeries, 8);
  assert.equal(history.length, 8);
  history.forEach((h) => {
    assert.ok(h.confidencePct >= 52 && h.confidencePct <= 94);
    assert.equal(h.hit, h.predicted === h.actual);
  });
});

test('computeAiOrderPrediction dynamically emits both Green BUY and Red SELL signals on oscillating markets', () => {
  const oscillatingCloses: number[] = [];
  let p = 95100;
  for (let i = 0; i < 48; i++) {
    p = Number((p + Math.sin(i * 0.72) * 24 + (i % 3 === 0 ? 12 : -8)).toFixed(2));
    oscillatingCloses.push(p);
  }
  const oscCandles = makeCandles(oscillatingCloses);
  const balancedHist = evaluateHistoricalAiAccuracy(oscCandles, 24, 'balanced');
  const reversalHist = evaluateHistoricalAiAccuracy(oscCandles, 24, 'reversal');

  const balBuys = balancedHist.filter((h) => h.predicted === 'BUY').length;
  const balSells = balancedHist.filter((h) => h.predicted === 'SELL').length;
  assert.ok(balBuys >= 6 && balSells >= 6, `Expected balanced BUY/SELL mix, got ${balBuys}B / ${balSells}S`);

  const revBuys = reversalHist.filter((h) => h.predicted === 'BUY').length;
  const revSells = reversalHist.filter((h) => h.predicted === 'SELL').length;
  assert.ok(revBuys >= 6 && revSells >= 6, `Expected reversal BUY/SELL mix, got ${revBuys}B / ${revSells}S`);
});

test('QuickInvest Bot preset strategies (reverse_2, reverse_3, zigzag, bottom_top) emit distinct signals', () => {
  const threeBuys = makeCandles([95000, 95020, 95050, 95090, 95130]);
  const baseCfg: BotConfig = {
    enabled: true,
    accountMode: 'demo',
    strategy: 'reverse_2',
    baseAmount: 10,
    takeProfit: 100,
    stopLoss: 50,
    maxSteps: 4,
  };

  const rev2 = computeNextBotOrder({ ...baseCfg, strategy: 'reverse_2' }, threeBuys, 0, 0);
  assert.equal(rev2.direction, 'SELL');
  assert.match(rev2.reason, /Đảo Chiều Sau 2 Lệnh/);

  const rev3 = computeNextBotOrder({ ...baseCfg, strategy: 'reverse_3' }, threeBuys, 0, 0);
  assert.equal(rev3.direction, 'SELL');
  assert.match(rev3.reason, /Đảo Chiều Sau 3 Lệnh/);

  const zigzag = computeNextBotOrder({ ...baseCfg, strategy: 'zigzag' }, threeBuys, 0, 0);
  assert.equal(zigzag.direction, 'SELL');
  assert.match(zigzag.reason, /Zigzag Pattern/);

  const trend21 = computeNextBotOrder({ ...baseCfg, strategy: 'trend_2_1' }, threeBuys, 0, 0);
  assert.equal(trend21.direction, 'BUY');
  assert.match(trend21.reason, /Theo Xu Hướng 2-1/);
});

test('computeQuickInvestPeriodStats and buildQuickInvestCalendar aggregate daily PnL, volume, and 42 Monday-first cells', () => {
  const refDate = new Date(2026, 10, 18, 12, 0, 0); // Nov 18, 2026 (Wednesday)
  const orders: TradeOrder[] = [
    makeOrder({
      id: 'q1',
      accountMode: 'live',
      amount: 20,
      status: 'WON',
      pnl: 19,
      createdAt: new Date(2026, 10, 18, 9, 30, 0).toISOString(),
    }),
    makeOrder({
      id: 'q2',
      accountMode: 'live',
      amount: 10,
      status: 'LOST',
      pnl: -10,
      createdAt: new Date(2026, 10, 18, 10, 15, 0).toISOString(),
    }),
    makeOrder({
      id: 'q3',
      accountMode: 'live',
      amount: 50,
      status: 'WON',
      pnl: 47.5,
      createdAt: new Date(2026, 10, 16, 14, 0, 0).toISOString(), // Monday same week
    }),
    makeOrder({
      id: 'q4',
      accountMode: 'live',
      amount: 100,
      status: 'WON',
      pnl: 95,
      createdAt: new Date(2026, 10, 2, 11, 0, 0).toISOString(), // Earlier in Nov
    }),
    makeOrder({
      id: 'q5',
      accountMode: 'demo',
      amount: 25,
      status: 'WON',
      pnl: 23.75,
      createdAt: new Date(2026, 10, 18, 11, 0, 0).toISOString(), // Demo shouldn't bleed into live
    }),
  ];

  const todayStats = computeQuickInvestPeriodStats(orders, 'live', 'today', refDate);
  assert.equal(todayStats.totalTrades, 2);
  assert.equal(todayStats.wins, 1);
  assert.equal(todayStats.winRatePct, 50);
  assert.equal(todayStats.totalPnl, 9);
  assert.equal(todayStats.totalVolume, 30);

  const weekStats = computeQuickInvestPeriodStats(orders, 'live', 'week', refDate);
  assert.equal(weekStats.totalTrades, 3);
  assert.equal(weekStats.totalPnl, 56.5);
  assert.equal(weekStats.totalVolume, 80);

  const monthStats = computeQuickInvestPeriodStats(orders, 'live', 'month', refDate);
  assert.equal(monthStats.totalTrades, 4);
  assert.equal(monthStats.totalPnl, 151.5);
  assert.equal(monthStats.totalVolume, 180);

  const grid = buildQuickInvestCalendar(orders, 'live', 2026, 10, refDate);
  assert.equal(grid.length, 42);
  // Nov 1, 2026 is a Sunday -> Monday-first grid starts on Oct 26 (dayNumber 26)
  assert.equal(grid[0].dayNumber, 26);
  assert.equal(grid[0].inCurrentMonth, false);
  const nov18 = grid.find((c) => c.dateKey === '2026-11-18');
  assert.ok(nov18);
  assert.equal(nov18.isToday, true);
  assert.equal(nov18.pnl, 9);
  assert.equal(nov18.volume, 30);
  assert.equal(nov18.tradesCount, 2);
});




