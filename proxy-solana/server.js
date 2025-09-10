const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const rateLimit = require("express-rate-limit");
const http = require("http");

// === CONFIG ===
const RPC_TARGET = "http://localhost:8899";
const PROXY_PORT = 8888;

// === EXPRESS APP ===
const app = express();

// === RATE LIMIT (100 req/sec) ===
const limiter = rateLimit({
  windowMs: 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// === LOG MIDDLEWARE HTTP ===
app.use((req, res, next) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] [HTTP] ${req.method} ${req.url}`);
  
  // Log des headers
  console.log(`[${requestId}] [HTTP] Headers:`, req.headers);
  
  res.on("finish", () => {
    console.log(`[${requestId}] [HTTP] ➜ Status: ${res.statusCode}`);
  });

  // Gestion des erreurs de la requête
  req.on('error', (error) => {
    console.error(`[${requestId}] [HTTP] Request Error:`, error);
  });

  // Gestion des erreurs de la réponse
  res.on('error', (error) => {
    console.error(`[${requestId}] [HTTP] Response Error:`, error);
  });

  next();
});

// === BLOCK WEBSOCKET UPGRADE REQUESTS ===
app.use((req, res, next) => {
  const requestId = Math.random().toString(36).substring(7);
  
  if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
    console.log(`[${requestId}] [BLOCK] WebSocket upgrade request blocked for ${req.url}`);
    console.log(`[${requestId}] [BLOCK] Headers:`, req.headers);
    console.log(`[${requestId}] [BLOCK] Origin:`, req.headers.origin);
    console.log(`[${requestId}] [BLOCK] Host:`, req.headers.host);
    
    try {
      res.status(400).json({ 
        error: 'WebSocket connections are not allowed',
        details: {
          url: req.url,
          headers: req.headers,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error(`[${requestId}] [BLOCK] Error sending response:`, error);
    }
    return;
  }
  next();
});

// === HTTP PROXY ===
app.use(
  "/",
  createProxyMiddleware({
    target: RPC_TARGET,
    changeOrigin: true,
    ws: false,
    logLevel: 'debug',
    onError(err, req, res) {
      const requestId = Math.random().toString(36).substring(7);
      console.error(`[${requestId}] [HTTP PROXY ERROR]`, err.message);
      console.error(`[${requestId}] [HTTP PROXY ERROR] Stack:`, err.stack);
      
      try {
        res.writeHead(502);
        res.end(JSON.stringify({
          error: "Proxy error",
          message: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error(`[${requestId}] [HTTP PROXY ERROR] Error sending error response:`, error);
      }
    },
    onProxyReq(proxyReq, req, res) {
      const requestId = Math.random().toString(36).substring(7);
      console.log(`[${requestId}] [PROXY] Forwarding request to ${RPC_TARGET}${req.url}`);
    },
    onProxyRes(proxyRes, req, res) {
      const requestId = Math.random().toString(36).substring(7);
      console.log(`[${requestId}] [PROXY] Received response from ${RPC_TARGET}${req.url}`);
    }
  })
);

// === SERVER CREATION ===
const server = http.createServer(app);

// === BLOCK WEBSOCKET UPGRADE AT SERVER LEVEL ===
server.on('upgrade', (req, socket, head) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] [BLOCK] WebSocket upgrade blocked at server level for ${req.url}`);
  console.log(`[${requestId}] [BLOCK] Headers:`, req.headers);
  
  try {
    socket.write('HTTP/1.1 400 Bad Request\r\n');
    socket.write('Content-Type: application/json\r\n');
    socket.write('\r\n');
    socket.write(JSON.stringify({
      error: 'WebSocket upgrade blocked',
      details: {
        url: req.url,
        headers: req.headers,
        timestamp: new Date().toISOString()
      }
    }));
  } catch (error) {
    console.error(`[${requestId}] [BLOCK] Error sending WebSocket error response:`, error);
  } finally {
    socket.end();
  }
});

// Gestion des erreurs du serveur
server.on('error', (error) => {
  console.error('[SERVER] Error:', error);
});

// Gestion des connexions
server.on('connection', (socket) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] [SERVER] New connection from ${socket.remoteAddress}`);
  
  socket.on('error', (error) => {
    console.error(`[${requestId}] [SERVER] Socket error:`, error);
  });
  
  socket.on('close', () => {
    console.log(`[${requestId}] [SERVER] Connection closed`);
  });
});

server.listen(PROXY_PORT, () => {
  console.log(`✅ Proxy Solana lancé sur:`);
  console.log(`   - RPC HTTP → ${RPC_TARGET}`);
  console.log(`   - Serveur   → http://localhost:${PROXY_PORT}`);
  console.log(`   - WebSocket → DÉSACTIVÉ`);
});
