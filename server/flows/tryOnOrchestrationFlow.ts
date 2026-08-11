import { z } from 'genkit';
import { extractViTPose, ai } from '../actions/vitposeAction.ts';
import { googleAI } from '@genkit-ai/google-genai';

export const tryOnFlow = ai.defineFlow(
  {
    name: 'tryOnFlow',
    inputSchema: z.object({
      userImageBase64: z.string(),
      garmentImageUrl: z.string(),
      modelVariant: z
        .enum(['usyd-dlc/vitpose-base-simple', 'usyd-dlc/vitpose-large-coco'])
        .default('usyd-dlc/vitpose-large-coco'),
    }),
    outputSchema: z.object({
      poseData: z.any(),
      renderedTryOnUrl: z.string(),
      veo360SpinUrl: z.string().optional(),
    }),
  },
  async (input) => {
    // Step 1: Execute ViTPose via Hugging Face / Model Garden Genkit Action
    const vitposeResult = await extractViTPose({
      userImageBase64: input.userImageBase64,
      modelVariant: input.modelVariant || 'usyd-dlc/vitpose-large-coco',
    });

    // Step 2: Pass spatial wireframe constraints to Imagen 3 / Nano Banana for Try-On Rendering
    let renderedTryOnUrl = input.garmentImageUrl;
    try {
      const tryOnResult = await ai.generate({
        model: googleAI.model('imagen-3'),
        prompt: [
          {
            text: `Virtual clothing try-on draping garment over body structure matching skeletal wireframe: ${vitposeResult.skeletonWireframeMap}`,
          },
          { media: { url: input.userImageBase64.startsWith('data:') ? input.userImageBase64 : `data:image/jpeg;base64,${input.userImageBase64}` } },
          { media: { url: input.garmentImageUrl } },
        ],
      });
      renderedTryOnUrl = tryOnResult.media?.url || input.garmentImageUrl;
    } catch (e: any) {
      console.warn('[tryOnFlow] Imagen generation error:', e);
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
    } catch (e: any) {
      console.warn('[tryOnFlow] Veo 360 spin generation error:', e);
    }

    return {
      poseData: vitposeResult.keypoints,
      renderedTryOnUrl,
      veo360SpinUrl,
    };
  }
);
