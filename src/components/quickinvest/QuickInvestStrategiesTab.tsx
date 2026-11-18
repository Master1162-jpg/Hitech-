import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  MoreVertical,
  Play,
  Plus,
  Search,
  Send,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import type { BotStrategy, QuickInvestStrategyItem } from '../../types';

interface QuickInvestStrategiesTabProps {
  strategies: QuickInvestStrategyItem[];
  activeStrategy: BotStrategy;
  onActivateStrategy: (item: QuickInvestStrategyItem) => void;
  onCreateStrategy: (item: Omit<QuickInvestStrategyItem, 'id' | 'createdAt' | 'winRateRef' | 'usersCount'>) => void;
  onDeleteStrategy: (id: string) => void;
}

type StrategySubView = 'all' | 'ranking' | 'telegram';

export const QuickInvestStrategiesTab: React.FC<QuickInvestStrategiesTabProps> = ({
  strategies,
  activeStrategy,
  onActivateStrategy,
  onCreateStrategy,
  onDeleteStrategy,
}) => {
  const [subView, setSubView] = useState<StrategySubView>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(6);
  const [page, setPage] = useState<number>(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Designer Modal State
  const [designerOpen, setDesignerOpen] = useState(false);
  const [stratName, setStratName] = useState('');
  const [stratMethod, setStratMethod] = useState<'String Method' | 'AI Quant' | 'Signal Matrix'>(
    'String Method'
  );
  const [stratKey, setStratKey] = useState<BotStrategy>('reverse_2');
  const [stratPattern, setStratPattern] = useState('B-S-B-B->S');
  const [designerError, setDesignerError] = useState<string | null>(null);

  // Telegram Bot Integration local state
  const [telegramHandle, setTelegramHandle] = useState(() => {
    try {
      return localStorage.getItem('quickinvest_tg_handle') || '';
    } catch {
      return '';
    }
  });
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('quickinvest_tg_channels');
      return raw ? JSON.parse(raw) : ['@QuickInvest_AI_Signals'];
    } catch {
      return ['@QuickInvest_AI_Signals'];
    }
  });
  const [tgSavedMsg, setTgSavedMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return strategies;
    return strategies.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.method.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [strategies, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const rankedList = useMemo(
    () => [...strategies].sort((a, b) => b.winRateRef - a.winRateRef),
    [strategies]
  );

  const telegramChannels = useMemo(
    () => strategies.filter((s) => Boolean(s.telegramChannel)),
    [strategies]
  );

  const handleCopyCode = (item: QuickInvestStrategyItem) => {
    const payload = `QUICKINVEST:${item.name}:${item.patternCode}`;
    navigator.clipboard?.writeText(payload).catch(() => {});
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleCreateCustomStrategy = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = stratName.trim();
    const cleanPattern = stratPattern.trim();
    if (!cleanName) {
      setDesignerError('Vui lòng nhập tên chiến lược Bot AI.');
      return;
    }
    if (!cleanPattern) {
      setDesignerError('Vui lòng nhập chuỗi tín hiệu / công thức quản trị.');
      return;
    }

    onCreateStrategy({
      name: cleanName,
      method: stratMethod,
      category: stratMethod === 'AI Quant' ? 'Chiến lược AI' : 'Chiến lược tùy chỉnh',
      strategyKey: stratKey,
      patternCode: cleanPattern,
      isDefault: false,
    });
    setStratName('');
    setDesignerError(null);
    setDesignerOpen(false);
    setPage(1);
  };

  const handleSaveTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = telegramHandle.trim();
    if (!clean) {
      setTgSavedMsg('Vui lòng nhập @username hoặc Chat ID Telegram.');
      return;
    }
    try {
      localStorage.setItem('quickinvest_tg_handle', clean);
    } catch {
      // ignore storage quota errors
    }
    setTgSavedMsg(`Đã liên kết cảnh báo QuickInvest Telegram cho ${clean}`);
  };

  const toggleChannel = (ch: string) => {
    setSubscribedChannels((prev) => {
      const next = prev.includes(ch) ? prev.filter((x) => x !== ch) : [...prev, ch];
      try {
        localStorage.setItem('quickinvest_tg_channels', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div className="px-3.5 py-4 pb-24 lg:px-6 lg:py-5 lg:pb-8 space-y-4">
      {/* Top 3 Segmented Card Tabs matching IMG_0100: Tất cả | Xếp hạng | Telegram */}
      <div
        role="tablist"
        aria-label="Phân loại chiến lược QuickInvest"
        className="flex items-center gap-1.5 border-b border-slate-800/80"
      >
        {(
          [
            { id: 'all', label: 'Tất cả' },
            { id: 'ranking', label: 'Xếp hạng' },
            { id: 'telegram', label: 'Telegram' },
          ] as { id: StrategySubView; label: string }[]
        ).map((tab) => {
          const active = subView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSubView(tab.id)}
              className={`min-h-[42px] rounded-t-xl border border-b-0 px-5 py-2 text-sm font-bold transition-colors cursor-pointer ${
                active
                  ? 'border-slate-700/80 bg-[#1B2336] text-[#6468FF]'
                  : 'border-slate-800/80 bg-[#111829] text-slate-200 hover:bg-[#161E31]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* === VIEW 1: TẤT CẢ (EXACT TABLE FROM IMG_0100) === */}
      {subView === 'all' && (
        <div className="space-y-4">
          {/* Search + Sao chép + Thiết kế Bot AI Toolbar */}
          <div className="space-y-3 lg:flex lg:items-center lg:justify-between lg:gap-3 lg:space-y-0">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm kiếm..."
                aria-label="Tìm kiếm chiến lược"
                className="w-full rounded-xl border border-slate-700/80 bg-[#141C2E] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-400 focus:border-[#5C60F5] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const activeItem =
                    strategies.find((s) => s.strategyKey === activeStrategy) ?? strategies[0];
                  if (activeItem) handleCopyCode(activeItem);
                }}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-700/80 bg-[#172034] hover:bg-slate-800/80 px-4 py-2 text-sm font-bold text-slate-100 cursor-pointer"
              >
                <span>{copiedId ? 'Đã sao chép' : 'Sao chép'}</span>
                {copiedId ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4 text-slate-300" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setDesignerError(null);
                  setDesignerOpen(true);
                }}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#4E9C6F] hover:bg-[#43AD73] px-4 py-2 text-sm font-bold text-white shadow-md transition-colors cursor-pointer"
              >
                <span>Thiết kế Bot AI</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Strategy Data Table matching IMG_0100 */}
          <div className="overflow-visible rounded-2xl border border-slate-700/70 bg-[#141B2D]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/70 bg-[#192237] text-xs sm:text-sm font-bold text-slate-300">
                  <th className="px-3.5 py-3.5 sm:px-5">Tên chiến lược</th>
                  <th className="px-2.5 py-3.5 sm:px-4">Phương pháp sử dụng</th>
                  <th className="px-2.5 py-3.5 sm:px-4">Loại chiến lược</th>
                  <th className="px-2.5 py-3.5 text-center sm:px-4">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs sm:text-sm">
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                      Không tìm thấy chiến lược phù hợp.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((item) => {
                    const isActive = item.strategyKey === activeStrategy;
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors hover:bg-[#192238]/70 ${
                          isActive ? 'bg-indigo-500/8' : ''
                        }`}
                      >
                        <td className="px-3.5 py-4 sm:px-5 align-top">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white leading-snug">
                              {item.name}
                            </span>
                            {isActive && (
                              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-emerald-300">
                                ĐANG CHỌN
                              </span>
                            )}
                          </div>
                          <div className="mt-1 font-mono text-[11px] text-slate-400 leading-tight">
                            Tạo: {item.createdAt}
                          </div>
                        </td>
                        <td className="px-2.5 py-4 sm:px-4 align-top font-medium text-slate-200">
                          <div>{item.method}</div>
                          <div className="mt-0.5 font-mono text-[10px] text-slate-400 hidden sm:block">
                            {item.patternCode}
                          </div>
                        </td>
                        <td className="px-2.5 py-4 sm:px-4 align-top font-medium text-slate-200">
                          {item.category}
                        </td>
                        <td className="relative px-2 py-4 sm:px-4 align-top text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuId((cur) => (cur === item.id ? null : item.id))
                            }
                            aria-label={`Thao tác chiến lược ${item.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                          >
                            <MoreVertical className="h-4.5 w-4.5" />
                          </button>

                          {openMenuId === item.id && (
                            <div className="absolute right-4 top-12 z-30 w-48 rounded-xl border border-slate-700 bg-[#101729] p-1.5 text-left shadow-2xl">
                              <button
                                type="button"
                                onClick={() => {
                                  onActivateStrategy(item);
                                  setOpenMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/15 cursor-pointer"
                              >
                                <Play className="h-3.5 w-3.5" />
                                <span>Áp dụng & Tạo Plan</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleCopyCode(item);
                                  setOpenMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                <span>Sao chép cấu trúc</span>
                              </button>
                              {!item.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteStrategy(item.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Xóa chiến lược</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar matching IMG_0100: Hiện kết quả: [6 v]   < [1] 2 > */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-300">
              <span>Hiện kết quả:</span>
              <select
                aria-label="Số kết quả mỗi trang"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-700 bg-[#141C2E] px-3 py-1.5 font-mono text-xs font-bold text-white focus:border-[#5C60F5] focus:outline-none"
              >
                <option value={6}>6</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-35 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setPage(pNum)}
                  aria-label={`Trang ${pNum}`}
                  aria-current={safePage === pNum ? 'page' : undefined}
                  className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 font-mono text-xs font-extrabold transition-colors cursor-pointer ${
                    safePage === pNum
                      ? 'border border-[#5C60F5] bg-[#5C60F5]/20 text-[#7B7FFF]'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {pNum}
                </button>
              ))}

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Trang tiếp theo"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-35 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === VIEW 2: XẾP HẠNG === */}
      {subView === 'ranking' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rankedList.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-700/60 bg-[#151D30] p-4 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-400/15 font-mono text-xs font-black text-amber-300">
                      #{idx + 1}
                    </span>
                    <h3 className="text-sm font-extrabold text-white">{item.name}</h3>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {item.method} · {item.patternCode}
                  </div>
                </div>
                <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#0F1627] px-3 py-2 text-xs">
                <div>
                  <span className="text-slate-400">Tỷ lệ thắng 24h</span>
                  <div className="font-mono text-sm font-black text-emerald-400 tabular-nums">
                    {item.winRateRef.toFixed(1)}%
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">Người dùng</span>
                  <div className="font-mono text-sm font-extrabold text-white tabular-nums">
                    {item.usersCount.toLocaleString('en-US')}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onActivateStrategy(item)}
                className="w-full min-h-[40px] rounded-xl bg-[#5F61F2] hover:bg-[#5254E6] text-xs font-bold text-white cursor-pointer"
              >
                Áp dụng chiến lược
              </button>
            </div>
          ))}
        </div>
      )}

      {/* === VIEW 3: TELEGRAM === */}
      {subView === 'telegram' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <form
            onSubmit={handleSaveTelegram}
            className="rounded-2xl border border-slate-700/60 bg-[#151D30] p-5 space-y-4 lg:col-span-5"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                <Send className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Kết nối Telegram Bot QuickInvest
                </h3>
                <p className="text-xs text-slate-400">
                  Nhận tín hiệu BUY/SELL & báo cáo chốt lời tự động qua Telegram.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="qi-tg-handle" className="mb-1 block text-xs font-bold text-slate-300">
                Telegram Username hoặc Chat ID
              </label>
              <input
                id="qi-tg-handle"
                type="text"
                value={telegramHandle}
                onChange={(e) => setTelegramHandle(e.target.value)}
                placeholder="@ten_telegram_cua_ban"
                className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3.5 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[42px] rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-extrabold text-slate-950 cursor-pointer"
            >
              Lưu liên kết Telegram
            </button>

            {tgSavedMsg && (
              <div className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200">
                {tgSavedMsg}
              </div>
            )}
          </form>

          <div className="rounded-2xl border border-slate-700/60 bg-[#151D30] p-5 space-y-3 lg:col-span-7">
            <h3 className="text-sm font-extrabold text-white">Kênh tín hiệu QuickInvest</h3>
            <div className="space-y-2.5">
              {telegramChannels.map((ch) => {
                const handle = ch.telegramChannel || '';
                const subscribed = subscribedChannels.includes(handle);
                return (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-[#0F1627] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">{ch.name}</div>
                      <div className="font-mono text-xs text-sky-400">{handle}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleChannel(handle)}
                      className={`min-h-[36px] rounded-lg px-3.5 py-1.5 text-xs font-bold shrink-0 cursor-pointer ${
                        subscribed
                          ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'bg-[#5F61F2] text-white hover:bg-[#5254E6]'
                      }`}
                    >
                      {subscribed ? 'Đang theo dõi' : 'Theo dõi'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* === MODAL: THIẾT KẾ BOT AI TÙY CHỈNH === */}
      {designerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Thiết kế chiến lược Bot AI"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/75" onClick={() => setDesignerOpen(false)} />
          <form
            onSubmit={handleCreateCustomStrategy}
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700/80 bg-[#131B2E] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="h-4.5 w-4.5 text-emerald-400" />
                <h3 className="font-display text-base font-extrabold text-white">
                  Thiết kế Bot AI mới
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDesignerOpen(false)}
                aria-label="Đóng thiết kế Bot AI"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {designerError && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
                {designerError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label htmlFor="qi-strat-name" className="mb-1 block text-xs font-bold text-slate-300">
                  Tên chiến lược
                </label>
                <input
                  id="qi-strat-name"
                  type="text"
                  value={stratName}
                  onChange={(e) => setStratName(e.target.value)}
                  placeholder="Ví dụ: QuickInvest Scalping Pro"
                  className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3.5 py-2.5 text-sm text-white focus:border-[#5C60F5] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="qi-strat-method" className="mb-1 block text-xs font-bold text-slate-300">
                    Phương pháp
                  </label>
                  <select
                    id="qi-strat-method"
                    value={stratMethod}
                    onChange={(e) =>
                      setStratMethod(
                        e.target.value as 'String Method' | 'AI Quant' | 'Signal Matrix'
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3 py-2.5 text-xs font-bold text-white"
                  >
                    <option value="String Method">String Method</option>
                    <option value="AI Quant">AI Quant</option>
                    <option value="Signal Matrix">Signal Matrix</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="qi-strat-engine" className="mb-1 block text-xs font-bold text-slate-300">
                    Bộ máy tín hiệu
                  </label>
                  <select
                    id="qi-strat-engine"
                    value={stratKey}
                    onChange={(e) => setStratKey(e.target.value as BotStrategy)}
                    className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3 py-2.5 text-xs font-bold text-white"
                  >
                    <option value="ai_predict">AI Dự Đoán Đa Tầng</option>
                    <option value="martingale">Martingale Cơ Bản</option>
                    <option value="reverse_2">Đảo Chiều Sau 2 Lệnh</option>
                    <option value="reverse_3">Đảo Chiều Sau 3 Lệnh</option>
                    <option value="trend_2_1">Theo Xu Hướng 2-1</option>
                    <option value="bottom_top">Bắt Đáy Đỉnh</option>
                    <option value="zigzag">Zigzag Pattern</option>
                    <option value="ema_rsi">EMA + RSI Momentum</option>
                    <option value="fibonacci">Fibonacci</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="qi-strat-pattern" className="mb-1 block text-xs font-bold text-slate-300">
                  Chuỗi quy tắc / Pattern
                </label>
                <input
                  id="qi-strat-pattern"
                  type="text"
                  value={stratPattern}
                  onChange={(e) => setStratPattern(e.target.value)}
                  placeholder="B-B->S / 1-2-4-8"
                  className="w-full rounded-xl border border-slate-700 bg-[#0D1323] px-3.5 py-2.5 font-mono text-sm text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDesignerOpen(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#4E9C6F] hover:bg-[#43AD73] px-5 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Lưu chiến lược
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
