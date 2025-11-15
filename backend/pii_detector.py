import re
from hashlib import sha256
from sentence_transformers import SentenceTransformer, util

# Load a tiny embedding model lazily 
_model = None
SENSITIVE_EXAMPLES = [
    "patient record",
    "medical file",
    "bank account",
    "credit card",
    "social security",
    "aadhar",
    "pan",
]

def _ensure_model():
    global _model
    if _model is None:
        _model = SentenceTransformer('all-MiniLM-L6-v2')

# Regex patterns
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
SSN_RE = re.compile(r"\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b")
PHONE_RE = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?(?:\d{10}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b")
CC_RE = re.compile(r"\b(?:\d[ -]*?){13,16}\b")
AADHAAR_RE = re.compile(r"\b\d{4}[ -]?\d{4}[ -]?\d{4}\b")
PAN_RE = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b")

def hash_text(s):
    return sha256(s.encode()).hexdigest()

def mask_matches(text):
    # Collect all matches first (with original positions)
    entities = []
    
    # Find all matches with their patterns
    patterns = [
        (EMAIL_RE, 'email'),
        (SSN_RE, 'ssn'),
        (PAN_RE, 'pan'),
        (AADHAAR_RE, 'aadhaar'),
        (PHONE_RE, 'phone'),
        (CC_RE, 'credit_card'),
    ]
    
    for pattern, type_name in patterns:
        for match in pattern.finditer(text):
            entities.append({
                "type": type_name,
                "text": match.group(0),
                "start": match.start(),
                "end": match.end(),
                "value_hash": hash_text(match.group(0))[:16],
                "original_len": len(match.group(0))
            })
    
    # Sort by position (reverse order so we can replace from end to start)
    entities.sort(key=lambda x: x['start'])
    
    # Remove overlapping entities (keep first match)
    filtered_entities = []
    for entity in entities:
        # Check if this entity overlaps with any already added
        overlaps = False
        for existing in filtered_entities:
            if not (entity['end'] <= existing['start'] or entity['start'] >= existing['end']):
                overlaps = True
                break
        if not overlaps:
            filtered_entities.append(entity)
    
    # Now create redacted text by replacing from end to start (to preserve positions)
    redacted_text = text
    for entity in sorted(filtered_entities, key=lambda x: x['start'], reverse=True):
        redacted_text = redacted_text[:entity['start']] + '[REDACTED]' + redacted_text[entity['end']:]
    
    return redacted_text, filtered_entities

def semantic_flag(text, threshold=0.75):
    _ensure_model()
    q_emb = _model.encode(text, convert_to_tensor=True)
    examples_emb = _model.encode(SENSITIVE_EXAMPLES, convert_to_tensor=True)
    sims = util.cos_sim(q_emb, examples_emb)[0]

    flagged = []
    for i, score in enumerate(sims):
        if float(score) >= threshold:
            flagged.append({
                "example": SENSITIVE_EXAMPLES[i],
                "score": float(score)
            })
    return flagged

def analyze_text(text, semantic=False):  # Disabled by default to avoid download issues
    redacted, entities = mask_matches(text)

    semantic_flags = []
    if semantic:
        try:
            semantic_flags = semantic_flag(text)
        except Exception as e:
            print(f"Warning: Semantic analysis skipped - {str(e)[:100]}")
            semantic_flags = []

    return {
        "original": text,
        "original_text": text,
        "redacted": redacted,
        "redacted_text": redacted,
        "entities": entities,
        "masks": entities,  # Keep for backward compatibility
        "context_flags": semantic_flags,
        "semantic_flags": semantic_flags
    }
