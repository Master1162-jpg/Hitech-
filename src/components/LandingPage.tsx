import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock,
  Globe,
  Lock,
  Mail,
  QrCode,
  Send,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { COPY } from '../lib/i18n';
import type { Language } from '../types';
import type { AuthMode } from './AuthDrawer';

interface LandingPageProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  onOpenAuth: (mode: AuthMode) => void;
}

const FAQS_VI = [
  {
    q: 'HitechTrade là gì?',
    a: 'HitechTrade là nền tảng đầu tư tài sản số chuyên sâu cặp BTC/USDT, tích hợp biểu đồ nến 30s trực quan, hệ thống Bot AI tự động, chuyển tiền nội bộ 0 phí và ví USDT tạo mã QR tự động.',
  },
  {
    q: 'HitechTrade có minh bạch và an toàn không?',
    a: 'Mọi giao dịch được mã hóa, bảo vệ bởi xác thực 2 lớp (2FA) và định danh KYC. Tuy nhiên, như mọi hình thức đầu tư tài sản số khác, thị trường luôn tiềm ẩn rủi ro biến động — bạn nên trải nghiệm tài khoản Demo $1,000 trước khi đầu tư vốn thực.',
  },
  {
    q: 'Bot AI trên HitechTrade hoạt động như thế nào?',
    a: 'Bot AI hỗ trợ 4 chiến lược thông minh (EMA + RSI, Martingale Pro, Fibonacci, Theo chuỗi giọt nước) kèm ngưỡng Chốt lời (Take Profit) và Cắt lỗ (Stop Loss) tự động trên cả ví Demo và ví Thực.',
  },
  {
    q: 'Chuyển tiền nội bộ và nạp USDT qua QR có mất phí không?',
    a: 'Chuyển tiền nội bộ giữa các tài khoản HitechTrade hoàn toàn miễn phí (0%) và xử lý tức thì theo Email hoặc Biệt danh. Nạp USDT qua mã QR tự sinh từ địa chỉ ví cá nhân cũng hoàn toàn 0 phí nạp.',
  },
  {
    q: 'Tài khoản VIP và tài khoản thử nghiệm $1,000 dùng để làm gì?',
    a: 'Tài khoản thử nghiệm tặng miễn phí $1,000 để làm quen giao diện và thử nghiệm chiến lược Bot AI không rủi ro. Tài khoản VIP (phí kích hoạt 100 USDT) mở khóa chương trình hoa hồng Affiliate nhiều cấp.',
  },
];

