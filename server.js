const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram setup
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const CHAT_ID = process.env.CHAT_ID || 'YOUR_CHAT_ID';
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Exchanges
const exchanges = {
    binance: 'https://api.binance.com/api/v3/ticker/price',
    kraken: 'https://api.kraken.com/0/public/Ticker?pair=BTCUSD,ETHUSD',
    coinbase: 'https://api.coinbase.com/v2/prices/BTC-USD/spot'
};

async function fetchPrices() {
    try {
        const [binanceResp, krakenResp, coinbaseResp] = await Promise.all([
            axios.get(exchanges.binance),
            axios.get(exchanges.kraken),
            axios.get(exchanges.coinbase)
        ]);

        const prices = {
            binance: binanceResp.data.filter(p => p.symbol === 'BTCUSDT' || p.symbol === 'ETHUSDT'),
            kraken: krakenResp.data.result,
            coinbase: { BTC: coinbaseResp.data.data.amount }
        };

        checkArbitrage(prices);
        return prices;
    } catch (err) {
        console.error('Error fetching prices:', err.message);
        return null;
    }
}

function checkArbitrage(prices) {
    const binanceBTC = parseFloat(prices.binance.find(p => p.symbol === 'BTCUSDT').price);
    const coinbaseBTC = parseFloat(prices.coinbase.BTC);
    const spread = ((binanceBTC - coinbaseBTC) / coinbaseBTC) * 100;

    if (spread > 1) {
        bot.sendMessage(CHAT_ID, `🚨 BTC Arbitrage Alert!\nBinance: $${binanceBTC}\nCoinbase: $${coinbaseBTC}\nSpread: ${spread.toFixed(2)}%`);
    }
}

app.get('/prices', async (req, res) => {
    const prices = await fetchPrices();
    res.json(prices);
});

setInterval(fetchPrices, 10000);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

