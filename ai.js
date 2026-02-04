const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic();

async function analyzeWhale(whaleData) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `You are Whale Shadow, an AI that tracks Solana whale wallets. Analyze this whale:
Address: ${whaleData.address}, Label: ${whaleData.label}
Balance: $${whaleData.balance}, SOL: ${whaleData.solBalance}
Recent trades: ${JSON.stringify(whaleData.recentTrades || [])}
Active protocols: ${(whaleData.protocols || []).join(", ")}

Profile this whale: what strategy are they running? Are they accumulating, distributing, or rotating? Predict their next likely move based on patterns. Reference Solana protocols (Jupiter, Kamino, Drift, Raydium). Keep it sharp (3-4 sentences).`
    }]
  });
  return msg.content[0].text;
}

async function predictMove(whaleAddress, historicalMoves) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: `Based on whale ${whaleAddress} historical patterns:
${historicalMoves}
Predict their next 3 likely actions on Solana. Consider: market conditions, protocol TVL changes, upcoming token unlocks, and governance votes. Rate each prediction with confidence %.`
    }]
  });
  return msg.content[0].text;
}

async function alertAnalysis(alertData) {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `A Solana whale alert just triggered:
Type: ${alertData.type}, Whale: ${alertData.whale}
Action: ${alertData.action}, Amount: $${alertData.amount}
Token: ${alertData.token}

Analyze the significance of this move. Is it bullish or bearish? Should other traders follow or fade? Quick 2-3 sentence analysis.`
    }]
  });
  return msg.content[0].text;
}

module.exports = { analyzeWhale, predictMove, alertAnalysis };
