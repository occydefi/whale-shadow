require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = 3022;

app.use(cors());
app.use(express.json());

// Storage
const whales = new Map();
const predictions = new Map();
const alerts = new Map();

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    skill: "Whale-Shadow-Tracker",
    version: "1.0.0",
    chain: "Solana",
    description: "Track whale wallets and predict their next moves",
    stats: {
      trackedWhales: whales.size,
      activePredictions: predictions.size
    }
  });
});

// Get tracked whales
app.get("/api/whales", (req, res) => {
  const whaleList = [
    {
      address: "Wha1e111111111111111111111111111111111111111",
      alias: "SOL Mega Whale",
      balance: 2500000,
      token: "SOL",
      lastActivity: new Date(Date.now() - 3600000).toISOString(),
      last5Moves: ["BUY", "HOLD", "BUY", "SELL", "BUY"],
      avgTradeSize: 50000,
      accuracy: "72%",
      followers: 1234
    },
    {
      address: "Wha1e222222222222222222222222222222222222222",
      alias: "DeFi Degen",
      balance: 890000,
      token: "SOL",
      lastActivity: new Date(Date.now() - 1800000).toISOString(),
      last5Moves: ["SELL", "SELL", "BUY", "SELL", "BUY"],
      avgTradeSize: 25000,
      accuracy: "65%",
      followers: 567
    },
    {
      address: "Wha1e333333333333333333333333333333333333333",
      alias: "NFT Flipper King",
      balance: 450000,
      token: "SOL",
      lastActivity: new Date(Date.now() - 7200000).toISOString(),
      last5Moves: ["BUY", "BUY", "BUY", "SELL", "HOLD"],
      avgTradeSize: 15000,
      accuracy: "58%",
      followers: 890
    },
    {
      address: "Wha1e444444444444444444444444444444444444444",
      alias: "Mysterious Accumulator",
      balance: 5000000,
      token: "SOL",
      lastActivity: new Date(Date.now() - 300000).toISOString(),
      last5Moves: ["BUY", "BUY", "BUY", "BUY", "BUY"],
      avgTradeSize: 100000,
      accuracy: "85%",
      followers: 3456
    }
  ];
  
  whaleList.forEach(w => whales.set(w.address, w));
  res.json({ whales: whaleList, count: whaleList.length });
});

// Get whale details
app.get("/api/whales/:address", (req, res) => {
  const whale = whales.get(req.params.address);
  if (!whale) return res.status(404).json({ error: "Whale not found" });
  
  res.json({
    ...whale,
    recentTransactions: [
      { type: "BUY", amount: 50000, token: "SOL", timestamp: new Date(Date.now() - 3600000).toISOString() },
      { type: "TRANSFER", amount: 10000, token: "SOL", to: "Exchange", timestamp: new Date(Date.now() - 7200000).toISOString() }
    ],
    analysis: {
      trend: "Accumulating",
      confidence: 78,
      nextMovePredict: "Likely BUY within 24h",
      riskLevel: "Medium"
    }
  });
});

// Create prediction market on whale move
app.post("/api/predictions/create", (req, res) => {
  const { whaleAddress, question, timeframe } = req.body;
  
  if (!whaleAddress) {
    return res.status(400).json({ error: "whaleAddress required" });
  }
  
  const predictionId = crypto.randomBytes(8).toString("hex");
  const whale = whales.get(whaleAddress);
  
  const prediction = {
    id: predictionId,
    whaleAddress,
    whaleAlias: whale?.alias || "Unknown Whale",
    question: question || `What will this whale do next?`,
    options: ["BUY", "SELL", "TRANSFER_TO_CEX", "HOLD"],
    pools: { BUY: 0, SELL: 0, TRANSFER_TO_CEX: 0, HOLD: 0 },
    bets: [],
    status: "open",
    timeframe: timeframe || "24h",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString()
  };
  
  predictions.set(predictionId, prediction);
  
  res.json({
    success: true,
    prediction,
    message: `Whale watch prediction created!`
  });
});

