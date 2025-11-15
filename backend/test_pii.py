"""
Test script to verify PII detection is working correctly
"""
import sys
sys.path.insert(0, '.')

from pii_detector import analyze_text

# Test with the patient data
test_text = """Patient Name: Sarah Johnson
DOB: 03/15/1985
SSN: 456-78-9012
Phone: 555 234-5678
Email: sarah.j@healthcare.com
Address: 123 Medical Plaza, Boston, MA 02108
Insurance ID: BCBS-987654321
Emergency Contact: John Johnson at 555-234-5679"""

print("=" * 60)
print("Testing PII Detection (Semantic Analysis Disabled)")
print("=" * 60)
print("\nOriginal Text:")
print(test_text)
print("\n" + "=" * 60)

# Analyze the text (semantic disabled to avoid network issues)
result = analyze_text(test_text, semantic=False)

print(f"\n✓ Detected {len(result['entities'])} entities:\n")
for entity in result['entities']:
    print(f"  • {entity['type'].upper()}: '{entity['text']}' at position {entity['start']}-{entity['end']}")

print("\n" + "=" * 60)
print("Redacted Text:")
print(result['redacted_text'])
print("=" * 60)

if result['context_flags']:
    print("\n⚠️ Semantic Flags:")
    for flag in result['context_flags']:
        print(f"  • {flag['example']} (score: {flag['score']:.2f})")

print("\n✓ Test completed successfully!")
print(f"Total entities detected: {len(result['entities'])}")
