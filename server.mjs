import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("C:/WebsiteMirror/lusion/lusion.co");
const CDN = "https://lusion.dev";
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".webmanifest": "application/manifest+json",
  ".buf": "application/octet-stream",
  ".txt": "text/plain; charset=utf-8",
};

const HOP = new Set([
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
  "etag",
  "last-modified",
]);

function resolveLocal(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const rel = decoded.replace(/^\/+/, "");
  const full = path.resolve(ROOT, rel);
  const rootPrefix = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;
  if (full !== ROOT && !full.startsWith(rootPrefix)) return null;
  return full;
}

function sendFile(req, res, file) {
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const stat = fs.statSync(file);
  const range = req.headers.range;
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : stat.size - 1;
      if (start <= end && end < stat.size) {
        res.writeHead(206, {
          "Content-Type": type,
          "Content-Length": end - start + 1,
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
        });
        if (req.method === "HEAD") {
          res.end();
          return;
        }
        fs.createReadStream(file, { start, end }).pipe(res);
        return;
      }
    }
  }
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": stat.size,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(file).pipe(res);
}

function proxyAsset(req, res, urlPath, search) {
  const target = new URL(urlPath + (search || ""), CDN);
  const headers = {
    "user-agent": req.headers["user-agent"] || "Mozilla/5.0",
    accept: req.headers.accept || "*/*",
  };
  if (req.headers.range) headers.range = req.headers.range;

  const upstream = https.request(
    target,
    { method: req.method === "HEAD" ? "HEAD" : "GET", headers },
    (incoming) => {
      const out = {};
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (HOP.has(key) && value) out[key] = value;
      }
      res.writeHead(incoming.statusCode || 502, out);
      if (req.method === "HEAD") {
        incoming.resume();
        res.end();
        return;
      }
      incoming.pipe(res);
    }
  );
  upstream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    }
    res.end("Asset proxy failed");
  });
  upstream.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const pathname = url.pathname;

  let file = resolveLocal(pathname);
  if (!file) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, "index.html");
  }

  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    sendFile(req, res, file);
    return;
  }

  if (pathname.startsWith("/assets/")) {
    proxyAsset(req, res, pathname, url.search);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Lusion site running at http://127.0.0.1:${PORT}`);
  console.log(`Serving ${ROOT}`);
  console.log(`Missing /assets requests proxy to ${CDN}`);
});
