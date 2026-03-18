import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables. Please add it to your Vercel/Environment settings.");
  }
  return new GoogleGenAI({ apiKey });
};

// API Routes
app.post("/api/generate-script", async (req, res) => {
  try {
    const { blogContent } = req.body;
    if (!blogContent) return res.status(400).json({ error: "Content is required" });

    const ai = getAI();
    const model = "gemini-3.1-pro-preview";
    
    const response = await ai.models.generateContent({
      model,
      contents: {
        role: "user",
        parts: [
          {
            text: `Transformez l'article de blog suivant en un script vidéo YouTube de 5 minutes. 
            Le script doit être engageant, conversationnel et structuré pour une vidéo de 5 minutes.
            TOUT le contenu généré (titres, scripts, prompts d'illustration) doit être en FRANÇAIS.
            
            Pour chaque scène, fournissez :
            1. Un titre de scène.
            2. Le script parlé (voix-off).
            3. TROIS (3) prompts d'illustration extrêmement détaillés qui ILLUSTRENT PRÉCISÉMENT différents moments ou angles de l'action décrits dans le script voix-off. 
               Chaque image doit être une traduction visuelle directe de ce qui est dit.
               Le style doit être celui d'une bande dessinée moderne et colorée. 
               Le personnage principal est TOUJOURS un "stickman" (bonhomme bâton) avec un corps noir filiforme et une tête blanche très expressive. 
               L'arrière-plan doit être riche en détails, coloré et professionnel.
            
            Contenu du Blog :
            ${blogContent}`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            totalEstimatedDuration: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  script: { type: Type.STRING },
                  illustrationPrompts: { 
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Exactly 3 detailed illustration prompts."
                  },
                },
                required: ["title", "script", "illustrationPrompts"],
              },
            },
          },
          required: ["title", "totalEstimatedDuration", "scenes"],
        },
      },
    });

    res.json(JSON.parse(response.text));
  } catch (error) {
    console.error("Script generation error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal Server Error" });
  }
});

app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, scriptContext } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const ai = getAI();
    const model = "gemini-2.5-flash-image";
    
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            text: `Create a high-quality, vibrant, and detailed comic book illustration.
            CONTEXT (Voice-over script): "${scriptContext || ''}"
            VISUAL DESCRIPTION TO ILLUSTRATE: ${prompt}
            
            REQUIREMENTS:
            - The image MUST perfectly match the action described in the context and visual description.
            - MAIN CHARACTER: A simple black stickman with a white, highly expressive head.
            - STYLE: Modern digital comic illustration, clean lines, vibrant colors, detailed and professional backgrounds.
            - ASPECT RATIO: 16:9 cinematic.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K",
        },
      },
    });

    if (!response.candidates?.[0]?.content?.parts) {
      throw new Error("No image generated");
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return res.json({ imageUrl: `data:image/png;base64,${part.inlineData.data}` });
      }
    }

    throw new Error("No image data found");
  } catch (error) {
    console.error("Image generation error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal Server Error" });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
