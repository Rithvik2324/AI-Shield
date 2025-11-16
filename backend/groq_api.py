import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Lazy load Groq client to avoid initialization issues on import
_client = None

def get_client():
    """Lazy load Groq client"""
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv('GROQ_API_KEY'))
    return _client

def groq_chat_completion(prompt, model="llama-3.1-8b-instant", temperature=0.3):
    """
    Send a chat completion request to Groq API.
    
    Args:
        prompt (str): The sanitized prompt to send to the LLM
        model (str): The model to use
        temperature (float): Controls randomness (0-2)
        max_tokens (int): Maximum tokens in the response
    
    Returns:
        dict: Response from Groq API with choices containing the message
    """
    try:
        client = get_client()
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=model,
            temperature=temperature,
        )
        
        # Convert to dictionary format expected by app.py
        return {
            'choices': [
                {
                    'message': {
                        'content': chat_completion.choices[0].message.content
                    }
                }
            ],
            'model': chat_completion.model,
            'usage': {
                'prompt_tokens': chat_completion.usage.prompt_tokens,
                'completion_tokens': chat_completion.usage.completion_tokens,
                'total_tokens': chat_completion.usage.total_tokens
            }
        }
    except Exception as e:
        raise Exception(f"Groq API Error: {str(e)}")
