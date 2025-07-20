const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();
app.use(express.json());

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const state = {};

async function sendTelegram(chatId, text, markdown = false, reply_markup = null) {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: markdown ? "Markdown" : undefined,
    reply_markup: reply_markup ? { inline_keyboard: reply_markup.inline_keyboard } : undefined
  });
}

app.post("/webhook", async (req, res) => {
  const msg = req.body.message;
  const callback = req.body.callback_query;

  if (msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const username = msg.from.username;

    // Upsert user
    await supabase.from("users").upsert({
      telegram_id: chatId,
      username
    });

    if (text.startsWith("/start")) {
      await sendTelegram(chatId, "Selamat datang di Coinawe 🔐\n\nKamu bisa escrow USDT atau token lainnya.", {
        inline_keyboard: [
          [{ text: "➕ Buat Escrow", callback_data: "create_escrow" }]
        ]
      });

      const parts = text.split(" ");
      if (parts[1]?.startsWith("ref_")) {
        const inviter = parts[1].replace("ref_", "").replace("@", "");
        const { data: user } = await supabase
          .from("users")
          .select("*")
          .eq("username", inviter)
          .single();

        if (user) {
          await supabase
            .from("users")
            .update({ awewe: user.awewe + 10 })
            .eq("username", inviter);
          await sendTelegram(user.telegram_id, `🎉 Temanmu @${username} baru saja join. Kamu dapat 10 AWEWE!`);
        }
      }

    } else if (state[chatId] === "waiting_username") {
      const opponentUsername = text.trim().replace("@", "");

      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("username", opponentUsername)
        .maybeSingle();

      if (!user) {
        const shareLink = `https://t.me/${process.env.BOT_USERNAME}?start=ref_${username}`;
        await sendTelegram(chatId,
          `@${opponentUsername} belum join.\nBagikan link ini:`,
          {
            inline_keyboard: [[{ text: "🔗 Share Bot", url: shareLink }]]
          }
        );
        delete state[chatId];
      } else {
        state[chatId] = {
          step: "waiting_amount",
          opponent_id: user.telegram_id
        };
        await sendTelegram(chatId, "Masukkan jumlah dan token (contoh: `100 USDT`)", true);
      }

    } else if (state[chatId]?.step === "waiting_amount") {
      const [amount, token] = text.split(" ");
      const buyerId = chatId;
      const sellerId = state[chatId].opponent_id;

      await supabase.from("escrow").insert({
        buyer_id: buyerId,
        seller_id: sellerId,
        amount,
        token
      });

      await sendTelegram(chatId, "✅ Escrow dibuat.");
      await sendTelegram(sellerId, `🔐 Permintaan escrow ${amount} ${token} dari @${username}`);

      delete state[chatId];
    }
  }

  if (callback) {
    const chatId = callback.from.id;
    const data = callback.data;

    if (data === "create_escrow") {
      state[chatId] = "waiting_username";
      await sendTelegram(chatId, "Ketik username lawan escrow (contoh: @relog)");
    }
  }

  res.send("ok");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Coinawe Bot Webhook running on port ${PORT}`));
