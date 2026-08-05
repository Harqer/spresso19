import base64
import io
import os
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForPoseEstimation

app = FastAPI(
    title="ViTPose Plain Vision Transformer Microservice",
    description="Production PyTorch inference microservice for ViTAE-Transformer/ViTPose (usyd-dlc/vitpose-large-coco)"
)

# Load ViTPose model weights from Hugging Face / ViTAE-Transformer repository
MODEL_ID = os.getenv("VITPOSE_MODEL_ID", "usyd-dlc/vitpose-large-coco")
device = "cuda" if torch.cuda.is_available() else "cpu"

print(f"[ViTPose Microservice] Loading {MODEL_ID} on device: {device}")
processor = AutoImageProcessor.from_pretrained(MODEL_ID)
model = AutoModelForPoseEstimation.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16 if device == "cuda" else torch.float32
).to(device)

class PoseRequest(BaseModel):
    image_base64: str

@app.get("/health")
def health_check():
    return {"status": "ok", "model": MODEL_ID, "device": device}

@app.post("/v1/predict")
async def predict_pose(req: PoseRequest):
    try:
        # Decode base64 image
        clean_b64 = req.image_base64.replace(/^data:image\/\w+;base64,/, "")
        image_bytes = base64.b64decode(clean_b64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Prepare tensors & execute forward pass on ViTPose model
        inputs = processor(images=image, return_tensors="pt").to(device)
        if device == "cuda":
            inputs = {k: v.to(torch.float16) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)

        # Post-process pose estimations
        results = processor.post_process_pose_estimation(outputs, target_sizes=[image.size[::-1]])[0]
        
        keypoints = []
        for point, score in zip(results["keypoints"].tolist(), results["scores"].tolist()):
            keypoints.append({
                "x": round(point[0], 2),
                "y": round(point[1], 2),
                "score": round(score, 4)
            })

        skeleton_map = ";".join([f"j{i}:({kp['x']},{kp['y']})" for i, kp in enumerate(keypoints)])

        return {
            "status": "success",
            "model": MODEL_ID,
            "keypoints": keypoints,
            "skeletonMapString": skeleton_map
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
