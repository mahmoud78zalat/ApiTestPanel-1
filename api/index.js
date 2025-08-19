import { z } from 'zod';

// Schema for API requests
const apiRequestSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS", "TRACE", "CONNECT"]).default("GET"),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  token: z.string().optional()
});

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-access-token'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only handle POST requests for the proxy functionality
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const validatedRequest = apiRequestSchema.parse(req.body);
    const startTime = Date.now();
    
    const headers = {
      "accept": "application/json, text/plain, */*",
      "origin": "https://new-panel.brandsforlessuae.com",
      "referer": "https://new-panel.brandsforlessuae.com/",
      "user-agent": "Mozilla/5.0 (compatible; API-Tester/1.0)",
      ...validatedRequest.headers
    };

    if (validatedRequest.token) {
      headers["x-access-token"] = validatedRequest.token;
    }

    const fetchOptions = {
      method: validatedRequest.method,
      headers
    };

    if (validatedRequest.body && !["GET", "HEAD", "OPTIONS"].includes(validatedRequest.method)) {
      fetchOptions.body = validatedRequest.body;
      headers["content-type"] = "application/json";
    }

    const response = await fetch(validatedRequest.url, fetchOptions);
    const endTime = Date.now();

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const responseData = {
      status: response.status,
      statusText: response.statusText,
      data,
      headers: responseHeaders,
      responseTime: endTime - startTime,
      size: JSON.stringify(data).length
    };

    res.json(responseData);
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid request format",
        errors: error.errors
      });
    }

    return res.status(500).json({
      message: "Request failed",
      error: error.message
    });
  }
}