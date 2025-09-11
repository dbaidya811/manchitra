"use server";

import { generateRelevantContentSuggestions } from "@/ai/flows/generate-relevant-content-suggestions";
import { z } from "zod";

const suggestionSchema = z.object({
  theme: z.string(),
  designDescription: z.string(),
});

export async function getSuggestions(input: {
  theme: string;
  designDescription: string;
}) {
  const parsedInput = suggestionSchema.parse(input);
  try {
    const suggestions = await generateRelevantContentSuggestions(parsedInput);
    return { success: true, data: suggestions };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to generate suggestions." };
  }
}

export async function exportWebsite(websiteConfig: any) {
  console.log("Exporting website with config:", websiteConfig);
  // This is a placeholder for the actual export logic which is complex.
  // A real implementation would involve rendering components to static HTML,
  // extracting CSS, and bundling assets into a downloadable zip file.
  return {
    success: true,
    message: "Export feature is under development. Check the console for the website configuration.",
  };
}
