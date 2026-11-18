import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import emptyGardenImg from '../../assets/images/quickinvest_empty_garden_1795004381707.jpg';
import {
  buildQuickInvestCalendar,
  computeQuickInvestPeriodStats,
} from '../../lib/tradingEngine';
import type {
  AccountMode,
  BotConfig,
  BotStrategy,
  QuickInvestPeriod,
  QuickInvestPlan,
  QuickInvestPortfolioSubTab,
  QuickInvestStrategyItem,
  QuickInvestTimer,
  TradeOrder,
} from '../../types';
import { QUICKINVEST_TOP_PACKAGES, STRATEGY_KEY_TO_LABEL } from './quickInvestData';

interface QuickInvestPortfolioTabProps {
  subTab: QuickInvestPortfolioSubTab;
  onChangeSubTab: (sub: QuickInvestPortfolioSubTab) => void;
  accountMode: AccountMode;
  orders: TradeOrder[];
  botConfig: BotConfig;
  cumulativePnl: number;
  stopReason: string | null;
  plans: QuickInvestPlan[];
  timers: QuickInvestTimer[];
  strategies: QuickInvestStrategyItem[];
  onCreatePlan: (plan: Omit<QuickInvestPlan, 'id' | 'pnl' | 'volume' | 'tradesCount' | 'winsCount' | 'createdAt'>) => void;
  onTogglePlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
  onUpdateRiskConfig: (patch: Partial<BotConfig>) => void;
  onCreateTimer: (timer: Omit<QuickInvestTimer, 'id' | 'createdAt'>) => void;
  onToggleTimer: (timerId: string) => void;
  onDeleteTimer: (timerId: string) => void;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const MiniAreaSparkline: React.FC<{ values: number[]; positive?: boolean }> = ({
  values,
  positive = true,
}) => {
  const pts = values.length >= 2 ? values : [0, 3, 2, 6, 5, 9, 8];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = Math.max(1, max - min);
  const w = 104;
  const h = 42;
  const coords = pts.map((v, idx) => {
    const x = (idx / Math.max(1, pts.length - 1)) * w;
    const y = h - 4 - ((v - min) / span) * (h - 10);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const linePath = `M ${coords.join(' L ')}`;
  const areaPath = `${linePath} L ${w},${h} L 0,${h} Z`;
  const stroke = values.length < 2 ? '#64748B' : positive ? '#22C55E' : '#F43F5E';
  const fill = values.length < 2 ? '#475569' : positive ? '#22C55E' : '#F43F5E';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-11 w-24 shrink-0" aria-hidden="true">
      <path d={areaPath} fill={fill} fillOpacity="0.18" />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const SemiCircleGauge: React.FC<{ winRatePct: number; totalTrades: number }> = ({
  winRatePct,
  totalTrades,
}) => {
  const radius = 34;
  const circumference = Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, winRatePct)) / 100) * circumference;

  return (
    <div className="relative flex h-14 w-24 items-end justify-center shrink-0">
      <svg viewBox="0 0 84 48" className="h-12 w-22" aria-hidden="true">
        <path
          d="M 8 44 A 34 34 0 0 1 76 44"
          fill="none"
          stroke="#2E384D"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {totalTrades > 0 && (
          <path
            d="M 8 44 A 34 34 0 0 1 76 44"
            fill="none"
            stroke="#22C55E"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        )}
      </svg>
      <span className="absolute bottom-0.5 font-mono text-sm font-extrabold text-white tabular-nums">
        {totalTrades}
      </span>
    </div>
  );
};

export const QuickInvestPortfolioTab: React.FC<QuickInvestPortfolioTabProps> = ({
  subTab,
  onChangeSubTab,
  accountMode,
  orders,
  botConfig,
  cumulativePnl,
  stopReason,
  plans,
  timers,
  strategies,
  onCreatePlan,
  onTogglePlan,
  onDeletePlan,
  onUpdateRiskConfig,
  onCreateTimer,
  onToggleTimer,
  onDeleteTimer,
}) => {
  // --- Danh mục state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [riskModalOpen, setRiskModalOpen] = useState(false);

  // Create Plan form state
  const [planName, setPlanName] = useState('');
  const [planStrategy, setPlanStrategy] = useState<BotStrategy>('ai_predict');
  const [planStake, setPlanStake] = useState('10');
  const [planTp, setPlanTp] = useState('100');
  const [planSl, setPlanSl] = useState('50');
  const [planMode, setPlanMode] = useState<AccountMode>(accountMode);
  const [planError, setPlanError] = useState<string | null>(null);

  // Copy shared package code modal state
  const [shareCodeInput, setShareCodeInput] = useState('');
  const [copyError, setCopyError] = useState<string | null>(null);

  // Global risk modal state
  const [riskTp, setRiskTp] = useState(String(botConfig.takeProfit));
  const [riskSl, setRiskSl] = useState(String(botConfig.stopLoss));
  const [riskSteps, setRiskSteps] = useState(String(botConfig.maxSteps));

  // --- Thống kê lợi nhuận state ---
  const [period, setPeriod] = useState<QuickInvestPeriod>('today');
  const now = useMemo(() => new Date(), []);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [compactCalendarMode, setCompactCalendarMode] = useState(false);

  // --- Hẹn giờ state ---
  const [timerModalOpen, setTimerModalOpen] = useState(false);
  const [timerPlanId, setTimerPlanId] = useState('');
  const [timerStart, setTimerStart] = useState('08:00');
  const [timerEnd, setTimerEnd] = useState('11:30');
  const [timerDays, setTimerDays] = useState<string[]>(['T2', 'T3', 'T4', 'T5', 'T6']);
  const [timerError, setTimerError] = useState<string | null>(null);

  // Computed stats & calendar
  const periodStats = useMemo(
    () => computeQuickInvestPeriodStats(orders, accountMode, period),
    [orders, accountMode, period]
  );

  const calendarCells = useMemo(
    () => buildQuickInvestCalendar(orders, accountMode, calYear, calMonth),
    [orders, accountMode, calYear, calMonth]
  );

  const positivePnl = useMemo(() => {
    const won = orders
      .filter((o) => o.accountMode === accountMode && o.status === 'WON')
      .reduce((acc, o) => acc + o.pnl, 0);
    return Number((won + (cumulativePnl > 0 ? cumulativePnl : 0)).toFixed(2));
  }, [orders, accountMode, cumulativePnl]);

  const negativePnl = useMemo(() => {
    const lost = orders
      .filter((o) => o.accountMode === accountMode && o.status === 'LOST')
      .reduce((acc, o) => acc + Math.abs(o.pnl), 0);
    return Number((lost + (cumulativePnl < 0 ? Math.abs(cumulativePnl) : 0)).toFixed(2));
  }, [orders, accountMode, cumulativePnl]);

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (statusFilter === 'active' && !p.active) return false;
      if (statusFilter === 'paused' && p.active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.strategyName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [plans, statusFilter, searchQuery]);

  const handleSubmitCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = planName.trim();
    const stakeNum = Number(planStake);
    const tpNum = Number(planTp);
    const slNum = Number(planSl);

    if (!trimmed) {
      setPlanError('Vui lòng nhập tên gói đầu tư (Plan).');
      return;
    }
    if (!Number.isFinite(stakeNum) || stakeNum < 1) {
      setPlanError('Số tiền gốc tối thiểu là $1.');
      return;
    }
    if (!Number.isFinite(tpNum) || tpNum <= 0 || !Number.isFinite(slNum) || slNum <= 0) {
      setPlanError('Mục tiêu Chốt lời và Cắt lỗ phải lớn hơn 0.');
      return;
    }

    const matchedStrat = strategies.find((s) => s.strategyKey === planStrategy);
    onCreatePlan({
      name: trimmed,
      strategy: planStrategy,
      strategyName: matchedStrat?.name ?? STRATEGY_KEY_TO_LABEL[planStrategy],
      method: matchedStrat?.method ?? 'String Method',
      baseAmount: stakeNum,
      takeProfit: tpNum,
      stopLoss: slNum,
      maxSteps: botConfig.maxSteps,
      accountMode: planMode,
      active: false,
    });
    setPlanName('');
    setPlanError(null);
    setCreateModalOpen(false);
  };

