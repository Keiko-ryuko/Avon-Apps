import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const gemini = {
  generateCaption: async (productName: string, brand: string, price: number, type: 'new_arrival' | 'low_stock') => {
    const prompt = `Generate a catchy, short social media caption for a beauty product. 
    Product: ${productName}
    Brand: ${brand}
    Price: $${price}
    Type: ${type === 'new_arrival' ? 'New Arrival' : 'Running Low/Urgent'}
    Include emojis and a call to action. Keep it under 200 characters.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text?.trim() || "";
  }
};
