import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

const MAX_PROMPT_LENGTH = 5000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, scriptContext } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return res.status(400).json({ error: `Prompt too long (max ${MAX_PROMPT_LENGTH} characters)` });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-2.0-flash-exp";

    const safeContext = typeof scriptContext === 'string' ? scriptContext.slice(0, 2000) : '';

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            text: `Create a high-quality, vibrant, and detailed comic book illustration.
            CONTEXT (Voice-over script): "${safeContext}"
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
      return res.status(500).json({ error: "No image generated" });
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return res.json({ imageUrl: `data:image/png;base64,${part.inlineData.data}` });
      }
    }

    return res.status(500).json({ error: "No image data found in response" });
  } catch (error) {
    console.error("Image generation error:", error);
    return res.status(500).json({ error: "Failed to generate image" });
  }
}
