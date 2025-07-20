const express = require("express");
const dotenv = require("dotenv");
const axios = require("axios");
const authRouter = require("./routes/auth");
const escrowRouter = require("./routes/escrow");

dotenv.config();
const app = express();
app.use(express.json());

app.get("/", (req, res) => res.send("Coinawe Backend API Running"));

app.use("/auth", authRouter);
app.use("/escrow", escrowRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.use(express.json()); // pastikan ini di atas

app.post('/webhook', async (req, res) => {
  console.log('Webhook received:', req.body);

  const message = req.body.message;
  if (message) {
    const chatId = message.chat.id;
    const text = message.text;

    // Kirim balasan
    await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: `Hai! Kamu mengirim: ${text}`,
    });
  }

  res.send('ok');
});
