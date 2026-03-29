import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

const MAX_CONTENT_LENGTH = 50000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { blogContent } = req.body;
    if (!blogContent || typeof blogContent !== 'string') {
      return res.status(400).json({ error: "Content is required" });
    }

    if (blogContent.length > MAX_CONTENT_LENGTH) {
      return res.status(400).json({ error: `Content too long (max ${MAX_CONTENT_LENGTH} characters)` });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-2.5-flash-preview-05-20";

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

    const text = response.text;
    if (!text) {
      return res.status(500).json({ error: "Empty response from AI model" });
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: "Invalid response format from AI model" });
    }

    return res.json(parsed);
  } catch (error) {
    console.error("Script generation error:", error);
    return res.status(500).json({ error: "Failed to generate script" });
  }
}
