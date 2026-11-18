import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Bot,
  CheckCircle2,
  Diamond,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Wallet,
} from 'lucide-react';
import type {
  AccountMode,
  AppNotification,
  BotConfig,
  BotLogEntry,
  Language,
  MarketSnapshot,
  QuickInvestPlan,
  QuickInvestPortfolioSubTab,
  QuickInvestStrategyItem,
  QuickInvestTab,
  QuickInvestTimer,
  TradeDirection,
  TradeOrder,
  UserAccount,
} from '../types';
import type { WorkspaceSection } from './WorkspaceShell';
import {
  DEFAULT_QUICKINVEST_STRATEGIES,
  STRATEGY_KEY_TO_LABEL,
  type DailyInvestorRank,
  type TopPackageItem,
} from './quickinvest/quickInvestData';
import {
  QuickInvestHeader,
  QuickInvestMobileBottomNav,
} from './quickinvest/QuickInvestHeaderAndNav';
import { QuickInvestDiscoverTab } from './quickinvest/QuickInvestDiscoverTab';
import { QuickInvestPortfolioTab } from './quickinvest/QuickInvestPortfolioTab';
import { QuickInvestSignalTab } from './quickinvest/QuickInvestSignalTab';
import { QuickInvestStrategiesTab } from './quickinvest/QuickInvestStrategiesTab';

interface AIBotViewProps {
  lang: Language;
  token: string;
  user: UserAccount;
  market: MarketSnapshot;
  orders: TradeOrder[];
  notifications: AppNotification[];
  accountMode: AccountMode;
  botConfig: BotConfig;
  botLogs: BotLogEntry[];
  cumulativePnl: number;
  consecutiveLosses: number;
  stopReason: string | null;
  onChangeAccountMode: (mode: AccountMode) => void;
  onChangeSection: (section: WorkspaceSection) => void;
  onMarkNotificationsRead: () => void;
  onUpdateConfig: (patch: Partial<BotConfig>) => void;
  onToggleBot: () => void;
  onResetStats: () => void;
  onPlaceTrade: (
    direction: TradeDirection,
    amount: number,
    modeOverride?: AccountMode
  ) => Promise<void>;
}

