import random
import json
from redis_state_engine import engine as state_engine

class ColdStartBandit:
    def __init__(self):
        # Explicit categories matching the Kotlin OnboardingInterestsCard
        self.clusters = [
            "Sports & Outdoors", 
            "Consumer Technology", 
            "Women's Fashion", 
            "Men's Fashion", 
            "Beauty & Skincare", 
            "Home & Interior Design", 
            "Health & Wellness", 
            "Automotive & Gadgets"
        ]

    def _get_user_bandit_state(self, uid: str):
        raw_state = state_engine.r.get(f"bandit_state:{uid}")
        if raw_state:
            return json.loads(raw_state)
        return {c: {"alpha": 1.0, "beta": 1.0} for c in self.clusters}

    def _save_user_bandit_state(self, uid: str, state: dict):
        state_engine.r.set(f"bandit_state:{uid}", json.dumps(state))

    def initialize_from_onboarding(self, uid: str, selected_categories: list):
        """
        Boosts the alpha parameter significantly for categories the user explicitly selected during onboarding.
        """
        state = self._get_user_bandit_state(uid)
        for cat in selected_categories:
            if cat in state:
                # Strong prior for selected interests
                state[cat]["alpha"] += 10.0
        self._save_user_bandit_state(uid, state)

    def select_cluster_thompson_sampling(self, uid: str):
        """
        Selects a cluster using Thompson Sampling for a specific user.
        """
        state = self._get_user_bandit_state(uid)
        sampled_theta = {}
        
        for cluster, stats in state.items():
            # Sample from Beta distribution
            sampled_theta[cluster] = random.betavariate(stats["alpha"], stats["beta"])
        
        return max(sampled_theta, key=sampled_theta.get)

    def record_interaction(self, uid: str, cluster: str, is_positive: bool):
        """
        Updates the beta distribution for a cluster based on user interaction.
        """
        state = self._get_user_bandit_state(uid)
        if cluster not in state:
            return # Ignore unknown clusters
            
        if is_positive:
            state[cluster]["alpha"] += 1.0
        else:
            state[cluster]["beta"] += 1.0
            
        self._save_user_bandit_state(uid, state)

bandit = ColdStartBandit()
