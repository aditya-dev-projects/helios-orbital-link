import { GoogleGenerativeAI } from "@google/generative-ai";

// Replace with your actual API Key
const genAI = new GoogleGenerativeAI("AIzaSyAHhyky1lNQJdlfywlKPsJjFyPbAi0fvio");

export const analyzeComponentImage = async (imageFile: File) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Convert file to base64 for the API
  const imageData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(imageFile);
  });

  const prompt = `
    Analyze this engineering component image for a Space-Based Solar Power simulation.
    Extract the following values if visible, otherwise estimate based on component type:
    - efficiency (0-100)
    - mass (kg)
    - powerOutput (kW)
    - cost (USD)
    Return ONLY a valid JSON object with these keys.
  `;

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: imageData, mimeType: imageFile.type } }
  ]);

  const text = result.response.text();
  return JSON.parse(text.replace(/```json|```/g, ""));
};