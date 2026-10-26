const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (Object.keys(req.body).length > 0) {
    console.log('Body:', req.body);
  }
  if (Object.keys(req.query).length > 0) {
    console.log('Query:', req.query);
  }
  next();
});

// Proxy everything from /gs2c/* to Pragmatic Play servers (to avoid 404s)
app.get('/gs2c/*', (req, res) => {
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.json({ status: 'ok', data: {} });
});

// Handle /desktop/bootstrap.js specifically
app.get('/desktop/bootstrap.js', (req, res) => {
  res.set('Content-Type', 'application/javascript; charset=utf-8');
  res.send(`
    console.log('Bootstrap loaded');
    window.PRAGMATIC_READY = true;
    if(window.onBootstrapReady) window.onBootstrapReady();
    if(window.Bootstrap) window.Bootstrap.onReady();
  `);
});

// Handle all other /desktop requests
app.get('/desktop/*', (req, res) => {
  res.set('Content-Type', 'application/javascript; charset=utf-8');
  res.send('console.log("Desktop stub loaded");');
});

app.post('/desktop/*', (req, res) => {
  res.json({ status: 'ok', data: {} });
});

// Storage for player sessions
const playerSessions = {};

// Game configuration
const GAME_CONFIG = {
  REELS: 5,
  ROWS: 3,
  PAYLINES: 20,
  SYMBOLS: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  RTP: 0.96,
  MIN_BET: 0.10,
  MAX_BET: 100.00,
  DEFAULT_BET: 1.00,
  INITIAL_BALANCE: 1000.00
};

// Paytable
const PAYTABLE = {
  0: { 3: 50, 4: 200, 5: 500 },
  1: { 3: 40, 4: 150, 5: 400 },
  2: { 3: 30, 4: 100, 5: 300 },
  3: { 3: 25, 4: 80, 5: 250 },
  4: { 3: 20, 4: 60, 5: 200 },
  5: { 3: 15, 4: 40, 5: 150 },
  6: { 3: 10, 4: 20, 5: 100 },
  7: { 3: 8, 4: 15, 5: 80 },
  8: { 3: 6, 4: 10, 5: 60 },
  9: { 3: 4, 4: 8, 5: 40 },
  10: { 3: 2, 4: 4, 5: 20 }
};

// Utility functions
function generateSessionKey() {
  return 'SESSION_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateReels() {
  const reels = [];
  for (let i = 0; i < GAME_CONFIG.REELS; i++) {
    const reel = [];
    for (let j = 0; j < GAME_CONFIG.ROWS; j++) {
      reel.push(getRandomInt(0, GAME_CONFIG.SYMBOLS.length - 1));
    }
    reels.push(reel);
  }
  return reels;
}

function checkWinLine(reels, line) {
  const lineSymbols = [];
  const lineMap = {
    0: [0, 0, 0, 0, 0], 1: [1, 1, 1, 1, 1], 2: [2, 2, 2, 2, 2],
    3: [0, 1, 2, 1, 0], 4: [2, 1, 0, 1, 2], 5: [0, 0, 1, 0, 0],
    6: [2, 2, 1, 2, 2], 7: [1, 0, 0, 0, 1], 8: [1, 2, 2, 2, 1],
    9: [0, 1, 1, 1, 0], 10: [2, 1, 1, 1, 2], 11: [0, 2, 1, 0, 0],
    12: [2, 0, 1, 2, 2], 13: [1, 0, 0, 2, 1], 14: [1, 2, 2, 0, 1],
    15: [0, 1, 0, 1, 0], 16: [2, 1, 2, 1, 2], 17: [0, 0, 2, 0, 0],
    18: [2, 2, 0, 2, 2], 19: [1, 1, 1, 1, 1]
  };

  if (!lineMap[line]) return { matches: 0, win: 0 };

  for (let i = 0; i < GAME_CONFIG.REELS; i++) {
    lineSymbols.push(reels[i][lineMap[line][i]]);
  }

  let matches = 1;
  const symbol = lineSymbols[0];

  for (let i = 1; i < lineSymbols.length; i++) {
    if (lineSymbols[i] === symbol) {
      matches++;
    } else {
      break;
    }
  }

  if (matches < 3) return { matches: 0, win: 0 };

  const multiplier = PAYTABLE[symbol][matches] || 0;
  return { matches, win: multiplier };
}

function calculateSpin(reels, bet, activeLines) {
  let totalWin = 0;
  const winLines = [];

  for (let line = 0; line < activeLines; line++) {
    const lineWin = checkWinLine(reels, line);
    if (lineWin.win > 0) {
      winLines.push({
        line: line,
        matches: lineWin.matches,
        win: lineWin.win * bet
      });
      totalWin += lineWin.win * bet;
    }
  }

  return { totalWin, winLines };
}

