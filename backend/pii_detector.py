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
PHONE_RE = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?(?:\d{10}|\d{3}[-.\s]\d{3}[-.\s]\d{4})\b")
CC_RE = re.compile(r"\b(?:\d[ -]*?){13,16}\b")
AADHAAR_RE = re.compile(r"\b\d{4}[ -]?\d{4}[ -]?\d{4}\b")
PAN_RE = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b")

def hash_text(s):
    return sha256(s.encode()).hexdigest()

def mask_matches(text):
    masks = []

    def mask_fn(m, type_name):
        s = m.group(0)
        h = hash_text(s)
        masks.append({
            "type": type_name,
            "value_hash": h[:16],
            "span": (m.start(), m.end()),
            "original_len": len(s)
        })
        return "[REDACTED]"

    # Order matters: emails first
    text = EMAIL_RE.sub(lambda m: mask_fn(m, 'EMAIL'), text)
    text = PAN_RE.sub(lambda m: mask_fn(m, 'PAN'), text)
    text = AADHAAR_RE.sub(lambda m: mask_fn(m, 'AADHAAR'), text)
    text = PHONE_RE.sub(lambda m: mask_fn(m, 'PHONE'), text)
    text = CC_RE.sub(lambda m: mask_fn(m, 'CREDIT_CARD'), text)

    return text, masks

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

def analyze_text(text, semantic=True):
    redacted, masks = mask_matches(text)

    semantic_flags = []
    if semantic:
        try:
            semantic_flags = semantic_flag(text)
        except Exception:
            semantic_flags = []

    return {
        "original": text,
        "redacted": redacted,
        "masks": masks,
        "semantic_flags": semantic_flags
    }
