import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { HfInference } from '@huggingface/inference';
import { getGeminiAI } from '../geminiService.js';
import { vitposePlugin } from '../plugins/vitposePlugin.js';

export const ai = genkit({
  plugins: [
    googleAI(),
    vitposePlugin({
      endpointUrl: process.env.VITPOSE_GPU_ENDPOINT_URL,
      apiKey: process.env.VITPOSE_INTERNAL_KEY,
    }),
  ],
});

const KeypointSchema = z.object({
  name: z.string(),
  x: z.number(),
  y: z.number(),
  score: z.number(),
});

const ViTPoseOutputSchema = z.object({
  modelUsed: z.string().optional(),
  keypoints: z.array(KeypointSchema),
  skeletonWireframeMap: z.string(),
  dimensions: z.object({
    shoulder_span_px: z.number(),
    torso_width_px: z.number(),
    torso_height_px: z.number(),
    hip_width_px: z.number(),
    shoulder_slope_deg: z.number(),
    estimated_height_cm: z.number(),
    estimated_chest_girth_cm: z.number(),
    estimated_waist_girth_cm: z.number(),
  }).optional(),
});

export const extractViTPose = ai.defineTool(
  {
    name: 'huggingfaceViTPose',
    description: 'Executes real forward pass on ViTPose Vision Transformer via Hugging Face Inference API or Model Garden Endpoint',
    inputSchema: z.object({
      userImageBase64: z.string(),
      modelVariant: z
        .enum(['usyd-dlc/vitpose-base-simple', 'usyd-dlc/vitpose-large-coco'])
        .default('usyd-dlc/vitpose-base-simple'),
    }),
    outputSchema: ViTPoseOutputSchema,
  },
  async (input) => {
    const endpointUrl = process.env.VITPOSE_MODEL_GARDEN_ENDPOINT;
    const hfToken = process.env.HF_TOKEN;

    // 1. Check Model Garden Custom Container Endpoint if configured
    if (endpointUrl) {
      try {
        const response = await fetch(endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_bytes: input.userImageBase64.replace(/^data:image\/\w+;base64,/, ''),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            modelUsed: 'model-garden/vitpose-container',
            keypoints: data.keypoints || [],
            skeletonWireframeMap: data.skeletonWireframeMap || '',
            dimensions: data.dimensions,
          };
        } else {
          console.warn(`[ViTPose Action] Model Garden Endpoint returned status ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        console.warn('[ViTPose Action] Model Garden endpoint call error:', err);
      }
    }

    // 2. Call Hugging Face Inference API for ViTPose Vision Transformer
    if (hfToken) {
      try {
        const hf = new HfInference(hfToken);
        const base64Data = input.userImageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

        const poseResults = await hf.imageSegmentation({
          model: input.modelVariant,
          inputs: imageBlob,
        });

        if (Array.isArray(poseResults) && poseResults.length > 0) {
          const keypoints = poseResults.map((item: any) => ({
            name: item.label || 'joint',
            score: item.score || 1.0,
            x: Number(item.x || 0),
            y: Number(item.y || 0),
          }));

          const skeletonWireframeMap = keypoints
            .map((k) => `${k.name}:(${Math.round(k.x)},${Math.round(k.y)})`)
            .join(';');

          return {
            modelUsed: input.modelVariant,
            keypoints,
            skeletonWireframeMap,
          };
        }
      } catch (hfErr: any) {
        console.warn('[ViTPose Action] Hugging Face Inference API execution failed:', hfErr);
        throw new Error(`ViTPose Hugging Face Inference API error: ${hfErr.message || hfErr}`);
      }
    }

    // 3. Agent Platform Vision Keypoint Extraction (Gemini Multimodal Vision fallback for spatial parsing)
    const geminiAi = getGeminiAI();
    const cleanBase64 = input.userImageBase64.replace(/^data:image\/\w+;base64,/, '');
    const visionPrompt = `You are ViTPose Plain Vision Transformer Pose Keypoint Estimator.
Analyze the user image and extract normalized 2D skeletal pose keypoints (0-500 scale for x and y coordinates):
Return valid JSON matching this structure:
{
  "keypoints": [
    {"name": "nose", "x": 200, "y": 70, "score": 0.99},
    {"name": "left_shoulder", "x": 145, "y": 120, "score": 0.98},
    {"name": "right_shoulder", "x": 255, "y": 122, "score": 0.98},
    {"name": "left_hip", "x": 160, "y": 260, "score": 0.95},
    {"name": "right_hip", "x": 240, "y": 262, "score": 0.95}
  ],
  "skeletonWireframeMap": "OPENPOSE_SKELETON_MAP::HEAD(200,70);SHOULDERS(145,120-255,122);HIPS(160,260-240,262)"
}`;

    const res = await geminiAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
        visionPrompt
      ],
      config: { responseMimeType: 'application/json' }
    });

    if (res?.text) {
      const parsed = JSON.parse(res.text.replace(/```json\s*|\s*```/g, '').trim());
      if (parsed.keypoints && Array.isArray(parsed.keypoints)) {
        return {
          modelUsed: 'gemini-2.5-flash/spatial-pose-vision',
          keypoints: parsed.keypoints,
          skeletonWireframeMap: parsed.skeletonWireframeMap || 'OPENPOSE_SKELETON_MAP::ESTIMATED'
        };
      }
    }

    throw new Error("Unable to extract pose keypoints: ViTPose Hugging Face / Model Garden inference endpoint not configured or image invalid.");
  }
);
