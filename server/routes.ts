import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { apiRequestSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // API proxy route to handle CORS and make requests to Brands for Less API
  app.post("/api/proxy", async (req, res) => {
    try {
      const validatedRequest = apiRequestSchema.parse(req.body);
      const startTime = Date.now();



      const headers: Record<string, string> = {
        "accept": "application/json, text/plain, */*",
        "origin": "https://new-panel.brandsforlessuae.com",
        "referer": "https://new-panel.brandsforlessuae.com/",
        "user-agent": "Mozilla/5.0 (compatible; API-Tester/1.0)",
        ...validatedRequest.headers,
      };

      if (validatedRequest.token) {
        headers["x-access-token"] = validatedRequest.token;
      }

      const fetchOptions: RequestInit = {
        method: validatedRequest.method,
        headers,
      };

      if (validatedRequest.body && !["GET", "HEAD", "OPTIONS"].includes(validatedRequest.method)) {
        fetchOptions.body = validatedRequest.body;
        headers["content-type"] = "application/json";
      }



      const response = await fetch(validatedRequest.url, fetchOptions);
      const endTime = Date.now();
      
      // Create response headers array without logging
      const responseHeadersArray: Array<[string, string]> = [];
      response.headers.forEach((value, key) => {
        responseHeadersArray.push([key, value]);
      });
      
      let data;
      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseData = {
        status: response.status,
        statusText: response.statusText,
        data,
        headers: responseHeaders,
        responseTime: endTime - startTime,
        size: JSON.stringify(data).length,
      };



      res.json(responseData);
    } catch (error) {
      console.log("❌ ERROR OCCURRED ❌");
      
      if (error instanceof z.ZodError) {
        console.log("🔴 Validation Error:");
        console.log("Error Type: Zod Validation Error");
        console.log("Validation Errors:", JSON.stringify(error.errors, null, 2));
        console.log("Raw Request Body:", JSON.stringify(req.body, null, 2));
        
        res.status(400).json({ 
          message: "Invalid request format", 
          errors: error.errors 
        });
        return;
      }

      if (error instanceof Error) {
        console.log("🔴 General Error:");
        console.log("Error Type:", error.constructor.name);
        console.log("Error Message:", error.message);
        console.log("Error Stack:", error.stack);
        
        // Log additional fetch-specific error info if available
        if ('cause' in error) {
          console.log("Error Cause:", error.cause);
        }
        
        res.status(500).json({ 
          message: "Request failed", 
          error: error.message 
        });
        return;
      }

      console.log("🔴 Unknown Error:");
      console.log("Error Type: Unknown");
      console.log("Error Value:", error);
      
      res.status(500).json({ 
        message: "Unknown error occurred" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
