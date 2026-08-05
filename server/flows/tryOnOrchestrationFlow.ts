import { z } from 'genkit';
import { extractViTPose, ai } from '../actions/vitposeAction.js';
import { googleAI } from '@genkit-ai/google-genai';

export const tryOnFlow = ai.defineFlow(
  {
    name: 'tryOnFlow',
    inputSchema: z.object({
      userImageBase64: z.string(),
      garmentImageUrl: z.string(),
    }),
    outputSchema: z.object({
      renderedTryOnUrl: z.string(),
      veo360SpinUrl: z.string().optional(),
    }),
  },
  async (input) => {
    // Step 1: Run ViTPose Action to extract high-precision skeletal keypoints
    const poseData = await extractViTPose({ userImageBase64: input.userImageBase64 });

    // Step 2: Pass pose constraints and images to Imagen 3 / Nano Banana for Try-On Rendering
    let renderedTryOnUrl = input.garmentImageUrl;
    try {
      const tryOnResult = await ai.generate({
        model: googleAI.model('imagen-3'),
        prompt: [
          { text: `Photorealistic clothing try-on overlaying garment on subject matching skeletal wireframe: ${poseData.skeletonWireframeMap}` },
          { media: { url: input.userImageBase64.startsWith('data:') ? input.userImageBase64 : `data:image/jpeg;base64,${input.userImageBase64}` } },
          { media: { url: input.garmentImageUrl } },
        ],
      });
      renderedTryOnUrl = tryOnResult.media?.url || input.garmentImageUrl;
    } catch (e) {
      console.warn('[tryOnFlow] Imagen generation fallback:', e);
    }

    // Step 3: Pass rendered image to Veo for 360-degree rotation spin video
    let veo360SpinUrl: string | undefined = undefined;
    try {
      const veoResult = await ai.generate({
        model: googleAI.model('veo-2'),
        prompt: [
          { text: '360 degree seamless turntable product rotation loop.' },
          { media: { url: renderedTryOnUrl } },
        ],
      });
      veo360SpinUrl = veoResult.media?.url;
    } catch (e) {
      console.warn('[tryOnFlow] Veo 360 spin generation fallback:', e);
    }

    return {
      renderedTryOnUrl,
      veo360SpinUrl,
    };
  }
);
