import { Genkit, z } from 'genkit';

export interface ViTPosePluginOptions {
  endpointUrl?: string;
  apiKey?: string;
}

export function vitposePlugin(options: ViTPosePluginOptions = {}) {
  return (ai: Genkit) => {
    return {
      name: 'vitposePlugin',
      initializer: () => {
        ai.defineTool(
          {
            name: 'vitposePlugin/extractPoseLarge',
            description: 'Commercial GPU-backed Vision Transformer keypoint estimator based on official ViTAE-Transformer/ViTPose architecture (Cloud Run GPU / Model Garden Microservice)',
            inputSchema: z.object({
              imageBase64: z.string(),
            }),
            outputSchema: z.object({
              status: z.string(),
              model: z.string(),
              keypoints: z.array(
                z.object({
                  x: z.number(),
                  y: z.number(),
                  score: z.number(),
                  label: z.string().optional(),
                })
              ),
              skeletonMapString: z.string().optional(),
            }),
          },
          async (input) => {
            const endpointUrl = options.endpointUrl || process.env.VITPOSE_GPU_ENDPOINT_URL || 'https://vitpose-gpu-service.a.run.app/v1/predict';
            const apiKey = options.apiKey || process.env.VITPOSE_INTERNAL_KEY;

            const response = await fetch(endpointUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
              },
              body: JSON.stringify({ image_base64: input.imageBase64 }),
            });

            if (!response.ok) {
              throw new Error(`ViTPose GPU cluster microservice error: ${response.statusText} (${response.status})`);
            }

            const data = await response.json();
            const keypoints = data.keypoints || [];
            const skeletonMapString = keypoints
              .map((k: any, i: number) => `${k.label || 'j' + i}:(${k.x},${k.y})`)
              .join(';');

            return {
              status: data.status || 'success',
              model: data.model || 'usyd-dlc/vitpose-large-coco',
              keypoints,
              skeletonMapString,
            };
          }
        );
      },
    };
  };
}
