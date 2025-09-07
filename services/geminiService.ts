import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

// Model for image editing, "Nano Banana", to ensure visual consistency from blueprints.
const NANO_BANANA_MODEL = 'gemini-2.5-flash-image-preview';

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

interface ImagePart {
  base64: string;
  mimeType: string;
}

export const generateFromMultipleImagesAndText = async (
  images: ImagePart[],
  prompt: string
): Promise<string> => {
  try {
    const imageParts = images.map(img => fileToGenerativePart(img.base64, img.mimeType));
    const textPart = { text: prompt };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: NANO_BANANA_MODEL,
      contents: { parts: [...imageParts, textPart] },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error("No image part found in the response.");

  } catch (error) {
    console.error("Error generating from images and text:", error);
    throw new Error("Failed to generate visualization. Please try again.");
  }
};


export const generateFromImageAndText = async (
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  return generateFromMultipleImagesAndText([{ base64: imageBase64, mimeType }], prompt);
};


export const generatePanoramaFromRooms = async (
    topDownImageBase64: string,
    roomImagesBase64: string[]
): Promise<string> => {
    try {
        const parts = [
            { text: "Act as an expert computer vision system specializing in architectural visualization." },
            fileToGenerativePart(topDownImageBase64, 'image/png'),
            { text: "This is the top-down floor plan for spatial reference." },
            ...roomImagesBase64.map(img => fileToGenerativePart(img, 'image/png')),
            {
                text: `These are ${roomImagesBase64.length} individual, partially overlapping, eye-level renders of the same room from different viewing angles.
      Your task is to stitch these images into a single, seamless, high-resolution 360x180 degree equirectangular panorama suitable for an immersive virtual tour.
      
      Follow this precise methodology:
      1.  **Feature Detection & Matching:** Use a SIFT-like approach to find and match keypoints between overlapping images.
      2.  **Geometric Estimation:** Employ a RANSAC-based method to calculate robust homography transformations, aligning architectural features.
      3.  **Warping & Projection:** Warp the images onto a common spherical projection plane.
      4.  **Blending:** Use multi-band blending to create invisible seams.
      5.  **Enhancements:** Apply bundle adjustment for global consistency and synthesize HDRI for realistic lighting.
      6.  **Final Output:** Produce one single equirectangular panoramic image. Do not output any text, explanations, or other images. Only the final stitched panorama.
      `
            }
        ];

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: NANO_BANANA_MODEL,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("No panoramic image was generated in the response.");

    } catch (error) {
        console.error("Error generating panorama:", error);
        throw new Error("Failed to generate the 360° tour. Please try again.");
    }
};