'use server';

/**
 * @fileOverview A content filter AI agent.
 *
 * - contentFilter - A function that handles the content filtering process.
 * - ContentFilterInput - The input type for the contentFilter function.
 * - ContentFilterOutput - The return type for the contentFilter function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ContentFilterInputSchema = z.object({
  text: z.string().describe('The text to be filtered.'),
  parentalControls: z
    .string()
    .optional()
    .describe('Additional parental controls to apply.'),
});
export type ContentFilterInput = z.infer<typeof ContentFilterInputSchema>;

const ContentFilterOutputSchema = z.object({
  filteredText: z.string().describe('The filtered text.'),
  isSafe: z.boolean().describe('Whether the text is safe for children.'),
  reason: z
    .string()
    .optional()
    .describe('The reason why the text was filtered.'),
});
export type ContentFilterOutput = z.infer<typeof ContentFilterOutputSchema>;

export async function contentFilter(input: ContentFilterInput): Promise<ContentFilterOutput> {
  return contentFilterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contentFilterPrompt',
  input: {
    schema: z.object({
      text: z.string().describe('The text to be filtered.'),
      parentalControls: z
        .string()
        .optional()
        .describe('Additional parental controls to apply.'),
    }),
  },
  output: {
    schema: z.object({
      filteredText: z.string().describe('The filtered text.'),
      isSafe: z.boolean().describe('Whether the text is safe for children.'),
      reason:
        z.string().optional().describe('The reason why the text was filtered.'),
    }),
  },
  prompt: `You are an AI content filter designed to ensure text is age-appropriate and safe for children 13 and under.

  Your primary goal is to filter the input text, removing any content that is inappropriate, harmful, or unsafe for children.

  Consider the following safety guidelines:
  - No sexually suggestive content
  - No violent content
  - No hate speech
  - No promotion of illegal activities
  - No personal information

  If the text violates any of these guidelines, filter it by removing or replacing the inappropriate content.

  {{#if parentalControls}}
  Apply these additional parental controls: {{{parentalControls}}}
  {{/if}}

  Input Text: {{{text}}}

  Output the filtered text, a boolean indicating whether the text is safe, and a reason if it is not safe.
  `,
});

const contentFilterFlow = ai.defineFlow<
  typeof ContentFilterInputSchema,
  typeof ContentFilterOutputSchema
>({
  name: 'contentFilterFlow',
  inputSchema: ContentFilterInputSchema,
  outputSchema: ContentFilterOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});
