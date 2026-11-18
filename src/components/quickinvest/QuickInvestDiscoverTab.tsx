import React, { useState } from 'react';
import { Crown, Info, Lock, Sparkles, User as UserIcon } from 'lucide-react';
import {
  QUICKINVEST_DAILY_LEADERBOARD,
  QUICKINVEST_TOP_PACKAGES,
  type DailyInvestorRank,
  type TopPackageItem,
} from './quickInvestData';

interface QuickInvestDiscoverTabProps {
  onCopyPackage: (pkg: TopPackageItem) => void;
  onCopyTrader: (trader: DailyInvestorRank) => void;
}

const MedalRibbon: React.FC<{ rank: 1 | 2 | 3 }> = ({ rank }) => {
  const palette =
    rank === 1
      ? { outer: '#FDE68A', inner: '#F59E0B', rim: '#FFFBEB', text: '#92400E', ribbon: '#FB923C' }
      : rank === 2
      ? { outer: '#E2E8F0', inner: '#94A3B8', rim: '#F8FAFC', text: '#1E293B', ribbon: '#64748B' }
      : { outer: '#FED7AA', inner: '#D97706', rim: '#FFF7ED', text: '#7C2D12', ribbon: '#EA580C' };

  return (
    <div className="mx-auto flex h-12 w-12 items-center justify-center">
      <svg viewBox="0 0 48 52" className="h-12 w-12 drop-shadow-md" aria-hidden="true">
        <path d="M16 32L12 49L20 44L23 48L24 34Z" fill={palette.ribbon} />
        <path d="M32 32L36 49L28 44L25 48L24 34Z" fill={palette.outer} />
        <circle cx="24" cy="21" r="16" fill={palette.outer} stroke={palette.rim} strokeWidth="2.5" />
        <circle cx="24" cy="21" r="12" fill={palette.inner} />
        <text
          x="24"
          y="26"
          textAnchor="middle"
          fontSize="14"
          fontWeight="900"
          fill="#FFFFFF"
          fontFamily="sans-serif"
        >
          {rank}
        </text>
      </svg>
    </div>
  );
};

