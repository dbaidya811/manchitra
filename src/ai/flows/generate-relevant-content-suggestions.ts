'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating relevant content suggestions (text and imagery) based on a given theme and design.
 *
 * - generateRelevantContentSuggestions - A function that takes a theme and design description and returns content suggestions.
 * - GenerateRelevantContentSuggestionsInput - The input type for the generateRelevantContentSuggestions function.
 * - GenerateRelevantContentSuggestionsOutput - The return type for the generateRelevantContentSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRelevantContentSuggestionsInputSchema = z.object({
  theme: z.string().describe('The overall theme of the website (e.g., modern, minimalist, corporate).'),
  designDescription: z.string().describe('A detailed description of the website design, including layout, colors, and fonts.'),
});
export type GenerateRelevantContentSuggestionsInput = z.infer<typeof GenerateRelevantContentSuggestionsInputSchema>;

const GenerateRelevantContentSuggestionsOutputSchema = z.object({
  suggestedText: z.array(z.string()).describe('An array of suggested text snippets relevant to the theme and design.'),
  suggestedImages: z.array(z.string()).describe('An array of suggested image URLs relevant to the theme and design.'),
});
export type GenerateRelevantContentSuggestionsOutput = z.infer<typeof GenerateRelevantContentSuggestionsOutputSchema>;

export async function generateRelevantContentSuggestions(
  input: GenerateRelevantContentSuggestionsInput
): Promise<GenerateRelevantContentSuggestionsOutput> {
  return generateRelevantContentSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRelevantContentSuggestionsPrompt',
  input: {schema: GenerateRelevantContentSuggestionsInputSchema},
  output: {schema: GenerateRelevantContentSuggestionsOutputSchema},
  prompt: `You are an AI assistant that suggests relevant content (text and imagery) for websites based on their theme and design.

  Theme: {{{theme}}}
  Design Description: {{{designDescription}}}

  Suggest at least three relevant text snippets and three image URLs that would be suitable for this website. Text snippets should be short and engaging, suitable for headlines or brief descriptions. Image URLs should point to high-quality, relevant images.
  Return the result as a JSON object.
  `,
});

const generateRelevantContentSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateRelevantContentSuggestionsFlow',
    inputSchema: GenerateRelevantContentSuggestionsInputSchema,
    outputSchema: GenerateRelevantContentSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
