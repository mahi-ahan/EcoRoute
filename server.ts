import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // Parse large JSON payloads for base64 images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Initialize Gemini AI Client lazily (only if API key is present on use, but check here too)
  const getGeminiClient = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in your AI Studio Secrets.");
    }
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API Route: Classify Waste Image
  app.post("/api/classify", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Missing image payload" });
      }

      // Check if image is a valid data URL
      const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Invalid image format. Expected base64 data URL." });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      const ai = getGeminiClient();

      const prompt = `Analyze this community waste image. Classify the type of waste (e.g., Plastic, Organic, Electronic, Hazardous, Bulky, Glass, Paper/Cardboard) and assess its severity (Low, Medium, High, Critical). Provide a brief, professional description of the waste and potential hazards, and list recommended handling procedures. Be precise and objective.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          prompt,
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              wasteType: { 
                type: Type.STRING, 
                description: "Primary type of waste detected (e.g. 'Hazardous', 'Plastic', 'Electronic', 'Organic', 'Bulky', 'Glass', 'Paper/Cardboard')" 
              },
              severity: { 
                type: Type.STRING, 
                enum: ["Low", "Medium", "High", "Critical"],
                description: "Urgency/Severity level of the waste issue" 
              },
              description: { 
                type: Type.STRING, 
                description: "A professional 2-3 sentence description summarizing the waste and immediate community hazard" 
              },
              handlingInstructions: { 
                type: Type.STRING, 
                description: "A bulleted or short description of handling/cleanup instructions for city crews or citizens" 
              }
            },
            required: ["wasteType", "severity", "description", "handlingInstructions"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response received from Gemini model.");
      }

      const result = JSON.parse(responseText);
      return res.json(result);
    } catch (error: any) {
      console.error("Gemini classification error:", error);
      return res.status(500).json({ 
        error: error.message || "An error occurred during waste classification analysis." 
      });
    }
  });

  // API Route: Staff interactive Q&A advice with Gemini AI
  app.post("/api/staff-advice", async (req, res) => {
    try {
      const { report, question } = req.body;
      if (!report || !question) {
        return res.status(400).json({ error: "Missing report or question payload" });
      }

      const ai = getGeminiClient();
      const prompt = `You are an expert municipal waste and environmental hazards safety coordinator.
Analyze the following community waste report:
- Waste Type: ${report.wasteType}
- Severity: ${report.severity}
- Description: ${report.description}
- Original Handling Instructions: ${report.handlingInstructions || "None"}

A city cleanup crew / staff member is asking you for specific advice or action plan:
"${question}"

Provide extremely professional, actionable, and safety-focused advice. Focus on worker safety, necessary protective gear, proper recycling/disposal sites, transport precautions, and community communications. Present your response in clear, readable Markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [prompt],
      });

      return res.json({ response: response.text });
    } catch (error: any) {
      console.error("Staff advice Gemini error:", error);
      return res.status(500).json({ 
        error: error.message || "An error occurred during Gemini advice analysis." 
      });
    }
  });

  // Haversine formula to compute distance in meters between two lat/lng coordinates
  function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (phi2_val: number) => (phi2_val * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2(lat2)) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // API Route: Check AI duplicate report
  app.post("/api/check-duplicate", async (req, res) => {
    try {
      const { newReport, existingReports } = req.body;
      if (!newReport || !existingReports || !Array.isArray(existingReports)) {
        return res.status(400).json({ error: "Missing newReport or existingReports array" });
      }

      const lat = parseFloat(newReport.lat);
      const lng = parseFloat(newReport.lng);

      if (isNaN(lat) || isNaN(lng)) {
        return res.json({ isDuplicate: false, reason: "No valid location specified.", matchingReportId: null });
      }

      // Filter existing reports that are within 300 meters of the new report
      const nearbyReports = existingReports.filter((r) => {
        if (!r.location || typeof r.location.lat !== "number" || typeof r.location.lng !== "number") return false;
        const dist = getDistanceInMeters(lat, lng, r.location.lat, r.location.lng);
        return dist <= 300; // 300 meters threshold
      });

      if (nearbyReports.length === 0) {
        return res.json({ isDuplicate: false, reason: "No other active reports found in the immediate vicinity (300m).", matchingReportId: null });
      }

      // Use Gemini to analyze nearby reports and see if they describe the exact same waste issue
      const ai = getGeminiClient();
      const prompt = `You are an AI-powered Waste Duplicate Detector.
We have a newly reported waste incident:
- Category/Type: ${newReport.wasteType}
- Description: ${newReport.description}

Here is a list of existing nearby reports (within 300 meters):
${nearbyReports.map((r, idx) => `${idx + 1}. [ID: ${r.id}] Category: ${r.wasteType}, Status: ${r.status}, Description: ${r.description}`).join("\n")}

Determine if the newly reported incident is a duplicate (i.e., refers to the exact same physical pile of waste or incident as one of the existing reports).
Only flag as a duplicate if they have overlapping descriptions/location indicators and describe the same pile of trash.
Respond with a JSON object containing:
- "isDuplicate": true or false
- "matchingReportId": the ID of the duplicate report, or null if not a duplicate
- "reason": A short 1-sentence friendly explanation of why you classified it as a duplicate (or why not).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [prompt],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isDuplicate: { type: Type.BOOLEAN },
              matchingReportId: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["isDuplicate", "matchingReportId", "reason"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      return res.json(result);
    } catch (error: any) {
      console.error("Duplicate detection error:", error);
      return res.status(500).json({ error: error.message || "Failed to check duplicates." });
    }
  });

  // API Route: AI Chatbot answering sustainability and app questions
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Missing message payload" });
      }

      const ai = getGeminiClient();

      let formattedHistory = "";
      if (history && Array.isArray(history)) {
        formattedHistory = history.slice(-6).map((h: any) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`).join("\n");
      }

      const prompt = `You are EcoRoute AI Chatbot, an advanced environmental sustainability expert and EcoRoute application guide.
      
Your task is to answer user and staff inquiries. You should answer questions about:
1. The EcoRoute App: An interactive portal for reporting waste, cleaning up neighborhoods, and coordinating municipal responses. Mention how citizens can register, tap the map to pin issues, view live status, and upload images.
2. Sustainability & Environmental Topics: Anything about recycling, reducing carbon footprints, correct disposal of hazardous waste, climate impact, etc.
3. Outside general knowledge: Since you are a powerful AI assistant, feel free to helpfully answer any other general questions with intelligence, but gently relate them back to sustainability or community support if possible.

Keep your tone helpful, extremely inspiring, and highly professional. Use formatting, bold terms, and lists in your markdown.

Conversation History:
${formattedHistory}

Current Question:
"${message}"

Provide a comprehensive and complete response in Markdown format.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [prompt],
      });

      return res.json({ response: response.text });
    } catch (error: any) {
      console.error("Chat API error:", error);
      return res.status(500).json({ error: error.message || "Failed to generate AI response." });
    }
  });

  // Serve static/Vite assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EcoRoute full-stack server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start EcoRoute server:", err);
});
