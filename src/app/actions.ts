'use server';

import { classifyWeapon } from '@/ai/flows/classify-weapon';

export async function classifyDrawingAction(photoDataUri: string) {
  try {
    const result = await classifyWeapon({ photoDataUri });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error classifying weapon:', error);
    // In a real app, you might want to log this error to a monitoring service.
    return { success: false, error: 'Failed to classify the drawing. Our AI is taking a quick nap. Please try again.' };
  }
}