export const QuickInvestDiscoverTab: React.FC<QuickInvestDiscoverTabProps> = ({
  onCopyPackage,
  onCopyTrader,
}) => {
  const [infoOpen, setInfoOpen] = useState(false);

  const topThree = QUICKINVEST_DAILY_LEADERBOARD.slice(0, 3);
  const restRanks = QUICKINVEST_DAILY_LEADERBOARD.slice(3);

  const getPackageGradient = (rank: 1 | 2 | 3) => {
    if (rank === 1) return 'from-[#F9BC37] via-[#F2AE26] to-[#E59716]';
    if (rank === 2) return 'from-[#6C7493] via-[#59617E] to-[#464D69]';
    return 'from-[#22A88A] via-[#1B8E78] to-[#157263]';
  };

  const getTopRankCardStyle = (tier?: 'silver' | 'gold' | 'emerald') => {
    if (tier === 'silver') {
      return 'bg-gradient-to-r from-[#2D3549] via-[#545D72] to-[#747B8C] border-slate-500/40';
    }
    if (tier === 'gold') {
      return 'bg-gradient-to-r from-[#45351A] via-[#7A5B22] to-[#98742D] border-amber-400/40';
    }
    return 'bg-gradient-to-r from-[#1A584F] via-[#268B78] to-[#34AC95] border-emerald-400/40';
  };

  return (
    <div className="space-y-7 px-3.5 py-5 pb-24 lg:px-6 lg:py-6 lg:pb-8">
      {/* Section 1: Gói hiệu quả hàng đầu (matches IMG_0088) */}
      <section aria-labelledby="qi-top-packages-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1
              id="qi-top-packages-heading"
              className="font-display text-2xl sm:text-[26px] font-extrabold tracking-tight bg-gradient-to-r from-[#F9D976] via-[#F39F86] to-[#A77BF3] bg-clip-text text-transparent"
            >
              Gói hiệu quả hàng đầu
            </h1>
            <Sparkles className="h-5 w-5 text-[#7B74FF] shrink-0" />
          </div>
          <span className="hidden sm:inline-flex text-xs font-semibold text-slate-400">
            Cập nhật trực tiếp 24h · QuickInvest
          </span>
        </div>

        {/* Mobile horizontal snap cards -> Desktop 3-column grid */}
        <div className="flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          {QUICKINVEST_TOP_PACKAGES.map((pkg) => (
            <article
              key={pkg.id}
              data-testid={`top-package-card-${pkg.rank}`}
              className="w-[268px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-700/60 bg-[#080B14] shadow-xl lg:w-auto flex flex-col"
            >
              <div
                className={`bg-gradient-to-b ${getPackageGradient(
                  pkg.rank
                )} px-4 pt-5 pb-5 text-center flex-1 flex flex-col justify-between`}
              >
                <MedalRibbon rank={pkg.rank} />
                <h2 className="mt-2.5 text-sm sm:text-[15px] font-extrabold tracking-wide text-white uppercase leading-snug drop-shadow-xs">
                  {pkg.name}
                </h2>
                <div className="mt-2.5 text-xs font-semibold text-slate-100/95">
                  <span>PnL 24h </span>
                  <span
                    className={`font-mono font-extrabold ${
                      pkg.rank === 1
                        ? 'text-[#146C2E]'
                        : pkg.rank === 2
                        ? 'text-[#4ADE80]'
                        : 'text-[#FEF08A]'
                    }`}
                  >
                    ({pkg.pnl24hPct})
                  </span>
                </div>
                <div className="mt-1 font-mono text-2xl font-black tracking-tight text-white tabular-nums">
                  {pkg.pnl24hUsd}
                </div>
              </div>

              <div className="bg-[#080B14] p-3.5">
                <button
                  type="button"
                  onClick={() => onCopyPackage(pkg)}
                  className="w-full min-h-[44px] rounded-xl bg-[#5F61F2] hover:bg-[#5254E6] active:scale-[0.99] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  Sao chép gói
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Section 2: Bảng xếp hạng nhà đầu tư hàng ngày (matches IMG_0088) */}
      <section aria-labelledby="qi-daily-ranking-heading">
        <div className="mb-4 flex items-center gap-2 relative">
          <h2
            id="qi-daily-ranking-heading"
            className="font-display text-2xl sm:text-[26px] font-extrabold leading-tight tracking-tight bg-gradient-to-r from-[#F9D976] via-[#E891D5] to-[#8F88FF] bg-clip-text text-transparent"
          >
            Bảng xếp hạng nhà đầu tư hàng ngày
          </h2>
          <button
            type="button"
            onClick={() => setInfoOpen((o) => !o)}
            aria-label="Thông tin bảng xếp hạng"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800/70 hover:text-white cursor-pointer shrink-0"
          >
            <Info className="h-4.5 w-4.5" />
          </button>

          {infoOpen && (
            <div className="absolute left-0 top-full mt-2 z-20 max-w-sm rounded-xl border border-slate-700 bg-[#131b30] p-3 text-xs text-slate-300 shadow-2xl">
              Xếp hạng tỷ suất lợi nhuận 24h của các nhà đầu tư sử dụng chiến lược QuickInvest Bot. Nhấn vào tài khoản công khai để sao chép cấu hình chiến lược.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
          {/* Top 3 Highlighted Gradient Cards */}
          <div className="space-y-3 lg:col-span-5">
            {topThree.map((entry) => (
              <button
                key={`top-${entry.rank}`}
                type="button"
                onClick={() => onCopyTrader(entry)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-transform hover:brightness-105 active:scale-[0.99] cursor-pointer ${getTopRankCardStyle(
                  entry.tier
                )}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1C2333]/85 border border-white/15 text-slate-200">
                    {entry.crown && (
                      <Crown className="absolute -top-3.5 left-1/2 h-5 w-5 -translate-x-1/2 fill-amber-400 text-amber-300 drop-shadow" />
                    )}
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-white">
                      {entry.username}
                    </div>
                    <div className="text-xs font-medium text-slate-200/80">Pnl 24h</div>
                  </div>
                </div>
                <div className="font-mono text-xl font-black text-white tabular-nums shrink-0">
                  {entry.pnlPctLabel}
                </div>
              </button>
            ))}
          </div>

          {/* Ranks #4 to #13 Clean Rows */}
          <div className="space-y-2 lg:col-span-7">
            {restRanks.map((entry) => (
              <div
                key={`rank-${entry.rank}`}
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-[#141B2E] px-3.5 py-2.5 transition-colors hover:border-slate-700"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 font-mono text-xs font-bold text-slate-400 tabular-nums shrink-0">
                    #{entry.rank}
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1E263D] border border-slate-700/60 text-slate-300">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate text-sm font-semibold text-slate-100">
                      {entry.username}
                    </span>
                    {entry.locked && (
                      <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-label="Chiến lược riêng tư" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!entry.locked && (
                    <button
                      type="button"
                      onClick={() => onCopyTrader(entry)}
                      className="hidden sm:inline-flex rounded-lg border border-indigo-500/35 bg-indigo-500/15 px-2.5 py-1 text-[11px] font-bold text-indigo-300 hover:bg-indigo-500/25 cursor-pointer"
                    >
                      Sao chép
                    </button>
                  )}
                  <span className="min-w-[82px] rounded-lg border border-slate-700/80 bg-[#1B2338] px-2.5 py-1.5 text-center font-mono text-xs font-bold text-slate-100 tabular-nums">
                    {entry.pnlPctLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
