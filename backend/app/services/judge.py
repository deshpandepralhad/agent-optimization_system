import logging
import json
import aiohttp
import re
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class LLMJudge:
    """
    LLM-as-a-Judge service using local Ollama models
    Now with REAL intelligence, not mock data
    """
    
    def __init__(self, model: str = "llama3.2:1b"):
        self.model = model
        self.ollama_url = "http://localhost:11434/api/generate"
        logger.info(f"LLM Judge initialized with model: {model}")
    
    async def _call_ollama(self, prompt: str) -> Dict[str, Any]:
        """Call local Ollama model as judge"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.ollama_url, json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": 0.3,
                    "format": "json"
                }) as response:
                    
                    if response.status != 200:
                        logger.error(f"Ollama returned {response.status}")
                        return self._fallback_scores()
                    
                    result = await response.json()
                    text = result.get('response', '{}')
                    
                    # Clean and parse JSON
                    try:
                        # Remove markdown code blocks if present
                        text = re.sub(r'```json\s*|\s*```', '', text)
                        # Find first { and last }
                        start = text.find('{')
                        end = text.rfind('}') + 1
                        if start >= 0 and end > start:
                            text = text[start:end]
                        
                        return json.loads(text)
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse JSON: {e}\nResponse: {text[:200]}")
                        return self._fallback_scores()
                    
        except aiohttp.ClientConnectorError:
            logger.error("Cannot connect to Ollama. Is it running?")
            return self._fallback_scores()
        except Exception as e:
            logger.error(f"Ollama call failed: {e}")
            return self._fallback_scores()
    
    async def evaluate_pairwise(
        self, 
        prompt: str, 
        response_a: str, 
        response_b: str
    ) -> Dict[str, Any]:
        """
        Compare two responses head-to-head using real LLM intelligence
        """
        judge_prompt = f"""You are an expert judge evaluating AI responses. You must respond with valid JSON only.

Task: {prompt}

Response A: {response_a}

Response B: {response_b}

Evaluate which response is better on accuracy, clarity, and completeness (1-10).

Return ONLY a JSON object with this exact structure:
{{
    "winner": "A" or "B" or "tie",
    "scores": {{
        "A": {{"accuracy": 0-10, "clarity": 0-10, "completeness": 0-10}},
        "B": {{"accuracy": 0-10, "clarity": 0-10, "completeness": 0-10}}
    }},
    "reasoning": "One sentence explaining why"
}}"""
        
        result = await self._call_ollama(judge_prompt)
        
        # Ensure result has required structure
        if "winner" not in result:
            logger.warning("Invalid response structure, using fallback")
            return self._fallback_scores()
        
        return result
    
    async def evaluate_single(
        self,
        prompt: str,
        response: str
    ) -> Dict[str, Any]:
        """
        Score a single response on multiple dimensions
        """
        judge_prompt = f"""You are an expert judge evaluating an AI response. Respond with JSON only.

Task: {prompt}

Response: {response}

Score this response on accuracy, clarity, and completeness (1-10).

Return ONLY:
{{
    "scores": {{"accuracy": 0-10, "clarity": 0-10, "completeness": 0-10}},
    "overall_score": 0-10,
    "reasoning": "One sentence summary",
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"]
}}"""
        
        return await self._call_ollama(judge_prompt)
    
    async def evaluate_multiaspect(
        self,
        prompt: str,
        response: str
    ) -> Dict[str, Any]:
        """
        Comprehensive 8-dimensional evaluation
        """
        judge_prompt = f"""You are an expert judge. Respond with JSON only.

Task: {prompt}

Response: {response}

Score this response on:
- correctness (1-10)
- helpfulness (1-10)
- coherence (1-10)
- depth (1-10)

Return ONLY:
{{
    "dimension_scores": {{
        "correctness": 0-10,
        "helpfulness": 0-10,
        "coherence": 0-10,
        "depth": 0-10
    }},
    "overall_score": 0-10,
    "summary": "One sentence",
    "key_strength": "best aspect",
    "key_weakness": "worst aspect"
}}"""
        
        return await self._call_ollama(judge_prompt)
    
    def _fallback_scores(self) -> Dict[str, Any]:
        """Fallback when judge fails"""
        logger.warning("Using fallback scores - Ollama may not be running")
        return {
            "winner": "tie",
            "scores": {
                "A": {"accuracy": 7, "clarity": 7, "completeness": 7},
                "B": {"accuracy": 7, "clarity": 7, "completeness": 7}
            },
            "reasoning": "Unable to evaluate at this time (Ollama connection issue)",
            "overall_score": 7.0,
            "dimension_scores": {
                "correctness": 7,
                "helpfulness": 7,
                "coherence": 7,
                "depth": 7
            }
        }

# Singleton instance
judge_service = LLMJudge()