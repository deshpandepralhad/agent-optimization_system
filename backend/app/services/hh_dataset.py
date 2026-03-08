import json
import random
import os
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class HHDataset:
    """Load and serve prompts from Anthropic HH Golden dataset"""
    
    def __init__(self, data_path: str = None):
        if data_path is None:
            # Get the absolute path to the backend directory
            current_dir = os.path.dirname(os.path.abspath(__file__))
            # Go up from services/ to backend/ then to data/
            backend_dir = os.path.dirname(os.path.dirname(current_dir))
            self.data_path = os.path.join(backend_dir, "data", "train.jsonl")
        else:
            self.data_path = data_path
            
        print(f"🔍 Dataset path: {self.data_path}")
        print(f"🔍 File exists: {os.path.exists(self.data_path)}")
        
        self.examples = []
        self.load_data()
    
    def load_data(self):
        """Load JSONL file with proper parsing"""
        try:
            if not os.path.exists(self.data_path):
                print(f"❌ File not found: {self.data_path}")
                self.examples = self.get_fallback_examples()
                return
            
            print(f"📂 Loading dataset from: {self.data_path}")
            with open(self.data_path, 'r', encoding='utf-8') as f:
                count = 0
                for i, line in enumerate(f):
                    try:
                        # Clean the line
                        line = line.strip()
                        if not line:
                            continue
                        
                        # Parse JSON
                        example = json.loads(line)
                        
                        # Accept any dictionary with some content
                        if isinstance(example, dict):
                            self.examples.append(example)
                            count += 1
                        else:
                            print(f"⚠️ Line {i} is not a dict: {type(example)}")
                        
                        # Load first 500 for speed (remove to load all)
                        if i >= 500:
                            break
                            
                    except json.JSONDecodeError as e:
                        print(f"⚠️ JSON parse error line {i}: {e}")
                        continue
                    except Exception as e:
                        print(f"⚠️ Error processing line {i}: {e}")
                        continue
                        
            print(f"✅ Successfully loaded {count} examples")
            logger.info(f"✅ Loaded {len(self.examples)} examples from {self.data_path}")
            
            # Show a sample if loaded
            if self.examples:
                print(f"📝 Sample keys: {list(self.examples[0].keys())}")
                # Print first example structure
                print("📝 First example structure:")
                print(json.dumps(self.examples[0], indent=2)[:500])
            
        except Exception as e:
            print(f"❌ Failed to load dataset: {e}")
            logger.error(f"Failed to load dataset: {e}")
            self.examples = self.get_fallback_examples()
    
    def get_fallback_examples(self) -> List[Dict]:
        """Fallback if dataset can't be loaded"""
        print("⚠️ Using fallback examples")
        return [
            {
                "chosen": [
                    {"role": "human", "content": "What is machine learning?"},
                    {"role": "assistant", "content": "Machine learning is a subset of AI that enables systems to learn from data."}
                ],
                "rejected": [
                    {"role": "human", "content": "What is machine learning?"},
                    {"role": "assistant", "content": "ML is when computers learn patterns from examples."}
                ]
            }
        ]
    
    def get_random_prompt(self) -> Dict[str, str]:
        """Get a random prompt and both responses"""
        if not self.examples:
            print("⚠️ No examples loaded, using fallback")
            return {
                "prompt": "What is machine learning?",
                "chosen": "Machine learning is a subset of AI that enables systems to learn from data.",
                "rejected": "ML is when computers learn patterns from examples."
            }
        
        try:
            # Get random example
            example = random.choice(self.examples)
            
            # 🔴 DEBUG: Print the actual structure
            print("="*50)
            print("🔍 RAW EXAMPLE STRUCTURE:")
            print(json.dumps(example, indent=2)[:1000])  # First 1000 chars
            print("="*50)
            
            # Initialize variables
            prompt = None
            chosen = None
            rejected = None
            
            # Try different possible formats
            
            # Format 1: Anthropic HH format with messages
            if 'chosen' in example and isinstance(example['chosen'], list):
                for msg in example['chosen']:
                    if isinstance(msg, dict):
                        if msg.get('role') == 'human':
                            prompt = msg.get('content')
                        elif msg.get('role') == 'assistant':
                            chosen = msg.get('content')
                
                if 'rejected' in example and isinstance(example['rejected'], list):
                    for msg in example['rejected']:
                        if isinstance(msg, dict) and msg.get('role') == 'assistant':
                            rejected = msg.get('content')
            
            # Format 2: Direct fields
            if not prompt and 'prompt' in example:
                prompt = example['prompt']
            if not chosen and 'chosen' in example:
                if isinstance(example['chosen'], str):
                    chosen = example['chosen']
                elif isinstance(example['chosen'], list) and len(example['chosen']) > 0:
                    # Maybe it's a list with one item
                    chosen = str(example['chosen'][0]) if example['chosen'] else None
            if not rejected and 'rejected' in example:
                if isinstance(example['rejected'], str):
                    rejected = example['rejected']
                elif isinstance(example['rejected'], list) and len(example['rejected']) > 0:
                    rejected = str(example['rejected'][0]) if example['rejected'] else None
            
            # Format 3: Instruction/Output format
            if not prompt and 'instruction' in example:
                prompt = example['instruction']
            if not chosen and 'output' in example:
                chosen = example['output']
            if not rejected and 'negative_output' in example:
                rejected = example['negative_output']
            
            # Format 4: Human/Assistant as strings
            if not prompt and 'human' in example:
                prompt = example['human']
            if not chosen and 'assistant' in example:
                chosen = example['assistant']
            if not rejected and 'rejected' in example:
                rejected = example['rejected']
            
            # Format 5: Just grab first string fields if nothing found
            if not prompt:
                for key, value in example.items():
                    if isinstance(value, str) and len(value) > 20 and '?' in value:
                        prompt = value
                        break
            
            if not chosen:
                for key, value in example.items():
                    if isinstance(value, str) and key != 'rejected' and value != prompt and len(value) > 20:
                        chosen = value
                        break
            
            if not rejected:
                for key, value in example.items():
                    if isinstance(value, str) and key != 'chosen' and value != chosen and value != prompt and len(value) > 20:
                        rejected = value
                        break
            
            # Absolute fallback
            if not prompt:
                prompt = "No prompt found"
            if not chosen:
                chosen = "No chosen response"
            if not rejected:
                rejected = "No rejected response"
            
            print(f"✅ Extracted - Prompt: {prompt[:50]}...")
            print(f"✅ Extracted - Chosen: {chosen[:50]}...")
            print(f"✅ Extracted - Rejected: {rejected[:50]}...")
            
            return {
                'prompt': prompt,
                'chosen': chosen,
                'rejected': rejected
            }
            
        except Exception as e:
            print(f"❌ Error getting random prompt: {e}")
            import traceback
            traceback.print_exc()
            return {
                "prompt": "What is machine learning?",
                "chosen": "Machine learning is a subset of AI that enables systems to learn from data.",
                "rejected": "ML is when computers learn patterns from examples."
            }
    
    def get_prompts_by_topic(self, keywords: List[str], limit: int = 10) -> List[Dict]:
        """Filter prompts by keywords"""
        matches = []
        try:
            for example in self.examples:
                # Try to get prompt from various formats
                prompt = None
                
                if 'chosen' in example and isinstance(example['chosen'], list):
                    for msg in example['chosen']:
                        if isinstance(msg, dict) and msg.get('role') == 'human':
                            prompt = msg.get('content')
                            break
                
                if not prompt and 'prompt' in example:
                    prompt = example['prompt']
                if not prompt and 'instruction' in example:
                    prompt = example['instruction']
                if not prompt and 'human' in example:
                    prompt = example['human']
                
                if prompt and any(kw.lower() in prompt.lower() for kw in keywords):
                    # Get responses
                    chosen = None
                    rejected = None
                    
                    # Try to get chosen
                    if 'chosen' in example:
                        if isinstance(example['chosen'], str):
                            chosen = example['chosen']
                        elif isinstance(example['chosen'], list):
                            for msg in example['chosen']:
                                if isinstance(msg, dict) and msg.get('role') == 'assistant':
                                    chosen = msg.get('content')
                                    break
                    
                    if not chosen and 'output' in example:
                        chosen = example['output']
                    if not chosen and 'assistant' in example:
                        chosen = example['assistant']
                    
                    # Try to get rejected
                    if 'rejected' in example:
                        if isinstance(example['rejected'], str):
                            rejected = example['rejected']
                        elif isinstance(example['rejected'], list):
                            for msg in example['rejected']:
                                if isinstance(msg, dict) and msg.get('role') == 'assistant':
                                    rejected = msg.get('content')
                                    break
                    
                    if not rejected and 'negative_output' in example:
                        rejected = example['negative_output']
                    
                    matches.append({
                        'prompt': prompt or "No prompt",
                        'chosen': chosen or "No chosen",
                        'rejected': rejected or "No rejected"
                    })
                    
                    if len(matches) >= limit:
                        break
                        
        except Exception as e:
            print(f"❌ Error searching prompts: {e}")
        
        return matches if matches else self.get_fallback_examples()

# Singleton instance
hh_dataset = HHDataset()

# Quick test if run directly
if __name__ == "__main__":
    print(f"📊 Dataset loaded: {len(hh_dataset.examples)} examples")
    if hh_dataset.examples:
        sample = hh_dataset.get_random_prompt()
        print(f"\n📝 Final extracted prompt: {sample['prompt'][:100]}...")
        print(f"📝 Final extracted chosen: {sample['chosen'][:100]}...")
        print(f"📝 Final extracted rejected: {sample['rejected'][:100]}...")