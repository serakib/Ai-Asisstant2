from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os, io, asyncio, base64
from dotenv import load_dotenv
from groq import Groq
import edge_tts

load_dotenv()
app = Flask(__name__)
CORS(app, origins=[
    "https://serakib.github.io",
    "http://localhost:5500", "http://127.0.0.1:5500","https://serakib.github.io/Medical-Admission-Tracker/"
    "http://localhost:5000", "http://127.0.0.1:5000"
])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is not set!")

client = Groq(api_key=GROQ_API_KEY)
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile") # Updated to a powerful universal model
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

# ═══════════════════════════════════════════════════════════
# 🧠 UNIVERSAL AI SYSTEM PROMPT
# ═══════════════════════════════════════════════════════════
SYSTEM_PROMPT = (
    "You are MedTracker AI, a universal and highly intelligent AI assistant. "
    "You can answer questions on ANY topic: General Knowledge, Science, Literature, Medical Admissions, Coding, Mathematics, and more. "
    "Provide clear, accurate, and well-structured answers. "
    "Always use Markdown for formatting (bold, lists, code blocks). "
    "For programming languages, use proper syntax highlighting in code blocks (e.g., ```python, ```javascript). "
    "For mathematical equations, use standard LaTeX notation (e.g., $x^2$, $\\int$, $\\frac{a}{b}$). "
    "If the user asks in Bengali, respond in Bengali. If they ask in English, respond in English. "
    "Be polite, supportive, and concise. Avoid using LaTeX or math symbols in the spoken voice response; the frontend sanitizer will handle it. "
    "If an image is provided, analyze it and help the user accordingly."
)

# ═══════════════════════════════════════════════════════════
# 🎙️ ৭ জন ভয়েস আর্টিস্ট — Edge-TTS
# ═══════════════════════════════════════════════════════════
VOICE_PRESETS = {
    "emma":      {"voice": "bn-BD-NabanitaNeural",  "rate": "+0%",  "pitch": "+0Hz"},
    "ryan":      {"voice": "bn-BD-PradeepNeural",   "rate": "+0%",  "pitch": "+0Hz"},
    "sophia":    {"voice": "bn-IN-TanishaaNeural",  "rate": "+8%",  "pitch": "+5Hz"},
    "david":     {"voice": "bn-IN-BashkarNeural",   "rate": "+0%",  "pitch": "+0Hz"},
    "olivia":    {"voice": "bn-BD-NabanitaNeural",  "rate": "-12%", "pitch": "-15Hz"},
    "james":     {"voice": "bn-BD-PradeepNeural",   "rate": "-10%", "pitch": "-20Hz"},
    "charlotte": {"voice": "en-US-AriaNeural",      "rate": "+0%",  "pitch": "+0Hz"},
}

VOICE_FALLBACK = "emma"

@app.route('/')
def home():
    return jsonify({
        "status": "online",
        "provider": "groq",
        "model": GROQ_MODEL,
        "tts": "edge-tts",
        "voices": list(VOICE_PRESETS.keys())
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        user_message = request.form.get('message', '').strip()
        image_file = request.files.get('image')
        if not user_message and not image_file:
            return jsonify({"error": "Message or image required"}), 400

        content_parts = []
        if user_message:
            content_parts.append({"type": "text", "text": user_message})
        else:
            content_parts.append({"type": "text", "text": "এই ছবিটি বিশ্লেষণ করে বাংলায় সংক্ষেপে বলো।"})

        if image_file:
            mime = image_file.mimetype
            if mime not in ['image/jpeg','image/png','image/webp','image/gif']:
                return jsonify({"error": "শুধু JPG, PNG, WEBP, GIF"}), 400
            image_b64 = base64.b64encode(image_file.read()).decode('utf-8')
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": f"data:{mime};base64,{image_b64}"}
            })

        # ⚡ Universal AI Response Generation
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content_parts}
            ],
            temperature=0.5,
            max_tokens=2048  # Increased from 200 to 2048 for detailed answers and code
        )
        return jsonify({"reply": response.choices[0].message.content, "provider": "groq"})
    except Exception as e:
        print(f"Chat Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/tts', methods=['POST'])
def tts():
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        voice_key = data.get('voice', VOICE_FALLBACK)
        if not text:
            return jsonify({"error": "Text required"}), 400

        is_bangla = any('\u0980' <= c <= '\u09FF' for c in text)
        if voice_key not in VOICE_PRESETS:
            voice_key = VOICE_FALLBACK
        preset = VOICE_PRESETS[voice_key]

        if is_bangla and preset['voice'].startswith('en-'):
            preset = VOICE_PRESETS['emma']
        if not is_bangla and preset['voice'].startswith('bn-'):
            preset = VOICE_PRESETS['charlotte']

        text = text[:500] # Limit to 500 chars per TTS request for speed

        async def generate():
            communicate = edge_tts.Communicate(
                text, preset['voice'],
                rate=preset['rate'], pitch=preset['pitch']
            )
            audio = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio += chunk["data"]
            return audio

        audio_bytes = asyncio.run(generate())
        if not audio_bytes:
            return jsonify({"error": "No audio generated"}), 500

        return send_file(io.BytesIO(audio_bytes), mimetype='audio/mpeg', as_attachment=False)
    except Exception as e:
        print(f"TTS Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "ফাইল ৫ MB এর বেশি"}), 413

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
