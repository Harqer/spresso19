import torch
import torch.nn as nn
import torch.nn.functional as F

class MMoERanker(nn.Module):
    def __init__(self, item_dim=64, user_sub_dim=64, user_con_dim=64, num_experts=3):
        super(MMoERanker, self).__init__()
        
        # Dynamic calculation of input_dim as requested in Verification Plan
        self.input_dim = item_dim + user_sub_dim + user_con_dim
        self.num_experts = num_experts
        
        # Experts
        self.experts = nn.ModuleList([
            nn.Sequential(
                nn.Linear(self.input_dim, 128),
                nn.ReLU(),
                nn.Linear(128, 64)
            ) for _ in range(num_experts)
        ])
        
        # Gates (one for Subconscious bias, one for Conscious bias)
        self.gate_subconscious = nn.Sequential(
            nn.Linear(self.input_dim, num_experts),
            nn.Softmax(dim=-1)
        )
        self.gate_conscious = nn.Sequential(
            nn.Linear(self.input_dim, num_experts),
            nn.Softmax(dim=-1)
        )
        
        # Towers
        self.tower_subconscious = nn.Sequential(
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid() # Predicts watch ratio / completion probability
        )
        
        self.tower_conscious = nn.Sequential(
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid() # Predicts like / share probability
        )

    def forward(self, item_emb, user_sub_emb, user_con_emb):
        # Concatenate item and dual user vectors
        x = torch.cat([item_emb, user_sub_emb, user_con_emb], dim=-1)
        
        # Expert outputs
        expert_outputs = torch.stack([expert(x) for expert in self.experts], dim=1) # [batch, num_experts, 64]
        
        # Gate weights
        gate_sub_weights = self.gate_subconscious(x).unsqueeze(-1) # [batch, num_experts, 1]
        gate_con_weights = self.gate_conscious(x).unsqueeze(-1) # [batch, num_experts, 1]
        
        # Weighted sum for each task
        sub_task_input = torch.sum(expert_outputs * gate_sub_weights, dim=1)
        con_task_input = torch.sum(expert_outputs * gate_con_weights, dim=1)
        
        # Final predictions
        pred_sub = self.tower_subconscious(sub_task_input)
        pred_con = self.tower_conscious(con_task_input)
        
        # Composite score (heavily weighted towards subconscious)
        composite_score = (0.7 * pred_sub) + (0.3 * pred_con)
        
        return composite_score, pred_sub, pred_con

# Singleton instance
ranker = MMoERanker()
# In a real setup, we would load weights here: ranker.load_state_dict(...)
ranker.eval()
