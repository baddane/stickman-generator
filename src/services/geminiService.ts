export interface Scene {
  title: string;
  script: string;
  illustrationPrompts: string[];
}

export interface VideoScript {
  title: string;
  totalEstimatedDuration: string;
  scenes: Scene[];
}

export async function generateYouTubeScript(blogContent: string): Promise<VideoScript> {
  const response = await fetch("/api/generate-script", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blogContent }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate script");
  }

  return response.json();
}

export async function generateImage(prompt: string, scriptContext?: string): Promise<string> {
  const response = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, scriptContext }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate image");
  }

  const data = await response.json();
  return data.imageUrl;
}
