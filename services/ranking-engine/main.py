from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import numpy as np
from typing import List

from redis_state_engine import engine as state_engine
from ranker_model import ranker
from cold_start_handler import bandit
from batch_worker import worker as batch_worker

app = FastAPI(title="Spresso Ranking Engine", version="1.0.0")

@app.post("/jobs/run-retention-loop")
async def trigger_retention_loop():
    """
    Triggered by Google Cloud Scheduler (e.g. every 12 hours).
    Runs the offline PyTorch + Genkit inference to fire push notifications.
    """
    # In production, secure this endpoint via OIDC / service account verification
    batch_worker.process_idle_users()
    return {"status": "retention_loop_completed"}

class VideoInteractionEvent(BaseModel):
    uid: str
    item_id: str
    item_embedding: List[float] = Field(default_factory=lambda: [0.1] * 64) # In production, fetch this from Qdrant/Redis by item_id
    watch_ratio: float # duration / video length
    scroll_velocity_ms: int
    pause_count: int
    like_pressed: bool
    shared_external: bool

class RecommendationRequest(BaseModel):
    uid: str
    candidate_embeddings: List[List[float]] # A batch of candidate items to score

class OnboardingRequest(BaseModel):
    uid: str
    selected_categories: List[str]

@app.post("/onboarding/initialize")
async def initialize_onboarding(req: OnboardingRequest):
    """
    Seeds the Thompson Sampling bandit with strong priors for categories the user selected.
    """
    bandit.initialize_from_onboarding(req.uid, req.selected_categories)
    return {"status": "ok"}

@app.post("/telemetry/ingest")
async def ingest_telemetry(event: VideoInteractionEvent):
    """
    Ingests high-throughput telemetry from the Kotlin client and updates the dual vectors.
    """
    item_emb = np.array(event.item_embedding)
    
    # Calculate Subconscious Weight (Heavily penalize fast scrolls, reward high watch ratios)
    sub_weight = 0.0
    if event.scroll_velocity_ms < 400:
        sub_weight = -0.5 # Immediate rejection
    else:
        sub_weight = min(1.0, event.watch_ratio) + (0.1 * event.pause_count)
        
    # Calculate Conscious Weight (Explicit actions)
    con_weight = 0.0
    if event.like_pressed:
        con_weight += 0.8
    if event.shared_external:
        con_weight += 1.0

    # Update Dual State
    new_sub = state_engine.update_subconscious(event.uid, item_emb, sub_weight)
    new_con = state_engine.update_conscious(event.uid, item_emb, con_weight)

    # For 0-history cold start promotion logic
    if np.sum(np.abs(new_sub)) < 0.1: # Very low magnitude, still in cold start
        # Determine if it was a positive interaction
        is_positive = sub_weight > 0.5 or con_weight > 0
        
        # In a fully integrated system, the client would send which cluster this item belongs to.
        # For now, we sample the current assumed cluster to record the interaction.
        assumed_cluster = bandit.select_cluster_thompson_sampling(event.uid)
        bandit.record_interaction(event.uid, assumed_cluster, is_positive)

    return {"status": "ok", "sub_norm": np.linalg.norm(new_sub), "con_norm": np.linalg.norm(new_con)}

@app.post("/feed/recommend")
async def get_recommendations(req: RecommendationRequest):
    """
    Scores a batch of candidate items using the MMoE PyTorch model.
    """
    state = state_engine.get_user_state(req.uid)
    sub_vec = torch.tensor(state["subconscious_vec"], dtype=torch.float32)
    con_vec = torch.tensor(state["conscious_vec"], dtype=torch.float32)

    # Check if user is in cold start
    if torch.sum(torch.abs(sub_vec)) < 0.1:
        selected_cluster = bandit.select_cluster_thompson_sampling(req.uid)
        return {"status": "cold_start", "recommended_cluster": selected_cluster, "scores": []}

    results = []
    # In a real app, do this in a batched tensor operation. Loop for clarity.
    for idx, cand_emb_raw in enumerate(req.candidate_embeddings):
        cand_emb = torch.tensor(cand_emb_raw, dtype=torch.float32)
        
        # Add batch dim
        cand_emb = cand_emb.unsqueeze(0)
        u_sub = sub_vec.unsqueeze(0)
        u_con = con_vec.unsqueeze(0)
        
        # Forward pass
        with torch.no_grad():
            composite_score, _, _ = ranker(cand_emb, u_sub, u_con)
            results.append({"item_index": idx, "score": composite_score.item()})
            
    # Sort by descending score
    results.sort(key=lambda x: x["score"], reverse=True)
    
    return {"status": "ok", "scores": results}
