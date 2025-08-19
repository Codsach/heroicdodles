'use server';
/**
 * @fileOverview An AI agent that classifies a weapon drawing as sword, gun, or shield.
 *
 * - classifyWeapon - A function that classifies the weapon drawing.
 * - ClassifyWeaponInput - The input type for the classifyWeapon function.
 * - ClassifyWeaponOutput - The return type for the classifyWeapon function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClassifyWeaponInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A drawing of a weapon, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ClassifyWeaponInput = z.infer<typeof ClassifyWeaponInputSchema>;

const ClassifyWeaponOutputSchema = z.object({
  weaponType: z.enum(['sword', 'gun', 'shield']).describe('The type of weapon classified by the AI.'),
});
export type ClassifyWeaponOutput = z.infer<typeof ClassifyWeaponOutputSchema>;

export async function classifyWeapon(input: ClassifyWeaponInput): Promise<ClassifyWeaponOutput> {
  return classifyWeaponFlow(input);
}

const prompt = ai.definePrompt({
  name: 'classifyWeaponPrompt',
  input: {schema: ClassifyWeaponInputSchema},
  output: {schema: ClassifyWeaponOutputSchema},
  prompt: `You are an AI that classifies weapon drawings into one of three categories: sword, gun, or shield.\n\nAnalyze the drawing and determine whether it is most like a sword, gun, or shield.  Return only the string value of the weapon type.\n\nDrawing: {{media url=photoDataUri}}`,
});

const classifyWeaponFlow = ai.defineFlow(
  {
    name: 'classifyWeaponFlow',
    inputSchema: ClassifyWeaponInputSchema,
    outputSchema: ClassifyWeaponOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
