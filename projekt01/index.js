import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { URL } from "node:url";

const host = "localhost";
const port = 8000;


const indexHtml = readFileSync("static/index.html", "utf8");
const favicon = readFileSync("static/favicon.ico");

const server = createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${host}`);
  const path = requestUrl.pathname;
  console.log(`${req.method} ${path}`);

  if (path === "/favicon.ico") {
    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "image/vnd.microsoft.ico" });
      res.end("Method not allowed\n");
      return;
    }
    res.writeHead(200, {
      "Content-Type": "image/x-icon",
      "Content-Length": favicon.length
    });
    res.end(favicon);
    return;
  }

  if (path === "/") {
    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Method not allowed\n");
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(indexHtml, "utf8")
    });
    res.end(indexHtml);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Site not found\n");
});

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});