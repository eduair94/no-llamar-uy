import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Health check endpoint
  return res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Uruguay Phone Validator API",
    availableEndpoints: ["GET /api - Health check", "GET /api/check/{phoneNumber} - Check phone number"],
  });
}
