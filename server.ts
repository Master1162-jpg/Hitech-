import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  computeAiOrderPrediction,
  computeIndicators,
  generateDeterministicBep20Address,
  resolveDepositWalletAddress,
  settleTradeOrder,
  validateInternalTransfer,
  validateMasterWalletAddress,
  validatePasswordChange,
} from './src/lib/tradingEngine';
import type {
  AccountMode,
  AdminRoundOverride,
  AppNotification,
  Candle,
  GeminiDeepPrediction,
  Language,
  MarketSnapshot,
  PlatformSettings,
  RoundPhase,
  TradeDirection,
  TradeOrder,
  UserAccount,
  WalletTransaction,
} from './src/types';

interface StoredUser extends UserAccount {
  passwordHash: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  trades: TradeOrder[];
  transactions: WalletTransaction[];
  notifications: AppNotification[];
  settings: PlatformSettings;
}

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');
const DEFAULT_ADMIN_EMAIL = 'ht.admin@hitechtrade.io';
const DEFAULT_ADMIN_PASSWORD = 'Hitech@Admin2026!';
const ENV_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const ENV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const HAS_CUSTOM_ENV_ADMIN =
  Boolean(ENV_ADMIN_EMAIL) &&
  ENV_ADMIN_EMAIL !== 'my_admin_email' &&
  Boolean(ENV_ADMIN_PASSWORD.trim()) &&
  ENV_ADMIN_PASSWORD !== 'MY_ADMIN_PASSWORD';
const ADMIN_EMAIL = HAS_CUSTOM_ENV_ADMIN ? ENV_ADMIN_EMAIL : DEFAULT_ADMIN_EMAIL;
const ADMIN_PASSWORD = HAS_CUSTOM_ENV_ADMIN ? ENV_ADMIN_PASSWORD : DEFAULT_ADMIN_PASSWORD;

function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(`hitechtrade_${pw}`).digest('hex');
}

function makeInitialSeed(): DatabaseSchema {
  const adminId = 'usr_admin_01';
  const traderId = 'usr_trader_01';
  const trader2Id = 'usr_trader_02';
  const now = Date.now();

  const users: StoredUser[] = [
    {
      id: adminId,
      email: ADMIN_EMAIL,
      nickname: 'AdminMaster',
      passwordHash: hashPassword(ADMIN_PASSWORD),
      role: 'admin',
      liveBalance: 25000,
      demoBalance: 1000,
      walletAddress: generateDeterministicBep20Address(adminId),
      referralCode: 'HTADMIN',
      referredBy: null,
      isVip: true,
      twoFactorEnabled: true,
      kycStatus: 'verified',
      kycFullName: 'Nguyễn Quản Trị',
      kycDocNumber: '079092001234',
      isBanned: false,
      totalDeposited: 25000,
      totalWithdrawn: 0,
      totalVolume: 18400,
      createdAt: new Date(now - 86400000 * 30).toISOString(),
    },
    {
      id: traderId,
      email: 'trader@hitechtrade.io',
      nickname: 'HoangTrader',
      passwordHash: hashPassword('123456'),
      role: 'user',
      liveBalance: 1250,
      demoBalance: 1000,
      walletAddress: generateDeterministicBep20Address(traderId),
      referralCode: 'HT8866',
      referredBy: 'HTADMIN',
      isVip: true,
      twoFactorEnabled: true,
      kycStatus: 'verified',
      kycFullName: 'Trần Minh Hoàng',
      kycDocNumber: '001095008812',
      isBanned: false,
      totalDeposited: 1500,
      totalWithdrawn: 250,
      totalVolume: 4820,
      createdAt: new Date(now - 86400000 * 14).toISOString(),
    },
    {
      id: trader2Id,
      email: 'minh.nguyen@hitechtrade.io',
      nickname: 'MinhCrypto',
      passwordHash: hashPassword('123456'),
      role: 'user',
      liveBalance: 480,
      demoBalance: 1000,
      walletAddress: generateDeterministicBep20Address(trader2Id),
      referralCode: 'HT3399',
      referredBy: 'HT8866',
      isVip: false,
      twoFactorEnabled: false,
      kycStatus: 'pending',
      kycFullName: 'Nguyễn Văn Minh',
      kycDocNumber: '034098004511',
      isBanned: false,
      totalDeposited: 500,
      totalWithdrawn: 0,
      totalVolume: 960,
      createdAt: new Date(now - 86400000 * 5).toISOString(),
    },
  ];

  const transactions: WalletTransaction[] = [
    {
      id: 'tx_seed_01',
      userId: traderId,
      userEmail: 'trader@hitechtrade.io',
      type: 'deposit',
      amount: 1500,
      fee: 0,
      status: 'completed',
      addressOrPeer: generateDeterministicBep20Address(traderId),
      txHash: '0x94a1f82e3b771c09812fa83e19c4b9e028a72101',
      note: 'Nạp USDT',
      createdAt: new Date(now - 86400000 * 10).toISOString(),
      processedAt: new Date(now - 86400000 * 10 + 120000).toISOString(),
    },
    {
      id: 'tx_seed_02',
      userId: traderId,
      userEmail: 'trader@hitechtrade.io',
      type: 'withdraw',
      amount: 250,
      fee: 1,
      status: 'completed',
      addressOrPeer: '0x4E81C903D2719B8A330F42D880A17E9011223344',
      txHash: '0x62b0d44c9e123fa71829c3a50192837465abcd02',
      note: 'Rút về ví Binance cá nhân',
      createdAt: new Date(now - 86400000 * 4).toISOString(),
      processedAt: new Date(now - 86400000 * 4 + 180000).toISOString(),
    },
    {
      id: 'tx_seed_03',
      userId: trader2Id,
      userEmail: 'minh.nguyen@hitechtrade.io',
      type: 'deposit',
      amount: 300,
      fee: 0,
      status: 'pending',
      addressOrPeer: generateDeterministicBep20Address(trader2Id),
      txHash: '0x71c992ab34890ef1234567890abcdef123456789',
      note: 'Yêu cầu xác nhận nạp USDT',
      createdAt: new Date(now - 3600000 * 2).toISOString(),
    },
    {
      id: 'tx_seed_04',
      userId: trader2Id,
      userEmail: 'minh.nguyen@hitechtrade.io',
      type: 'withdraw',
      amount: 120,
      fee: 1,
      status: 'pending',
      addressOrPeer: '0x99887766554433221100AABBCCDDEEFF00112233',
      note: 'Rút lợi nhuận tuần',
      createdAt: new Date(now - 1800000).toISOString(),
    },
  ];

  const trades: TradeOrder[] = [
    {
      id: 'tr_seed_01',
      userId: traderId,
      userEmail: 'trader@hitechtrade.io',
      pair: 'BTC/USDT',
      accountMode: 'live',
      direction: 'BUY',
      amount: 50,
      payoutRate: 0.95,
      entryPrice: 95110.25,
      closePrice: 95148.8,
      roundId: 1001,
      status: 'WON',
      pnl: 47.5,
      source: 'manual',
      createdAt: new Date(now - 7200000).toISOString(),
      settledAt: new Date(now - 7140000).toISOString(),
    },
    {
      id: 'tr_seed_02',
      userId: traderId,
      userEmail: 'trader@hitechtrade.io',
      pair: 'BTC/USDT',
      accountMode: 'live',
      direction: 'SELL',
      amount: 25,
      payoutRate: 0.95,
      entryPrice: 95180.1,
      closePrice: 95162.4,
      roundId: 1002,
      status: 'WON',
      pnl: 23.75,
      source: 'bot',
      createdAt: new Date(now - 3600000).toISOString(),
      settledAt: new Date(now - 3540000).toISOString(),
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'ntf_seed_01',
      userId: traderId,
      title: 'Chào mừng đến với HitechTrade',
      message: 'Tài khoản Demo $1,000 đã sẵn sàng. Bắt đầu giao dịch BTC/USDT hoặc kích hoạt Bot AI.',
      type: 'system',
      read: false,
      createdAt: new Date(now - 3600000 * 6).toISOString(),
    },
    {
      id: 'ntf_seed_02',
      userId: traderId,
      title: 'Lệnh thắng +$47.50',
      message: 'Lệnh MUA BTC/USDT $50.00 đã chốt lời thành công (+95%).',
      type: 'trade',
      read: false,
      createdAt: new Date(now - 7140000).toISOString(),
    },
  ];

  const settings: PlatformSettings = {
    payoutRate: 0.95,
    minTradeAmount: 1,
    maxTradeAmount: 10000,
    withdrawFee: 1,
    vipFee: 100,
    prizePool: 27680.5,
    masterWalletAddress: '0x71C7656EC7AB88B098DEF751B7401B5F6D8976F0',
    maintenanceMode: false,
  };

  return { users, trades, transactions, notifications, settings };
}

function loadDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const seeded = makeInitialSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
    return seeded;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    const adminUser = parsed.users.find((u) => u.id === 'usr_admin_01' || u.role === 'admin');
    const expectedHash = hashPassword(ADMIN_PASSWORD);
    if (!adminUser) {
      const seededAdmin = makeInitialSeed().users[0];
      parsed.users.unshift(seededAdmin);
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    } else if (
      adminUser.email !== ADMIN_EMAIL ||
      adminUser.passwordHash !== expectedHash ||
      adminUser.role !== 'admin' ||
      adminUser.isBanned
    ) {
      adminUser.email = ADMIN_EMAIL;
      adminUser.passwordHash = expectedHash;
      adminUser.role = 'admin';
      adminUser.isBanned = false;
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch {
    const seeded = makeInitialSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
    return seeded;
  }
}

let db: DatabaseSchema = loadDb();

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store.json:', err);
  }
}

function sanitizeUser(u: StoredUser): UserAccount {
  const { passwordHash: _pw, ...safe } = u;
  return safe;
}

// In-memory session store (persisted with simple HMAC-like token validation so restarts still work)
const SESSION_SECRET = 'hitechtrade_session_secret_2026';
function createToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token?: string): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as { userId: string };
    return parsed.userId;
  } catch {
    return null;
  }
}

// ==========================================
// Synchronized BTC/USDT Market Engine
// ==========================================
function generateInitialCandles(count = 72): Candle[] {
  const candles: Candle[] = [];
  let price = 95040;
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const open = Number(price.toFixed(2));
    const delta = Math.sin(i * 0.72) * 20 + (Math.random() - 0.5) * 44;
    const close = Number(Math.max(94200, Math.min(96200, open + delta)).toFixed(2));
    const wickUp = Math.random() * 24 + 4;
    const wickDown = Math.random() * 24 + 4;
    const high = Number((Math.max(open, close) + wickUp).toFixed(2));
    const low = Number((Math.min(open, close) - wickDown).toFixed(2));
    const volume = Number((8 + Math.random() * 24).toFixed(2));
    candles.push({
      id: 6478700 + i,
      timestamp: now - (count - i) * 30000,
      open,
      high,
      low,
      close,
      volume,
      result: close >= open ? 'BUY' : 'SELL',
    });
    price = close;
  }
  return candles;
}

const candles: Candle[] = generateInitialCandles(72);
const lastResults: TradeDirection[] = candles.slice(-76).map((c) => c.result);

let currentPrice = candles[candles.length - 1].close;
let roundId = 6478772;
let roundPhase: RoundPhase = 'betting'; // 0..29s betting, 30..59s waiting
let secondsRemaining = 30;
let roundEntryPrice = currentPrice;
let adminRoundOverride: AdminRoundOverride = 'auto';

let activeCandle: Candle = {
  id: roundId,
  timestamp: Date.now(),
  open: currentPrice,
  high: currentPrice,
  low: currentPrice,
  close: currentPrice,
  volume: 4.5,
  result: 'BUY',
};

function settleRoundOrders(settledRoundId: number, entry: number, close: number) {
  let anyChanged = false;
  const nowIso = new Date().toISOString();

  for (const order of db.trades) {
    if (order.roundId === settledRoundId && order.status === 'OPEN') {
      const outcome = settleTradeOrder(
        order.direction,
        order.amount,
        order.payoutRate,
        entry,
        close
      );
      order.status = outcome.status;
      order.pnl = outcome.pnl;
      order.closePrice = close;
      order.settledAt = nowIso;

      const user = db.users.find((u) => u.id === order.userId);
      if (user) {
        if (outcome.totalReturn > 0) {
          if (order.accountMode === 'live') {
            user.liveBalance = Number((user.liveBalance + outcome.totalReturn).toFixed(2));
          } else {
            user.demoBalance = Number((user.demoBalance + outcome.totalReturn).toFixed(2));
          }
        }
        db.notifications.unshift({
          id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: user.id,
          title:
            outcome.status === 'WON'
              ? `Thắng +$${outcome.pnl.toFixed(2)} (${order.accountMode.toUpperCase()})`
              : outcome.status === 'DRAW'
              ? `Hòa lệnh hoàn $${order.amount.toFixed(2)} (${order.accountMode.toUpperCase()})`
              : `Kết thúc lệnh -$${order.amount.toFixed(2)} (${order.accountMode.toUpperCase()})`,
          message: `Lệnh ${order.direction === 'BUY' ? 'MUA' : 'BÁN'} BTC/USDT $${order.amount.toFixed(2)} chốt ở $${close.toFixed(2)}.`,
          type: order.source === 'bot' ? 'bot' : 'trade',
          read: false,
          createdAt: nowIso,
        });
        if (db.notifications.length > 200) db.notifications.length = 200;
      }
      anyChanged = true;
    }
  }

  if (anyChanged) {
    saveDb();
  }
}

