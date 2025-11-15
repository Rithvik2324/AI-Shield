from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os, time, json
from pii_detector import analyze_text
from groq_api import groq_chat_completion
from assembly_api import upload_file, request_transcript, poll_transcript


load_dotenv()
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
LOG_FILE = os.path.join(os.path.dirname(__file__), '..', 'logs.json')


def append_log(entry):
    entry['ts'] = time.time()
    with open(LOG_FILE, 'a') as f:
        f.write(json.dumps(entry) + '\n')


@app.route('/process_text', methods=['POST'])
def process_text():
    try:
        data = request.get_json() or {}
        text = data.get('text', '')
        level = data.get('level', 'lenient')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        result = analyze_text(text, semantic=False)  # Disabled to avoid model download
        append_log({'type':'process_text', 'original_hash': result['original'][:64], 'entities': result['entities'], 'semantic': result['semantic_flags']})
        return jsonify(result)
    except Exception as e:
        print(f"Error in process_text: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/ask_llm', methods=['POST'])
def ask_llm():
    try:
        data = request.get_json() or {}
        sanitized = data.get('sanitized')
        if not sanitized:
            return jsonify({'error':'sanitized prompt required'}), 400
        try:
            res = groq_chat_completion(sanitized)
        except Exception as e:
            print(f"LLM API error: {str(e)}")
            res = {'choices':[{'message':{'content': '[SIMULATED] Model response to sanitized prompt.'}}]}
        # Extract LLM output
        llm_output = res['choices'][0]['message']['content']

    # 🔒 Safety check: re-scan output
        safe_output = analyze_text(llm_output, semantic=True)
     # Replace original response with sanitized version
        res['choices'][0]['message']['content'] = safe_output['redacted']
        append_log({'type':'ask_llm', 'sanitized': sanitized[:200], 'response_preview': res['choices'][0]['message']['content'][:200],'output_masks': safe_output['masks'],
        'output_semantic_flags': safe_output['semantic_flags']})
        return jsonify(res)
    except Exception as e:
        print(f"Error in ask_llm: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/process_audio', methods=['POST'])
def process_audio():
    try:
        f = request.files.get('file') or request.files.get('audio')
        if not f:
            return jsonify({'error':'file required'}), 400
        # Create uploads directory if it doesn't exist
        upload_dir = os.path.join(os.path.dirname(__file__), 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, f.filename)
        f.save(filepath)
        upload_url = upload_file(filepath)
        transcript_id = request_transcript(upload_url)
        text = poll_transcript(transcript_id)
        result = analyze_text(text, semantic=False)  # Disabled to avoid model download
        result['transcription'] = text  # Add transcription to result
        append_log({'type':'process_audio', 'transcript_preview': text[:200], 'entities': result['entities']})
        return jsonify(result)
    except Exception as e:
        print(f"Error in process_audio: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/logs', methods=['GET'])
def get_logs():
    try:
        if not os.path.exists(LOG_FILE):
            return jsonify({'logs': []})
        
        logs = []
        with open(LOG_FILE, 'r') as f:
            for line_num, line in enumerate(f, 1):
                if line.strip():
                    try:
                        logs.append(json.loads(line))
                    except json.JSONDecodeError as e:
                        # Skip corrupted lines and log the error
                        print(f"Warning: Skipping corrupted log entry at line {line_num}: {str(e)}")
                        continue
        
        return jsonify({'logs': logs})
    except Exception as e:
        print(f"Error reading logs: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)), debug=False)