const PLANS_STORAGE_KEY = 'quickinvest_plans_v1';
const TIMERS_STORAGE_KEY = 'quickinvest_timers_v1';
const STRATEGIES_STORAGE_KEY = 'quickinvest_custom_strategies_v1';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function formatCreatedStamp(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy}, ${hh}:${mi}:${ss}`;
}

export const AIBotView: React.FC<AIBotViewProps> = ({
  token,
  user,
  market,
  orders,
  notifications,
  accountMode,
  botConfig,
  botLogs,
  cumulativePnl,
  consecutiveLosses,
  stopReason,
  onChangeAccountMode,
  onChangeSection,
  onMarkNotificationsRead,
  onUpdateConfig,
  onToggleBot,
  onResetStats,
  onPlaceTrade,
}) => {
  const [activeTab, setActiveTab] = useState<QuickInvestTab>('discover');
  const [portfolioSubTab, setPortfolioSubTab] = useState<QuickInvestPortfolioSubTab>('list');
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const [plans, setPlans] = useState<QuickInvestPlan[]>(() =>
    loadJson<QuickInvestPlan[]>(PLANS_STORAGE_KEY, [])
  );
  const [timers, setTimers] = useState<QuickInvestTimer[]>(() =>
    loadJson<QuickInvestTimer[]>(TIMERS_STORAGE_KEY, [])
  );
  const [customStrategies, setCustomStrategies] = useState<QuickInvestStrategyItem[]>(() =>
    loadJson<QuickInvestStrategyItem[]>(STRATEGIES_STORAGE_KEY, [])
  );

  const allStrategies = [...customStrategies, ...DEFAULT_QUICKINVEST_STRATEGIES];

  useEffect(() => {
    try {
      localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
    } catch {
      // ignore storage quota errors
    }
  }, [plans]);

  useEffect(() => {
    try {
      localStorage.setItem(TIMERS_STORAGE_KEY, JSON.stringify(timers));
    } catch {
      // ignore
    }
  }, [timers]);

  useEffect(() => {
    try {
      localStorage.setItem(STRATEGIES_STORAGE_KEY, JSON.stringify(customStrategies));
    } catch {
      // ignore
    }
  }, [customStrategies]);

  const showBanner = (text: string) => {
    setBannerMsg(text);
    setTimeout(() => {
      setBannerMsg((prev) => (prev === text ? null : prev));
    }, 3200);
  };

  const handleCreatePlan = (
    draft: Omit<
      QuickInvestPlan,
      'id' | 'pnl' | 'volume' | 'tradesCount' | 'winsCount' | 'createdAt'
    >
  ) => {
    const newPlan: QuickInvestPlan = {
      ...draft,
      id: `qi_plan_${Date.now()}`,
      pnl: 0,
      volume: 0,
      tradesCount: 0,
      winsCount: 0,
      createdAt: formatCreatedStamp(),
    };
    setPlans((prev) => [newPlan, ...prev]);
    showBanner(`Đã thêm gói "${newPlan.name}" vào Danh mục QuickInvest.`);
  };

  const handleTogglePlan = (planId: string) => {
    const target = plans.find((p) => p.id === planId);
    if (!target) return;

    const willRun = !(target.active && botConfig.enabled);
    setPlans((prev) =>
      prev.map((p) => ({
        ...p,
        active: p.id === planId ? willRun : false,
      }))
    );

    if (willRun) {
      onUpdateConfig({
        strategy: target.strategy,
        baseAmount: target.baseAmount,
        takeProfit: target.takeProfit,
        stopLoss: target.stopLoss,
        maxSteps: target.maxSteps,
        accountMode: target.accountMode,
        enabled: true,
      });
      onChangeAccountMode(target.accountMode);
      showBanner(`QuickInvest Bot đang chạy tự động gói "${target.name}".`);
    } else {
      onUpdateConfig({ enabled: false });
      showBanner(`Đã tạm dừng gói "${target.name}".`);
    }
  };

  const handleDeletePlan = (planId: string) => {
    const target = plans.find((p) => p.id === planId);
    if (target?.active && botConfig.enabled) {
      onUpdateConfig({ enabled: false });
    }
    setPlans((prev) => prev.filter((p) => p.id !== planId));
  };

  const handleCopyTopPackage = (pkg: TopPackageItem) => {
    handleCreatePlan({
      name: pkg.name,
      strategy: pkg.strategy,
      strategyName: pkg.strategyName,
      method: pkg.method,
      baseAmount: pkg.baseAmount,
      takeProfit: pkg.takeProfit,
      stopLoss: pkg.stopLoss,
      maxSteps: pkg.maxSteps,
      accountMode,
      active: false,
      copiedFrom: pkg.shareCode,
    });
    setActiveTab('portfolio');
    setPortfolioSubTab('list');
  };

  const handleCopyTrader = (trader: DailyInvestorRank) => {
    handleCreatePlan({
      name: `Copy ${trader.username} (#${trader.rank})`,
      strategy: trader.strategy,
      strategyName: STRATEGY_KEY_TO_LABEL[trader.strategy],
      method: 'String Method',
      baseAmount: trader.baseAmount,
      takeProfit: 100,
      stopLoss: 50,
      maxSteps: 4,
      accountMode,
      active: false,
      copiedFrom: trader.username,
    });
    setActiveTab('portfolio');
    setPortfolioSubTab('list');
  };

  const handleActivateStrategyFromTable = (item: QuickInvestStrategyItem) => {
    onUpdateConfig({ strategy: item.strategyKey });
    handleCreatePlan({
      name: item.name,
      strategy: item.strategyKey,
      strategyName: item.name,
      method: item.method,
      baseAmount: botConfig.baseAmount,
      takeProfit: botConfig.takeProfit,
      stopLoss: botConfig.stopLoss,
      maxSteps: botConfig.maxSteps,
      accountMode,
      active: false,
    });
    setActiveTab('portfolio');
    setPortfolioSubTab('list');
  };

  const handleCreateCustomStrategy = (
    draft: Omit<QuickInvestStrategyItem, 'id' | 'createdAt' | 'winRateRef' | 'usersCount'>
  ) => {
    const created: QuickInvestStrategyItem = {
      ...draft,
      id: `qi_custom_strat_${Date.now()}`,
      winRateRef: 74.8,
      usersCount: 1,
      createdAt: formatCreatedStamp(),
    };
    setCustomStrategies((prev) => [created, ...prev]);
    showBanner(`Đã lưu chiến lược Bot AI "${created.name}".`);
  };

  const handleDeleteCustomStrategy = (id: string) => {
    setCustomStrategies((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCreateTimer = (draft: Omit<QuickInvestTimer, 'id' | 'createdAt'>) => {
    const created: QuickInvestTimer = {
      ...draft,
      id: `qi_timer_${Date.now()}`,
      createdAt: formatCreatedStamp(),
    };
    setTimers((prev) => [created, ...prev]);
    showBanner(`Đã thêm lịch hẹn giờ ${created.startTime} - ${created.endTime}.`);
  };

  const handleToggleTimer = (id: string) => {
    setTimers((prev) =>
      prev.map((tm) => (tm.id === id ? { ...tm, enabled: !tm.enabled } : tm))
    );
  };

  const handleDeleteTimer = (id: string) => {
    setTimers((prev) => prev.filter((tm) => tm.id !== id));
  };

  return (
    <div
      data-testid="quickinvest-root"
      className="min-h-[calc(100vh-56px)] bg-[#0C1120] text-slate-100 lg:min-h-0 lg:rounded-2xl lg:border lg:border-slate-800/80 lg:shadow-2xl"
    >
      {/* QuickInvest Persistent Header (Orbital QuickInvest Brand + Wallet + Desktop 5-Tab Rail) */}
      <QuickInvestHeader
        user={user}
        accountMode={accountMode}
        activeTab={activeTab}
        notifications={notifications}
        botEnabled={botConfig.enabled}
        onSelectTab={setActiveTab}
        onChangeAccountMode={onChangeAccountMode}
        onMarkNotificationsRead={onMarkNotificationsRead}
        onGoToProfile={() => onChangeSection('profile')}
      />

      {/* Action Confirmation Banner */}
      {bannerMsg && (
        <div
          role="status"
          className="mx-3.5 mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2.5 text-xs font-bold text-emerald-200 lg:mx-6"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{bannerMsg}</span>
        </div>
      )}

      {/* Active QuickInvest View */}
      {activeTab === 'discover' && (
        <QuickInvestDiscoverTab
          onCopyPackage={handleCopyTopPackage}
          onCopyTrader={handleCopyTrader}
        />
      )}

      {activeTab === 'portfolio' && (
        <QuickInvestPortfolioTab
          subTab={portfolioSubTab}
          onChangeSubTab={setPortfolioSubTab}
          accountMode={accountMode}
          orders={orders}
          botConfig={botConfig}
          cumulativePnl={cumulativePnl}
          stopReason={stopReason}
          plans={plans}
          timers={timers}
          strategies={allStrategies}
          onCreatePlan={handleCreatePlan}
          onTogglePlan={handleTogglePlan}
          onDeletePlan={handleDeletePlan}
          onUpdateRiskConfig={onUpdateConfig}
          onCreateTimer={handleCreateTimer}
          onToggleTimer={handleToggleTimer}
          onDeleteTimer={handleDeleteTimer}
        />
      )}

      {activeTab === 'signal' && (
        <QuickInvestSignalTab
          token={token}
          accountMode={accountMode}
          market={market}
          orders={orders}
          botLogs={botLogs}
          onBack={() => setActiveTab('discover')}
          onPlaceTrade={onPlaceTrade}
        />
      )}

      {activeTab === 'strategies' && (
        <QuickInvestStrategiesTab
          strategies={allStrategies}
          activeStrategy={botConfig.strategy}
          onActivateStrategy={handleActivateStrategyFromTable}
          onCreateStrategy={handleCreateCustomStrategy}
          onDeleteStrategy={handleDeleteCustomStrategy}
        />
      )}

      {activeTab === 'more' && (
        <div className="px-3.5 py-5 pb-24 lg:px-6 lg:py-6 lg:pb-8 space-y-5">
          {/* QuickInvest Live Bot Engine Master Switch Card */}
          <div className="rounded-2xl border border-slate-700/60 bg-[#151D30] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/20 text-[#7D78FF]">
                  <Bot className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="font-display text-base font-extrabold text-white">
                    Điều khiển nhanh QuickInvest Auto-Bot
                  </h2>
                  <p className="text-xs text-slate-400">
                    Chiến lược hiện tại:{' '}
                    <span className="font-bold text-slate-200">
                      {STRATEGY_KEY_TO_LABEL[botConfig.strategy]}
                    </span>{' '}
                    · Vốn ${botConfig.baseAmount} · TP +${botConfig.takeProfit} / SL -$
                    {botConfig.stopLoss}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onToggleBot}
                  className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white cursor-pointer ${
                    botConfig.enabled
                      ? 'bg-rose-500 hover:bg-rose-400'
                      : 'bg-[#169A6B] hover:bg-[#19AF7A]'
                  }`}
                >
                  {botConfig.enabled ? (
                    <>
                      <Pause className="h-4 w-4" />
                      <span>Dừng Bot</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>Khởi chạy Bot</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onResetStats}
                  aria-label="Đặt lại thống kê phiên Bot"
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-700 bg-[#101728] px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-[#0F1627] p-3.5 text-center">
              <div>
                <div className="text-[11px] text-slate-400">PnL Phiên Bot</div>
                <div
                  className={`mt-0.5 font-mono text-base font-extrabold tabular-nums ${
                    cumulativePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {cumulativePnl >= 0 ? '+' : '-'}${Math.abs(cumulativePnl).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Chuỗi thua hiện tại</div>
                <div className="mt-0.5 font-mono text-base font-extrabold text-white tabular-nums">
                  {consecutiveLosses} / {botConfig.maxSteps}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Gói trong danh mục</div>
                <div className="mt-0.5 font-mono text-base font-extrabold text-indigo-300 tabular-nums">
                  {plans.length}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts back to HitechTrade Workspace Modules */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => onChangeSection('trade')}
              className="flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-[#151D30] p-4 text-left hover:border-indigo-500/50 transition-colors cursor-pointer"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
                <Diamond className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-bold text-white">Sàn Giao Dịch</div>
                <div className="text-xs text-slate-400">Biểu đồ nến BTC/USDT</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChangeSection('wallet')}
              className="flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-[#151D30] p-4 text-left hover:border-indigo-500/50 transition-colors cursor-pointer"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-bold text-white">Ví & Nạp Rút</div>
                <div className="text-xs text-slate-400">Quản lý USDT Live / Demo</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChangeSection('orders')}
              className="flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-[#151D30] p-4 text-left hover:border-indigo-500/50 transition-colors cursor-pointer"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                <ArrowLeftRight className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-bold text-white">Lịch Sử Lệnh</div>
                <div className="text-xs text-slate-400">Tra cứu toàn bộ giao dịch</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChangeSection('profile')}
              className="flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-[#151D30] p-4 text-left hover:border-indigo-500/50 transition-colors cursor-pointer"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                <UserIcon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-bold text-white">Hồ Sơ & Bảo Mật</div>
                <div className="text-xs text-slate-400">KYC, 2FA & Cấp độ VIP</div>
              </div>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-[#12192B] p-4 flex items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                QuickInvest đồng bộ trực tiếp với thanh khoản HitechTrade BTC/USDT & bộ máy AI Dự Đoán.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('signal')}
              className="inline-flex items-center gap-1 font-bold text-indigo-300 hover:text-indigo-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Mở Tín hiệu AI</span>
            </button>
          </div>
        </div>
      )}

      {/* QuickInvest 5-Icon Mobile Bottom Navigation Bar */}
      <QuickInvestMobileBottomNav
        activeTab={activeTab}
        botEnabled={botConfig.enabled}
        onSelectTab={setActiveTab}
      />
    </div>
  );
};