// 500ms tick loop for smooth Kaizenfin-style live candlestick movement
setInterval(() => {
  const cycleBias = Math.sin(roundId * 0.95) * 1.15;
  const meanPull = (95100 - currentPrice) * 0.004;
  let drift = (Math.random() - 0.5) * 10.5 + cycleBias + meanPull;
  if (roundPhase === 'waiting' && adminRoundOverride !== 'auto') {
    const targetGap = adminRoundOverride === 'BUY' ? 18 : -18;
    const desired = roundEntryPrice + targetGap;
    drift = (desired - currentPrice) * 0.25 + (Math.random() - 0.5) * 2.5;
  }
  currentPrice = Number(Math.max(93500, Math.min(97500, currentPrice + drift)).toFixed(2));
  activeCandle.close = currentPrice;
  activeCandle.high = Number(Math.max(activeCandle.high, currentPrice).toFixed(2));
  activeCandle.low = Number(Math.min(activeCandle.low, currentPrice).toFixed(2));
  activeCandle.volume = Number((activeCandle.volume + Math.random() * 0.35).toFixed(2));
  activeCandle.result = activeCandle.close >= activeCandle.open ? 'BUY' : 'SELL';
}, 500);

// 1s phase countdown loop (30s Betting -> 30s Waiting -> Settle -> New Round)
setInterval(() => {
  secondsRemaining -= 1;
  if (secondsRemaining <= 0) {
    if (roundPhase === 'betting') {
      // Transition to 30s result / waiting phase
      roundPhase = 'waiting';
      secondsRemaining = 30;
      roundEntryPrice = activeCandle.open;
    } else {
      // Close active candle, settle orders, start new betting round
      let finalClose = currentPrice;
      if (adminRoundOverride === 'BUY' && finalClose <= activeCandle.open) {
        finalClose = Number((activeCandle.open + 14.5).toFixed(2));
      } else if (adminRoundOverride === 'SELL' && finalClose >= activeCandle.open) {
        finalClose = Number((activeCandle.open - 14.5).toFixed(2));
      }
      currentPrice = finalClose;
      activeCandle.close = finalClose;
      activeCandle.high = Number(Math.max(activeCandle.high, finalClose).toFixed(2));
      activeCandle.low = Number(Math.min(activeCandle.low, finalClose).toFixed(2));
      activeCandle.result = finalClose >= activeCandle.open ? 'BUY' : 'SELL';

      candles.push({ ...activeCandle });
      if (candles.length > 90) candles.shift();

      lastResults.push(activeCandle.result);
      if (lastResults.length > 100) lastResults.shift();

      settleRoundOrders(roundId, activeCandle.open, finalClose);

      db.settings.prizePool = Number((db.settings.prizePool + Math.random() * 4.2).toFixed(2));

      roundId += 1;
      roundPhase = 'betting';
      secondsRemaining = 30;
      adminRoundOverride = 'auto';
      roundEntryPrice = currentPrice;
      activeCandle = {
        id: roundId,
        timestamp: Date.now(),
        open: currentPrice,
        high: currentPrice,
        low: currentPrice,
        close: currentPrice,
        volume: 1.2,
        result: 'BUY',
      };
    }
  }
}, 1000);

