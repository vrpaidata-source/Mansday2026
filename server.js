const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, "data");
const PUBLIC = path.join(__dirname, "public");
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(PUBLIC, { recursive: true });
const upload = multer({ dest: DATA, limits: { fileSize: 12 * 1024 * 1024 } });
const records = new Map();

app.use(express.static(PUBLIC));
app.post("/api/share", upload.single("poster"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Poster படம் கிடைக்கவில்லை" });
  const id = crypto.randomBytes(9).toString("hex");
  const ext = ".png";
  const filename = id + ext;
  fs.renameSync(req.file.path, path.join(PUBLIC, filename));
  const record = {
    id, filename,
    heading: String(req.body.heading || "ஆண்கள் தின வாழ்த்து").slice(0, 100),
    greeting: String(req.body.greeting || "இனிய சர்வதேச ஆண்கள் தின நல்வாழ்த்துக்கள்!").slice(0, 1200),
    createdAt: new Date().toISOString()
  };
  records.set(id, record);
  fs.writeFileSync(path.join(DATA, id + ".json"), JSON.stringify(record, null, 2));
  res.json({ url: `${req.protocol}://${req.get("host")}/s/${id}` });
});

app.get("/s/:id", (req, res) => {
  const id = req.params.id;
  let record = records.get(id);
  if (!record) {
    const file = path.join(DATA, id + ".json");
    if (fs.existsSync(file)) record = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  if (!record || !/^[a-f0-9]{18}$/.test(id)) return res.status(404).send("இந்த வாழ்த்து Link கிடைக்கவில்லை.");
  const origin = `${req.protocol}://${req.get("host")}`;
  const image = `${origin}/${record.filename}`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  res.type("html").send(`<!doctype html><html lang="ta"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(record.heading)}</title>
<meta property="og:type" content="website"><meta property="og:title" content="${esc(record.heading)}">
<meta property="og:description" content="${esc(record.greeting)}"><meta property="og:image" content="${image}">
<meta property="og:url" content="${origin}/s/${id}"><meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(record.heading)}"><meta name="twitter:description" content="${esc(record.greeting)}"><meta name="twitter:image" content="${image}">
<style>body{margin:0;background:#101827;color:white;font-family:system-ui,'Noto Sans Tamil',sans-serif;text-align:center;padding:20px}main{max-width:650px;margin:auto}img{width:100%;height:auto;border-radius:14px}h1{font-size:24px}p{line-height:1.8;color:#d7deea}</style></head>
<body><main><h1>${esc(record.heading)}</h1><img src="/${record.filename}" alt="ஆண்கள் தின வாழ்த்து படம்"><p>${esc(record.greeting)}</p></main></body></html>`);
});
app.get("/health", (req,res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`Men's Day Share Studio running on port ${PORT}`));
