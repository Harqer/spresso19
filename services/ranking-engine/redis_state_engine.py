import redis
import json
import numpy as np

class RedisStateEngine:
    def __init__(self, host='localhost', port=6379, db=0):
        self.r = redis.Redis(host=host, port=port, db=db, decode_responses=True)
        # Vector dimensionality
        self.dim = 64
        # Exponential Moving Average (EMA) decay factor for Subconscious vs Conscious
        self.beta_subconscious = 0.85
        self.beta_conscious = 0.95

    def get_user_state(self, uid: str):
        raw_state = self.r.get(f"user_state:{uid}")
        if raw_state:
            state = json.loads(raw_state)
            return {
                "subconscious_vec": np.array(state["sub_vec"]),
                "conscious_vec": np.array(state["con_vec"])
            }
        else:
            # Cold start initialization
            return {
                "subconscious_vec": np.zeros(self.dim),
                "conscious_vec": np.zeros(self.dim)
            }

    def update_subconscious(self, uid: str, item_embedding: np.ndarray, interaction_weight: float):
        """
        Updates the subconscious vector using EMA. 
        interaction_weight is derived from watch ratio, scroll velocity, etc.
        """
        state = self.get_user_state(uid)
        S_old = state["subconscious_vec"]
        
        # EMA Update: S_new = beta * S_old + (1 - beta) * (weight * item_embedding)
        S_new = self.beta_subconscious * S_old + (1 - self.beta_subconscious) * (interaction_weight * item_embedding)
        
        self._save_state(uid, S_new, state["conscious_vec"])
        return S_new

    def update_conscious(self, uid: str, item_embedding: np.ndarray, interaction_weight: float):
        """
        Updates the conscious vector using EMA.
        interaction_weight is derived from likes, shares, etc.
        """
        state = self.get_user_state(uid)
        C_old = state["conscious_vec"]
        
        # EMA Update: C_new = beta * C_old + (1 - beta) * (weight * item_embedding)
        C_new = self.beta_conscious * C_old + (1 - self.beta_conscious) * (interaction_weight * item_embedding)
        
        self._save_state(uid, state["subconscious_vec"], C_new)
        return C_new

    def _save_state(self, uid: str, sub_vec: np.ndarray, con_vec: np.ndarray):
        state = {
            "sub_vec": sub_vec.tolist(),
            "con_vec": con_vec.tolist()
        }
        self.r.set(f"user_state:{uid}", json.dumps(state))

engine = RedisStateEngine()