// Place bet on whale move
app.post("/api/predictions/:id/bet", (req, res) => {
  const { id } = req.params;
  const { agentId, predictedMove, amount, reasoning } = req.body;
  
  const prediction = predictions.get(id);
  if (!prediction) return res.status(404).json({ error: "Prediction not found" });
  if (prediction.status !== "open") return res.status(400).json({ error: "Prediction closed" });
  
  if (!agentId || !predictedMove || !amount) {
    return res.status(400).json({ error: "agentId, predictedMove, and amount required" });
  }
  
  const bet = {
    id: crypto.randomBytes(4).toString("hex"),
    agentId,
    predictedMove: predictedMove.toUpperCase(),
    amount,
    reasoning: reasoning || "",
    timestamp: new Date().toISOString()
  };
  
  prediction.bets.push(bet);
  prediction.pools[predictedMove.toUpperCase()] = (prediction.pools[predictedMove.toUpperCase()] || 0) + amount;
  predictions.set(id, prediction);
  
  const totalPool = Object.values(prediction.pools).reduce((a, b) => a + b, 0);
  
  res.json({
    success: true,
    bet,
    totalPool,
    currentOdds: Object.fromEntries(
      Object.entries(prediction.pools).map(([k, v]) => [k, v > 0 ? (totalPool / v).toFixed(2) : "N/A"])
    )
  });
});

// Get active predictions
app.get("/api/predictions", (req, res) => {
  const active = Array.from(predictions.values())
    .filter(p => p.status === "open")
    .map(p => ({
      ...p,
      totalPool: Object.values(p.pools).reduce((a, b) => a + b, 0),
      participantCount: p.bets.length
    }));
  
  res.json({ predictions: active, count: active.length });
});

// Resolve prediction (when whale actually moves)
app.post("/api/predictions/:id/resolve", (req, res) => {
  const { id } = req.params;
  const { actualMove, txSignature } = req.body;
  
  const prediction = predictions.get(id);
  if (!prediction) return res.status(404).json({ error: "Prediction not found" });
  
  prediction.status = "resolved";
  prediction.result = {
    actualMove: actualMove.toUpperCase(),
    txSignature,
    resolvedAt: new Date().toISOString()
  };
  
  const winners = prediction.bets
    .filter(b => b.predictedMove === actualMove.toUpperCase())
    .map(b => ({
      agentId: b.agentId,
      bet: b.amount,
      payout: (b.amount * 2.5).toFixed(2) // Simplified payout
    }));
  
  predictions.set(id, prediction);
  
  res.json({
    success: true,
    prediction,
    winners,
    message: `Whale moved! ${actualMove.toUpperCase()} - ${winners.length} winners!`
  });
});

// Set alert for whale activity
app.post("/api/alerts/create", (req, res) => {
  const { agentId, whaleAddress, triggerOn, notifyUrl } = req.body;
  
  const alertId = crypto.randomBytes(6).toString("hex");
  
  const alert = {
    id: alertId,
    agentId,
    whaleAddress,
    triggerOn: triggerOn || ["BUY", "SELL", "LARGE_TRANSFER"],
    notifyUrl,
    createdAt: new Date().toISOString(),
    triggered: false
  };
  
  alerts.set(alertId, alert);
  
  res.json({
    success: true,
    alert,
    message: "Alert created! You will be notified when whale moves."
  });
});

// Seed demo
function seedDemo() {
  const demo = {
    id: "demo-whale-prediction",
    whaleAddress: "Wha1e444444444444444444444444444444444444444",
    whaleAlias: "Mysterious Accumulator",
    question: "What will Mysterious Accumulator do in the next 24h?",
    options: ["BUY", "SELL", "TRANSFER_TO_CEX", "HOLD"],
    pools: { BUY: 500, SELL: 200, TRANSFER_TO_CEX: 100, HOLD: 50 },
    bets: [
      { id: "b1", agentId: "whale-follower", predictedMove: "BUY", amount: 300, reasoning: "Pattern shows accumulation" },
      { id: "b2", agentId: "contrarian-bot", predictedMove: "SELL", amount: 200, reasoning: "Too much buying, due for profit take" }
    ],
    status: "open",
    timeframe: "24h",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString()
  };
  
  predictions.set(demo.id, demo);
}

seedDemo();

app.listen(PORT, () => {
  console.log(`🐋 Whale Shadow Tracker running on port ${PORT}`);
});
