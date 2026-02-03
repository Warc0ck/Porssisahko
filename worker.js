  export default {
    async fetch() {
      return new Response("OK");
    },
  
  async scheduled(event, env, ctx) {
    const url = "https://api.porssisahko.net/v1/latest-prices.json";

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

    // 4. Lisää 25,5% ALV ja muodosta viesti
    const VAT_RATE = 0.255;
    const addVat = v => Number((v * (1 + VAT_RATE)).toFixed(2));

    const currentWithVat = addVat(current);
    const lowestWithVat = addVat(lowest);
    const highestWithVat = addVat(highest);

    const message =
        `Hinta nyt: ${currentWithVat} snt/kWh (sis. alv 25,5%)\n` +
        `Päivän alin: ${lowestWithVat} snt/kWh (sis. alv 25,5%)\n` +
        `Päivän korkein: ${highestWithVat} snt/kWh (sis. alv 25,5%)`;

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
