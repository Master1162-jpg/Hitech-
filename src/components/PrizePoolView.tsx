import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Coins,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import {
  computeUserStreakStats,
  generatePrizePoolWinners,
} from '../lib/tradingEngine';
import type { Language, MarketSnapshot, TradeOrder } from '../types';

interface PrizePoolViewProps {
  lang: Language;
  market: MarketSnapshot;
  orders: TradeOrder[];
  onGoToTrade: () => void;
}

const ITEMS_PER_PAGE = 10;

export const PrizePoolView: React.FC<PrizePoolViewProps> = ({
  lang,
  market,
  orders,
  onGoToTrade,
}) => {
  const isVi = lang === 'vi';
  const [activeTab, setActiveTab] = useState<'winners' | 'history'>('winners');
  const [page, setPage] = useState<number>(1);
  const rulesRef = useRef<HTMLDivElement | null>(null);

  const winners = useMemo(
    () => generatePrizePoolWinners(market.prizePool, 50),
    [market.prizePool]
  );

  const totalPages = Math.ceil(winners.length / ITEMS_PER_PAGE);
  const pageWinners = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return winners.slice(start, start + ITEMS_PER_PAGE);
  }, [winners, page]);

  const userStreak = useMemo(
    () => computeUserStreakStats(orders, market.prizePool, 10, 9),
    [orders, market.prizePool]
  );

  const megaPrizeAmount = Number((market.prizePool * 0.005).toFixed(2));
  const yesterdayStr = useMemo(() => {
    const d = new Date(Date.now() - 86400000);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }, []);

  const scrollToRules = () => {
    rulesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mx-auto w-full max-w-5xl pb-8">
      {/* Subtle Back Bar */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onGoToTrade}
          className="inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{isVi ? 'Quay lại Giao dịch' : 'Back to Trading'}</span>
        </button>
      </div>

      {/* ============================================================
          SECTION 1: STREAK CHALLENGE HERO BANNER (matching IMG_0073)
         ============================================================ */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.28)_0%,_rgba(15,18,43,0.96)_55%,_rgba(6,9,19,1)_100%)] px-5 py-9 text-center sm:px-10 sm:py-12">
        {/* Subtle Horizon Rim Arc */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[140%] -translate-x-1/2 rounded-[100%] border-b border-sky-400/30 shadow-[0_8px_40px_rgba(56,189,248,0.28)]"
        />

        <h1 className="relative font-display text-3xl sm:text-5xl font-black tracking-wider text-white uppercase drop-shadow-[0_4px_20px_rgba(56,189,248,0.3)]">
          STREAK
          <br />
          CHALLENGE
        </h1>

        {/* Center Prize Pool Emblem + Isometric Vaults */}
        <div className="relative mx-auto mt-6 flex max-w-xl items-center justify-center gap-3 sm:gap-6">
          {/* Left Tech Prize Crate SVG */}
          <svg
            viewBox="0 0 80 80"
            className="h-16 w-16 sm:h-24 sm:w-24 shrink-0 drop-shadow-[0_10px_22px_rgba(0,212,170,0.35)]"
            fill="none"
            aria-hidden="true"
          >
            <polygon points="40,10 70,26 40,42 10,26" fill="#00D4AA" />
            <polygon points="40,14 63,26 40,38 17,26" fill="#0EA5E9" opacity="0.65" />
            <polygon points="10,26 40,42 40,70 10,54" fill="#1E293B" />
            <polygon points="70,26 40,42 40,70 70,54" fill="#0F172A" />
            <rect x="20" y="42" width="12" height="16" rx="2" fill="#00D4AA" opacity="0.85" />
            <path d="M48 45L62 37V53L48 61V45Z" fill="#38BDF8" opacity="0.7" />
          </svg>

          {/* Glowing Center Prize Pool Crest */}
          <div className="flex flex-col items-center">
            <div className="relative rounded-2xl border border-indigo-400/50 bg-gradient-to-b from-[#3b2994] via-[#271d68] to-[#1a134d] px-6 py-2.5 shadow-[0_0_28px_rgba(129,140,248,0.45)]">
              <div className="text-[11px] font-black tracking-widest text-indigo-100 uppercase">
                PRIZE POOL
              </div>
            </div>

            <div
              data-testid="prizepool-live-amount"
              className="mt-2 font-mono text-3xl sm:text-5xl font-black tracking-tight text-amber-300 drop-shadow-[0_4px_16px_rgba(251,191,36,0.45)] tabular-nums"
            >
              ${Math.round(market.prizePool).toLocaleString('en-US')}
            </div>

            {/* Mega Prizes Pill */}
            <div className="mt-3 rounded-xl border border-amber-400/60 bg-gradient-to-r from-[#51238a] via-[#7026a8] to-[#4c1d95] px-5 py-1.5 shadow-[0_0_22px_rgba(168,85,247,0.4)]">
              <div className="font-mono text-base sm:text-lg font-extrabold text-amber-300 tabular-nums">
                ${megaPrizeAmount.toFixed(2)}
              </div>
              <div className="text-[9px] font-extrabold tracking-widest text-amber-200/90 uppercase">
                MEGA PRIZES
              </div>
            </div>
          </div>

          {/* Right Golden Treasure Chest SVG */}
          <svg
            viewBox="0 0 80 80"
            className="h-16 w-16 sm:h-24 sm:w-24 shrink-0 drop-shadow-[0_10px_22px_rgba(251,191,36,0.35)]"
            fill="none"
            aria-hidden="true"
          >
            <polygon points="40,12 70,28 40,44 10,28" fill="#F59E0B" />
            <ellipse cx="40" cy="28" rx="18" ry="8" fill="#FDE047" />
            <circle cx="33" cy="25" r="4" fill="#F59E0B" />
            <circle cx="43" cy="23" r="4.5" fill="#FBBF24" />
            <circle cx="49" cy="28" r="3.5" fill="#F59E0B" />
            <polygon points="10,28 40,44 40,70 10,54" fill="#78350F" />
            <polygon points="70,28 40,44 40,70 70,54" fill="#451A03" />
            <rect x="35" y="42" width="10" height="12" rx="2" fill="#FBBF24" />
          </svg>
        </div>

        {/* Hero Primary CTA + Info Anchor */}
        <div className="relative mt-7 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onGoToTrade}
            className="w-full max-w-xs rounded-xl bg-gradient-to-r from-[#289BF8] to-[#1D84E8] px-7 py-3.5 text-sm sm:text-base font-extrabold text-white shadow-[0_8px_24px_rgba(29,132,232,0.4)] transition-transform hover:brightness-105 active:scale-[0.98] cursor-pointer"
          >
            {isVi ? 'Giao dịch & Chiến thắng' : 'Trade & Win Now'}
          </button>

          <button
            type="button"
            onClick={scrollToRules}
            className="text-xs sm:text-sm font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
          >
            {isVi ? 'Xem thêm thông tin' : 'Learn more about the rules'}
          </button>
        </div>
      </section>

      {/* ============================================================
          SECTION 2: LATEST MEGA JACKPOT WINNER (matching IMG_0073)
         ============================================================ */}
      <section className="mt-10 text-center">
        <div className="text-xs sm:text-sm font-semibold text-slate-400">
          {isVi ? 'Vinh danh người chiến thắng' : 'Hall of Champions'}
        </div>
        <h2 className="mt-1 font-display text-2xl sm:text-3xl font-black tracking-wide text-white uppercase text-balance">
          {isVi ? 'NGƯỜI CHIẾN THẮNG MỚI NHẤT' : 'LATEST MEGA WINNER'}
        </h2>

        <div className="relative mx-auto mt-6 max-w-md rounded-2xl border border-amber-400/70 bg-gradient-to-b from-[#604215]/75 via-[#2e2214]/85 to-[#17120e] px-6 pb-8 pt-7 shadow-[0_0_32px_rgba(245,158,11,0.18)]">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-amber-300/80 bg-[#2b1f0d] px-4 py-1 text-[10px] font-extrabold tracking-wider text-amber-300 uppercase whitespace-nowrap">
            MEGA JACKPOT WINNER
          </div>

          <div className="font-display text-xl sm:text-2xl font-black tracking-wider text-amber-300">
            HNPMINH
          </div>
          <div className="mt-1 text-xs font-medium text-amber-100/80">
            Won Mega Prizes {yesterdayStr}
          </div>

          <div className="mt-4 inline-block rounded-xl border border-amber-400/60 bg-gradient-to-r from-[#4b2083] via-[#6d28d9] to-[#4c1d95] px-5 py-1.5">
            <div className="font-mono text-base font-extrabold text-amber-300 tabular-nums">
              ${megaPrizeAmount.toFixed(2)}
            </div>
            <div className="text-[9px] font-bold tracking-widest text-amber-200 uppercase">
              MEGA PRIZES
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: WINNERS LEADERBOARD & YOUR STREAK HISTORY TABS
         ============================================================ */}
      <section className="mt-10">
        <div className="grid grid-cols-2 border-b border-slate-800" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'winners'}
            onClick={() => setActiveTab('winners')}
            className={`pb-3 text-center text-sm sm:text-base font-bold transition-colors cursor-pointer ${
              activeTab === 'winners'
                ? 'border-b-2 border-[#289BF8] text-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isVi ? 'Người chiến thắng' : 'Winners'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-center text-sm sm:text-base font-bold transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-b-2 border-[#289BF8] text-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isVi ? 'Lịch sử của bạn' : 'Your History'}
          </button>
        </div>

        {activeTab === 'winners' ? (
          <div className="mt-3">
            <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0c1020]">
              <div className="divide-y divide-slate-800/70">
                {pageWinners.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 hover:bg-slate-800/30"
                  >
                    <div>
                      <div
                        className={`text-xs sm:text-sm font-bold ${
                          w.type === 'WIN' ? 'text-[#00D4AA]' : 'text-rose-500'
                        }`}
                      >
                        {w.type === 'WIN'
                          ? `Win Streak ${w.streak}x`
                          : `Lose Streak ${w.streak}x`}
                      </div>
                      <div className="mt-0.5 font-mono text-xs sm:text-sm font-extrabold text-white tabular-nums">
                        $ {w.prizeAmount.toFixed(6)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xs sm:text-sm font-bold text-slate-100">
                        {w.maskedUser}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
                        {w.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Controls matching IMG_0073 (< 1 2 3 4 5 >) */}
            <nav
              aria-label={isVi ? 'Phân trang danh sách thắng giải' : 'Winners pagination'}
              className="mt-5 flex items-center justify-center gap-2"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={isVi ? 'Trang trước' : 'Previous page'}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-[#0d1326] text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setPage(pNum)}
                  aria-current={page === pNum ? 'page' : undefined}
                  className={`flex h-9 w-9 items-center justify-center rounded-full font-mono text-xs font-bold transition-colors cursor-pointer ${
                    page === pNum
                      ? 'bg-[#289BF8] text-white shadow-md shadow-sky-500/30'
                      : 'border border-slate-700/80 bg-[#0d1326] text-slate-300 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  {pNum}
                </button>
              ))}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label={isVi ? 'Trang sau' : 'Next page'}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-[#0d1326] text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Live User Streak Progress Card */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800/90 bg-[#0d1324] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#00D4AA]">
                    {isVi ? 'Chuỗi Thắng hiện tại' : 'Current Win Streak'}
                  </span>
                  <span className="font-mono font-extrabold text-white tabular-nums">
                    {userStreak.currentWinStreak} / {userStreak.targetStreak}
                  </span>
                </div>
                <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-[#00D4AA] transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (userStreak.currentWinStreak / userStreak.targetStreak) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-slate-400">
                  {isVi
                    ? `Kỷ lục thắng liên tiếp: ${userStreak.bestWinStreak} phiên`
                    : `Best win streak: ${userStreak.bestWinStreak} rounds`}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800/90 bg-[#0d1324] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-rose-400">
                    {isVi ? 'Chuỗi Thua hiện tại' : 'Current Lose Streak'}
                  </span>
                  <span className="font-mono font-extrabold text-white tabular-nums">
                    {userStreak.currentLoseStreak} / {userStreak.targetStreak}
                  </span>
                </div>
                <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-rose-500 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (userStreak.currentLoseStreak / userStreak.targetStreak) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-slate-400">
                  {isVi
                    ? `Kỷ lục thua liên tiếp: ${userStreak.bestLoseStreak} phiên`
                    : `Best lose streak: ${userStreak.bestLoseStreak} rounds`}
                </div>
              </div>
            </div>

            {userStreak.records.length === 0 ? (
              <div className="rounded-2xl border border-slate-800/80 bg-[#0c1020] px-5 py-10 text-center">
                <p className="text-sm font-semibold text-slate-200">
                  {isVi
                    ? 'Bạn chưa có giải thưởng Streak Challenge nào.'
                    : 'No Streak Challenge rewards claimed yet.'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {isVi
                    ? `Số lệnh hợp lệ (>= $${userStreak.minStake}) đã chốt: ${userStreak.qualifyingOrdersCount}. Đạt chuỗi ${userStreak.targetStreak} lệnh Thắng hoặc Thua liên tiếp để nhận 0.1% Prize Pool!`
                    : `Qualifying settled orders (>= $${userStreak.minStake}): ${userStreak.qualifyingOrdersCount}. Hit ${userStreak.targetStreak} consecutive Wins or Losses to claim 0.1% of the Prize Pool!`}
                </p>
                <button
                  type="button"
                  onClick={onGoToTrade}
                  className="mt-4 rounded-xl bg-gradient-to-r from-[#289BF8] to-[#1D84E8] px-5 py-2.5 text-xs font-extrabold text-white cursor-pointer"
                >
                  {isVi ? 'Tham gia Giao dịch ngay' : 'Start Trading Now'}
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0c1020] divide-y divide-slate-800/70">
                {userStreak.records.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <div>
                      <div
                        className={`text-sm font-bold ${
                          rec.type === 'WIN' ? 'text-[#00D4AA]' : 'text-rose-400'
                        }`}
                      >
                        {rec.type === 'WIN' ? 'Win' : 'Lose'} Streak {rec.length}x
                      </div>
                      <div className="font-mono text-xs text-slate-400">
                        {new Date(rec.date).toLocaleDateString(isVi ? 'vi-VN' : 'en-US')}
                      </div>
                    </div>
                    <div className="font-mono text-sm font-extrabold text-amber-300 tabular-nums">
                      +${rec.estimatedPrize.toFixed(6)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ============================================================
          SECTION 4: HOW TO PARTICIPATE (matching IMG_0073)
         ============================================================ */}
      <section ref={rulesRef} className="mt-12 space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-xs font-bold text-amber-400">
              {isVi ? 'Hướng dẫn' : 'Guide'}
            </div>
            <h2 className="mt-0.5 font-display text-2xl sm:text-3xl font-black tracking-wide text-white uppercase">
              {isVi ? 'CÁCH THAM GIA THỬ THÁCH' : 'HOW TO JOIN THE CHALLENGE'}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              step: '1',
              title: isVi ? 'ĐĂNG KÝ' : 'REGISTER',
              desc: isVi ? 'Đăng ký bằng email của bạn' : 'Create your HitechTrade account via email',
              icon: UserPlus,
              color: 'text-[#00D4AA]',
            },
            {
              step: '2',
              title: isVi ? 'GIAO DỊCH' : 'TRADE',
              desc: isVi ? 'Giao dịch và kiếm lợi nhuận' : 'Trade BTC/USDT rounds and build your streak',
              icon: TrendingUp,
              color: 'text-sky-400',
            },
            {
              step: '3',
              title: isVi ? 'CHIẾN THẮNG' : 'WIN',
              desc: isVi
                ? 'Bạn càng giao dịch nhiều cơ hội thắng càng lớn'
                : 'The more consecutive rounds you complete, the bigger your reward chance',
              icon: Coins,
              color: 'text-amber-300',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="flex flex-col items-center rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-[#17123a] to-[#0f0c29] px-6 py-8 text-center"
              >
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#0b1021] shadow-lg">
                  <span className="absolute -left-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#17123a] font-display text-lg font-black italic text-white">
                    {item.step}
                  </span>
                  <Icon className={`h-7 w-7 ${item.color}`} />
                </div>
                <h3 className="mt-5 font-display text-lg font-extrabold tracking-wide text-white uppercase">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-300">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* About & Terms Sections matching IMG_0073 */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0c1020] p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-slate-300">
          <div>
            <h3 className="font-display text-xl font-extrabold text-white">
              {isVi ? 'Về thử thách này' : 'About this Challenge'}
            </h3>
            <p className="mt-2.5">
              {isVi
                ? 'Thử thách Streak là chương trình khuyến khích đặc biệt tại HitechTrade cho phép các nhà giao dịch BTC/USDT nhận phần thưởng cho cả chuỗi thắng lẫn chuỗi thua liên tiếp. 0,05% tổng khối lượng giao dịch trên toàn nền tảng được cộng dồn trực tiếp vào Quỹ thưởng (Prize Pool) mỗi phút. Mỗi khi đạt điều kiện thử thách, 0,1% giá trị quỹ thưởng sẽ được trao thưởng và cơ hội nhận thêm giải Mega gấp 5 lần mỗi ngày.'
                : 'Streak Challenge is a HitechTrade incentive program rewarding BTC/USDT traders for consecutive winning or losing streaks. 0.05% of total platform trading volume feeds directly into the progressive Prize Pool every minute. Qualifying streaks receive 0.1% of the Prize Pool plus eligibility for the daily 5x Mega Prize.'}
            </p>
          </div>

          <div className="border-t border-slate-800/80 pt-5 space-y-3">
            <h3 className="font-display text-xl font-extrabold text-white">
              {isVi ? 'Điều khoản và chính sách' : 'Terms & Policy'}
            </h3>
            <p>
              {isVi
                ? 'Người dùng đặt lệnh MUA hoặc BÁN trong các phiên giao dịch BTC/USDT liên tiếp với giá trị tối thiểu $10 mỗi lệnh để đủ điều kiện tham gia. Trường hợp có nhiều người dùng cùng đạt giải độc đắc trong một phiên, giải thưởng được chia đều cho các tài khoản đủ điều kiện. Tài khoản cần hoàn tất xác minh KYC để nhận thưởng; giải thưởng được phân phối tự động vào Ví Thực trong vòng 48 giờ.'
                : 'Users must place BUY or SELL orders in consecutive BTC/USDT rounds with a minimum stake of $10 per order to qualify. When multiple traders qualify in the same session, rewards are distributed evenly. Completed KYC verification is required; payouts settle directly into the Live Wallet within 48 hours.'}
            </p>
            <p>
              {isVi
                ? 'HitechTrade có quyền điều chỉnh điều kiện chương trình và rà soát các hành vi gian lận hoặc thao túng nhằm bảo đảm tính minh bạch, công bằng cho toàn bộ cộng đồng giao dịch.'
                : 'HitechTrade reserves the right to adjust campaign rules and audit irregular trading patterns to maintain fairness and transparency across the trading community.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