function formatReelsForResponse(reels) {
  let response = '';
  for (let i = 0; i < GAME_CONFIG.REELS; i++) {
    response += `reel${i}=${reels[i].join(',')}&`;
  }
  return response;
}

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/gs2c/gameService', (req, res) => {
  try {
    const action = req.body.action || req.query.action;
    const symbol = req.body.symbol || req.query.symbol || 'vs20doghouse';
    const mgckey = req.body.mgckey || req.query.mgckey;
    const coin = parseFloat(req.body.c || req.query.c || GAME_CONFIG.DEFAULT_BET);

    console.log(`Action: ${action}, Symbol: ${symbol}, Bet: ${coin}`);

    if (!action) {
      return res.status(400).send('Missing action parameter');
    }

    let sessionKey = mgckey;
    let response = '';

    if (!playerSessions[sessionKey]) {
      playerSessions[sessionKey] = {
        sessionKey: sessionKey,
        symbol: symbol,
        balance: GAME_CONFIG.INITIAL_BALANCE,
        bet: coin,
        index: 0,
        counter: 0,
        lastWin: 0,
        currentReels: generateReels(),
        createdAt: new Date()
      };
      console.log(`Created new session: ${sessionKey}`);
    }

    const session = playerSessions[sessionKey];

    switch (action) {
      case 'doInit':
        session.currentReels = generateReels();
        response = `index=${session.index}&counter=${session.counter}&balance=${session.balance}&c=${coin}&l=${GAME_CONFIG.PAYLINES}&defc=${GAME_CONFIG.DEFAULT_BET}&bets=0.01,0.05,0.10,0.25,0.50,1.00,2.50,5.00,10.00,25.00,50.00,100.00&sh=3&na=s&${formatReelsForResponse(session.currentReels)}`;
        break;

      case 'doSpin':
        if (session.balance < coin) {
          response = `index=${session.index}&counter=${session.counter}&balance=${session.balance}&nomoney=1&na=&`;
        } else {
          const reels = generateReels();
          session.currentReels = reels;
          const spinResult = calculateSpin(reels, coin, GAME_CONFIG.PAYLINES);
          session.balance -= coin;
          session.balance += spinResult.totalWin;
          session.index++;
          session.counter++;
          session.lastWin = spinResult.totalWin;

          response = `index=${session.index}&counter=${session.counter}&balance=${session.balance}&c=${coin}&l=${GAME_CONFIG.PAYLINES}&w=${spinResult.totalWin}&${formatReelsForResponse(reels)}`;
          for (const winLine of spinResult.winLines) {
            response += `l${winLine.line}=${winLine.win}&`;
          }
          response += `action=doSpin&na=${spinResult.totalWin > 0 ? 'c,s' : 's'}&`;
        }
        break;

      case 'doCollect':
        session.index++;
        session.counter++;
        session.lastWin = 0;
        response = `index=${session.index}&counter=${session.counter}&balance=${session.balance}&w=0&action=doCollect&na=s&`;
        break;

      case 'doBet':
        session.bet = coin;
        session.currentReels = generateReels();
        response = `index=${session.index}&counter=${session.counter}&balance=${session.balance}&c=${coin}&l=${GAME_CONFIG.PAYLINES}&defc=${GAME_CONFIG.DEFAULT_BET}&bets=0.01,0.05,0.10,0.25,0.50,1.00,2.50,5.00,10.00,25.00,50.00,100.00&sh=3&na=s&${formatReelsForResponse(session.currentReels)}`;
        break;

      default:
        return res.status(400).send(`Unknown action: ${action}`);
    }

    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(response);

  } catch (error) {
    console.error('Error processing game service request:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/gs2c/reloadBalance.do', (req, res) => {
  try {
    const mgckey = req.body.mgckey || req.query.mgckey;
    const session = playerSessions[mgckey];

    if (!session) {
      return res.json({
        balance: GAME_CONFIG.INITIAL_BALANCE,
        currency: 'USD'
      });
    }

    res.json({
      balance: session.balance,
      currency: 'USD',
      time: Date.now()
    });
  } catch (error) {
    console.error('Error reloading balance:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/gs2c/logout.do', (req, res) => {
  try {
    const mgckey = req.body.mgckey || req.query.mgckey;

    if (mgckey && playerSessions[mgckey]) {
      console.log(`Session ended: ${mgckey}`);
      delete playerSessions[mgckey];
    }

    res.json({ status: 'logged_out' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/gs2c/configuration.do', (req, res) => {
  res.json({
    accountType: 'R',
    currency: 'USD',
    vendor: 'T',
    language: 'en',
    jurisdiction: '99'
  });
});

app.post('/gs2c/stats.do', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pragmatic Play Backend</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; }
        .status { background: #4caf50; color: white; padding: 10px; border-radius: 4px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎰 Pragmatic Play Backend Server</h1>
        <div class="status">Server Running</div>
        <h2>Endpoints</h2>
        <ul>
          <li><strong>POST /gs2c/gameService</strong> - Game API</li>
          <li><strong>POST /gs2c/reloadBalance.do</strong> - Get Balance</li>
          <li><strong>POST /gs2c/logout.do</strong> - Logout</li>
          <li><strong>GET /health</strong> - Health Check</li>
        </ul>
        <p><strong>Acceso:</strong> http://localhost:3000/vs20doghouse_completo.html</p>
      </div>
    </body>
    </html>
  `);
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
    ╔════════════════════════════════════════════╗
    ║  PRAGMATIC PLAY BACKEND SERVER             ║
    ╠════════════════════════════════════════════╣
    ║  Server running at http://0.0.0.0:${PORT}     ║
    ║  Game Symbol: vs20doghouse                 ║
    ║  Initial Balance: $${GAME_CONFIG.INITIAL_BALANCE}                   ║
    ║  Paylines: ${GAME_CONFIG.PAYLINES}                        ║
    ║  RTP: ${(GAME_CONFIG.RTP * 100).toFixed(1)}%                       ║
    ╚════════════════════════════════════════════╝
  `);
  console.log('Server is ready to accept connections...\n');
});

process.on('SIGTERM', () => {
  console.log('Server shutting down...');
  process.exit(0);
});
