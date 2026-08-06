import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ENV } from "./env";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/**
 * Sessions are HS256-signed with JWT_SECRET. A missing or short secret is not a
 * cosmetic config problem: `createContext` swallows auth errors into `user = null`,
 * so the app would boot healthy and simply refuse every login with no clue why —
 * and a guessable secret lets an attacker mint a token for any openId, admin included.
 * Fail loudly here instead of at the first request.
 */
function assertSessionSecret() {
  const secret = ENV.cookieSecret;
  const bytes = secret ? Buffer.byteLength(secret, "utf8") : 0;
  if (bytes >= 32) return;
  const message =
    `JWT_SECRET is ${bytes === 0 ? "not set" : `only ${bytes} bytes`}; ` +
    "sessions require at least 32 bytes of random secret.";
  if (ENV.isProduction) throw new Error(message);
  console.warn(`[startup] ${message} Logins will fail until it is set.`);
}

async function startServer() {
  assertSessionSecret();
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
