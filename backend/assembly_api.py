import os
import requests
import time
from dotenv import load_dotenv

load_dotenv()

# AssemblyAI API configuration
ASSEMBLY_API_KEY = os.getenv('ASSEMBLY_API_KEY')
ASSEMBLY_BASE_URL = "https://api.assemblyai.com/v2"

def upload_file(filepath):
    """
    Upload an audio file to AssemblyAI.
    
    Args:
        filepath (str): Path to the audio file to upload
    
    Returns:
        str: Upload URL for the file
    """
    headers = {
        'authorization': ASSEMBLY_API_KEY
    }
    
    with open(filepath, 'rb') as f:
        response = requests.post(
            f"{ASSEMBLY_BASE_URL}/upload",
            headers=headers,
            data=f
        )
    
    if response.status_code != 200:
        raise Exception(f"Upload failed: {response.status_code} - {response.text}")
    
    return response.json()['upload_url']


def request_transcript(audio_url, pii_redaction=False):
    """
    Request a transcript from AssemblyAI.
    
    Args:
        audio_url (str): URL of the uploaded audio file
        pii_redaction (bool): Whether to enable PII redaction (default: False)
    
    Returns:
        str: Transcript ID for polling
    """
    headers = {
        'authorization': ASSEMBLY_API_KEY,
        'content-type': 'application/json'
    }
    
    data = {
        'audio_url': audio_url
    }
    
    # Optional: Enable AssemblyAI's built-in PII redaction
    if pii_redaction:
        data['redact_pii'] = True
        data['redact_pii_policies'] = [
            'medical_condition',
            'person_name',
            'phone_number',
            'email_address',
            'credit_card_number',
            'banking_information'
        ]
    
    response = requests.post(
        f"{ASSEMBLY_BASE_URL}/transcript",
        headers=headers,
        json=data
    )
    
    if response.status_code != 200:
        raise Exception(f"Transcript request failed: {response.status_code} - {response.text}")
    
    return response.json()['id']


def poll_transcript(transcript_id, max_wait=300, poll_interval=3):
    """
    Poll AssemblyAI for transcript completion.
    
    Args:
        transcript_id (str): The transcript ID to poll
        max_wait (int): Maximum time to wait in seconds (default: 300)
        poll_interval (int): Seconds between polls (default: 3)
    
    Returns:
        str: The transcribed text
    """
    headers = {
        'authorization': ASSEMBLY_API_KEY
    }
    
    start_time = time.time()
    
    while True:
        response = requests.get(
            f"{ASSEMBLY_BASE_URL}/transcript/{transcript_id}",
            headers=headers
        )
        
        if response.status_code != 200:
            raise Exception(f"Polling failed: {response.status_code} - {response.text}")
        
        result = response.json()
        status = result['status']
        
        if status == 'completed':
            return result.get('text', '')
        
        elif status == 'error':
            error_msg = result.get('error', 'Unknown error')
            raise Exception(f"Transcription failed: {error_msg}")
        
        # Check if we've exceeded max wait time
        if time.time() - start_time > max_wait:
            raise Exception(f"Transcription timeout after {max_wait} seconds")
        
        # Wait before polling again
        time.sleep(poll_interval)


def get_transcript_with_pii(transcript_id):
    """
    Get detailed transcript with PII entities if redaction was enabled.
    
    Args:
        transcript_id (str): The transcript ID
    
    Returns:
        dict: Full transcript response with PII details if available
    """
    headers = {
        'authorization': ASSEMBLY_API_KEY
    }
    
    response = requests.get(
        f"{ASSEMBLY_BASE_URL}/transcript/{transcript_id}",
        headers=headers
    )
    
    if response.status_code != 200:
        raise Exception(f"Failed to get transcript: {response.status_code} - {response.text}")
    
    return response.json()
