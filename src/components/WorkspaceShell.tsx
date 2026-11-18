import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Award,
  Bell,
  Bot,
  ChevronDown,
  Diamond,
  Gauge,
  Globe,
  LogOut,
  Mail,
  Rocket,
  RotateCcw,
  Settings,
  Share2,
  Shield,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { COPY } from '../lib/i18n';
import type {
  AccountMode,
  AppNotification,
  Language,
  MarketSnapshot,
  UserAccount,
} from '../types';

export type WorkspaceSection =
  | 'trade'
  | 'dashboard'
  | 'orders'
  | 'prizepool'
  | 'bot'
  | 'wallet'
  | 'vip'
  | 'profile'
  | 'admin';

interface WorkspaceShellProps {
  user: UserAccount;
  market: MarketSnapshot;
  accountMode: AccountMode;
  section: WorkspaceSection;
  lang: Language;
  notifications: AppNotification[];
  botRunning: boolean;
  onChangeSection: (section: WorkspaceSection) => void;
  onChangeAccountMode: (mode: AccountMode) => void;
  onQuickDeposit: () => void;
  onResetDemo: () => void;
  onMarkNotificationsRead: () => void;
  onChangeLang: (lang: Language) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

interface NavCardItem {
  id: WorkspaceSection | 'settings';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: 'new' | 'bot_on';
  avatarStyle?: boolean;
  hidden?: boolean;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  user,
  market,
  accountMode,
  section,
  lang,
  notifications,
  botRunning,
  onChangeSection,
  onChangeAccountMode,
  onQuickDeposit,
  onResetDemo,
  onMarkNotificationsRead,
  onChangeLang,
  onLogout,
  children,
}) => {
  const [acctMenuOpen, setAcctMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const t = COPY[lang];
  const isVi = lang === 'vi';
  const unreadCount = notifications.filter((n) => !n.read).length;
  const activeBalance = accountMode === 'live' ? user.liveBalance : user.demoBalance;

  const earnItems: NavCardItem[] = [
    { id: 'trade', label: isVi ? 'Giao Dịch' : 'Trade', icon: Diamond },
    {
      id: 'bot',
      label: isVi ? 'QuickInvest Bot' : 'QuickInvest Bot',
      icon: Bot,
      badge: botRunning ? 'bot_on' : undefined,
    },
    { id: 'vip', label: isVi ? 'Thành Viên VIP' : 'VIP Member', icon: Share2 },
    { id: 'prizepool', label: 'Streak Challenge', icon: Rocket, badge: 'new' },
  ];

  const profileItems: NavCardItem[] = [
    { id: 'profile', label: user.nickname, icon: UserIcon, avatarStyle: true },
    { id: 'dashboard', label: isVi ? 'Bảng Điều Khiển' : 'Dashboard', icon: Gauge },
    { id: 'orders', label: isVi ? 'Lệnh' : 'Orders', icon: ArrowLeftRight },
    { id: 'wallet', label: isVi ? 'Ví' : 'Wallet', icon: Wallet },
    {
      id: 'admin',
      label: isVi ? 'Quản trị Admin' : 'Admin Console',
      icon: Shield,
      hidden: user.role !== 'admin',
    },
  ];

  const helpItems: NavCardItem[] = [
    { id: 'settings', label: isVi ? 'Cài đặt' : 'Settings', icon: Settings },
  ];

  const handleSelectNav = (target: WorkspaceSection | 'settings') => {
    setMobileMenuOpen(false);
    if (target === 'settings') {
      setSettingsOpen(true);
      return;
    }
    onChangeSection(target);
  };

  const renderGroupedNavigation = (showTopLogo: boolean) => (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-5 pt-4">
      {showTopLogo && (
        <div className="relative mb-5 flex items-center justify-center pt-1">
          <button
            type="button"
            onClick={() => handleSelectNav('trade')}
            className="cursor-pointer"
          >
            <BrandLogo size="sm" />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Đóng menu"
            className="absolute right-0 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/70 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Primary Azure-Blue Deposit Button matching IMG_0077 */}
      <button
        type="button"
        onClick={() => {
          onQuickDeposit();
          setMobileMenuOpen(false);
        }}
        className="w-full rounded-lg bg-gradient-to-r from-[#289BF8] to-[#1D84E8] py-2.5 text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-opacity hover:opacity-95 cursor-pointer"
      >
        {isVi ? 'Nạp tiền' : 'Deposit'}
      </button>

      {/* Group 1: Kiếm tiền */}
      <div className="mt-5">
        <div className="mb-2.5 text-xs font-bold text-slate-100">
          {isVi ? 'Kiếm tiền' : 'Earn'}
        </div>
        <div className="space-y-2">
          {earnItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-[#289BF8] to-[#1D84E8] text-white shadow-md shadow-sky-500/20'
                    : 'bg-[#1c2135] text-slate-100 hover:bg-[#242b44]'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 ${
                      item.id === 'prizepool' && !active ? 'text-indigo-300' : 'text-white'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>

                {item.badge === 'new' && (
                  <span className="inline-flex items-center rounded bg-gradient-to-r from-rose-600 to-orange-500 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-white uppercase shrink-0">
                    NEW
                  </span>
                )}
                {item.badge === 'bot_on' && (
                  <span className="font-mono text-[10px] font-extrabold text-[#00D4AA] shrink-0">
                    ON
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Group 2: Quản lý hồ sơ */}
      <div className="mt-6">
        <div className="mb-2.5 text-xs font-bold text-slate-100">
          {isVi ? 'Quản lý hồ sơ' : 'Profile Management'}
        </div>
        <div className="space-y-2">
          {profileItems
            .filter((i) => !i.hidden)
            .map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNav(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-[#289BF8] to-[#1D84E8] text-white shadow-md shadow-sky-500/20'
                      : 'bg-[#1c2135] text-slate-100 hover:bg-[#242b44]'
                  }`}
                >
                  {item.avatarStyle ? (
                    user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.nickname}
                        className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-white/25"
                      />
                    ) : (
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          active ? 'bg-white/25 text-white' : 'bg-slate-400/80 text-[#1c2135]'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                    )
                  ) : (
                    <Icon className="h-4.5 w-4.5 shrink-0 text-white" />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Group 3: Cài đặt & Trợ giúp */}
      <div className="mt-6">
        <div className="mb-2.5 text-xs font-bold text-slate-100">
          {isVi ? 'Cài đặt & Trợ giúp' : 'Settings & Help'}
        </div>
        <div className="space-y-2">
          {helpItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className="flex w-full items-center gap-3 rounded-lg bg-[#1c2135] px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-[#242b44] cursor-pointer"
              >
                <Icon className="h-4.5 w-4.5 shrink-0 text-white" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col">
      {/* Top Bar — Exact Kaizenfin Mobile Bar (< lg) & Full Desktop Bar (>= lg) */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0b1021]/95 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 px-3 py-2 lg:gap-4 lg:px-6 lg:py-2.5">
          {/* Left: Mobile Hamburger (Kaizenfin 3-bar icon) + Desktop BrandLogo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(true);
                setAcctMenuOpen(false);
                setNotifOpen(false);
              }}
              aria-label="Mở menu điều hướng"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-slate-800/70 cursor-pointer lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="2.4" rx="1.2" fill="currentColor" />
                <rect x="3" y="11" width="14" height="2.4" rx="1.2" fill="currentColor" />
                <rect x="3" y="17" width="10" height="2.4" rx="1.2" fill="currentColor" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => onChangeSection('trade')}
              className="hidden lg:inline-flex cursor-pointer"
            >
              <BrandLogo size="sm" />
            </button>
          </div>

          {/* Center & Right Controls */}
          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3 min-w-0">
            {/* Clickable Prize Pool Button (Opens Prize Pool / Streak Challenge on BOTH Mobile & Desktop) */}
            <button
              type="button"
              onClick={() => {
                onChangeSection('prizepool');
                setAcctMenuOpen(false);
                setNotifOpen(false);
                setMobileMenuOpen(false);
              }}
              aria-label="Mở Prize Pool Streak Challenge"
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 sm:px-3 sm:py-1.5 text-left transition-all shrink-0 cursor-pointer hover:brightness-110 active:scale-[0.98] ${
                section === 'prizepool'
                  ? 'border-amber-300/80 bg-gradient-to-r from-[#3b2f8c] via-[#4c2ea3] to-[#6431c4] shadow-[0_0_22px_rgba(251,191,36,0.3)]'
                  : 'border-indigo-400/35 bg-gradient-to-r from-[#2c2570] via-[#3a2887] to-[#4f2da8] shadow-[0_0_16px_rgba(99,102,241,0.22)]'
              }`}
            >
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md bg-amber-400/20 border border-amber-300/40 shrink-0">
                <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-300" />
              </div>
              <div className="leading-tight">
                <div className="text-[9px] sm:text-[10px] font-medium text-indigo-100/90 whitespace-nowrap">
                  Prize Pool
                </div>
                <div className="font-mono text-xs sm:text-sm font-extrabold text-amber-300 whitespace-nowrap tabular-nums">
                  ${(market.prizePool / 1000).toFixed(1)}k
                </div>
              </div>
            </button>

            {/* Live / Demo Account Switcher */}
            <div className="relative min-w-0">
              <button
                type="button"
                onClick={() => {
                  setAcctMenuOpen((o) => !o);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-slate-700/70 bg-[#192034] px-2.5 py-1 sm:px-3 sm:py-1.5 text-left transition-colors hover:border-slate-500 cursor-pointer"
              >
                <div className="leading-tight min-w-0">
                  <div className="text-[9px] sm:text-[10px] text-slate-300 whitespace-nowrap">
                    {accountMode === 'live' ? t.liveAccount : t.demoAccount}
                  </div>
                  <div
                    data-testid="active-balance-display"
                    className={`font-mono text-xs sm:text-sm font-extrabold whitespace-nowrap tabular-nums ${
                      accountMode === 'live' ? 'text-white' : 'text-[#00D4AA]'
                    }`}
                  >
                    ${activeBalance.toLocaleString('en-US', {
                      minimumFractionDigits: activeBalance % 1 === 0 ? 0 : 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700/80 text-slate-200 shrink-0">
                  <ChevronDown className="h-3.5 w-3.5" />
                </span>
              </button>

              {acctMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-700 bg-[#0d1326] p-2 shadow-2xl z-50">
                  <button
                    type="button"
                    onClick={() => {
                      onChangeAccountMode('live');
                      setAcctMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      accountMode === 'live' ? 'bg-[#00D4AA]/15 text-white' : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{t.liveAccount}</div>
                      <div className="text-[11px] text-slate-400">USDT</div>
                    </div>
                    <span className="font-mono text-sm font-extrabold text-[#00D4AA]">
                      ${user.liveBalance.toFixed(2)}
                    </span>
                  </button>

                  <div className="mt-1 flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-800/60">
                    <button
                      type="button"
                      onClick={() => {
                        onChangeAccountMode('demo');
                        setAcctMenuOpen(false);
                      }}
                      className="flex-1 text-left cursor-pointer"
                    >
                      <div className="text-xs font-bold text-white">{t.demoAccount}</div>
                      <div className="font-mono text-sm font-extrabold text-sky-400">
                        ${user.demoBalance.toFixed(2)}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onResetDemo();
                        setAcctMenuOpen(false);
                      }}
                      title="Đặt lại $1,000 Demo"
                      aria-label="Đặt lại $1,000 Demo"
                      className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Deposit Button (Desktop top bar) */}
            <button
              type="button"
              onClick={onQuickDeposit}
              className="hidden lg:inline-flex rounded-lg bg-gradient-to-r from-[#289BF8] to-[#1D84E8] px-3.5 py-2 text-xs font-extrabold text-white whitespace-nowrap shrink-0 cursor-pointer hover:opacity-95"
            >
              {isVi ? 'Nạp tiền' : t.quickDeposit}
            </button>

            {/* Notifications Bell */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setAcctMenuOpen(false);
                  if (!notifOpen && unreadCount > 0) onMarkNotificationsRead();
                }}
                aria-label="Thông báo"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 hover:bg-slate-800/70 hover:text-white lg:border lg:border-slate-700/70 lg:bg-[#131a30] cursor-pointer"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 font-mono text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl border border-slate-700 bg-[#0d1326] p-3 shadow-2xl z-50">
                  <div className="border-b border-slate-800 pb-2 text-xs font-bold text-white">
                    {isVi ? 'Thông báo gần đây' : 'Recent Notifications'}
                  </div>
                  <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">Không có thông báo</div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div key={n.id} className="rounded-lg bg-[#080c17] p-2.5 text-xs">
                          <div className="font-bold text-slate-100">{n.title}</div>
                          <div className="mt-0.5 text-[11px] text-slate-400">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Language Toggle (Desktop) */}
            <button
              type="button"
              onClick={() => onChangeLang(isVi ? 'en' : 'vi')}
              aria-label="Chuyển ngôn ngữ"
              className="hidden lg:inline-flex h-9 items-center gap-1 rounded-lg border border-slate-700/70 bg-[#131a30] px-2.5 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5 text-[#00D4AA]" />
              <span>{lang.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Navigation Drawer matching IMG_0077 */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[300px] max-w-[82vw] flex-col border-r border-slate-800/80 bg-[#111521] shadow-2xl">
            {renderGroupedNavigation(true)}
          </aside>
        </div>
      )}

      {/* Settings & Help Dialog (triggered by "Cài đặt") */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={isVi ? 'Cài đặt & Trợ giúp' : 'Settings & Help'}
        >
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setSettingsOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-[#111524] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <Settings className="h-5 w-5 text-sky-400" />
                <h2 className="font-display text-lg font-bold text-white">
                  {isVi ? 'Cài đặt & Trợ giúp' : 'Settings & Help'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Đóng cài đặt"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* Language Selector */}
              <div className="flex items-center justify-between rounded-xl bg-[#191f33] px-4 py-3">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
                  <Globe className="h-4 w-4 text-[#00D4AA]" />
                  <span>{isVi ? 'Ngôn ngữ hiển thị' : 'Display Language'}</span>
                </div>
                <div className="inline-flex rounded-lg bg-[#0d1222] p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => onChangeLang('vi')}
                    className={`rounded-md px-2.5 py-1 cursor-pointer ${
                      isVi ? 'bg-[#289BF8] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    VI
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeLang('en')}
                    className={`rounded-md px-2.5 py-1 cursor-pointer ${
                      !isVi ? 'bg-[#289BF8] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>

              {/* Reset Demo Balance */}
              <button
                type="button"
                onClick={() => {
                  onResetDemo();
                  setSettingsOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl bg-[#191f33] px-4 py-3 text-left text-sm font-semibold text-white hover:bg-[#222a44] cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <RotateCcw className="h-4 w-4 text-sky-400" />
                  <span>{isVi ? 'Đặt lại vốn Demo $1,000' : 'Reset $1,000 Demo Balance'}</span>
                </span>
                <span className="font-mono text-xs text-[#00D4AA]">${user.demoBalance.toFixed(2)}</span>
              </button>

              {/* Profile & 2FA Shortcut */}
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  onChangeSection('profile');
                }}
                className="flex w-full items-center justify-between rounded-xl bg-[#191f33] px-4 py-3 text-left text-sm font-semibold text-white hover:bg-[#222a44] cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <span>{isVi ? 'Bảo mật 2FA & Xác minh KYC' : '2FA Security & KYC Verification'}</span>
                </span>
                <span className="text-xs text-slate-400">
                  {user.twoFactorEnabled ? '2FA ON' : '2FA OFF'}
                </span>
              </button>

              {/* Support Contact */}
              <a
                href="mailto:support@hitechtrade.io"
                className="flex w-full items-center justify-between rounded-xl bg-[#191f33] px-4 py-3 text-sm font-semibold text-white hover:bg-[#222a44]"
              >
                <span className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-amber-300" />
                  <span>{isVi ? 'Hỗ trợ trực tuyến 24/7' : '24/7 Support Center'}</span>
                </span>
                <span className="font-mono text-[11px] text-sky-400">support@hitechtrade.io</span>
              </a>

              {/* Logout */}
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  onLogout();
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/35 bg-rose-500/10 py-3 text-sm font-bold text-rose-400 hover:bg-rose-500/20 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>{t.navLogout}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Desktop Left Navigation Rail matching IMG_0077 */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-800/80 bg-[#111521]">
          {renderGroupedNavigation(false)}
        </aside>

        {/* Active Viewport Content — Full-bleed on mobile for Trade, Wallet, and QuickInvest Bot views */}
        <main
          className={`relative flex-1 overflow-x-hidden ${
            section === 'trade' || section === 'wallet' || section === 'bot'
              ? 'p-0 lg:p-5'
              : 'p-3.5 pb-6 lg:p-6'
          }`}
        >
          {/* Global Background Watermark Layer (cached SVG tile for zero-jank repaints) */}
          <div
            aria-hidden="true"
            data-testid="workspace-watermark"
            className="pointer-events-none select-none absolute inset-0 z-0 opacity-[0.065]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='380' height='210' viewBox='0 0 380 210'%3E%3Cg transform='rotate(-20 190 105)'%3E%3Cg transform='translate(68 78) scale(0.56)'%3E%3Cpath d='M4 37.5C13 44.5 34 45.5 52 38.5C37 42 18 41 11 35.5L17.5 13H10.5L4 37.5Z' fill='%2338BDF8'/%3E%3Cpath d='M14.5 11H22.5L17.2 35H9.2L14.5 11Z' fill='%2338BDF8'/%3E%3Cpath d='M17.5 21.5L36.5 18.5L34.8 25.5L15.8 27.5L17.5 21.5Z' fill='%2300D4AA'/%3E%3Cpath d='M35.5 9L45.5 6.5L37.8 35H29.8L35.5 9Z' fill='%2338BDF8'/%3E%3C/g%3E%3Cg transform='translate(106 99) skewX(-11)'%3E%3Ctext x='0' y='0' font-family='Inter,Arial,sans-serif' font-weight='800' font-size='19' letter-spacing='1.2' fill='%23E2E8F0'%3EHITECH%3C/text%3E%3Ctext x='80' y='0' font-family='Inter,Arial,sans-serif' font-weight='800' font-size='19' letter-spacing='1.2' fill='%2300D4AA'%3ETRADE%3C/text%3E%3C/g%3E%3Cline x1='104' y1='106' x2='256' y2='106' stroke='%2338BDF8' stroke-width='1.1' stroke-opacity='0.7'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '380px 210px',
            }}
          />

          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  );
};
