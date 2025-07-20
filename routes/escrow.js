
const express = require("express");
const router = express.Router();

router.post("/create", (req, res) => {
  // Simpan transaksi escrow ke Supabase (contoh)
  res.json({ success: true, message: "Escrow created (mock)" });
});

router.post("/release", (req, res) => {
  res.json({ success: true, message: "Escrow released (mock)" });
});

router.post("/dispute", (req, res) => {
  res.json({ success: true, message: "Dispute started (mock)" });
});

router.post("/cancel", (req, res) => {
  res.json({ success: true, message: "Escrow canceled (mock)" });
});

module.exports = router;
