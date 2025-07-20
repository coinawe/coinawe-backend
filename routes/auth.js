
const express = require("express");
const router = express.Router();
const crypto = require("crypto");

router.get("/telegram", (req, res) => {
  const { hash, ...data } = req.query;
  const secret = crypto.createHash("sha256").update(process.env.SECRET).digest();
  const checkString = Object.keys(data).sort().map(key => `${key}=${data[key]}`).join("\n");
  const hmac = crypto.createHmac("sha256", secret).update(checkString).digest("hex");

  if (hmac !== hash) return res.status(403).send("Invalid hash");

  res.json({ success: true, user: data });
});

module.exports = router;
