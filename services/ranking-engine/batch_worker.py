import os
import torch
import numpy as np
import requests
import firebase_admin
from firebase_admin import credentials, messaging

from redis_state_engine import engine as state_engine
from ranker_model import ranker

# Initialize Firebase Admin SDK for sending Push Notifications
# In production, GOOGLE_APPLICATION_CREDENTIALS must be set in the environment
if not firebase_admin._apps:
    try:
        firebase_admin.initialize_app()
    except Exception as e:
        print(f"Failed to init Firebase Admin: {e}")

class BatchRetentionWorker:
    def __init__(self):
        # We need a way to hit the Genkit flow for live product discovery
        # This URL should point to the deployed Firebase Cloud Function
        self.genkit_discover_url = os.getenv(
            "GENKIT_DISCOVER_URL", 
            "http://localhost:5001/spresso-project/us-central1/discoverPersonalizedProducts"
        )
    
    def process_idle_users(self):
        print("Starting offline retention batch job...")
        
        # 1. Fetch all user keys from Redis
        user_keys = state_engine.r.keys("user_state:*")
        
        for key in user_keys:
            uid = key.replace("user_state:", "")
            state = state_engine.get_user_state(uid)
            
            sub_vec = state["subconscious_vec"]
            con_vec = state["conscious_vec"]
            
            # 2. Skip users with weak profiles (still in cold start or not enough data)
            if np.linalg.norm(sub_vec) < 0.5:
                continue
                
            print(f"Processing retention loop for user: {uid}")
            
            # 3. Fetch candidates from Genkit based on their inferred profile
            # In a true integration, we would pull their inferred pain points from Firestore
            # For now, we mock a search query based on standard retention hooks
            candidates = self._fetch_genkit_candidates(uid)
            if not candidates:
                continue
                
            # 4. Rank candidates using the PyTorch MMoE
            best_candidate = self._rank_candidates(sub_vec, con_vec, candidates)
            
            # 5. Threshold check: only push if the PyTorch score is exceptionally high (>0.90)
            if best_candidate and best_candidate["score"] > 0.90:
                self._send_push_notification(uid, best_candidate["item"])

    def _fetch_genkit_candidates(self, uid):
        # Calls the discoverPersonalizedProducts flow
        try:
            # We assume the user wants 'trending fashion' or 'tech gadgets' as a broad hook
            # In production, pull from Firestore `user_profiles` -> `inferredPainPoints`
            payload = {"data": {"searchQueries": ["trending new tech gadgets 2026", "viral fashion trends"]}}
            # Since this is server-to-server, we might need a service account token
            response = requests.post(self.genkit_discover_url, json=payload)
            if response.status_code == 200:
                return response.json().get("result", {}).get("items", [])
        except Exception as e:
            print(f"Failed to fetch Genkit candidates: {e}")
        return []

    def _rank_candidates(self, sub_vec, con_vec, items):
        if not items:
            return None
            
        sub_tensor = torch.tensor(sub_vec, dtype=torch.float32).unsqueeze(0)
        con_tensor = torch.tensor(con_vec, dtype=torch.float32).unsqueeze(0)
        
        best_item = None
        best_score = -1.0
        
        for item in items:
            # Mock candidate embedding extraction. In prod, fetch from Vector DB
            cand_emb = torch.ones(64) * 0.1 # Placeholder
            cand_emb = cand_emb.unsqueeze(0)
            
            with torch.no_grad():
                composite_score, _, _ = ranker(cand_emb, sub_tensor, con_tensor)
                score_val = composite_score.item()
                
                if score_val > best_score:
                    best_score = score_val
                    best_item = item
                    
        return {"item": best_item, "score": best_score}

    def _send_push_notification(self, uid, item):
        print(f"Dispatched Push Notification to {uid} for item {item.get('name')}")
        
        # In a real app, you fetch the user's FCM registration token from Firestore
        # fcm_token = fetch_token_from_firestore(uid)
        
        message = messaging.Message(
            notification=messaging.Notification(
                title="We found something you'll love ❤️",
                body=f"Check out this {item.get('name', 'product')} based on your recent activity.",
                image=item.get('imageUrl', '')
            ),
            data={
                "action": "DEEP_LINK",
                "item_id": item.get('id', '')
            },
            topic=uid # Using topics as a fallback if token isn't available
        )
        
        try:
            messaging.send(message)
        except Exception as e:
            print(f"Firebase Messaging error: {e}")

worker = BatchRetentionWorker()
