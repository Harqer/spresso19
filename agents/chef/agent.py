import asyncio
import base64
import numpy as np
import re
import os
from typing import Any, Dict, AsyncIterator
from google_antigravity import Agent, LocalAgentConfig

class ChefAgent:
    """
    Chef AI using Vertex AI Agent Engine and the Gemini Multimodal Live API.
    Refactored to use the official google-antigravity SDK.
    """
    def __init__(self, project: str, location: str, model_id: str):
        self.project = project
        self.location = location
        self.model_id = model_id
        self.agent = None

    def _load_prompt(self):
        prompt_path = os.path.join(os.path.dirname(__file__), "../../functions/src/ai/prompts/bargainChef.prompt")
        try:
            with open(prompt_path, 'r') as f:
                content = f.read()
                # Strip YAML frontmatter
                content = re.sub(r"^---\n.*?\n---\n", "", content, flags=re.DOTALL)
                return content.strip()
        except Exception as e:
            print(f"Warning: Failed to load system prompt: {e}")
            return "You are Chef AI, a real-time voice and video cooking assistant."

    def set_up(self):
        config = LocalAgentConfig(
            project=self.project,
            location=self.location,
            vertex=True,
            model_id=self.model_id
        )
        self.agent = Agent(config)
        self.agent.system_instruction = self._load_prompt()
        # The Antigravity SDK natively configures the model, modalities, and safety settings.

    async def bidi_stream_query(self, queue: asyncio.Queue) -> AsyncIterator[Dict[str, Any]]:
        # The Antigravity SDK supports async generator inputs for continuous bidirectional streaming
        async def input_generator():
            while True:
                message = await queue.get()
                input_text = message.get("input", "")
                if input_text.lower() in ("exit", "quit"):
                    break
                yield input_text

        try:
            async for event in self.agent.stream(input_generator()):
                if event.type == "audio":
                    # Emit raw PCM audio arrays for the frontend WebRTC player
                    if isinstance(event.data, bytes):
                        audio_array = np.frombuffer(event.data, dtype=np.int16)
                        yield {"output": audio_array.tolist()}
                    elif isinstance(event.data, list):
                        yield {"output": event.data}
        except Exception as e:
            print(f"SDK Stream Error: {e}")

    def register_operations(self):
        return {
            "bidi_stream": ["bidi_stream_query"]
        }
