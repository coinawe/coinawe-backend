
const express = require("express");
const dotenv = require("dotenv");
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
