import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
} from 'lucide-react';
import {
  computeTradeDashboardStats,
  filterOrdersByCriteria,
} from '../lib/tradingEngine';
import type { AccountMode, Language, TradeOrder } from '../types';

interface TradingDashboardViewProps {
  lang: Language;
  accountMode: AccountMode;
  orders: TradeOrder[];
  hideSensitiveData?: boolean;
}

function getOffsetDateString(daysOffset = 0): string {
  const d = new Date(Date.now() + daysOffset * 86400000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDollar(value: number, showSign = false): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) return `-$${formatted}`;
  if (showSign && value > 0) return `+$${formatted}`;
  return `$${formatted}`;
}

export const TradingDashboardView: React.FC<TradingDashboardViewProps> = ({
  lang,
  accountMode,
  orders,
  hideSensitiveData = false,
}) => {
  const isVi = lang === 'vi';
  const defaultStart = useMemo(() => getOffsetDateString(-30), []);
  const defaultEnd = useMemo(() => getOffsetDateString(0), []);
  const endInputRef = React.useRef<HTMLInputElement | null>(null);

  const [scope, setScope] = useState<'active' | 'all'>('active');
  const [startDateInput, setStartDateInput] = useState<string>(defaultStart);
  const [endDateInput, setEndDateInput] = useState<string>(defaultEnd);
  const [appliedRange, setAppliedRange] = useState<{ start: string; end: string }>({
    start: defaultStart,
    end: defaultEnd,
  });

  const effectiveMode: AccountMode | 'all' = scope === 'all' ? 'all' : accountMode;

  const stats = useMemo(
    () => computeTradeDashboardStats(orders, effectiveMode),
    [orders, effectiveMode]
  );

  const filteredHistory = useMemo(
    () =>
      filterOrdersByCriteria(orders, {
        accountMode: effectiveMode,
        startDate: appliedRange.start || undefined,
        endDate: appliedRange.end || undefined,
      }),
    [orders, effectiveMode, appliedRange]
  );

  // Donut Ring SVG math (r=62 => circumference ~ 389.56)
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const total = stats.totalOrders;
  const winLen = total > 0 ? (stats.wins / total) * circumference : 0;
  const drawLen = total > 0 ? (stats.draws / total) * circumference : 0;
  const loseLen = total > 0 ? (stats.losses / total) * circumference : 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedRange({ start: startDateInput, end: endDateInput });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pt-1">
      {/* Page Title & Account Scope Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          {isVi ? 'Số liệu thống kê' : 'Trading Statistics'}
        </h1>

        <div className="inline-flex items-center rounded-xl border border-slate-800 bg-[#0d1326] p-1 text-xs">
          <button
            type="button"
            onClick={() => setScope('active')}
            className={`rounded-lg px-3 py-1.5 font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              scope === 'active'
                ? 'bg-[#1c2642] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {accountMode === 'live'
              ? isVi
                ? 'Tài khoản Thực'
                : 'Live Account'
              : isVi
              ? 'Tài khoản Demo'
              : 'Demo Account'}
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`rounded-lg px-3 py-1.5 font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              scope === 'all'
                ? 'bg-[#1c2642] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isVi ? 'Tất cả ví' : 'All Accounts'}
          </button>
        </div>
      </div>

      {/* Main Analytics Grid: Vertical stack on mobile (matching IMG_0070), balanced 12-col split on desktop */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        {/* Donut Ring + Round Counts Card */}
        <section
          aria-label={isVi ? 'Tổng quan lượt giao dịch' : 'Trade rounds overview'}
          className="lg:col-span-5 rounded-2xl border border-slate-800/80 bg-[#111524] px-6 py-7 flex flex-col items-center text-center"
        >
          {/* SVG Donut Chart */}
          <div className="relative flex h-44 w-44 items-center justify-center">
            <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden="true">
              {/* Neutral base ring matching IMG_0070 when 0 trades */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="#746e87"
                strokeWidth="18"
                opacity={total === 0 ? 0.85 : 0.2}
              />
              {total > 0 && (
                <>
                  {/* Wins arc (Royal Blue #2563EB) */}
                  {winLen > 0 && (
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="18"
                      strokeDasharray={`${winLen} ${circumference}`}
                      strokeDashoffset={0}
                      strokeLinecap="butt"
                    />
                  )}
                  {/* Draws arc (Muted Violet-Slate #7A748E) */}
                  {drawLen > 0 && (
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="none"
                      stroke="#7A748E"
                      strokeWidth="18"
                      strokeDasharray={`${drawLen} ${circumference}`}
                      strokeDashoffset={-winLen}
                      strokeLinecap="butt"
                    />
                  )}
                  {/* Losses arc (Crimson #E11D48) */}
                  {loseLen > 0 && (
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="none"
                      stroke="#E11D48"
                      strokeWidth="18"
                      strokeDasharray={`${loseLen} ${circumference}`}
                      strokeDashoffset={-(winLen + drawLen)}
                      strokeLinecap="butt"
                    />
                  )}
                </>
              )}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-medium text-slate-200">
                {isVi ? 'Lượt giao dịch' : 'Total Trades'}
              </span>
              <span
                data-testid="stat-total-orders"
                className="mt-1 font-mono text-2xl font-extrabold text-white tabular-nums"
              >
                {hideSensitiveData ? '****' : stats.totalOrders}
              </span>
            </div>
          </div>

          {/* Centered Legend matching IMG_0070 */}
          <div className="mt-5 w-full max-w-[230px] space-y-2.5 text-left text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-slate-100">
                <span className="h-4 w-4 rounded-full border-[2.5px] border-[#2563EB] shrink-0" />
                <span>{isVi ? 'Tổng vòng thắng' : 'Total Win Rounds'}</span>
              </div>
              <span
                data-testid="stat-wins"
                className="font-mono font-bold text-white tabular-nums"
              >
                {hideSensitiveData ? '***' : stats.wins}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-slate-100">
                <span className="h-4 w-4 rounded-full border-[2.5px] border-[#7A748E] shrink-0" />
                <span>{isVi ? 'Tổng vòng hòa' : 'Total Draw Rounds'}</span>
              </div>
              <span
                data-testid="stat-draws"
                className="font-mono font-bold text-white tabular-nums"
              >
                {hideSensitiveData ? '***' : stats.draws}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-slate-100">
                <span className="h-4 w-4 rounded-full border-[2.5px] border-[#E11D48] shrink-0" />
                <span>{isVi ? 'Tổng vòng thua' : 'Total Lose Rounds'}</span>
              </div>
              <span
                data-testid="stat-losses"
                className="font-mono font-bold text-white tabular-nums"
              >
                {hideSensitiveData ? '***' : stats.losses}
              </span>
            </div>
          </div>

          {/* Win Rate & Total Volume */}
          <div className="mt-6 space-y-4">
            <div>
              <div className="text-xs font-medium text-slate-300">
                {isVi ? 'Tỉ lệ thắng' : 'Win Rate'}
              </div>
              <div
                data-testid="stat-win-rate"
                className="mt-1 font-mono text-2xl font-extrabold text-white tabular-nums"
              >
                {hideSensitiveData
                  ? '****'
                  : `${
                      stats.winRatePct % 1 === 0
                        ? stats.winRatePct.toFixed(0)
                        : stats.winRatePct.toFixed(1)
                    }%`}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-300">
                {isVi ? 'Tổng giao dịch' : 'Total Trade Volume'}
              </div>
              <div
                data-testid="stat-total-volume"
                className="mt-1 font-mono text-2xl font-extrabold text-white tabular-nums"
              >
                {hideSensitiveData ? '****' : formatDollar(stats.totalVolume)}
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Net Profit Banner, Total Revenue Banner & Trade Summary */}
        <div className="lg:col-span-7 space-y-4">
          {/* Vibrant Azure Net Profit Banner matching IMG_0070 */}
          <div className="rounded-2xl bg-gradient-to-r from-[#289BF8] to-[#1D84E8] px-6 py-6 shadow-lg shadow-sky-500/15">
            <div className="flex items-center justify-center sm:justify-start gap-5">
              <svg
                viewBox="0 0 48 48"
                className="h-12 w-12 shrink-0 text-white/75"
                fill="none"
                aria-hidden="true"
              >
                <rect x="6" y="28" width="8" height="14" rx="2" fill="currentColor" />
                <rect x="19" y="18" width="8" height="24" rx="2" fill="currentColor" />
                <rect x="32" y="8" width="8" height="34" rx="2" fill="currentColor" />
                <line x1="4" y1="44" x2="44" y2="44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <div>
                <div className="text-base font-bold text-sky-100/90">
                  {isVi ? 'Lợi nhuận ròng' : 'Net Profit'}
                </div>
                <div
                  data-testid="stat-net-profit"
                  className="mt-0.5 font-mono text-3xl font-extrabold text-white tabular-nums"
                >
                  {hideSensitiveData ? '****' : formatDollar(stats.netProfit, stats.netProfit > 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Vibrant Emerald Total Revenue Banner matching IMG_0070 */}
          <div className="rounded-2xl bg-gradient-to-r from-[#05CE8E] to-[#00B87C] px-6 py-6 shadow-lg shadow-emerald-500/15">
            <div className="flex items-center justify-center sm:justify-start gap-5">
              <svg
                viewBox="0 0 48 48"
                className="h-12 w-12 shrink-0 text-white/80"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="24" cy="14" r="7" fill="currentColor" />
                <path d="M24 11L26.5 14L24 17L21.5 14L24 11Z" fill="#00B87C" />
                <path d="M24 21V31" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path d="M24 28C24 24 18 22 14 23C15 27 19 29 24 28Z" fill="currentColor" />
                <path d="M24 28C24 24 30 22 34 23C33 27 29 29 24 28Z" fill="currentColor" />
                <path d="M16 32H32L30 43H18L16 32Z" fill="currentColor" />
              </svg>
              <div>
                <div className="text-base font-bold text-emerald-50/90">
                  {isVi ? 'Tổng doanh thu' : 'Total Revenue'}
                </div>
                <div
                  data-testid="stat-total-revenue"
                  className="mt-0.5 font-mono text-3xl font-extrabold text-white tabular-nums"
                >
                  {hideSensitiveData ? '****' : formatDollar(stats.totalRevenue)}
                </div>
              </div>
            </div>
          </div>

          {/* Trade Summary (MUA % vs BÁN %) matching IMG_0070 */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#111524] p-5">
            <h2 className="text-center text-lg font-bold text-slate-300">
              {isVi ? 'Tóm tắt giao dịch' : 'Trade Summary'}
            </h2>

            <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-[#1d2236]">
              {stats.totalOrders > 0 && (
                <>
                  <div
                    className="h-full bg-[#00D4AA] transition-all duration-300"
                    style={{ width: `${stats.buyPct}%` }}
                  />
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${stats.sellPct}%` }}
                  />
                </>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-sm font-extrabold">
              <div className="flex items-center gap-1.5">
                <span className="text-white">{isVi ? 'MUA' : 'BUY'}</span>
                <span className="font-mono text-[#00D4AA] tabular-nums">{stats.buyPct}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-rose-500 tabular-nums">{stats.sellPct}%</span>
                <span className="text-white">{isVi ? 'BÁN' : 'SELL'}</span>
              </div>
            </div>

            {stats.openOrders > 0 && (
              <div className="mt-3 border-t border-slate-800/70 pt-2.5 text-center text-xs text-slate-400">
                {isVi
                  ? `Hiện có ${stats.openOrders} lệnh đang mở chờ kết quả.`
                  : `${stats.openOrders} open order(s) currently awaiting settlement.`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Date-Range Trade History Section matching IMG_0070 */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-extrabold text-white">
            {isVi ? 'Lịch sử giao dịch' : 'Trading History'}
          </h2>
          {(appliedRange.start || appliedRange.end) && (
            <button
              type="button"
              onClick={() => {
                setStartDateInput('');
                setEndDateInput('');
                setAppliedRange({ start: '', end: '' });
              }}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
            >
              {isVi ? 'Hiển thị tất cả ngày' : 'Show all dates'}
            </button>
          )}
        </div>

        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex flex-1 items-center gap-2 sm:gap-4">
              <input
                type="date"
                aria-label={isVi ? 'Từ ngày' : 'From date'}
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                className="w-full max-w-[140px] bg-transparent font-mono text-sm font-medium text-slate-100 outline-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden"
              />
              <span className="text-slate-500 font-bold">-</span>
              <input
                ref={endInputRef}
                type="date"
                aria-label={isVi ? 'Đến ngày' : 'To date'}
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
                className="w-full max-w-[140px] bg-transparent font-mono text-sm font-medium text-slate-100 outline-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const el = endInputRef.current;
                if (!el) return;
                if (typeof el.showPicker === 'function') {
                  try {
                    el.showPicker();
                    return;
                  } catch {
                    // fallback to focus
                  }
                }
                el.focus();
              }}
              aria-label={isVi ? 'Chọn ngày' : 'Pick date'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
            >
              <Calendar className="h-5 w-5" />
            </button>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-[#289BF8] to-[#1D84E8] py-3.5 text-sm font-extrabold text-white shadow-lg shadow-sky-500/15 transition-opacity hover:opacity-95 cursor-pointer"
          >
            {isVi ? 'Tìm kiếm' : 'Search'}
          </button>
        </form>

        {/* Filtered Results or "Không có dữ liệu" */}
        {filteredHistory.length === 0 ? (
          <div className="py-10 text-center text-sm font-medium text-slate-400">
            {isVi ? 'Không có dữ liệu' : 'No data available'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-[#0d1324]">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="px-4 py-3 font-semibold">{isVi ? 'Thời gian' : 'Time'}</th>
                  <th className="px-4 py-3 font-semibold">{isVi ? 'Cặp / Ví' : 'Pair / Account'}</th>
                  <th className="px-4 py-3 font-semibold">{isVi ? 'Lệnh' : 'Side'}</th>
                  <th className="px-4 py-3 text-right font-semibold">{isVi ? 'Số tiền' : 'Amount'}</th>
                  <th className="px-4 py-3 text-right font-semibold">{isVi ? 'Kết quả' : 'Result'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredHistory.map((ord) => {
                  const isBuy = ord.direction === 'BUY';
                  return (
                    <tr key={ord.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono text-slate-300 tabular-nums">
                        {new Date(ord.createdAt).toLocaleString(isVi ? 'vi-VN' : 'en-US', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-white">{ord.pair}</span>
                        <span className="ml-1.5 text-slate-400">
                          · {ord.accountMode === 'live' ? (isVi ? 'Thực' : 'Live') : 'Demo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            isBuy ? 'text-[#00D4AA]' : 'text-rose-400'
                          }`}
                        >
                          {isBuy ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          )}
                          {isBuy ? (isVi ? 'MUA' : 'BUY') : isVi ? 'BÁN' : 'SELL'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white tabular-nums">
                        ${ord.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                        {ord.status === 'OPEN' ? (
                          <span className="text-sky-400">{isVi ? 'Đang mở' : 'Open'}</span>
                        ) : ord.status === 'DRAW' ? (
                          <span className="text-slate-300">{isVi ? 'Hòa ($0)' : 'Draw ($0)'}</span>
                        ) : ord.status === 'WON' ? (
                          <span className="text-[#00D4AA]">+${ord.pnl.toFixed(2)}</span>
                        ) : (
                          <span className="text-rose-400">-${ord.amount.toFixed(2)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
