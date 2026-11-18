import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthDrawer, type AuthMode } from './components/AuthDrawer';
import { LandingPage } from './components/LandingPage';
import { WorkspaceShell, type WorkspaceSection } from './components/WorkspaceShell';
import { TradingTerminal } from './components/TradingTerminal';
import { TradingDashboardView } from './components/TradingDashboardView';
import { OrdersHistoryView } from './components/OrdersHistoryView';
import { PrizePoolView } from './components/PrizePoolView';
import { AIBotView } from './components/AIBotView';
import { WalletView } from './components/WalletView';
import { ProfileVipView } from './components/ProfileVipView';
import { AdminDashboard } from './components/AdminDashboard';
import { WinPopup } from './components/WinPopup';
import { computeNextBotOrder } from './lib/tradingEngine';
import type {
  AccountMode,
  AppNotification,
  BotConfig,
  BotLogEntry,
  Language,
  MarketSnapshot,
  TradeDirection,
  TradeOrder,
  UserAccount,
} from './types';

const TOKEN_KEY = 'hitechtrade_token';

export default function App() {
  const [lang, setLang] = useState<Language>('vi');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<UserAccount | null>(null);
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const [section, setSection] = useState<WorkspaceSection>('trade');
  const [walletModalTrigger, setWalletModalTrigger] = useState<{
    tab: 'deposit' | 'withdraw';
    seq: number;
  } | null>(null);
  const [accountMode, setAccountMode] = useState<AccountMode>('demo');

  const [market, setMarket] = useState<MarketSnapshot | null>(null);
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // AI Bot State
  const [botConfig, setBotConfig] = useState<BotConfig>({
    enabled: false,
    accountMode: 'demo',
    strategy: 'ai_predict',
    baseAmount: 10,
    takeProfit: 100,
    stopLoss: 50,
    maxSteps: 4,
  });
  const [botLogs, setBotLogs] = useState<BotLogEntry[]>([]);
  const [botPnl, setBotPnl] = useState(0);
  const [botConsecutiveLosses, setBotConsecutiveLosses] = useState(0);
  const [botStopReason, setBotStopReason] = useState<string | null>(null);

  const lastBotRoundRef = useRef<number | null>(null);
  const settledOrderIdsRef = useRef<Set<string>>(new Set());
  const ordersInitializedRef = useRef(false);
  const winTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lossTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [winPopup, setWinPopup] = useState<{ totalReturn: number; netProfit: number } | null>(null);
  const [toast, setToast] = useState<{ title: string; positive: boolean } | null>(null);

  useEffect(() => {
    return () => {
      if (winTimerRef.current) clearTimeout(winTimerRef.current);
      if (lossTimerRef.current) clearTimeout(lossTimerRef.current);
    };
  }, []);

  const syncAll = useCallback(async (activeToken: string | null) => {
    try {
      const headers: Record<string, string> = activeToken
        ? { Authorization: `Bearer ${activeToken}` }
        : {};
      const res = await fetch('/api/market/state', { headers });
      if (!res.ok) return;
      const data = await res.json();
      setMarket(data.market);
      if (data.user) {
        setUser(data.user);
      } else if (activeToken) {
        // Token expired or invalid
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
      if (Array.isArray(data.orders)) {
        if (!ordersInitializedRef.current) {
          data.orders.forEach((o: TradeOrder) => {
            if (o.status !== 'OPEN') settledOrderIdsRef.current.add(o.id);
          });
          ordersInitializedRef.current = true;
        }
        setOrders(data.orders);
      }
    } catch {
      // ignore transient network errors
    }
  }, []);

  const fetchNotifications = useCallback(async (activeToken: string | null) => {
    if (!activeToken) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      // ignore
    }
  }, []);

  // Poll live market & user state every 800ms
  useEffect(() => {
    syncAll(token);
    fetchNotifications(token);
    const marketInterval = setInterval(() => {
      syncAll(token);
    }, 800);
    const notifInterval = setInterval(() => {
      fetchNotifications(token);
    }, 3000);
    return () => {
      clearInterval(marketInterval);
      clearInterval(notifInterval);
    };
  }, [token, syncAll, fetchNotifications]);

  // Track settled orders to update AI Bot PnL & show 2s WinPopup on wins
  useEffect(() => {
    if (!token || !ordersInitializedRef.current) return;

    let wonTotalReturn = 0;
    let wonNetProfit = 0;
    let lastLostOrder: TradeOrder | null = null;

    orders.forEach((o) => {
      if (o.status !== 'OPEN' && !settledOrderIdsRef.current.has(o.id)) {
        settledOrderIdsRef.current.add(o.id);

        if (o.status === 'WON') {
          wonTotalReturn += o.amount + o.pnl;
          wonNetProfit += o.pnl;
        } else if (o.status === 'LOST') {
          lastLostOrder = o;
        }

        // Update AI Bot logs if matching
        setBotLogs((prev) =>
          prev.map((log) =>
            log.id === o.id
              ? { ...log, status: o.status, pnl: o.pnl }
              : log
          )
        );
        if (o.source === 'bot') {
          setBotPnl((p) => Number((p + o.pnl).toFixed(2)));
          setBotConsecutiveLosses((losses) =>
            o.status === 'WON' ? 0 : o.status === 'LOST' ? losses + 1 : losses
          );
        }
      }
    });

    if (wonNetProfit > 0) {
      if (winTimerRef.current) clearTimeout(winTimerRef.current);
      setToast(null);
      setWinPopup({
        totalReturn: Number(wonTotalReturn.toFixed(2)),
        netProfit: Number(wonNetProfit.toFixed(2)),
      });
      winTimerRef.current = setTimeout(() => {
        setWinPopup(null);
      }, 2000);
    } else if (lastLostOrder) {
      const lost = lastLostOrder as TradeOrder;
      if (lossTimerRef.current) clearTimeout(lossTimerRef.current);
      setToast({
        title: `Thua -$${lost.amount.toFixed(2)} (${lost.pair})`,
        positive: false,
      });
      lossTimerRef.current = setTimeout(() => {
        setToast(null);
      }, 2500);
    }
  }, [orders]);

  // Automated AI Bot Execution Engine
  useEffect(() => {
    if (!botConfig.enabled || !token || !user || !market) return;
    if (market.phase !== 'betting') return;
    if (lastBotRoundRef.current === market.roundId) return;

    lastBotRoundRef.current = market.roundId;

    const decision = computeNextBotOrder(
      botConfig,
      market.candles,
      botConsecutiveLosses,
      botPnl
    );

    if (!decision.shouldTrade) {
      setBotConfig((cfg) => ({ ...cfg, enabled: false }));
      setBotStopReason(decision.stopReason || 'Bot đã dừng theo giới hạn.');
      return;
    }

    const avail = botConfig.accountMode === 'live' ? user.liveBalance : user.demoBalance;
    if (decision.amount > avail) {
      setBotConfig((cfg) => ({ ...cfg, enabled: false }));
      setBotStopReason(
        `Số dư ${botConfig.accountMode.toUpperCase()} không đủ ($${decision.amount.toFixed(2)}). Bot đã tự động dừng.`
      );
      return;
    }

    fetch('/api/trades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        direction: decision.direction,
        amount: decision.amount,
        accountMode: botConfig.accountMode,
        source: 'bot',
      }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) {
          setBotConfig((cfg) => ({ ...cfg, enabled: false }));
          setBotStopReason(d.error || 'Bot không thể vào lệnh.');
          return;
        }
        if (d.user) setUser(d.user);
        if (d.order) {
          setOrders((prev) => [d.order, ...prev]);
          setBotLogs((prev) => [
            {
              id: d.order.id,
              roundId: market.roundId,
              strategy: botConfig.strategy,
              direction: decision.direction,
              amount: decision.amount,
              reason: decision.reason,
              status: 'OPEN',
              pnl: 0,
              timestamp: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      })
      .catch(() => {});
  }, [botConfig, token, user, market, botConsecutiveLosses, botPnl]);

  const handleAuthSuccess = (newToken: string, newUser: UserAccount) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    settledOrderIdsRef.current.clear();
    ordersInitializedRef.current = false;
    setToken(newToken);
    setUser(newUser);
    setAuthDrawerOpen(false);
    setSection(newUser.role === 'admin' ? 'admin' : 'trade');
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    settledOrderIdsRef.current.clear();
    ordersInitializedRef.current = false;
    setToken(null);
    setUser(null);
    setOrders([]);
    setWinPopup(null);
    setBotConfig((c) => ({ ...c, enabled: false }));
    setSection('trade');
  };

  const handlePlaceTrade = async (
    direction: TradeDirection,
    amount: number,
    modeOverride?: AccountMode
  ) => {
    if (!token) throw new Error('Vui lòng đăng nhập.');
    const res = await fetch('/api/trades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        direction,
        amount,
        accountMode: modeOverride ?? accountMode,
        source: 'manual',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Không thể đặt lệnh.');
    if (data.user) setUser(data.user);
    if (data.order) setOrders((prev) => [data.order, ...prev]);
  };

  const handleResetDemo = async () => {
    if (!token) return;
    const res = await fetch('/api/account/reset-demo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok && data.user) setUser(data.user);
  };

  const handleMarkNotificationsRead = async () => {
    if (!token) return;
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Logged-out view: Kaizenfin-cloned HitechTrade Landing Page + Slide-over Auth Drawer
  if (!token || !user) {
    return (
      <>
        <LandingPage
          lang={lang}
          onChangeLang={setLang}
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setAuthDrawerOpen(true);
          }}
        />
        <AuthDrawer
          open={authDrawerOpen}
          mode={authMode}
          lang={lang}
          onClose={() => setAuthDrawerOpen(false)}
          onSwitchMode={setAuthMode}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  // Logged-in Workspace
  return (
    <>
      <WorkspaceShell
        user={user}
        market={
          market ?? {
            pair: 'BTC/USDT',
            currentPrice: 95180,
            open24h: 95000,
            high24h: 95300,
            low24h: 94900,
            change24hPct: 0.19,
            roundId: 1,
            phase: 'betting',
            secondsRemaining: 30,
            candles: [],
            lastResults: [],
            prizePool: 27680,
            payoutRate: 0.95,
            sentimentBuyPct: 52,
            sentimentSellPct: 48,
            maintenanceMode: false,
            depositWalletAddress: '',
          }
        }
        accountMode={accountMode}
        section={section}
        lang={lang}
        notifications={notifications}
        botRunning={botConfig.enabled}
        onChangeSection={setSection}
        onChangeAccountMode={setAccountMode}
        onQuickDeposit={() => {
          setWalletModalTrigger((prev) => ({
            tab: 'deposit',
            seq: (prev?.seq ?? 0) + 1,
          }));
          setSection('wallet');
        }}
        onResetDemo={handleResetDemo}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onChangeLang={setLang}
        onLogout={handleLogout}
      >
        {section === 'trade' && market && (
          <TradingTerminal
            market={market}
            user={user}
            accountMode={accountMode}
            orders={orders}
            lang={lang}
            onPlaceTrade={handlePlaceTrade}
            onGoToBot={() => setSection('bot')}
            onGoToOrders={() => setSection('orders')}
          />
        )}

        {section === 'dashboard' && (
          <TradingDashboardView
            lang={lang}
            accountMode={accountMode}
            orders={orders}
            hideSensitiveData={Boolean(user.hideSensitiveData)}
          />
        )}

        {section === 'orders' && (
          <OrdersHistoryView
            lang={lang}
            accountMode={accountMode}
            orders={orders}
            onBackToTrade={() => setSection('trade')}
          />
        )}

        {section === 'prizepool' && market && (
          <PrizePoolView
            lang={lang}
            market={market}
            orders={orders}
            onGoToTrade={() => setSection('trade')}
          />
        )}

        {section === 'bot' && market && (
          <AIBotView
            lang={lang}
            token={token}
            user={user}
            market={market}
            orders={orders}
            notifications={notifications}
            accountMode={accountMode}
            botConfig={botConfig}
            botLogs={botLogs}
            cumulativePnl={botPnl}
            consecutiveLosses={botConsecutiveLosses}
            stopReason={botStopReason}
            onChangeAccountMode={(mode) => {
              setAccountMode(mode);
              setBotConfig((prev) => ({ ...prev, accountMode: mode }));
            }}
            onChangeSection={setSection}
            onMarkNotificationsRead={handleMarkNotificationsRead}
            onUpdateConfig={(patch) => setBotConfig((prev) => ({ ...prev, ...patch }))}
            onToggleBot={() => {
              setBotStopReason(null);
              lastBotRoundRef.current = null;
              setBotConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
            }}
            onResetStats={() => {
              setBotPnl(0);
              setBotConsecutiveLosses(0);
              setBotLogs([]);
              setBotStopReason(null);
            }}
            onPlaceTrade={handlePlaceTrade}
          />
        )}

        {section === 'wallet' && (
          <WalletView
            lang={lang}
            user={user}
            token={token}
            depositWalletAddress={market?.depositWalletAddress}
            modalTrigger={walletModalTrigger}
            onUserUpdated={setUser}
            onResetDemo={handleResetDemo}
            onGoToProfile={() => setSection('profile')}
            onGoToTrade={() => setSection('trade')}
          />
        )}

        {(section === 'vip' || section === 'profile') && (
          <ProfileVipView
            lang={lang}
            user={user}
            token={token}
            mode={section === 'vip' ? 'vip' : 'profile'}
            onUserUpdated={setUser}
          />
        )}

        {section === 'admin' && user.role === 'admin' && (
          <AdminDashboard
            lang={lang}
            token={token}
            onSyncSelfUser={() => syncAll(token)}
          />
        )}
      </WorkspaceShell>

      <WinPopup
        open={Boolean(winPopup)}
        totalReturn={winPopup?.totalReturn ?? 0}
        netProfit={winPopup?.netProfit ?? 0}
        lang={lang}
      />

      {toast && (
        <div
          role="status"
          className={`fixed bottom-20 right-5 z-50 rounded-xl border px-4 py-3 text-xs font-extrabold shadow-2xl lg:bottom-6 ${
            toast.positive
              ? 'border-[#00D4AA]/50 bg-[#081c1a] text-[#00D4AA]'
              : 'border-rose-500/50 bg-[#1c0a12] text-rose-300'
          }`}
        >
          {toast.title}
        </div>
      )}
    </>
  );
}
