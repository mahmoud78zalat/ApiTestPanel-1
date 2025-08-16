import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Enhanced request logging for debugging
  if (path.startsWith("/api")) {
    console.log("🔷 INCOMING REQUEST 🔷");
    console.log("Method:", req.method);
    console.log("Path:", req.path);
    console.log("Query:", req.query);
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    if (req.body && Object.keys(req.body).length > 0) {
      console.log("Body:", JSON.stringify(req.body, null, 2));
    }
    console.log("IP:", req.ip);
    console.log("User-Agent:", req.get('User-Agent'));
    console.log("Content-Type:", req.get('Content-Type'));
    console.log("Content-Length:", req.get('Content-Length'));
    console.log("─".repeat(60));
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log("🔶 OUTGOING RESPONSE 🔶");
      console.log("Status:", res.statusCode);
      console.log("Duration:", duration + "ms");
      
      // Log response headers
      const responseHeaders: Record<string, any> = {};
      res.getHeaderNames().forEach(name => {
        responseHeaders[name] = res.getHeader(name);
      });
      console.log("Response Headers:", JSON.stringify(responseHeaders, null, 2));
      
      if (capturedJsonResponse) {
        console.log("Response Body:", JSON.stringify(capturedJsonResponse, null, 2));
      }
      console.log("═".repeat(60));
      console.log(""); // Add empty line for readability

      // Keep the original compact log line
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
