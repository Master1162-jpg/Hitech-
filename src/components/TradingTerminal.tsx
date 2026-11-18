import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { CandlestickChart } from './CandlestickChart';
import { IndicatorGauges } from './IndicatorGauges';
import { COPY } from '../lib/i18n';
import type {
  AccountMode,
  Language,
  MarketSnapshot,
  TradeDirection,
  TradeOrder,
  UserAccount,
} from '../types';

interface TradingTerminalProps {
  market: MarketSnapshot;
  user: UserAccount;
  accountMode: AccountMode;
  orders: TradeOrder[];
  lang: Language;
  onPlaceTrade: (direction: TradeDirection, amount: number) => Promise<void>;
  onGoToBot: () => void;
  onGoToOrders?: () => void;
}

export const TradingTerminal: React.FC<TradingTerminalProps> = ({
  market,
  user,
  accountMode,
  orders,
  lang,
  onPlaceTrade,
  onGoToBot,
  onGoToOrders,
}) => {
  const [amount, setAmount] = useState<number>(10);
  const [bottomTab, setBottomTab] = useState<'results' | 'indicators'>('results');
  const [orderTab, setOrderTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const t = COPY[lang];
  const isVi = lang === 'vi';
  const activeBalance = accountMode === 'live' ? user.liveBalance : user.demoBalance;
  const payoutTotal = Number((amount + amount * market.payoutRate).toFixed(2));
  const profitPercent = Math.round(market.payoutRate * 100);
  const isWaiting = market.phase !== 'betting';

  // 5 blocks of 5x4 = 20 circles (desktop shows 5 blocks, mobile shows latest 3 blocks like Kaizenfin)
  const waterdropBlocks = useMemo(() => {
    const recent = market.lastResults.slice(-88);
    const totalBlocks = 5;
    const blockCapacity = 20;
    const blocks: Array<Array<TradeDirection | null>> = [];
    for (let b = 0; b < totalBlocks; b++) {
      const start = b * blockCapacity;
      const arr: Array<TradeDirection | null> = [];
      for (let i = 0; i < blockCapacity; i++) {
        arr.push(recent[start + i] ?? null);
      }
      blocks.push(arr);
    }
    return blocks;
  }, [market.lastResults]);

  // Mobile 3 blocks of 5x4 (latest 48 results so the 3rd block actively fills like IMG_0049)
  const mobileWaterdropBlocks = useMemo(() => {
    const recent = market.lastResults.slice(-46);
    const totalBlocks = 3;
    const blockCapacity = 20;
    const blocks: Array<Array<TradeDirection | null>> = [];
    for (let b = 0; b < totalBlocks; b++) {
      const start = b * blockCapacity;
      const arr: Array<TradeDirection | null> = [];
      for (let i = 0; i < blockCapacity; i++) {
        arr.push(recent[start + i] ?? null);
      }
      blocks.push(arr);
    }
    return blocks;
  }, [market.lastResults]);

  const upCount = useMemo(
    () => market.lastResults.filter((r) => r === 'BUY').length,
    [market.lastResults]
  );
  const downCount = useMemo(
    () => market.lastResults.filter((r) => r === 'SELL').length,
    [market.lastResults]
  );

  const openOrders = useMemo(() => orders.filter((o) => o.status === 'OPEN'), [orders]);
  const closedOrders = useMemo(() => orders.filter((o) => o.status !== 'OPEN'), [orders]);

  const handleOrder = async (dir: TradeDirection) => {
    setFeedback(null);
    if (market.phase !== 'betting') {
      setFeedback({
        type: 'err',
        text: isVi
          ? 'Đang trong 30s chờ kết quả. Vui lòng đợi phiên đặt lệnh tiếp theo!'
          : 'Waiting for round settlement. Please wait for the next betting phase.',
      });
      return;
    }
    if (amount <= 0 || amount > activeBalance) {
      setFeedback({
        type: 'err',
        text: isVi
          ? 'Số tiền đặt lệnh không hợp lệ hoặc vượt quá số dư.'
          : 'Invalid amount or insufficient balance.',
      });
      return;
    }
    setSubmitting(true);
    try {
      await onPlaceTrade(dir, amount);
      setFeedback({
        type: 'ok',
        text: isVi
          ? `Đã vào lệnh ${dir === 'BUY' ? 'MUA' : 'BÁN'} $${amount.toFixed(2)} thành công!`
          : `Placed ${dir} $${amount.toFixed(2)} order!`,
      });
      setOrderTab('OPEN');
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Lỗi đặt lệnh',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 xl:gap-4">
      {/* Left/Center Main Chart + Last Results Column (Bulky pair stats card removed!) */}
      <div className="xl:col-span-9 flex flex-col xl:gap-4">
        {/* Kaizenfin-Style Live Candlestick Chart with Floating BTC/USDT Badge */}
        <CandlestickChart
          candles={market.candles}
          currentPrice={market.currentPrice}
          secondsRemaining={market.secondsRemaining}
          phase={market.phase}
          sentimentBuyPct={market.sentimentBuyPct}
          sentimentSellPct={market.sentimentSellPct}
        />

        {/* Indicators & Last Results (5x4 Waterdrop Matrix) */}
        <div className="bg-[#060913] px-3 pt-2.5 pb-3 lg:rounded-xl lg:border lg:border-slate-800/90 lg:bg-[#0b1021] lg:p-4">
          <div className="flex items-center justify-between gap-2 pb-2.5 lg:border-b lg:border-slate-800/80">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => setBottomTab('indicators')}
                className={`pb-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                  bottomTab === 'indicators'
                    ? 'border-b-2 border-[#0EA5E9] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.indicators}
              </button>
              <button
                type="button"
                onClick={() => setBottomTab('results')}
                className={`pb-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                  bottomTab === 'results'
                    ? 'border-b-2 border-[#0EA5E9] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.lastResults}
              </button>
            </div>

            {bottomTab === 'results' && (
              <div className="flex items-center gap-2 font-mono text-sm font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#141b2d] px-2.5 py-1 text-white">
                  <TrendingUp className="h-4 w-4 text-[#00D4AA]" />
                  {upCount}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#141b2d] px-2.5 py-1 text-white">
                  <TrendingDown className="h-4 w-4 text-rose-500" />
                  {downCount}
                </span>
              </div>
            )}
          </div>

          {bottomTab === 'results' ? (
            <>
              {/* Mobile 3-block clean waterdrop grid matching Kaizenfin */}
              <div className="mt-2 grid grid-cols-3 gap-3 md:hidden">
                {mobileWaterdropBlocks.map((block, bIdx) => (
                  <div
                    key={bIdx}
                    className="grid grid-cols-5 grid-rows-4 grid-flow-col justify-items-center gap-1.5"
                  >
                    {block.map((cell, cIdx) => (
                      <span
                        key={cIdx}
                        title={cell ? (cell === 'BUY' ? 'MUA (Tăng)' : 'BÁN (Giảm)') : 'Chờ kết quả'}
                        className={`h-4 w-4 rounded-full transition-colors ${
                          cell === 'BUY'
                            ? 'bg-[#00D4AA]'
                            : cell === 'SELL'
                            ? 'bg-rose-500'
                            : 'bg-[#1c2438]'
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Desktop / Tablet 5-block waterdrop grid */}
              <div className="mt-4 hidden md:block overflow-x-auto pb-1">
                <div className="flex min-w-[540px] items-center justify-between gap-4">
                  {waterdropBlocks.map((block, bIdx) => (
                    <div
                      key={bIdx}
                      className="grid grid-cols-5 grid-rows-4 grid-flow-col gap-1.5 rounded-lg border border-slate-800/60 bg-[#080c17] p-2.5"
                    >
                      {block.map((cell, cIdx) => (
                        <span
                          key={cIdx}
                          title={cell ? (cell === 'BUY' ? 'MUA (Tăng)' : 'BÁN (Giảm)') : 'Chờ kết quả'}
                          className={`h-3.5 w-3.5 rounded-full transition-colors ${
                            cell === 'BUY'
                              ? 'bg-[#00D4AA] shadow-[0_0_8px_rgba(0,212,170,0.4)]'
                              : cell === 'SELL'
                              ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                              : 'bg-slate-800/80'
                          }`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <IndicatorGauges candles={market.candles} lang={lang} />
          )}
        </div>

        {/* ============================================================
            MOBILE / TABLET KAIZENFIN EXECUTION DOCK (< xl)
            Fits directly above the fold with Profit + Stepper + [BÁN | Timer | MUA]
           ============================================================ */}
        <div className="xl:hidden px-3 pt-2 pb-5 space-y-3">
          {/* Compact Feedback Banner */}
          {feedback && (
            <div
              className={`rounded-lg px-3 py-1.5 text-center text-xs font-semibold ${
                feedback.type === 'ok'
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* Row 1: Inline Profit Summary ("Lợi nhuận 95% +$19.50") */}
          <div className="flex items-baseline justify-center gap-2.5">
            <span className="text-sm font-medium text-slate-200">{t.profit}</span>
            <span className="font-mono text-lg font-extrabold text-rose-400">{profitPercent}%</span>
            <span className="font-mono text-2xl font-extrabold text-[#00D4AA]">
              +${payoutTotal % 1 === 0 ? payoutTotal.toFixed(0) : payoutTotal.toFixed(2)}
            </span>
          </div>

          {/* Row 2: Clean Horizontal Stepper ([ - ] [ $10 ] [ + ]) */}
          <div className="grid grid-cols-12 items-center gap-2">
            <button
              type="button"
              onClick={() => setAmount((a) => Math.max(1, a - 5))}
              aria-label="Giảm 5 đô"
              className="col-span-3 flex h-11 items-center justify-center rounded-lg bg-[#171f36] text-white transition-colors hover:bg-slate-700 cursor-pointer"
            >
              <Minus className="h-5 w-5" />
            </button>
            <div className="relative col-span-6">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-base font-bold text-slate-900">
                $
              </span>
              <input
                type="number"
                min={1}
                step={1}
                aria-label="Số tiền đặt lệnh"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                className="h-11 w-full rounded-lg bg-white pl-7 pr-3 font-mono text-base font-extrabold text-slate-900 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setAmount((a) => a + 5)}
              aria-label="Tăng 5 đô"
              className="col-span-3 flex h-11 items-center justify-center rounded-lg bg-[#171f36] text-white transition-colors hover:bg-slate-700 cursor-pointer"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Row 3: 3-Column Kaizenfin Action Bar ([ BÁN ↘ ] [ Chờ Kết quả 24s ] [ MUA ↗ ]) */}
          <div className="grid grid-cols-3 items-stretch gap-2">
            <button
              type="button"
              disabled={submitting || isWaiting}
              onClick={() => handleOrder('SELL')}
              className={`flex h-14 items-center justify-center gap-1.5 rounded-xl font-display text-base font-extrabold transition-all cursor-pointer ${
                isWaiting || submitting
                  ? 'bg-[#8d96a6] text-white/95 cursor-not-allowed'
                  : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:brightness-105'
              }`}
            >
              <span>{t.sell}</span>
              <TrendingDown className="h-5 w-5" />
            </button>

            <div className="flex h-14 flex-col items-center justify-center rounded-xl border border-slate-700/60 bg-[#151c30] px-1 text-center">
              <div className="text-[11px] font-medium leading-tight text-slate-200">
                {isWaiting ? (isVi ? 'Chờ Kết quả' : 'Wait Result') : t.pleaseTrade}
              </div>
              <div className="font-mono text-lg font-extrabold leading-tight text-white">
                {market.secondsRemaining}s
              </div>
            </div>

            <button
              type="button"
              disabled={submitting || isWaiting}
              onClick={() => handleOrder('BUY')}
              className={`flex h-14 items-center justify-center gap-1.5 rounded-xl font-display text-base font-extrabold transition-all cursor-pointer ${
                isWaiting || submitting
                  ? 'bg-[#8d96a6] text-white/95 cursor-not-allowed'
                  : 'bg-[#00D4AA] text-[#050814] shadow-lg shadow-emerald-500/20 hover:brightness-105'
              }`}
            >
              <span>{t.buy}</span>
              <TrendingUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          DESKTOP RIGHT ORDER EXECUTION & ORDERS COLUMN (>= xl)
         ============================================================ */}
      <div className="hidden xl:flex xl:col-span-3 flex-col gap-4">
        <div className="rounded-xl border border-slate-800/90 bg-[#0b1021] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{isVi ? 'Số tiền đặt lệnh' : 'Order Amount'}</span>
            <span className="font-mono text-slate-300">
              {isVi ? 'Khả dụng:' : 'Avail:'} ${activeBalance.toFixed(2)}
            </span>
          </div>

          {/* Stepper Input */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAmount((a) => Math.max(1, a - 5))}
              aria-label="Giảm 5 đô"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#141a2e] text-white hover:bg-slate-800 cursor-pointer"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-slate-400">
                $
              </span>
              <input
                type="number"
                min={1}
                step={1}
                aria-label="Số tiền đặt lệnh"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                className="h-10 w-full rounded-lg bg-white pl-7 pr-3 font-mono text-base font-extrabold text-slate-900 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setAmount((a) => a + 5)}
              aria-label="Tăng 5 đô"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#141a2e] text-white hover:bg-slate-800 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Amount Chips */}
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {[5, 10, 20, 50, 100].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount((a) => Number((a + val).toFixed(2)))}
                className="rounded-lg border border-slate-800 bg-[#131a30] py-1.5 font-mono text-xs font-semibold text-slate-200 transition-colors hover:border-[#00D4AA]/50 hover:text-white cursor-pointer"
              >
                +{val}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount(Math.floor(activeBalance))}
              className="rounded-lg border border-slate-800 bg-[#131a30] py-1.5 font-mono text-xs font-semibold text-amber-300 transition-colors hover:border-amber-400/50 cursor-pointer"
            >
              All
            </button>
          </div>

          {/* Profit Projection */}
          <div className="mt-4 text-center">
            <div className="text-xs text-slate-400">
              {t.profit} <strong className="text-rose-400">{profitPercent}%</strong>
            </div>
            <div className="mt-0.5 font-mono text-2xl font-extrabold text-[#00D4AA]">
              +${payoutTotal.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">
              {isVi ? 'Tổng nhận khi thắng (Vốn + 95%)' : 'Total return on win (Stake + 95%)'}
            </div>
          </div>

          {/* Traders Sentiment Bar */}
          <div className="mt-4">
            <div className="text-center text-[11px] text-slate-400 mb-1.5">{t.tradersSentiment}</div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="bg-[#00D4AA] transition-all duration-300"
                style={{ width: `${market.sentimentBuyPct}%` }}
              />
              <div
                className="bg-rose-500 transition-all duration-300"
                style={{ width: `${market.sentimentSellPct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[11px] font-bold">
              <span className="text-[#00D4AA]">{market.sentimentBuyPct}%</span>
              <span className="text-rose-400">{market.sentimentSellPct}%</span>
            </div>
          </div>

          {feedback && (
            <div
              className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${
                feedback.type === 'ok'
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* BUY / Phase Timer / SELL Stack */}
          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              disabled={submitting || isWaiting}
              onClick={() => handleOrder('BUY')}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display text-base font-extrabold transition-all cursor-pointer ${
                isWaiting || submitting
                  ? 'bg-[#8d96a6] text-white/95 cursor-not-allowed'
                  : 'bg-[#00D4AA] text-[#050814] shadow-lg shadow-emerald-500/15 hover:brightness-105'
              }`}
            >
              <span>{t.buy}</span>
              <TrendingUp className="h-5 w-5" />
            </button>

            <div className="rounded-xl border border-slate-700/80 bg-[#131a30] py-2.5 text-center">
              <div className="text-[11px] font-medium text-slate-300">
                {isWaiting ? (isVi ? 'Chờ Kết quả' : 'Wait Result') : t.pleaseTrade}
              </div>
              <div
                className={`font-mono text-base font-extrabold ${
                  !isWaiting ? 'text-[#00D4AA]' : 'text-amber-400'
                }`}
              >
                {market.secondsRemaining}s
              </div>
            </div>

            <button
              type="button"
              disabled={submitting || isWaiting}
              onClick={() => handleOrder('SELL')}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display text-base font-extrabold transition-all cursor-pointer ${
                isWaiting || submitting
                  ? 'bg-[#8d96a6] text-white/95 cursor-not-allowed'
                  : 'bg-rose-500 text-white shadow-lg shadow-rose-500/15 hover:brightness-105'
              }`}
            >
              <span>{t.sell}</span>
              <TrendingDown className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Open / Closed Orders Card */}
        <div className="flex-1 rounded-xl border border-slate-800/90 bg-[#0b1021] p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setOrderTab('OPEN')}
                className={`flex items-center gap-1.5 pb-1 text-xs font-bold transition-colors cursor-pointer ${
                  orderTab === 'OPEN'
                    ? 'border-b-2 border-[#00D4AA] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{t.openOrders}</span>
                <span className="rounded bg-rose-500 px-1.5 py-0.5 font-mono text-[10px] text-white">
                  {openOrders.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setOrderTab('CLOSED')}
                className={`pb-1 text-xs font-bold transition-colors cursor-pointer ${
                  orderTab === 'CLOSED'
                    ? 'border-b-2 border-[#00D4AA] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.closedOrders} ({closedOrders.length})
              </button>
            </div>
            <div className="flex items-center gap-2">
              {onGoToOrders && (
                <button
                  type="button"
                  onClick={onGoToOrders}
                  className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
                >
                  {isVi ? 'Tất cả' : 'All'}
                </button>
              )}
              <button
                type="button"
                onClick={onGoToBot}
                title="Mở Bot AI"
                className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/20 cursor-pointer"
              >
                <Bot className="h-3.5 w-3.5" />
                <span>Bot AI</span>
              </button>
            </div>
          </div>

          <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1">
            {(orderTab === 'OPEN' ? openOrders : closedOrders).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {orderTab === 'OPEN'
                  ? isVi
                    ? 'Chưa có lệnh đang mở trong phiên này.'
                    : 'No open orders in this round.'
                  : isVi
                  ? 'Chưa có lịch sử lệnh đã đóng.'
                  : 'No closed orders yet.'}
              </div>
            ) : (
              (orderTab === 'OPEN' ? openOrders : closedOrders).map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-lg border border-slate-800/80 bg-[#080c17] px-3 py-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">
                      {ord.pair}{' '}
                      <span className="text-[10px] text-slate-400">
                        ({ord.accountMode === 'live' ? 'LIVE' : 'DEMO'}
                        {ord.source === 'bot' ? ' · BOT' : ''})
                      </span>
                    </span>
                    <span className="font-mono font-bold text-slate-200">
                      ${ord.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        ord.direction === 'BUY' ? 'text-[#00D4AA]' : 'text-rose-400'
                      }`}
                    >
                      {ord.direction === 'BUY' ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                      {ord.direction}
                    </span>
                    {ord.status === 'OPEN' ? (
                      <span className="font-mono text-[11px] text-sky-400">
                        Entry ${ord.entryPrice.toFixed(2)}
                      </span>
                    ) : ord.status === 'DRAW' ? (
                      <span className="font-mono font-bold text-slate-300">
                        {isVi ? 'Hòa $0.00' : 'Draw $0.00'}
                      </span>
                    ) : (
                      <span
                        className={`font-mono font-bold ${
                          ord.status === 'WON' ? 'text-[#00D4AA]' : 'text-rose-400'
                        }`}
                      >
                        {ord.pnl >= 0 ? '+' : ''}${ord.pnl.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
