const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();
app.use(express.json());

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Cek /start
app.post("/webhook", async (req, res) => {
  const msg = req.body.message;
  const callback = req.body.callback_query;

  if (msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const username = msg.from.username;

    // Upsert user ke database
    await supabase.from("users").upsert({
      telegram_id: chatId,
      username,
    });

    if (text === "/start") {
      await sendTelegram(chatId, "Selamat datang di Coinawe 🔐\n\nKamu bisa escrow USDT atau token lainnya.", {
        inline_keyboard: [
          [{ text: "➕ Buat Escrow", callback_data: "create_escrow" }]
        ]
      });

      // Cek referral
      const parts = text.split(" ");
      if (parts[1] && parts[1].startsWith("ref_")) {
        const inviter = parts[1].replace("ref_", "");
        const inviterUsername = inviter.replace("@", "");

        const { data: user } = await supabase
          .from("users")
          .select("*")
          .eq("username", inviterUsername)
          .single();

        if (user) {
          await supabase
            .from("users")
            .update({ awewe: user.awewe + 10 })
            .eq("username", inviterUsername);

          await sendTelegram(user.telegram_id, `🎉 Temanmu @${username} baru saja bergabung melalui link-mu. Kamu dapat 10 AWEWE!`);
        }
      }

    } else if (state[chatId] === "waiting_username") {
      const opponentUsername = text.trim().replace("@", "");

      // Cek apakah user lawan sudah join
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("username", opponentUsername)
        .maybeSingle();

      if (!user) {
        const shareLink = `https://t.me/${process.env.BOT_USERNAME}?start=ref_${msg.from.username}`;
        await sendTelegram(chatId,
          `Pengguna @${opponentUsername} belum bergabung ke bot ini.\n\nBagikan link ini agar mereka join:`,
          {
            inline_keyboard: [[{ text: "🔗 Share Bot", url: shareLink }]]
          }
        );
        delete state[chatId];
      } else {
        // Simpan ke state
        state[chatId] = {
          step: "waiting_amount",
          opponent_id: user.telegram_id
        };
        await sendTelegram(chatId, "Masukkan jumlah dan token yang ingin di-escrow (contoh: `100 USDT`)", true);
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

      await sendTelegram(chatId, "✅ Escrow berhasil dibuat dan sedang menunggu konfirmasi lawan.");
      await sendTelegram(sellerId, `🔐 Kamu menerima permintaan escrow sebesar ${amount} ${token} dari @${msg.from.username}`);

      delete state[chatId];
    }
  }

  // Tangani tombol
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

// Simpan state sementara
const state = {};

// Fungsi kirim pesan
async function sendTelegram(chatId, text, markdown = false, reply_markup = null) {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: markdown ? "Markdown" : undefined,
    reply_markup: reply_markup ? { inline_keyboard: reply_markup.inline_keyboard } : undefined
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Coinawe Bot Webhook running on port ${PORT}`));
