export default {
  async fetch() {
    return new Response("OK");
  },

async scheduled(event, env, ctx) {
  const url = "https://api.porssisahko.net/v2/latest-prices.json";

  // 1. Hae data
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Hinnan haku epäonnistui");
  }

  const data = await res.json();
  if (!Array.isArray(data.prices)) {
    throw new Error("Virheellinen data");
  }

  const prices = data.prices;

  // 2. Etsi nykyinen tunti (UTC)
  const now = new Date();

  const currentItem = prices.find(p => {
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    return now >= start && now < end;
  });

  if (!currentItem) {
    throw new Error("Nykyisen tunnin hintaa ei löydy");
  }

  const current = currentItem.price;

  // 3. Min / max
  const allPrices = prices.map(p => p.price);
  const lowest = Math.min(...allPrices);
  const highest = Math.max(...allPrices);

  // 4. Viesti
  const message =
    `Hinta nyt: ${current} snt/kWh\n` +
    `Päivän alin: ${lowest} snt/kWh\n` +
    `Päivän korkein: ${highest} snt/kWh`;

  // 5. Telegram
  const tgUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  const tgRes = await fetch(tgUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.CHAT_ID,
      text: message
    })
  });

  if (!tgRes.ok) {
    throw new Error("Telegram-viestin lähetys epäonnistui");
  }
}
};