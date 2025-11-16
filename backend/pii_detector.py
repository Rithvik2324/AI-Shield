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
# Enhanced phone pattern: US, UK, India, International with country codes
PHONE_RE = re.compile(r"\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b|\b(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b")
CC_RE = re.compile(r"\b(?:\d[ -]*?){13,16}\b")
AADHAAR_RE = re.compile(r"\b\d{4}[ -]?\d{4}[ -]?\d{4}\b")
PAN_RE = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b")

# IP Address (IPv4 and IPv6)
IPV4_RE = re.compile(r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b")
IPV6_RE = re.compile(r"\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:\b|\b::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\b")

# API Keys (common patterns for AWS, Google, GitHub, OpenAI, etc.)
API_KEY_RE = re.compile(r"\b(?:AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z\-_]{35}|sk-[a-zA-Z0-9]{48}|ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|xox[baprs]-[0-9a-zA-Z\-]+)\b")

# Date of Birth (multiple formats: MM/DD/YYYY, DD-MM-YYYY, YYYY-MM-DD, Month DD, YYYY)
DOB_RE = re.compile(r"\b(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12][0-9]|3[01])[/-](?:19|20)\d{2}\b|\b(?:0?[1-9]|[12][0-9]|3[01])[/-](?:0?[1-9]|1[0-2])[/-](?:19|20)\d{2}\b|\b(?:19|20)\d{2}[/-](?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12][0-9]|3[01])\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(?:0?[1-9]|[12][0-9]|3[01]),?\s+(?:19|20)\d{2}\b", re.IGNORECASE)

# Bank Account Numbers (US: 8-17 digits, IBAN: starts with 2 letters + 2 digits)
BANK_ACCOUNT_RE = re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b|\b\d{8,17}\b")

# Street Address (House number + street name + optional unit, city, state, zip)
ADDRESS_RE = re.compile(r"\b\d+\s+[A-Za-z0-9\s,\.]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Parkway|Pkwy|Place|Pl|Square|Sq|Trail|Trl|Terrace|Ter)\.?\s*(?:#|Apt|Suite|Unit|Ste)?\s*[A-Za-z0-9]*,?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?\b", re.IGNORECASE)

# Medical Record Number (MRN: typically 6-10 digits, sometimes with prefix)
MRN_RE = re.compile(r"\bMRN[-:\s]?[0-9]{6,10}\b|\b(?:MR|MED|MEDICAL)[-:\s]?[0-9]{6,10}\b", re.IGNORECASE)

def hash_text(s):
    return sha256(s.encode()).hexdigest()

def mask_matches(text):
    # Collect all matches first (with original positions)
    entities = []
    
    # Find all matches with their patterns (order matters - more specific patterns first)
    patterns = [
        (EMAIL_RE, 'email'),
        (API_KEY_RE, 'api_key'),
        (SSN_RE, 'ssn'),
        (PAN_RE, 'pan'),
        (AADHAAR_RE, 'aadhaar'),
        (IPV6_RE, 'ipv6'),
        (IPV4_RE, 'ipv4'),
        (DOB_RE, 'date_of_birth'),
        (MRN_RE, 'medical_record'),
        (ADDRESS_RE, 'address'),
        (PHONE_RE, 'phone'),
        (CC_RE, 'credit_card'),
        (BANK_ACCOUNT_RE, 'bank_account'),
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

def semantic_flag(text, threshold=0.55):
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

def analyze_text(text, semantic=True):  # Disabled by default to avoid download issues
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