const FAQS_EN = [
  {
    q: 'What is HitechTrade?',
    a: 'HitechTrade is a next-generation digital asset trading platform focused exclusively on BTC/USDT with real-time candlestick indicators, automated AI Trading Bots, instant zero-fee internal transfers, and auto-generated USDT QR wallets.',
  },
  {
    q: 'How secure is HitechTrade?',
    a: 'All accounts are protected by 2FA security, KYC verification, and encrypted order execution. Digital asset options carry high volatility risk, so we provide a free $1,000 Demo account to test strategies before trading live.',
  },
  {
    q: 'How does the AI Trading Bot work?',
    a: 'Our AI Bot supports 4 automated strategies (EMA+RSI, Martingale Pro, Fibonacci, Trend Follow) with automatic Take Profit and Stop Loss guardrails on both Demo and Live balances.',
  },
  {
    q: 'Are internal transfers and QR deposits free?',
    a: 'Internal USDT transfers between HitechTrade accounts are 100% free (0% fee) and settle instantly. USDT deposits via your auto-generated wallet QR code also carry zero deposit fee.',
  },
  {
    q: 'What are the VIP and $1,000 Demo accounts for?',
    a: 'Every new account receives $1,000 in unlimited Demo funds to practice BTC/USDT trading. Upgrading to VIP (100 USDT) unlocks multi-tier Affiliate commission payouts.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ lang, onChangeLang, onOpenAuth }) => {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | 'risk' | null>(null);
  const t = COPY[lang];
  const isVi = lang === 'vi';
  const faqs = isVi ? FAQS_VI : FAQS_EN;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#090e1c] text-slate-100">
      {/* Top Navigation Bar - Clean 3-zone contract */}
      <header className="sticky top-0 z-40 border-b border-slate-800/70 bg-[#090e1c]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 sm:gap-8 px-4 sm:px-6 py-3">
          <a href="#top" className="shrink-0">
            <BrandLogo size="md" />
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="#indicators" className="whitespace-nowrap shrink-0 transition-colors hover:text-[#00D4AA]">
              {isVi ? 'Chỉ báo & Bot AI' : 'Indicators & AI Bot'}
            </a>
            <a href="#features" className="whitespace-nowrap shrink-0 transition-colors hover:text-[#00D4AA]">
              {isVi ? 'Tính năng' : 'Features'}
            </a>
            <a href="#steps" className="whitespace-nowrap shrink-0 transition-colors hover:text-[#00D4AA]">
              {isVi ? 'Bắt đầu' : 'Get Started'}
            </a>
            <a href="#faq" className="whitespace-nowrap shrink-0 transition-colors hover:text-[#00D4AA]">
              {isVi ? 'Câu hỏi' : 'FAQ'}
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="rounded-lg bg-gradient-to-r from-[#00D4AA] to-[#0EA5E9] px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-[#050814] transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.navRegister}
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:border-slate-500 hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.navLogin}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="relative overflow-hidden border-b border-slate-800/60">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,212,170,0.14),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(14,165,233,0.16),transparent_58%),linear-gradient(to_right,rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:100%_100%,100%_100%,48px_48px,48px_48px]"
        />
        <div className="relative mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-6 px-4 sm:px-6 py-7 lg:grid-cols-12 lg:py-10">
          <div className="lg:col-span-6">
            <p className="text-xs font-bold tracking-wider text-[#00D4AA] uppercase">
              {t.heroBadge} · BTC/USDT
            </p>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[54px] [text-wrap:balance]">
              {t.heroTitle1}{' '}
              <span className="block">{t.heroTitle2}</span>
              <span className="bg-gradient-to-r from-[#00D4AA] to-[#0EA5E9] bg-clip-text text-transparent">
                {t.heroTitleAccent}
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
              {t.heroDesc}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#00D4AA] to-[#0EA5E9] px-6 py-3.5 text-sm font-extrabold text-[#050814] shadow-lg shadow-emerald-500/20 transition-transform hover:-translate-y-0.5 cursor-pointer"
              >
                <span>{t.heroPrimaryCta}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#indicators"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/70 px-5 py-3.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
              >
                <span>{t.heroSecondaryCta}</span>
                <ChevronDown className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-slate-400">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#00D4AA]" />
                {t.trust2fa}
              </span>
              <span className="inline-flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#0EA5E9]" />
                {t.trustFast}
              </span>
              <span className="inline-flex items-center gap-2">
                <Wallet className="h-4 w-4 text-amber-400" />
                {t.trustUsdt}
              </span>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <div className="relative w-full max-w-[620px]">
              <img
                src="/assets/aistudio/IMG_0041_cfa1ee9e.png"
                alt="HitechTrade BTC/USDT Trading Platform Desktop & Mobile"
                referrerPolicy="no-referrer"
                className="w-full h-auto rounded-2xl object-contain drop-shadow-[0_24px_48px_rgba(0,212,170,0.14)]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Indicators & AI Bot Showcase */}
      <section id="indicators" className="relative bg-[radial-gradient(ellipse_at_left,rgba(14,165,233,0.08),transparent_55%)]">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-8 lg:py-10">
          <div className="grid grid-cols-1 items-center gap-8 lg:gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6 relative">
              <img
                src="/assets/aistudio/IMG_0042_504293fb.png"
                alt="HitechTrade BTC/USDT Candlestick Indicators & Waterdrop Matrix"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-contain drop-shadow-[0_18px_36px_rgba(14,165,233,0.18)]"
              />
              <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-800/90 bg-[#0b1021]/95 px-4 py-2.5 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-[#00D4AA] shrink-0" />
                <div>
                  <div className="font-mono text-sm font-bold text-white">24/7</div>
                  <div className="text-xs text-slate-400">{isVi ? 'Thị trường BTC/USDT' : 'BTC/USDT Market'}</div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800/90 bg-[#0b1021]/95 px-4 py-2.5 flex items-center gap-3">
                <Clock className="h-5 w-5 text-[#0EA5E9] shrink-0" />
                <div>
                  <div className="font-mono text-sm font-bold text-white">&lt; 1s</div>
                  <div className="text-xs text-slate-400">{isVi ? 'Độ trễ khớp lệnh' : 'Execution Latency'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <p className="text-xs font-bold tracking-wider text-[#0EA5E9] uppercase">
              {isVi ? 'Một nền tảng · Mọi công cụ' : 'One Platform · Every Tool'}
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl [text-wrap:balance]">
              {isVi ? 'Đầu tư thông minh với ' : 'Trade smarter with '}
              <span className="bg-gradient-to-r from-[#00D4AA] to-[#0EA5E9] bg-clip-text text-transparent">
                {isVi ? 'chỉ báo & Bot AI tiên tiến' : 'advanced indicators & AI Bot'}
              </span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              {isVi
                ? 'HitechTrade trang bị bộ chỉ báo kỹ thuật EMA, RSI, MACD, bảng giọt nước 5x4 trực quan cùng Bot AI tự động giúp bạn ra quyết định tự tin trong từng phiên BTC/USDT.'
                : 'HitechTrade equips you with live EMA, RSI, MACD overlays, 5x4 Last Results matrix, and automated AI Bot strategies for confident BTC/USDT execution.'}
            </p>

            <ul className="mt-6 space-y-3.5 text-sm text-slate-200">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#00D4AA]" />
                <span>
                  {isVi
                    ? 'Biểu đồ nến 30s đặc trưng Kaizenfin, tín hiệu đọc ngay trên màn hình'
                    : 'Kaizenfin-style 30s candlestick chart with live EMA crossovers'}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#00D4AA]" />
                <span>
                  {isVi
                    ? 'Bot AI tự động đặt lệnh theo EMA+RSI, Martingale, Fibonacci & quản lý TP/SL'
                    : 'Automated AI Bot supporting EMA+RSI, Martingale, Fibonacci & TP/SL'}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#00D4AA]" />
                <span>
                  {isVi
                    ? 'Chuyển tiền nội bộ 0% phí & nạp USDT qua mã QR tự sinh từ ví'
                    : 'Zero-fee internal transfers & auto-generated USDT wallet QR'}
                </span>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="mt-8 inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#00D4AA] to-[#0EA5E9] px-6 py-3.5 text-sm font-extrabold text-[#050814] transition-opacity hover:opacity-95 cursor-pointer"
            >
              <span>{isVi ? 'Bắt đầu miễn phí' : 'Start Free Now'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        </div>
      </section>

      {/* Section 3: Bento Features Grid */}
      <section id="features" className="border-t border-slate-800/60 bg-[#0c1222] py-8 lg:py-10">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-bold tracking-wider text-[#00D4AA] uppercase">
              {isVi ? 'Vì sao chọn HitechTrade' : 'Why HitechTrade'}
            </p>
            <h2 className="mt-1.5 font-display text-3xl font-extrabold text-white sm:text-4xl">
              {isVi ? 'Được xây dựng trên ' : 'Built on '}
              <span className="text-[#0EA5E9]">{isVi ? 'sự đột phá' : 'precision engineering'}</span>
            </h2>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
            {/* Large Bento Card 1 */}
            <div className="md:col-span-7 rounded-2xl border border-slate-800 bg-[#0d1326] p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00D4AA]/15 text-[#00D4AA]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-white">
                  {isVi ? 'Ổn định & Bảo mật đa tầng' : 'Multi-Layer Security & Uptime'}
                </h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                {isVi
                  ? 'HitechTrade vận hành ổn định 24/7 với cặp thanh khoản BTC/USDT. Tài sản của bạn được bảo vệ bởi xác thực 2 lớp (2FA), định danh KYC và hệ thống ví USDT riêng biệt.'
                  : 'HitechTrade operates 24/7 on BTC/USDT liquidity with 2FA protection, KYC verification, and dedicated USDT wallets.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[#00D4AA]" />
                  {isVi ? 'Xác thực 2 lớp (2FA)' : '2FA Authentication'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#00D4AA]" />
                  {isVi ? 'Định danh KYC' : 'KYC Verification'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5 text-[#0EA5E9]" />
                  {isVi ? 'QR Ví USDT tự sinh' : 'Auto Wallet QR'}
                </span>
              </div>
            </div>

            {/* Bento Card 2 */}
            <div className="md:col-span-5 rounded-2xl border border-slate-800 bg-[#0d1326] p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0EA5E9]/15 text-[#0EA5E9]">
                    <Bot className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white">
                    {isVi ? 'Bot AI Tự động 24/7' : 'Automated AI Bot'}
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                  {isVi
                    ? 'Tự động hóa giao dịch BTC/USDT theo chỉ báo kỹ thuật và quản trị vốn thông minh với điểm dừng lỗ, chốt lời tự động.'
                    : 'Automate BTC/USDT orders with technical signal logic and disciplined TP/SL risk guardrails.'}
                </p>
              </div>
              <div className="mt-6 h-16 w-full rounded-xl bg-gradient-to-r from-[#00D4AA]/10 via-[#0EA5E9]/15 to-[#00D4AA]/5 border border-slate-800 flex items-center justify-between px-4">
                <span className="text-xs font-semibold text-slate-300">EMA + RSI + Martingale</span>
                <span className="font-mono text-sm font-bold text-[#00D4AA]">+95% Payout</span>
              </div>
            </div>

            {/* Bento Card 3 */}
            <div className="md:col-span-4 rounded-2xl border border-slate-800 bg-[#0d1326] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00D4AA]/15 text-[#00D4AA]">
                <Send className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-white">
                {isVi ? 'Chuyển tiền nội bộ & QR' : 'Internal Transfer & QR'}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                {isVi
                  ? '0% phí chuyển tiền nội bộ giữa các tài khoản HitechTrade. Mã QR tự sinh tức thì từ địa chỉ ví.'
                  : '0% fee internal transfers between HitechTrade accounts and instant auto-generated QR deposit codes.'}
              </p>
            </div>

            {/* Bento Card 4 */}
            <div className="md:col-span-4 rounded-2xl border border-slate-800 bg-[#0d1326] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-white">
                {isVi ? 'Giới thiệu & Kiếm tiền VIP' : 'VIP & Affiliate Network'}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                {isVi
                  ? 'Nhận hoa hồng nhiều cấp khi bạn bè giao dịch BTC/USDT qua hệ thống Affiliate của HitechTrade.'
                  : 'Earn multi-tier referral commissions when your network trades BTC/USDT on HitechTrade.'}
              </p>
            </div>

            {/* Bento Card 5: KPIs */}
            <div className="md:col-span-4 rounded-2xl border border-slate-800 bg-[#0d1326] p-6 grid grid-cols-2 gap-4">
              <div>
                <div className="font-mono text-2xl font-bold text-white">30s</div>
                <div className="text-xs text-slate-400 mt-0.5">{isVi ? 'Chu kỳ mỗi phiên' : 'Round Cycle'}</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-[#00D4AA]">95%</div>
                <div className="text-xs text-slate-400 mt-0.5">{isVi ? 'Tỷ suất lợi nhuận' : 'Payout Rate'}</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-white">$1,000</div>
                <div className="text-xs text-slate-400 mt-0.5">{isVi ? 'Vốn thử miễn phí' : 'Free Demo Funds'}</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-[#0EA5E9]">BTC/USDT</div>
                <div className="text-xs text-slate-400 mt-0.5">{isVi ? 'Cặp chuyên sâu' : 'Focused Pair'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Networks Strip (Using the 3 attached network logos!) */}
      <section className="bg-gradient-to-r from-[#0a233d] via-[#0e3a5f] to-[#0a2f44] py-5 border-y border-sky-500/20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 text-center">
          <p className="text-xs font-bold tracking-widest text-sky-200 uppercase">
            {isVi ? 'Được hỗ trợ bởi các mạng lưới hàng đầu' : 'Powered by Leading Blockchain Networks'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <div className="flex h-13 w-42 items-center justify-center rounded-xl bg-white px-4 py-2 shadow-md">
              <img
                src="/assets/aistudio/IMG_0043_f790f9ad.webp"
                alt="Binance Smart Chain"
                referrerPolicy="no-referrer"
                className="max-h-9 w-auto object-contain"
              />
            </div>
            <div className="flex h-13 w-42 items-center justify-center rounded-xl bg-white px-4 py-2 shadow-md">
              <img
                src="/assets/aistudio/IMG_0044_18e7f01e.webp"
                alt="Bitcoin"
                referrerPolicy="no-referrer"
                className="max-h-9 w-auto object-contain"
              />
            </div>
            <div className="flex h-13 w-42 items-center justify-center rounded-xl bg-white px-4 py-2 shadow-md">
              <img
                src="/assets/aistudio/IMG_0045_b33025a5.webp"
                alt="Tether USDT"
                referrerPolicy="no-referrer"
                className="max-h-9 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: 3 Steps */}
      <section id="steps" className="mx-auto max-w-[1280px] px-4 sm:px-6 py-8 lg:py-10">
        <h2 className="text-center font-display text-3xl font-extrabold text-white sm:text-4xl">
          {isVi ? 'Bắt đầu chỉ sau ' : 'Start trading in '}
          <span className="text-[#00D4AA]">{isVi ? '5 phút' : '5 minutes'}</span>
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              step: '1',
              icon: UserPlus,
              title: isVi ? 'Đăng ký HitechTrade' : 'Register HitechTrade',
              desc: isVi
                ? 'Tạo tài khoản miễn phí chỉ với email — nhận ngay tài khoản thử nghiệm $1,000.'
                : 'Create a free account with your email and instantly receive $1,000 demo funds.',
              time: isVi ? '~1 phút' : '~1 min',
            },
            {
              step: '2',
              icon: Wallet,
              title: isVi ? 'Ký quỹ qua QR USDT' : 'Deposit via USDT QR',
              desc: isVi
                ? 'Quét mã QR tự sinh từ địa chỉ ví USDT hoặc nhận chuyển tiền nội bộ 0 phí.'
                : 'Scan your auto-generated USDT wallet QR code or receive zero-fee internal transfers.',
              time: isVi ? '~2 phút' : '~2 mins',
            },
            {
              step: '3',
              icon: TrendingUp,
              title: isVi ? 'Giao dịch & Bot AI' : 'Trade & Run AI Bot',
              desc: isVi
                ? 'Theo dõi biểu đồ BTC/USDT hoặc kích hoạt Bot AI tự động gia tăng danh mục.'
                : 'Trade BTC/USDT live candlesticks or activate the automated AI Bot.',
              time: isVi ? 'Bất cứ lúc nào' : 'Anytime',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative rounded-2xl border border-slate-800 bg-[#0d1326] p-7 text-center"
              >
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#00D4AA]/40 bg-[#00D4AA]/10 font-mono text-xs font-bold text-[#00D4AA]">
                  {item.step}
                </div>
                <div className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/80 text-[#0EA5E9]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{item.desc}</p>
                <div className="mt-4 text-xs font-semibold text-slate-500">{item.time}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#00D4AA] to-[#0EA5E9] px-7 py-3 text-sm font-extrabold text-[#050814] transition-opacity hover:opacity-95 cursor-pointer"
          >
            <span>{isVi ? 'Tạo tài khoản miễn phí' : 'Create Free Account'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Section 5: Cross-Device CTA Banner */}
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 py-2">
        <div className="grid grid-cols-1 items-center gap-6 overflow-hidden rounded-3xl bg-gradient-to-r from-[#059669] via-[#0284c7] to-[#0369a1] p-6 sm:p-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl [text-wrap:balance]">
              {isVi ? 'Mọi nơi bạn muốn. Mọi lúc bạn cần.' : 'Everywhere you go. Anytime you trade.'}
            </h2>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-sky-50/90">
              {isVi
                ? 'HitechTrade chạy mượt trên mọi thiết bị — điện thoại, máy tính bảng hay trình duyệt. Bắt đầu với tài khoản thử nghiệm $1,000, không cần nạp tiền.'
                : 'HitechTrade runs seamlessly across mobile, tablet, and desktop browsers. Start immediately with $1,000 Demo balance.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-slate-900 shadow-lg transition-transform hover:-translate-y-0.5 cursor-pointer"
              >
                <span>{isVi ? 'Đầu tư ngay' : 'Trade Now'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium text-sky-100">
                {isVi ? 'Miễn phí đăng ký · Không ràng buộc' : 'Free registration · No obligation'}
              </span>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <img
              src="/assets/aistudio/IMG_0041_cfa1ee9e.png"
              alt="HitechTrade Cross-Device App"
              referrerPolicy="no-referrer"
              className="w-full max-w-[440px] h-auto object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Section 6: FAQ */}
      <section id="faq" className="mx-auto max-w-[1040px] px-4 sm:px-6 py-8 lg:py-10">
        <div className="text-center">
          <p className="text-xs font-bold tracking-wider text-[#00D4AA] uppercase">
            {isVi ? 'Câu hỏi thường gặp' : 'FAQ'}
          </p>
          <h2 className="mt-1.5 font-display text-3xl font-extrabold text-white">
            {isVi ? 'Giải đáp thắc mắc' : 'Frequently Asked Questions'}
          </h2>
        </div>

        <div className="mt-5 space-y-2.5">
          {faqs.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div key={item.q} className="rounded-xl border border-slate-800 bg-[#0d1326] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left text-sm sm:text-base font-semibold text-white transition-colors hover:bg-slate-800/40 cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                      isOpen ? 'rotate-180 text-[#00D4AA]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-800/70 px-5 py-3.5 text-sm leading-relaxed text-slate-300">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 text-center text-sm text-slate-400">
          <span>{isVi ? 'Vẫn còn thắc mắc? ' : 'Still have questions? '}</span>
          <a
            href="mailto:support@hitechtrade.io"
            className="inline-flex items-center gap-1.5 font-semibold text-[#00D4AA] hover:underline"
          >
            <Mail className="h-4 w-4" />
            support@hitechtrade.io
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070b18] py-8">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            <div className="md:col-span-4 space-y-4">
              <BrandLogo size="md" />
              <p className="text-sm text-slate-400 max-w-xs">
                {isVi
                  ? 'Nền tảng đầu tư tài sản số BTC/USDT — đơn giản, minh bạch và tích hợp Bot AI.'
                  : 'BTC/USDT digital asset platform — fast, transparent, and AI-powered.'}
              </p>
              <button
                type="button"
                onClick={() => onChangeLang(isVi ? 'en' : 'vi')}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500 cursor-pointer"
              >
                <Globe className="h-3.5 w-3.5 text-[#00D4AA]" />
                <span>{isVi ? 'Tiếng Việt (Chuyển EN)' : 'English (Switch VI)'}</span>
              </button>
            </div>

            <div className="md:col-span-2 space-y-2.5 text-sm">
              <h3 className="font-display font-bold text-white">{isVi ? 'Hỗ trợ' : 'Support'}</h3>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <button type="button" onClick={() => setLegalModal('privacy')} className="hover:text-white cursor-pointer">
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <a href="mailto:support@hitechtrade.io" className="hover:text-white">
                    support@hitechtrade.io
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-2.5 text-sm">
              <h3 className="font-display font-bold text-white">{isVi ? 'Pháp lý & Bảo mật' : 'Legal & Security'}</h3>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <button type="button" onClick={() => setLegalModal('terms')} className="hover:text-white cursor-pointer">
                    {isVi ? 'Điều khoản và điều kiện' : 'Terms & Conditions'}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setLegalModal('risk')} className="hover:text-white cursor-pointer">
                    {isVi ? 'Cảnh báo rủi ro' : 'Risk Disclosure'}
                  </button>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3 rounded-xl border border-slate-800 bg-[#0b1021] p-5">
              <div className="font-display text-sm font-bold text-white">
                {isVi ? 'Sẵn sàng bắt đầu?' : 'Ready to start?'}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                {isVi
                  ? 'Nhận tài khoản thử nghiệm $1,000 miễn phí ngay khi đăng ký.'
                  : 'Receive $1,000 free Demo funds immediately on sign-up.'}
              </p>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#00D4AA] to-[#0EA5E9] py-2.5 text-xs font-extrabold text-[#050814] cursor-pointer"
              >
                <span>{isVi ? 'Đăng ký ngay' : 'Register Now'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-800/70 pt-6 text-xs text-slate-500 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>© 2026 HitechTrade. All rights reserved.</span>
              <span>{isVi ? 'Đầu tư tài sản số tiềm ẩn mức rủi ro cao.' : 'Digital asset trading involves high risk.'}</span>
            </div>
            <p className="leading-relaxed">
              {isVi
                ? 'Cảnh báo rủi ro: Giao dịch và đầu tư vào tài sản kỹ thuật số BTC/USDT có mức độ rủi ro đáng kể. Vui lòng cân nhắc mục tiêu đầu tư, mức độ kinh nghiệm và không sử dụng nguồn vốn vượt quá khả năng tài chính của bạn.'
                : 'Risk Warning: Trading digital asset options carries significant risk and may not be suitable for all investors. Never invest funds you cannot afford to lose.'}
            </p>
          </div>
        </div>
      </footer>

      {/* Legal Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0d1326] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">
                {legalModal === 'privacy'
                  ? 'Privacy Policy'
                  : legalModal === 'terms'
                  ? isVi
                    ? 'Điều khoản & Điều kiện'
                    : 'Terms & Conditions'
                  : isVi
                  ? 'Cảnh báo rủi ro'
                  : 'Risk Disclosure'}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                aria-label="Đóng"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              {legalModal === 'privacy' &&
                'HitechTrade cam kết bảo mật tuyệt đối thông tin email, lịch sử giao dịch và dữ liệu KYC của người dùng theo tiêu chuẩn mã hóa hiện đại.'}
              {legalModal === 'terms' &&
                'Người dùng cam kết đủ 18 tuổi, chịu trách nhiệm bảo mật thông tin đăng nhập, mã 2FA và tuân thủ quy định sử dụng tài khoản VIP / Affiliate trên HitechTrade.'}
              {legalModal === 'risk' &&
                'Giao dịch quyền chọn nhị phân BTC/USDT mang tính đầu cơ cao. Kết quả quá khứ và Bot AI không đảm bảo lợi nhuận tuyệt đối trong tương lai.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
