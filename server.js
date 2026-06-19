const express = require("express");

function startHttpServer(getSock) {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  const API_KEY = process.env.API_KEY || "";

  app.use((req, res, next) => {
    if (req.path === "/health") return next();
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!API_KEY || token !== API_KEY) {
      return res.status(401).json({ error: "unauthorized" });
    }
    next();
  });

  app.get("/health", (req, res) => {
    const sock = getSock();
    res.json({ ok: true, connected: !!sock?.user, user: sock?.user || null });
  });

  // POST /send-image  { to, imageUrl, caption }
  app.post("/send-image", async (req, res) => {
    try {
      const { to, imageUrl, caption } = req.body || {};
      if (!to || !imageUrl) return res.status(400).json({ error: "to and imageUrl required" });
      const sock = getSock();
      if (!sock) return res.status(503).json({ error: "whatsapp not connected" });
      const result = await sock.sendMessage(to, { image: { url: imageUrl }, caption: caption || "" });
      res.json({ ok: true, id: result?.key?.id || null });
    } catch (err) {
      res.status(500).json({ error: String(err?.message || err) });
    }
  });

  // POST /send-text  { to, text }
  app.post("/send-text", async (req, res) => {
    try {
      const { to, text } = req.body || {};
      if (!to || !text) return res.status(400).json({ error: "to and text required" });
      const sock = getSock();
      if (!sock) return res.status(503).json({ error: "whatsapp not connected" });
      const result = await sock.sendMessage(to, { text });
      res.json({ ok: true, id: result?.key?.id || null });
    } catch (err) {
      res.status(500).json({ error: String(err?.message || err) });
    }
  });

  // GET /groups  -> lista grupos pra você descobrir o ID
  app.get("/groups", async (req, res) => {
    try {
      const sock = getSock();
      if (!sock) return res.status(503).json({ error: "whatsapp not connected" });
      const groups = await sock.groupFetchAllParticipating();
      const list = Object.values(groups).map((g) => ({ id: g.id, subject: g.subject }));
      res.json({ groups: list });
    } catch (err) {
      res.status(500).json({ error: String(err?.message || err) });
    }
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`HTTP server on :${port}`));
}

module.exports = { startHttpServer };