  const handleSubmitCopyCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = shareCodeInput.trim().toUpperCase();
    if (!code) {
      setCopyError('Vui lòng nhập mã gói chia sẻ (ví dụ: QI-CA-F2).');
      return;
    }
    const found = QUICKINVEST_TOP_PACKAGES.find(
      (p) => p.shareCode.toUpperCase() === code
    );
    if (!found) {
      setCopyError('Không tìm thấy mã gói. Thử mã mẫu: QI-CA-F2, QI-CA-VIP hoặc QI-QUANT-V3.');
      return;
    }
    onCreatePlan({
      name: found.name,
      strategy: found.strategy,
      strategyName: found.strategyName,
      method: found.method,
      baseAmount: found.baseAmount,
      takeProfit: found.takeProfit,
      stopLoss: found.stopLoss,
      maxSteps: found.maxSteps,
      accountMode,
      active: false,
      copiedFrom: found.shareCode,
    });
    setShareCodeInput('');
    setCopyError(null);
    setCopyModalOpen(false);
  };

  const handleSaveRisk = (e: React.FormEvent) => {
    e.preventDefault();
    const tp = Math.max(1, Number(riskTp) || 100);
    const sl = Math.max(1, Number(riskSl) || 50);
    const steps = Math.min(8, Math.max(1, Number(riskSteps) || 4));
    onUpdateRiskConfig({ takeProfit: tp, stopLoss: sl, maxSteps: steps });
    setRiskModalOpen(false);
  };

  const handleSubmitTimer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timerStart || !timerEnd) {
      setTimerError('Vui lòng chọn giờ bắt đầu và kết thúc.');
      return;
    }
    if (timerDays.length === 0) {
      setTimerError('Vui lòng chọn ít nhất một ngày lặp lại.');
      return;
    }
    const chosenPlan = plans.find((p) => p.id === timerPlanId);
    onCreateTimer({
      planId: chosenPlan?.id ?? 'default_bot',
      planName: chosenPlan?.name ?? STRATEGY_KEY_TO_LABEL[botConfig.strategy],
      startTime: timerStart,
      endTime: timerEnd,
      repeatDays: timerDays,
      enabled: true,
    });
    setTimerError(null);
    setTimerModalOpen(false);
  };

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  return (
    <div className="pb-24 lg:pb-8">
      {/* Top 3 Sub-Tabs matching IMG_0090, IMG_0092, IMG_0094 */}
      <div
        role="tablist"
        aria-label="Quản lý danh mục Bot QuickInvest"
        className="flex items-center justify-between border-b border-slate-800/80 bg-[#0d1323] px-3.5 lg:justify-start lg:gap-8 lg:px-6"
      >
        {(
          [
            { id: 'list', label: 'Danh mục' },
            { id: 'stats', label: 'Thống kê lợi nhuận' },
            { id: 'timer', label: 'Hẹn giờ' },
          ] as { id: QuickInvestPortfolioSubTab; label: string }[]
        ).map((tab) => {
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChangeSubTab(tab.id)}
              className={`relative py-3.5 text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
                active ? 'text-[#5C60F5]' : 'text-slate-100 hover:text-indigo-300'
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t-full bg-[#5C60F5]" />
              )}
            </button>
          );
        })}
      </div>

      {/* === SUB-TAB 1: DANH MỤC (IMG_0090) === */}
      {subTab === 'list' && (
        <div className="space-y-4 px-3.5 pt-4 lg:px-6 lg:pt-5">
          {stopReason && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-200">
              {stopReason}
            </div>
          )}

          {/* Top Action Filter Card matching IMG_0090 */}
          <div className="rounded-2xl border border-slate-700/50 bg-[#151D30] p-3.5 space-y-3 lg:flex lg:items-center lg:justify-between lg:gap-3 lg:space-y-0">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm gói..."
                aria-label="Tìm gói đầu tư"
                className="w-full rounded-xl border border-slate-700/80 bg-[#12192B] py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-400 focus:border-[#5C60F5] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* +$0.00 / -$0.00 + Purple Gear */}
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-700/80 bg-[#12192B] px-3 py-2">
                <div className="font-mono text-sm font-extrabold tabular-nums">
                  <span className="text-[#18B87A]">+${positivePnl.toFixed(2)}</span>
                  <span className="mx-1.5 text-slate-500">/</span>
                  <span className="text-[#EA4B5A]">-${negativePnl.toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRiskTp(String(botConfig.takeProfit));
                    setRiskSl(String(botConfig.stopLoss));
                    setRiskSteps(String(botConfig.maxSteps));
                    setRiskModalOpen(true);
                  }}
                  aria-label="Cài đặt Chốt lời Cắt lỗ Bot"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6863FF] hover:bg-indigo-500/15 cursor-pointer"
                >
                  <Settings className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Bộ lọc */}
              <button
                type="button"
                onClick={() => setFilterOpen((o) => !o)}
                className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                  filterOpen || statusFilter !== 'all'
                    ? 'border-[#5C60F5] bg-[#5C60F5]/15 text-indigo-200'
                    : 'border-slate-700/80 bg-[#12192B] text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <span>Bộ lọc</span>
                <ArrowLeftRight className="h-4 w-4 text-slate-300" />
              </button>

              {/* Sao chép */}
              <button
                type="button"
                onClick={() => {
                  setCopyError(null);
                  setCopyModalOpen(true);
                }}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-700/80 bg-[#182136] px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800/80 cursor-pointer"
              >
                <Copy className="h-4 w-4 text-slate-300" />
                <span>Sao chép</span>
              </button>

              {/* + Tạo plan */}
              <button
                type="button"
                onClick={() => {
                  setPlanMode(accountMode);
                  setPlanError(null);
                  setCreateModalOpen(true);
                }}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#169A6B] hover:bg-[#19AF7A] px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-950/40 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Tạo plan</span>
              </button>
            </div>
          </div>

          {filterOpen && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-[#12192B] p-2.5">
              <span className="text-xs font-semibold text-slate-400 px-1">Trạng thái:</span>
              {(
                [
                  { id: 'all', label: 'Tất cả' },
                  { id: 'active', label: 'Đang chạy' },
                  { id: 'paused', label: 'Đang tạm dừng' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-[#5C60F5] text-white'
                      : 'bg-slate-800/70 text-slate-300 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Empty State vs Populated Plans */}
          {filteredPlans.length === 0 ? (
            <div className="rounded-2xl border border-slate-700/50 bg-[#151D30] px-6 py-10 text-center">
              <img
                src={emptyGardenImg}
                alt="Minh họa danh mục đầu tư trống"
                className="mx-auto h-52 w-52 sm:h-60 sm:w-60 rounded-2xl object-cover"
              />
              <h3 className="mt-5 font-display text-lg font-extrabold text-white">
                Danh mục đầu tư đang trống
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400 leading-relaxed">
                Bắt đầu khám phá các cơ hội đầu tư và kiếm lợi nhuận ngay hôm nay.
              </p>
              <div className="mt-5 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPlanMode(accountMode);
                    setPlanError(null);
                    setCreateModalOpen(true);
                  }}
                  className="min-h-[44px] rounded-xl bg-[#5F61F2] hover:bg-[#5254E6] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition-colors cursor-pointer"
                >
                  Tạo chiến lược của bạn
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCopyError(null);
                    setCopyModalOpen(true);
                  }}
                  className="text-sm font-bold text-[#6A6CFF] hover:text-indigo-300 cursor-pointer"
                >
                  + Sao chép Gói đầu tư được chia sẻ
                </button>
              </div>
            </div>
          ) : (
            <div
              data-testid="quickinvest-plans-list"
              className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3"
            >
              {filteredPlans.map((plan) => {
                const isRunning = plan.active && botConfig.enabled;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      isRunning
                        ? 'border-emerald-500/50 bg-[#142333]'
                        : 'border-slate-700/60 bg-[#151D30]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-extrabold text-white">
                            {plan.name}
                          </h3>
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase shrink-0 ${
                              plan.accountMode === 'live'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-sky-500/15 text-sky-300'
                            }`}
                          >
                            {plan.accountMode}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {plan.strategyName} · {plan.method}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeletePlan(plan.id)}
                        aria-label={`Xóa gói ${plan.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3.5 grid grid-cols-3 gap-2 rounded-xl bg-[#0F1627] p-2.5 text-center">
                      <div>
                        <div className="text-[10px] text-slate-400">Vốn gốc</div>
                        <div className="font-mono text-xs font-extrabold text-white tabular-nums">
                          ${plan.baseAmount}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Chốt lời</div>
                        <div className="font-mono text-xs font-extrabold text-emerald-400 tabular-nums">
                          +${plan.takeProfit}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Cắt lỗ</div>
                        <div className="font-mono text-xs font-extrabold text-rose-400 tabular-nums">
                          -${plan.stopLoss}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between gap-2">
                      <div className="text-xs text-slate-400">
                        {isRunning ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            Đang chạy tự động
                          </span>
                        ) : (
                          <span>Đang tạm dừng</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onTogglePlan(plan.id)}
                        className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                          isRunning
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                            : 'bg-[#169A6B] text-white hover:bg-[#19AF7A]'
                        }`}
                      >
                        {isRunning ? (
                          <>
                            <Pause className="h-3.5 w-3.5" />
                            <span>Tạm dừng</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" />
                            <span>Chạy Bot</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* === SUB-TAB 2: THỐNG KÊ LỢI NHUẬN (IMG_0092) === */}
      {subTab === 'stats' && (
        <div className="px-3.5 pt-4 lg:px-6 lg:pt-5">
          <div className="rounded-2xl border border-slate-700/50 bg-[#151D30] p-4 space-y-5">
            {/* Period Tabs: Hôm nay | Tuần này | Tháng này */}
            <div className="flex items-center gap-6 border-b border-slate-700/60">
              {(
                [
                  { id: 'today', label: 'Hôm nay' },
                  { id: 'week', label: 'Tuần này' },
                  { id: 'month', label: 'Tháng này' },
                ] as { id: QuickInvestPeriod; label: string }[]
              ).map((p) => {
                const active = period === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriod(p.id)}
                    className={`relative pb-3 text-sm font-bold transition-colors cursor-pointer ${
                      active ? 'text-[#5C60F5]' : 'text-slate-100 hover:text-indigo-300'
                    }`}
                  >
                    {p.label}
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#5C60F5]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* 3 KPI Sparkline / Gauge Cards matching IMG_0092 */}
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
              {/* Card 1: Lợi nhuận tổng */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-700/60 bg-[#192238] px-4 py-4">
                <div>
                  <div className="text-sm font-bold text-white">Lợi nhuận tổng</div>
                  <div
                    className={`mt-2 font-mono text-xl font-extrabold tabular-nums ${
                      periodStats.totalPnl >= 0 ? 'text-[#22C55E]' : 'text-rose-400'
                    }`}
                  >
                    {periodStats.totalPnl >= 0 ? '+' : '-'}$
                    {Math.abs(periodStats.totalPnl).toLocaleString('en-US', {
                      minimumFractionDigits: periodStats.totalPnl % 1 === 0 ? 0 : 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <MiniAreaSparkline
                  values={periodStats.pnlSeries}
                  positive={periodStats.totalPnl >= 0}
                />
              </div>

              {/* Card 2: Trades */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-700/60 bg-[#192238] px-4 py-4">
                <div>
                  <div className="text-sm font-bold text-white">Trades</div>
                  <div className="mt-1.5 font-mono text-xl font-extrabold text-white tabular-nums">
                    {periodStats.wins}/{periodStats.totalTrades}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-400">
                    T.L Win: {periodStats.winRatePct}%
                  </div>
                </div>
                <SemiCircleGauge
                  winRatePct={periodStats.winRatePct}
                  totalTrades={periodStats.totalTrades}
                />
              </div>

              {/* Card 3: Total Volumes */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-700/60 bg-[#192238] px-4 py-4">
                <div>
                  <div className="text-sm font-bold text-white">Total Volumes</div>
                  <div className="mt-2 font-mono text-xl font-extrabold text-slate-300 tabular-nums">
                    +$
                    {periodStats.totalVolume.toLocaleString('en-US', {
                      minimumFractionDigits: periodStats.totalVolume % 1 === 0 ? 0 : 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <MiniAreaSparkline values={periodStats.volumeSeries} positive />
              </div>
            </div>

            {/* Calendar Controls matching IMG_0092 */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-400">Thời gian</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      aria-label="Tháng trước"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span
                      data-testid="qi-calendar-month-label"
                      className="font-display text-base font-extrabold text-[#48A868] min-w-[126px] text-center"
                    >
                      tháng {calMonth + 1} {calYear}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      aria-label="Tháng sau"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Chế độ xem toggle */}
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold text-slate-400">Chế độ xem</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={compactCalendarMode}
                    aria-label="Chuyển chế độ xem lịch"
                    onClick={() => setCompactCalendarMode((v) => !v)}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full border border-slate-600/70 transition-colors cursor-pointer ${
                      compactCalendarMode ? 'bg-[#5C60F5]' : 'bg-[#252F47]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform ${
                        compactCalendarMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                    <CalendarIcon
                      className={`pointer-events-none absolute right-1.5 h-3 w-3 ${
                        compactCalendarMode ? 'opacity-0' : 'text-slate-300'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 7-Column Monthly Calendar Grid matching IMG_0092 */}
              {!compactCalendarMode ? (
                <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-[#192134]">
                  <div className="grid grid-cols-7 border-b border-slate-700/60 bg-[#141B2D]">
                    {WEEKDAYS.map((day) => (
                      <div
                        key={day}
                        className="py-2 text-center text-xs font-bold text-slate-300"
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {calendarCells.map((cell) => {
                      const showMetrics = cell.isToday || cell.tradesCount > 0;
                      return (
                        <div
                          key={cell.dateKey}
                          className={`min-h-[76px] sm:min-h-[86px] border-b border-r border-slate-800/80 p-1 sm:p-1.5 flex flex-col justify-between ${
                            cell.isToday
                              ? 'bg-[#202A42]'
                              : cell.inCurrentMonth
                              ? 'bg-[#192134]'
                              : 'bg-[#151C2C]/70'
                          }`}
                        >
                          <div
                            className={`text-right font-mono text-xs font-bold tabular-nums ${
                              cell.isToday
                                ? 'text-white'
                                : cell.inCurrentMonth
                                ? 'text-slate-300'
                                : 'text-slate-600'
                            }`}
                          >
                            {cell.dayNumber}
                          </div>
                          {showMetrics && (
                            <div className="mt-1 space-y-1">
                              <div
                                className={`rounded px-1 py-0.5 text-[9px] sm:text-[10px] leading-tight font-semibold truncate ${
                                  cell.pnl >= 0
                                    ? 'bg-[#1B3A33] text-[#4ADE80] border border-emerald-500/30'
                                    : 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                <div className="truncate opacity-85">Lợi nhu...</div>
                                <div className="font-mono font-bold tabular-nums">
                                  {cell.pnl >= 0 ? '+' : '-'}${Math.abs(cell.pnl).toFixed(2)}
                                </div>
                              </div>
                              <div className="rounded bg-[#253352] border border-sky-500/25 px-1 py-0.5 text-[9px] sm:text-[10px] leading-tight text-sky-300 truncate">
                                <div className="truncate opacity-85">KLGD</div>
                                <div className="font-mono font-bold tabular-nums">
                                  ${cell.volume.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {calendarCells
                    .filter((c) => c.inCurrentMonth && (c.tradesCount > 0 || c.isToday))
                    .map((c) => (
                      <div
                        key={c.dateKey}
                        className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-[#192134] px-4 py-3 text-xs"
                      >
                        <div className="font-mono font-bold text-white">
                          {c.dateKey} {c.isToday ? '(Hôm nay)' : ''}
                        </div>
                        <div className="flex items-center gap-4 font-mono tabular-nums">
                          <span
                            className={
                              c.pnl >= 0 ? 'font-bold text-emerald-400' : 'font-bold text-rose-400'
                            }
                          >
                            {c.pnl >= 0 ? '+' : '-'}${Math.abs(c.pnl).toFixed(2)}
                          </span>
                          <span className="text-sky-300">KLGD ${c.volume.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === SUB-TAB 3: HẸN GIỜ (IMG_0094) === */}
      {subTab === 'timer' && (
        <div className="px-3.5 pt-4 lg:px-6 lg:pt-5">
          <div className="rounded-2xl border border-slate-700/50 bg-[#151D30] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-extrabold text-white">Danh sách</h2>
              <button
                type="button"
                onClick={() => {
                  setTimerError(null);
                  setTimerModalOpen(true);
                }}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#149A6A] hover:bg-[#19AF7A] px-4 py-2 text-sm font-bold text-white shadow-md transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm hẹn giờ</span>
              </button>
            </div>

            {timers.length === 0 ? (
              <div className="py-12 text-center">
                <img
                  src={emptyGardenImg}
                  alt="Minh họa danh mục hẹn giờ trống"
                  className="mx-auto h-52 w-52 sm:h-60 sm:w-60 rounded-2xl object-cover"
                />
                <p className="mt-5 text-base font-bold text-slate-400">
                  Danh mục hẹn giờ trống
                </p>
              </div>
            ) : (
              <div
                data-testid="quickinvest-timers-list"
                className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"
              >
                {timers.map((tm) => (
                  <div
                    key={tm.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-[#101728] p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="font-mono text-base font-extrabold text-white tabular-nums">
                          {tm.startTime} - {tm.endTime}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-xs font-semibold text-slate-300">
                        Gói: {tm.planName}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tm.repeatDays.map((d) => (
                          <span
                            key={d}
                            className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={tm.enabled}
                        aria-label={`Bật tắt hẹn giờ ${tm.startTime}`}
                        onClick={() => onToggleTimer(tm.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                          tm.enabled ? 'bg-[#169A6B]' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform ${
                            tm.enabled ? 'translate-x-5.5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTimer(tm.id)}
                        aria-label={`Xóa hẹn giờ ${tm.startTime}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === MODAL: TẠO PLAN MỚI === */}
      {createModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tạo gói đầu tư QuickInvest"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/75"
            onClick={() => setCreateModalOpen(false)}
          />
          <form
            onSubmit={handleSubmitCreatePlan}
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700/80 bg-[#131B2E] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display text-base font-extrabold text-white">
                Tạo chiến lược đầu tư mới
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                aria-label="Đóng hộp thoại tạo plan"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {planError && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
                {planError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="qi-plan-name"
                  className="mb-1 block text-xs font-bold text-slate-300"
                >
                  Tên gói (Plan)
                </label>
                <input
                  id="qi-plan-name"
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Ví dụ: QuickInvest AI Scalper"
                  className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#5C60F5] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="qi-plan-strategy"
                  className="mb-1 block text-xs font-bold text-slate-300"
                >
                  Chiến lược Bot AI
                </label>
                <select
                  id="qi-plan-strategy"
                  value={planStrategy}
                  onChange={(e) => setPlanStrategy(e.target.value as BotStrategy)}
                  className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3.5 py-2.5 text-sm text-white focus:border-[#5C60F5] focus:outline-none"
                >
                  {strategies.map((s) => (
                    <option key={s.id} value={s.strategyKey}>
                      {s.name} ({s.method})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label htmlFor="qi-plan-stake" className="mb-1 block text-xs font-bold text-slate-300">
                    Vốn gốc ($)
                  </label>
                  <input
                    id="qi-plan-stake"
                    type="number"
                    min={1}
                    step="any"
                    value={planStake}
                    onChange={(e) => setPlanStake(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3 py-2 font-mono text-sm text-white"
                  />
                </div>
                <div>
                  <label htmlFor="qi-plan-tp" className="mb-1 block text-xs font-bold text-emerald-300">
                    Chốt lời ($)
                  </label>
                  <input
                    id="qi-plan-tp"
                    type="number"
                    min={1}
                    step="any"
                    value={planTp}
                    onChange={(e) => setPlanTp(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3 py-2 font-mono text-sm text-white"
                  />
                </div>
                <div>
                  <label htmlFor="qi-plan-sl" className="mb-1 block text-xs font-bold text-rose-300">
                    Cắt lỗ ($)
                  </label>
                  <input
                    id="qi-plan-sl"
                    type="number"
                    min={1}
                    step="any"
                    value={planSl}
                    onChange={(e) => setPlanSl(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3 py-2 font-mono text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <span className="mb-1 block text-xs font-bold text-slate-300">Tài khoản áp dụng</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['demo', 'live'] as AccountMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPlanMode(m)}
                      className={`rounded-xl border py-2 text-xs font-bold cursor-pointer ${
                        planMode === m
                          ? 'border-[#5C60F5] bg-[#5C60F5]/20 text-white'
                          : 'border-slate-700 bg-[#0D1323] text-slate-400'
                      }`}
                    >
                      {m === 'live' ? 'Ví TK Live' : 'Ví TK Demo'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#169A6B] hover:bg-[#19AF7A] px-5 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Lưu & Tạo plan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* === MODAL: SAO CHÉP GÓI ĐƯỢC CHIA SẺ === */}
      {copyModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sao chép gói đầu tư được chia sẻ"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/75" onClick={() => setCopyModalOpen(false)} />
          <form
            onSubmit={handleSubmitCopyCode}
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700/80 bg-[#131B2E] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display text-base font-extrabold text-white">
                Sao chép Gói đầu tư được chia sẻ
              </h3>
              <button
                type="button"
                onClick={() => setCopyModalOpen(false)}
                aria-label="Đóng hộp thoại sao chép"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {copyError && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
                {copyError}
              </div>
            )}

            <div>
              <label htmlFor="qi-share-code" className="mb-1 block text-xs font-bold text-slate-300">
                Mã chia sẻ gói QuickInvest
              </label>
              <input
                id="qi-share-code"
                type="text"
                value={shareCodeInput}
                onChange={(e) => setShareCodeInput(e.target.value)}
                placeholder="Nhập mã (VD: QI-CA-F2)"
                className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3.5 py-2.5 font-mono text-sm uppercase text-white placeholder:text-slate-500 focus:border-[#5C60F5] focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICKINVEST_TOP_PACKAGES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setShareCodeInput(p.shareCode)}
                    className="rounded-lg border border-slate-700 bg-[#0D1323] px-2.5 py-1 font-mono text-[11px] font-bold text-indigo-300 hover:border-indigo-400 cursor-pointer"
                  >
                    {p.shareCode}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCopyModalOpen(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#5F61F2] hover:bg-[#5254E6] px-5 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Xác nhận sao chép
              </button>
            </div>
          </form>
        </div>
      )}

      {/* === MODAL: CÀI ĐẶT RỦI RO TỔNG (GEAR) === */}
      {riskModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cài đặt quản trị rủi ro Bot"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/75" onClick={() => setRiskModalOpen(false)} />
          <form
            onSubmit={handleSaveRisk}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-700/80 bg-[#131B2E] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display text-base font-extrabold text-white">
                Quản trị rủi ro toàn hệ thống
              </h3>
              <button
                type="button"
                onClick={() => setRiskModalOpen(false)}
                aria-label="Đóng cài đặt rủi ro"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor="qi-risk-tp" className="mb-1 block text-xs font-bold text-emerald-300">
                  Mục tiêu Chốt lời tổng ($)
                </label>
                <input
                  id="qi-risk-tp"
                  type="number"
                  min={1}
                  value={riskTp}
                  onChange={(e) => setRiskTp(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3.5 py-2 font-mono text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="qi-risk-sl" className="mb-1 block text-xs font-bold text-rose-300">
                  Giới hạn Cắt lỗ tổng ($)
                </label>
                <input
                  id="qi-risk-sl"
                  type="number"
                  min={1}
                  value={riskSl}
                  onChange={(e) => setRiskSl(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3.5 py-2 font-mono text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="qi-risk-steps" className="mb-1 block text-xs font-bold text-slate-300">
                  Số bước gấp thếp tối đa (1 - 8)
                </label>
                <input
                  id="qi-risk-steps"
                  type="number"
                  min={1}
                  max={8}
                  value={riskSteps}
                  onChange={(e) => setRiskSteps(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3.5 py-2 font-mono text-sm text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRiskModalOpen(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#5F61F2] px-5 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Lưu cấu hình
              </button>
            </div>
          </form>
        </div>
      )}

      {/* === MODAL: THÊM HẸN GIỜ === */}
      {timerModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Thêm hẹn giờ chạy Bot"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/75" onClick={() => setTimerModalOpen(false)} />
          <form
            onSubmit={handleSubmitTimer}
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700/80 bg-[#131B2E] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display text-base font-extrabold text-white">
                Thêm lịch hẹn giờ Bot
              </h3>
              <button
                type="button"
                onClick={() => setTimerModalOpen(false)}
                aria-label="Đóng hộp thoại hẹn giờ"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {timerError && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
                {timerError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label htmlFor="qi-timer-plan" className="mb-1 block text-xs font-bold text-slate-300">
                  Áp dụng cho gói
                </label>
                <select
                  id="qi-timer-plan"
                  value={timerPlanId}
                  onChange={(e) => setTimerPlanId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3.5 py-2.5 text-sm text-white"
                >
                  <option value="">
                    Bot mặc định ({STRATEGY_KEY_TO_LABEL[botConfig.strategy]})
                  </option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="qi-timer-start" className="mb-1 block text-xs font-bold text-slate-300">
                    Giờ bắt đầu
                  </label>
                  <input
                    id="qi-timer-start"
                    type="time"
                    value={timerStart}
                    onChange={(e) => setTimerStart(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3 py-2 font-mono text-sm text-white"
                  />
                </div>
                <div>
                  <label htmlFor="qi-timer-end" className="mb-1 block text-xs font-bold text-slate-300">
                    Giờ kết thúc
                  </label>
                  <input
                    id="qi-timer-end"
                    type="time"
                    value={timerEnd}
                    onChange={(e) => setTimerEnd(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3 py-2 font-mono text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-bold text-slate-300">Ngày lặp lại</span>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const selected = timerDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          setTimerDays((prev) =>
                            prev.includes(day) ? prev.filter((x) => x !== day) : [...prev, day]
                          )
                        }
                        className={`h-9 w-10 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#5F61F2] text-white'
                            : 'border border-slate-700 bg-[#0D1323] text-slate-400'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTimerModalOpen(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#149A6A] hover:bg-[#19AF7A] px-5 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Lưu hẹn giờ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