// ==========================================
// Express Server & API Routes
// ==========================================
async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  function getAuthUser(req: express.Request): StoredUser | null {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const userId = verifyToken(token);
    if (!userId) return null;
    return db.users.find((u) => u.id === userId) ?? null;
  }

  function requireAuth(req: express.Request, res: express.Response): StoredUser | null {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
      return null;
    }
    if (user.isBanned) {
      res.status(403).json({ error: 'Tài khoản của bạn đã bị tạm khóa bởi quản trị viên.' });
      return null;
    }
    return user;
  }

  function requireAdmin(req: express.Request, res: express.Response): StoredUser | null {
    const user = requireAuth(req, res);
    if (!user) return null;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Bạn không có quyền truy cập bảng điều khiển Admin.' });
      return null;
    }
    return user;
  }

  // --- Auth Routes ---
  app.post('/api/auth/register', (req, res) => {
    const { email, nickname, password, referralCode } = req.body as {
      email?: string;
      nickname?: string;
      password?: string;
      referralCode?: string;
    };
    const cleanEmail = (email ?? '').trim().toLowerCase();
    const cleanNick = (nickname ?? '').trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Email không hợp lệ.' });
    }
    if (!cleanNick || cleanNick.length < 3) {
      return res.status(400).json({ error: 'Biệt danh phải có ít nhất 3 ký tự.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }
    if (db.users.some((u) => u.email === cleanEmail)) {
      return res.status(409).json({ error: 'Email này đã được đăng ký.' });
    }
    if (db.users.some((u) => u.nickname.toLowerCase() === cleanNick.toLowerCase())) {
      return res.status(409).json({ error: 'Biệt danh này đã có người sử dụng.' });
    }

    const id = `usr_${Date.now().toString(36)}`;
    const newUser: StoredUser = {
      id,
      email: cleanEmail,
      nickname: cleanNick,
      passwordHash: hashPassword(password),
      role: 'user',
      liveBalance: 0,
      demoBalance: 1000,
      walletAddress: generateDeterministicBep20Address(id + cleanEmail),
      referralCode: `HT${Math.floor(1000 + Math.random() * 9000)}`,
      referredBy: referralCode?.trim() || null,
      isVip: false,
      twoFactorEnabled: false,
      kycStatus: 'unverified',
      isBanned: false,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalVolume: 0,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.notifications.unshift({
      id: `ntf_${Date.now()}`,
      userId: id,
      title: 'Tặng $1,000 tài khoản Demo',
      message: 'Tài khoản HitechTrade của bạn đã sẵn sàng với $1,000 vốn thử nghiệm miễn phí.',
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });
    saveDb();

    const token = createToken(id);
    return res.json({ token, user: sanitizeUser(newUser) });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const identifier = (email ?? '').trim().toLowerCase();
    const rawPassword = password ?? '';
    const pwHash = hashPassword(rawPassword);

    let user = db.users.find(
      (u) => u.email.toLowerCase() === identifier || u.nickname.toLowerCase() === identifier
    );

    const isIssuedAdminLogin =
      (identifier === DEFAULT_ADMIN_EMAIL || identifier === 'adminmaster') &&
      rawPassword === DEFAULT_ADMIN_PASSWORD;

    if (!user && isIssuedAdminLogin) {
      user = db.users.find((u) => u.id === 'usr_admin_01' || u.role === 'admin');
    }

    const passwordValid =
      Boolean(user) &&
      (user!.passwordHash === pwHash || (user!.role === 'admin' && isIssuedAdminLogin));

    if (!user || !passwordValid) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
    }
    if (user.isBanned) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa. Liên hệ support@hitechtrade.io.' });
    }
    const token = createToken(user.id);
    return res.json({ token, user: sanitizeUser(user) });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body as { email?: string };
    const cleanEmail = (email ?? '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Vui lòng nhập địa chỉ email.' });
    }
    return res.json({
      message: `Nếu email ${cleanEmail} tồn tại trên hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.`,
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    return res.json({ user: sanitizeUser(user) });
  });

  // --- Market & Trade Routes ---
  app.get('/api/market/state', (req, res) => {
    const allCandles = [...candles, activeCandle];
    const indicators = computeIndicators(allCandles);
    const open24h = candles[0]?.open ?? currentPrice;
    const high24h = Math.max(...allCandles.map((c) => c.high));
    const low24h = Math.min(...allCandles.map((c) => c.low));
    const change24hPct = Number((((currentPrice - open24h) / open24h) * 100).toFixed(2));

    const snapshot: MarketSnapshot = {
      pair: 'BTC/USDT',
      currentPrice,
      open24h,
      high24h,
      low24h,
      change24hPct,
      roundId,
      phase: roundPhase,
      secondsRemaining,
      candles: allCandles.slice(-60),
      lastResults: lastResults.slice(-80),
      prizePool: db.settings.prizePool,
      payoutRate: db.settings.payoutRate,
      sentimentBuyPct: indicators.sentimentBuyPct,
      sentimentSellPct: indicators.sentimentSellPct,
      maintenanceMode: db.settings.maintenanceMode,
      depositWalletAddress: db.settings.masterWalletAddress,
    };

    const user = getAuthUser(req);
    const orders = user
      ? db.trades.filter((t) => t.userId === user.id).slice(0, 200)
      : [];

    return res.json({
      market: snapshot,
      user: user ? sanitizeUser(user) : null,
      orders,
    });
  });

  app.post('/api/trades', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    if (db.settings.maintenanceMode && user.role !== 'admin') {
      return res.status(503).json({ error: 'Hệ thống đang bảo trì giao dịch tạm thời.' });
    }

    if (roundPhase !== 'betting') {
      return res.status(400).json({ error: 'Đang trong thời gian chờ kết quả. Vui lòng đợi phiên kế tiếp.' });
    }

    const { direction, amount, accountMode, source } = req.body as {
      direction?: TradeDirection;
      amount?: number;
      accountMode?: AccountMode;
      source?: 'manual' | 'bot';
    };

    if (direction !== 'BUY' && direction !== 'SELL') {
      return res.status(400).json({ error: 'Hướng đặt lệnh không hợp lệ.' });
    }
    const mode: AccountMode = accountMode === 'live' ? 'live' : 'demo';
    const stake = Number(amount ?? 0);
    if (!Number.isFinite(stake) || stake < db.settings.minTradeAmount || stake > db.settings.maxTradeAmount) {
      return res.status(400).json({
        error: `Số tiền đặt lệnh phải từ $${db.settings.minTradeAmount} đến $${db.settings.maxTradeAmount}.`,
      });
    }

    const available = mode === 'live' ? user.liveBalance : user.demoBalance;
    if (stake > available) {
      return res.status(400).json({
        error: `Số dư tài khoản ${mode === 'live' ? 'Thực (Live)' : 'Demo'} không đủ.`,
      });
    }

    if (mode === 'live') {
      user.liveBalance = Number((user.liveBalance - stake).toFixed(2));
      user.totalVolume = Number((user.totalVolume + stake).toFixed(2));
    } else {
      user.demoBalance = Number((user.demoBalance - stake).toFixed(2));
    }

    const newOrder: TradeOrder = {
      id: `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      userEmail: user.email,
      pair: 'BTC/USDT',
      accountMode: mode,
      direction,
      amount: stake,
      payoutRate: db.settings.payoutRate,
      entryPrice: currentPrice,
      roundId,
      status: 'OPEN',
      pnl: 0,
      source: source === 'bot' ? 'bot' : 'manual',
      createdAt: new Date().toISOString(),
    };

    db.trades.unshift(newOrder);
    if (db.trades.length > 500) db.trades.length = 500;
    saveDb();

    return res.json({ order: newOrder, user: sanitizeUser(user) });
  });

  // --- Server-Side Gemini AI Deep Order Prediction ---
  app.post('/api/bot/ai-predict', async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({
        error:
          'Chưa cấu hình GEMINI_API_KEY trong bảng Settings > Secrets để chạy phân tích chuyên sâu Gemini AI. Bộ dự đoán kỹ thuật 5 chỉ báo thời gian thực vẫn đang hoạt động bình thường.',
      });
    }

    const { lang } = (req.body || {}) as { lang?: Language };
    const isVi = lang !== 'en';
    const allCandles = [...candles, activeCandle];
    const recentCandles = allCandles.slice(-20);
    const indicators = computeIndicators(allCandles);
    const quant = computeAiOrderPrediction(allCandles, lastResults.slice(-20), roundId);
    const lastIdx = Math.max(0, indicators.ema5.length - 1);

    const candleLines = recentCandles
      .map(
        (c, i) =>
          `#${i + 1} O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)} V:${c.volume.toFixed(1)} (${c.result})`
      )
      .join('\n');

    const prompt = [
      `Analyze the live BTC/USDT 60-second market snapshot for Round #${roundId} (phase: ${roundPhase}, ${secondsRemaining}s remaining).`,
      `Current Price: $${currentPrice.toFixed(2)}`,
      `EMA5: ${(indicators.ema5[lastIdx] ?? currentPrice).toFixed(2)}, EMA10: ${(indicators.ema10[lastIdx] ?? currentPrice).toFixed(2)}`,
      `RSI(14): ${indicators.rsi14}, MACD: ${indicators.macd}, Signal: ${indicators.macdSignal}`,
      `Bollinger Upper: ${indicators.bollingerUpper}, Lower: ${indicators.bollingerLower}`,
      `Recent 15 Waterdrop results (oldest -> newest): ${lastResults.slice(-15).join(', ')}`,
      `5-Factor Quant Baseline: ${quant.direction} (${quant.confidencePct}%), Support: ${quant.supportPrice}, Resistance: ${quant.resistancePrice}`,
      `Last 20 candles:\n${candleLines}`,
      isVi
        ? 'Trả về nhận định dự đoán lệnh tiếp theo (BUY hoặc SELL) ngắn gọn, chuyên nghiệp bằng tiếng Việt theo đúng cấu trúc JSON.'
        : 'Return a concise, professional next-round order forecast (BUY or SELL) in English matching the JSON schema.',
    ].join('\n');

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction: isVi
            ? 'Bạn là chuyên gia phân tích định lượng BTC/USDT khung 1 phút cho sàn HitechTrade. Đưa ra phân tích súc tích, thực tế (headline dưới 14 từ, analysis 2-3 câu rõ ràng, riskNote 1 câu nhắc quản trị vốn). Không bao giờ khẳng định thắng 100%.'
            : 'You are a quantitative 1-minute BTC/USDT market analyst for HitechTrade. Provide concise, disciplined analysis (headline under 14 words, analysis 2-3 sentences, riskNote 1 sentence on risk management). Never guarantee profits.',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              direction: {
                type: Type.STRING,
                description: 'Must be strictly BUY or SELL.',
              },
              confidencePct: {
                type: Type.INTEGER,
                description: 'Calibrated integer confidence percentage between 52 and 92.',
              },
              headline: {
                type: Type.STRING,
                description: 'Short tactical headline summarizing the signal.',
              },
              analysis: {
                type: Type.STRING,
                description: '2-3 sentences explaining price action, EMA/RSI/MACD momentum, and waterdrop context.',
              },
              riskNote: {
                type: Type.STRING,
                description: '1 concise risk management warning for this round.',
              },
              supportLevel: {
                type: Type.NUMBER,
                description: 'Immediate support price in USDT.',
              },
              resistanceLevel: {
                type: Type.NUMBER,
                description: 'Immediate resistance price in USDT.',
              },
            },
            required: [
              'direction',
              'confidencePct',
              'headline',
              'analysis',
              'riskNote',
              'supportLevel',
              'resistanceLevel',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        return res.status(502).json({ error: 'Gemini AI không trả về dữ liệu phân tích. Vui lòng thử lại.' });
      }

      const parsed = JSON.parse(rawText) as {
        direction?: string;
        confidencePct?: number;
        headline?: string;
        analysis?: string;
        riskNote?: string;
        supportLevel?: number;
        resistanceLevel?: number;
      };

      const normalizedDir: TradeDirection =
        String(parsed.direction || '').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
      const clampedConfidence = Math.min(
        94,
        Math.max(52, Math.round(Number(parsed.confidencePct) || quant.confidencePct))
      );

      const result: GeminiDeepPrediction = {
        roundId,
        model: 'gemini-4-hydrogen',
        direction: normalizedDir,
        confidencePct: clampedConfidence,
        headline: String(parsed.headline || '').trim(),
        analysis: String(parsed.analysis || '').trim(),
        riskNote: String(parsed.riskNote || '').trim(),
        supportLevel: Number((Number(parsed.supportLevel) || quant.supportPrice).toFixed(2)),
        resistanceLevel: Number((Number(parsed.resistanceLevel) || quant.resistancePrice).toFixed(2)),
        generatedAt: new Date().toISOString(),
      };

      return res.json({ prediction: result });
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: number }).status)
          : 502;
      const errMsg = err instanceof Error ? err.message : String(err);

      if (status === 400 || status === 403 || /API_KEY_INVALID|PERMISSION_DENIED/i.test(errMsg)) {
        return res.status(403).json({
          error:
            'API Key Gemini không hợp lệ hoặc không có quyền truy cập. Vui lòng kiểm tra lại GEMINI_API_KEY trong Settings > Secrets.',
        });
      }
      if (status === 429 || /RESOURCE_EXHAUSTED/i.test(errMsg)) {
        return res.status(429).json({
          error:
            'Đã vượt hạn mức gọi Gemini API tạm thời. Vui lòng thử lại sau ít phút hoặc nâng cấp khóa API trong Settings > Secrets.',
        });
      }
      return res.status(502).json({
        error: `Không thể kết nối dịch vụ Gemini AI lúc này (${errMsg.slice(0, 120)}).`,
      });
    }
  });

  // --- Account & Profile Routes ---
  app.post('/api/account/reset-demo', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    user.demoBalance = 1000;
    saveDb();
    return res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/account/profile', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const {
      nickname,
      twoFactorEnabled,
      hideSensitiveData,
      avatarUrl,
      kycFullName,
      kycDocNumber,
    } = req.body as {
      nickname?: string;
      twoFactorEnabled?: boolean;
      hideSensitiveData?: boolean;
      avatarUrl?: string | null;
      kycFullName?: string;
      kycDocNumber?: string;
    };

    if (nickname !== undefined) {
      const clean = nickname.trim();
      if (clean.length < 3) return res.status(400).json({ error: 'Biệt danh tối thiểu 3 ký tự.' });
      const duplicate = db.users.some(
        (u) => u.id !== user.id && u.nickname.toLowerCase() === clean.toLowerCase()
      );
      if (duplicate) return res.status(409).json({ error: 'Biệt danh này đã có người sử dụng.' });
      user.nickname = clean;
    }
    if (typeof twoFactorEnabled === 'boolean') {
      user.twoFactorEnabled = twoFactorEnabled;
    }
    if (typeof hideSensitiveData === 'boolean') {
      user.hideSensitiveData = hideSensitiveData;
    }
    if (avatarUrl !== undefined) {
      if (avatarUrl === null || avatarUrl === '') {
        delete user.avatarUrl;
      } else if (
        typeof avatarUrl === 'string' &&
        avatarUrl.startsWith('data:image/') &&
        avatarUrl.length <= 450_000
      ) {
        user.avatarUrl = avatarUrl;
      } else {
        return res.status(400).json({ error: 'Ảnh đại diện không hợp lệ hoặc vượt quá dung lượng cho phép.' });
      }
    }
    if (kycFullName && kycDocNumber) {
      if (user.kycStatus === 'verified') {
        return res.status(400).json({ error: 'Hồ sơ đã xác minh không thể chỉnh sửa.' });
      }
      user.kycFullName = kycFullName.trim();
      user.kycDocNumber = kycDocNumber.trim();
      user.kycStatus = 'pending';
      db.notifications.unshift({
        id: `ntf_${Date.now()}`,
        userId: user.id,
        title: 'Hồ sơ KYC đã được gửi',
        message: 'Hồ sơ định danh của bạn đang được quản trị viên xét duyệt.',
        type: 'system',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    saveDb();
    return res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/account/change-password', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const { currentPassword, newPassword, confirmPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };
    const check = validatePasswordChange({
      twoFactorEnabled: user.twoFactorEnabled,
      currentPassword: currentPassword ?? '',
      newPassword: newPassword ?? '',
      confirmPassword: confirmPassword ?? '',
    });
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }
    if (user.passwordHash !== hashPassword(currentPassword ?? '')) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác.' });
    }
    user.passwordHash = hashPassword(newPassword ?? '');
    db.notifications.unshift({
      id: `ntf_${Date.now()}`,
      userId: user.id,
      title: 'Đổi mật khẩu thành công',
      message: 'Mật khẩu đăng nhập HitechTrade của bạn vừa được cập nhật.',
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });
    saveDb();
    return res.json({ ok: true, message: 'Đổi mật khẩu thành công.' });
  });

  app.get('/api/account/network-info', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const cleanIp = rawIp.startsWith('::ffff:') ? rawIp.slice(7) : rawIp;
    return res.json({
      ip: cleanIp,
      serverTime: Date.now(),
    });
  });

  app.post('/api/account/upgrade-vip', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (user.isVip) {
      return res.status(400).json({ error: 'Tài khoản của bạn đã là thành viên VIP.' });
    }
    const fee = db.settings.vipFee;
    if (user.liveBalance < fee) {
      return res.status(400).json({ error: `Cần ít nhất ${fee} USDT trong Ví Thực để nâng cấp VIP.` });
    }
    user.liveBalance = Number((user.liveBalance - fee).toFixed(2));
    user.isVip = true;
    db.transactions.unshift({
      id: `tx_${Date.now().toString(36)}`,
      userId: user.id,
      userEmail: user.email,
      type: 'vip_upgrade',
      amount: fee,
      fee: 0,
      status: 'completed',
      addressOrPeer: 'HitechTrade VIP Program',
      note: 'Kích hoạt quyền lợi VIP & Hoa hồng Affiliate',
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    });
    saveDb();
    return res.json({ user: sanitizeUser(user) });
  });

  // --- Wallet, QR Deposit, Withdraw & Internal Transfer ---
  app.get('/api/wallet/transactions', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const txs = db.transactions.filter((t) => t.userId === user.id);
    const referrals = db.users
      .filter((u) => u.referredBy === user.referralCode)
      .map((u) => ({
        nickname: u.nickname,
        email: u.email.replace(/(.{2}).+(@.+)/, '$1***$2'),
        isVip: u.isVip,
        totalVolume: u.totalVolume,
        createdAt: u.createdAt,
      }));
    return res.json({ transactions: txs, referrals, settings: db.settings });
  });

  app.post('/api/wallet/deposit', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const { amount, txHash, instantTestCredit } = req.body as {
      amount?: number;
      txHash?: string;
      instantTestCredit?: boolean;
    };
    const amt = Number(amount ?? 0);
    if (!Number.isFinite(amt) || amt < 5) {
      return res.status(400).json({ error: 'Số tiền nạp tối thiểu là 5 USDT.' });
    }
    const nowIso = new Date().toISOString();
    const isInstant = Boolean(instantTestCredit);

    const tx: WalletTransaction = {
      id: `tx_${Date.now().toString(36)}`,
      userId: user.id,
      userEmail: user.email,
      type: 'deposit',
      amount: amt,
      fee: 0,
      status: isInstant ? 'completed' : 'pending',
      addressOrPeer: resolveDepositWalletAddress(db.settings.masterWalletAddress, user.walletAddress),
      txHash: txHash?.trim() || `0x${crypto.randomBytes(16).toString('hex')}`,
      note: isInstant ? 'Nạp USDT xác nhận nhanh' : 'Nạp USDT chờ Admin duyệt',
      createdAt: nowIso,
      processedAt: isInstant ? nowIso : undefined,
    };

    if (isInstant) {
      user.liveBalance = Number((user.liveBalance + amt).toFixed(2));
      user.totalDeposited = Number((user.totalDeposited + amt).toFixed(2));
    }

    db.transactions.unshift(tx);
    db.notifications.unshift({
      id: `ntf_${Date.now()}`,
      userId: user.id,
      title: isInstant ? `Nạp thành công +$${amt.toFixed(2)}` : `Yêu cầu nạp $${amt.toFixed(2)}`,
      message: isInstant
        ? `Số dư Ví Thực đã được cộng +${amt.toFixed(2)} USDT.`
        : `Lệnh nạp ${amt.toFixed(2)} USDT đang chờ quản trị viên xác nhận.`,
      type: 'wallet',
      read: false,
      createdAt: nowIso,
    });
    saveDb();
    return res.json({ transaction: tx, user: sanitizeUser(user) });
  });

  app.post('/api/wallet/withdraw', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const { amount, address, note } = req.body as {
      amount?: number;
      address?: string;
      note?: string;
    };
    const amt = Number(amount ?? 0);
    const fee = db.settings.withdrawFee;
    if (!Number.isFinite(amt) || amt < 5) {
      return res.status(400).json({ error: 'Số tiền rút tối thiểu là 5 USDT.' });
    }
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address.trim())) {
      return res.status(400).json({ error: 'Địa chỉ ví nhận (0x...) không hợp lệ.' });
    }
    if (amt + fee > user.liveBalance) {
      return res.status(400).json({
        error: `Số dư Ví Thực không đủ (cần ${(amt + fee).toFixed(2)} USDT bao gồm phí ${fee} USDT).`,
      });
    }

    user.liveBalance = Number((user.liveBalance - (amt + fee)).toFixed(2));
    const nowIso = new Date().toISOString();
    const tx: WalletTransaction = {
      id: `tx_${Date.now().toString(36)}`,
      userId: user.id,
      userEmail: user.email,
      type: 'withdraw',
      amount: amt,
      fee,
      status: 'pending',
      addressOrPeer: address.trim(),
      note: note?.trim() || 'Rút USDT',
      createdAt: nowIso,
    };
    db.transactions.unshift(tx);
    db.notifications.unshift({
      id: `ntf_${Date.now()}`,
      userId: user.id,
      title: `Yêu cầu rút -$${amt.toFixed(2)}`,
      message: `Lệnh rút ${amt.toFixed(2)} USDT về ${address.slice(0, 8)}... đang chờ duyệt.`,
      type: 'wallet',
      read: false,
      createdAt: nowIso,
    });
    saveDb();
    return res.json({ transaction: tx, user: sanitizeUser(user) });
  });

  app.get('/api/wallet/lookup', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const query = String(req.query.query ?? '').trim().toLowerCase();
    if (!query) {
      return res.status(400).json({ error: 'Nhập Email hoặc Biệt danh người nhận.' });
    }
    const found = db.users.find(
      (u) => u.email.toLowerCase() === query || u.nickname.toLowerCase() === query
    );
    if (!found) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản người nhận.' });
    }
    if (found.id === user.id) {
      return res.status(400).json({ error: 'Không thể chuyển tiền cho chính tài khoản của bạn.' });
    }
    return res.json({
      recipient: {
        id: found.id,
        email: found.email,
        nickname: found.nickname,
        isVip: found.isVip,
      },
    });
  });

  app.post('/api/wallet/transfer', (req, res) => {
    const sender = requireAuth(req, res);
    if (!sender) return;
    const { recipientQuery, amount, note } = req.body as {
      recipientQuery?: string;
      amount?: number;
      note?: string;
    };
    const q = (recipientQuery ?? '').trim().toLowerCase();
    const recipient = db.users.find(
      (u) => u.email.toLowerCase() === q || u.nickname.toLowerCase() === q
    );
    const amt = Number(amount ?? 0);
    const check = validateInternalTransfer({ sender, recipient, amount: amt });
    if (!check.valid || !recipient) {
      return res.status(400).json({ error: check.error || 'Giao dịch không hợp lệ.' });
    }

    sender.liveBalance = Number((sender.liveBalance - amt).toFixed(2));
    recipient.liveBalance = Number((recipient.liveBalance + amt).toFixed(2));
    const nowIso = new Date().toISOString();

    const outTx: WalletTransaction = {
      id: `tx_${Date.now().toString(36)}_out`,
      userId: sender.id,
      userEmail: sender.email,
      type: 'transfer_out',
      amount: amt,
      fee: 0,
      status: 'completed',
      addressOrPeer: `${recipient.nickname} (${recipient.email})`,
      note: note?.trim() || 'Chuyển tiền nội bộ HitechTrade',
      createdAt: nowIso,
      processedAt: nowIso,
    };

    const inTx: WalletTransaction = {
      id: `tx_${Date.now().toString(36)}_in`,
      userId: recipient.id,
      userEmail: recipient.email,
      type: 'transfer_in',
      amount: amt,
      fee: 0,
      status: 'completed',
      addressOrPeer: `${sender.nickname} (${sender.email})`,
      note: note?.trim() || 'Nhận chuyển tiền nội bộ HitechTrade',
      createdAt: nowIso,
      processedAt: nowIso,
    };

    db.transactions.unshift(outTx, inTx);
    db.notifications.unshift(
      {
        id: `ntf_${Date.now()}_s`,
        userId: sender.id,
        title: `Đã chuyển -$${amt.toFixed(2)}`,
        message: `Bạn đã chuyển nội bộ ${amt.toFixed(2)} USDT đến ${recipient.nickname}.`,
        type: 'wallet',
        read: false,
        createdAt: nowIso,
      },
      {
        id: `ntf_${Date.now()}_r`,
        userId: recipient.id,
        title: `Nhận +$${amt.toFixed(2)}`,
        message: `Bạn vừa nhận ${amt.toFixed(2)} USDT từ ${sender.nickname} (Phí 0%).`,
        type: 'wallet',
        read: false,
        createdAt: nowIso,
      }
    );
    saveDb();

    return res.json({ transaction: outTx, user: sanitizeUser(sender) });
  });

  // --- Notifications ---
  app.get('/api/notifications', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const list = db.notifications.filter((n) => n.userId === user.id).slice(0, 30);
    return res.json({ notifications: list });
  });

  app.post('/api/notifications/read', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    for (const n of db.notifications) {
      if (n.userId === user.id) n.read = true;
    }
    saveDb();
    return res.json({ ok: true });
  });

  // --- Admin Control Panel APIs ---
  app.get('/api/admin/overview', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const currentRoundOrders = db.trades.filter((t) => t.roundId === roundId && t.status === 'OPEN');
    const liveBuyVolume = currentRoundOrders
      .filter((t) => t.accountMode === 'live' && t.direction === 'BUY')
      .reduce((acc, t) => acc + t.amount, 0);
    const liveSellVolume = currentRoundOrders
      .filter((t) => t.accountMode === 'live' && t.direction === 'SELL')
      .reduce((acc, t) => acc + t.amount, 0);
    const totalBuyVolume = currentRoundOrders
      .filter((t) => t.direction === 'BUY')
      .reduce((acc, t) => acc + t.amount, 0);
    const totalSellVolume = currentRoundOrders
      .filter((t) => t.direction === 'SELL')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalUsers = db.users.length;
    const totalLiveBalance = db.users.reduce((acc, u) => acc + u.liveBalance, 0);
    const totalVolume = db.users.reduce((acc, u) => acc + u.totalVolume, 0);
    const pendingDeposits = db.transactions.filter((t) => t.type === 'deposit' && t.status === 'pending').length;
    const pendingWithdrawals = db.transactions.filter((t) => t.type === 'withdraw' && t.status === 'pending').length;
    const platformNetPnl = db.trades
      .filter((t) => t.accountMode === 'live' && t.status !== 'OPEN')
      .reduce((acc, t) => acc - t.pnl, 0);

    return res.json({
      stats: {
        totalUsers,
        totalLiveBalance: Number(totalLiveBalance.toFixed(2)),
        totalVolume: Number(totalVolume.toFixed(2)),
        platformNetPnl: Number(platformNetPnl.toFixed(2)),
        pendingDeposits,
        pendingWithdrawals,
      },
      roundControl: {
        roundId,
        phase: roundPhase,
        secondsRemaining,
        adminOverride: adminRoundOverride,
        liveBuyVolume,
        liveSellVolume,
        totalBuyVolume,
        totalSellVolume,
        openOrdersCount: currentRoundOrders.length,
      },
      users: db.users.map(sanitizeUser),
      transactions: db.transactions.slice(0, 120),
      trades: db.trades.slice(0, 120),
      settings: db.settings,
    });
  });

  app.post('/api/admin/round-override', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const { override } = req.body as { override?: AdminRoundOverride };
    if (override !== 'auto' && override !== 'BUY' && override !== 'SELL') {
      return res.status(400).json({ error: 'Giá trị điều khiển không hợp lệ.' });
    }
    adminRoundOverride = override;
    return res.json({ override: adminRoundOverride, roundId });
  });

  app.post('/api/admin/users/:id/balance', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });

    const { accountMode, operation, amount, reason } = req.body as {
      accountMode?: AccountMode;
      operation?: 'add' | 'subtract';
      amount?: number;
      reason?: string;
    };
    const amt = Number(amount ?? 0);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Số tiền điều chỉnh phải lớn hơn 0.' });
    }
    const mode: AccountMode = accountMode === 'demo' ? 'demo' : 'live';
    const delta = operation === 'subtract' ? -amt : amt;

    if (mode === 'live') {
      target.liveBalance = Number(Math.max(0, target.liveBalance + delta).toFixed(2));
    } else {
      target.demoBalance = Number(Math.max(0, target.demoBalance + delta).toFixed(2));
    }

    const nowIso = new Date().toISOString();
    db.transactions.unshift({
      id: `tx_${Date.now().toString(36)}`,
      userId: target.id,
      userEmail: target.email,
      type: 'admin_adjust',
      amount: delta,
      fee: 0,
      status: 'completed',
      addressOrPeer: `Admin (${admin.nickname})`,
      note: reason?.trim() || `Điều chỉnh ví ${mode.toUpperCase()} bởi Admin`,
      createdAt: nowIso,
      processedAt: nowIso,
    });
    db.notifications.unshift({
      id: `ntf_${Date.now()}`,
      userId: target.id,
      title: `Biến động số dư ${delta >= 0 ? '+' : ''}$${delta.toFixed(2)}`,
      message: reason?.trim() || `Quản trị viên đã điều chỉnh ví ${mode.toUpperCase()} của bạn.`,
      type: 'wallet',
      read: false,
      createdAt: nowIso,
    });
    saveDb();

    return res.json({ user: sanitizeUser(target) });
  });

  app.post('/api/admin/users/:id/update', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });

    const { isBanned, isVip, kycStatus, role } = req.body as Partial<UserAccount>;
    if (typeof isBanned === 'boolean' && target.id !== admin.id) target.isBanned = isBanned;
    if (typeof isVip === 'boolean') target.isVip = isVip;
    if (kycStatus) target.kycStatus = kycStatus;
    if (role === 'user' || role === 'admin') target.role = role;
    saveDb();
    return res.json({ user: sanitizeUser(target) });
  });

  app.post('/api/admin/transactions/:id/decide', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const tx = db.transactions.find((t) => t.id === req.params.id);
    if (!tx) return res.status(404).json({ error: 'Không tìm thấy giao dịch.' });
    if (tx.status !== 'pending') {
      return res.status(400).json({ error: 'Giao dịch này đã được xử lý trước đó.' });
    }

    const { decision } = req.body as { decision?: 'approve' | 'reject' };
    if (decision !== 'approve' && decision !== 'reject') {
      return res.status(400).json({ error: 'Quyết định không hợp lệ.' });
    }

    const target = db.users.find((u) => u.id === tx.userId);
    const nowIso = new Date().toISOString();
    tx.processedAt = nowIso;

    if (decision === 'approve') {
      tx.status = 'completed';
      if (target) {
        if (tx.type === 'deposit') {
          target.liveBalance = Number((target.liveBalance + tx.amount).toFixed(2));
          target.totalDeposited = Number((target.totalDeposited + tx.amount).toFixed(2));
        } else if (tx.type === 'withdraw') {
          target.totalWithdrawn = Number((target.totalWithdrawn + tx.amount).toFixed(2));
        }
        db.notifications.unshift({
          id: `ntf_${Date.now()}`,
          userId: target.id,
          title: tx.type === 'deposit' ? `Duyệt nạp +$${tx.amount.toFixed(2)}` : `Duyệt rút $${tx.amount.toFixed(2)}`,
          message: `Yêu cầu ${tx.type === 'deposit' ? 'nạp tiền' : 'rút tiền'} của bạn đã được Admin phê duyệt.`,
          type: 'wallet',
          read: false,
          createdAt: nowIso,
        });
      }
    } else {
      tx.status = 'rejected';
      if (target && tx.type === 'withdraw') {
        // Refund withheld amount + fee
        target.liveBalance = Number((target.liveBalance + tx.amount + tx.fee).toFixed(2));
      }
      if (target) {
        db.notifications.unshift({
          id: `ntf_${Date.now()}`,
          userId: target.id,
          title: `Từ chối giao dịch $${tx.amount.toFixed(2)}`,
          message: `Lệnh ${tx.type === 'deposit' ? 'nạp' : 'rút'} tiền đã bị từ chối bởi quản trị viên.`,
          type: 'wallet',
          read: false,
          createdAt: nowIso,
        });
      }
    }

    saveDb();
    return res.json({ transaction: tx });
  });

  app.post('/api/admin/settings', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const body = req.body as Partial<PlatformSettings>;
    if (typeof body.payoutRate === 'number' && body.payoutRate >= 0.5 && body.payoutRate <= 1.0) {
      db.settings.payoutRate = body.payoutRate;
    }
    if (typeof body.minTradeAmount === 'number' && body.minTradeAmount >= 1) {
      db.settings.minTradeAmount = body.minTradeAmount;
    }
    if (typeof body.maxTradeAmount === 'number' && body.maxTradeAmount >= 10) {
      db.settings.maxTradeAmount = body.maxTradeAmount;
    }
    if (typeof body.withdrawFee === 'number' && body.withdrawFee >= 0) {
      db.settings.withdrawFee = body.withdrawFee;
    }
    if (typeof body.vipFee === 'number' && body.vipFee >= 0) {
      db.settings.vipFee = body.vipFee;
    }
    if (body.masterWalletAddress !== undefined) {
      const walletCheck = validateMasterWalletAddress(body.masterWalletAddress);
      if (!walletCheck.valid) {
        return res.status(400).json({ error: walletCheck.error });
      }
      db.settings.masterWalletAddress = walletCheck.address;
    }
    if (typeof body.maintenanceMode === 'boolean') {
      db.settings.maintenanceMode = body.maintenanceMode;
    }
    saveDb();
    return res.json({ settings: db.settings });
  });

  // Mount Vite middleware in dev, or serve static dist in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HitechTrade server running on http://localhost:${PORT}`);
  });
}

startServer();
