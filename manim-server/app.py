import glob
import logging
import os
import re
import shutil
import subprocess
import tempfile
import time
import uuid

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file
import anthropic

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
BASE_URL = os.environ.get("BASE_URL", "http://localhost:5000")
FLASK_HOST = os.environ.get("FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.environ.get("FLASK_PORT", "5000"))

VIDEOS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "videos")
os.makedirs(VIDEOS_DIR, exist_ok=True)

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
# Manim Script Instructions

## Introduction
Create an elegant Manim script that \
demonstrates a mathematical concept or problem. Keep in mind the dimensions \
of the window.
IMPORTANT - it is Create() not ShowCreation()

## Overall Structure

1. **Set Up the Scene**:
   - Define the scene and its properties.
   - Create any necessary objects.
   - Ensure all objects are instances of `Mobject` or its subclasses.
   - Position objects to avoid overlap. Keep space between words. Load all \
symbols properly. Global text size is small but legible in such a way that \
the text does not leave the border. Have enough checks to ensure nothing is \
going out of boundary.

2. **Display Mathematical Content**:
   - Include relevant equations or mathematical expressions using `MathTex`.
   - Ensure proper formatting, including LaTeX when applicable. Avoid LaTeX \
compilation errors in all cases. No "Undefined control sequence." Avoid in \
all cases please.
   - Animate or display mathematical content as needed.

3. **Provide Explanations**:
   - Include step-by-step explanations with `MathTex` formatting.
   - Use text boxes, labels, or annotations to clarify concepts.
   - Position text to avoid overlap with other elements.

4. **Transition Effects**:
   - Add transition effects between scenes or elements.
   - Specify the timing and duration of animations.
   - Ensure that animation targets are valid `Mobject` instances.

5. **Customization** (optional):
   - Allow for any customizations or variations based on specific examples \
or preferences.

6. **Quality and Layout**:
   - Ensure a clear layout with appropriate spacing.
   - Adjust the rendering quality for optimal viewing.
   - Check for compatibility with your chosen Manim version.

7. **Debugging and Troubleshooting**:
   - Include instructions on handling common errors, such as LaTeX-related \
issues.
   - Verify that all objects used for animations are of the correct type \
(`Mobject` or subclasses).
   - Double-check the inheritance of custom objects to ensure compatibility.

## Example Script
Keep everything inside the window. Do your best.

```python
from manim import *

config.pixel_height = 1080
config.pixel_width = 1920
config.frame_height = 6.0
config.frame_width = 6.0

class MyMathAnimation(Scene):
    def construct(self):
        triangle = Polygon(ORIGIN, RIGHT * 2, UP * 2)
        triangle.move_to(LEFT * 2)

        expression = MathTex("E = \\\\frac{m \\\\cdot c^2}{\\\\quad\\\\quad}")
        expression.next_to(triangle, DOWN)

        explanation = MathTex("This equation is known as Euler's identity.")
        explanation.next_to(expression, DOWN)

        self.play(Create(triangle))
        self.play(Write(expression))
        self.play(Write(explanation))
```

## Key rules
- Use `set_color(RED)` not `.color = RED`
- Use `Create()` not `ShowCreation()`
- If text length is more than 30 characters, break it and start at a new \
line. Do not exceed boundaries.
"""

USER_PROMPT_TEMPLATE = (
    "Just give code as plain text no '```' or '```python' in the output. "
    "I don't need explanations. Use MathTex and keep in mind the size of the "
    "window. Adjust size of text accordingly. DO NOT exceed boundaries. "
    "If there's more content, erase stuff first and then write on it. "
    "Go slow, increase wait time. And keep it simple unless programming wise "
    "required. Query: {query}"
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_SCENE_CLASS_RE = re.compile(r"class\s+(\w+)\s*\(.*Scene.*\)")


def _extract_scene_name(code: str) -> str | None:
    """Return the first Scene subclass name found in *code*, or None."""
    match = _SCENE_CLASS_RE.search(code)
    return match.group(1) if match else None


def _strip_code_fences(text: str) -> str:
    """Remove leading/trailing markdown code fences if the model added them."""
    lines = text.strip().splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines)


def _find_video(media_dir: str) -> str | None:
    """Walk *media_dir* and return the path to the first .mp4 found."""
    for path in glob.glob(os.path.join(media_dir, "**", "*.mp4"), recursive=True):
        return path
    return None


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s.%(msecs)03d | %(levelname)-7s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("visimath")

# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------

app = Flask(__name__)


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/videos/<filename>")
def serve_video(filename):
    """Serve a previously generated video from the videos/ folder."""
    # Sanitise: only allow simple filenames (no path traversal)
    if "/" in filename or "\\" in filename or ".." in filename:
        return jsonify({"error": "Invalid filename"}), 400

    video_path = os.path.join(VIDEOS_DIR, filename)
    if not os.path.isfile(video_path):
        return jsonify({"error": "Video not found"}), 404

    return send_file(video_path, mimetype="video/mp4")


@app.post("/generate")
def generate():
    t_start = time.perf_counter()
    log.info("POST /generate — request received")

    body = request.get_json(silent=True)
    if not body or not body.get("prompt"):
        log.warning("Bad request: missing 'prompt'")
        return jsonify({"error": "Missing 'prompt' in request body"}), 400

    prompt = body["prompt"]
    log.info("Prompt: %s", prompt)

    # -- 1. Call the LLM ---------------------------------------------------
    log.info("Calling Anthropic model=%s ...", ANTHROPIC_MODEL)
    t_llm = time.perf_counter()
    try:
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": USER_PROMPT_TEMPLATE.format(query=prompt)},
            ],
        )
        raw_code = message.content[0].text
    except Exception as exc:
        log.error("Anthropic API error after %.2fs: %s", time.perf_counter() - t_llm, exc)
        return jsonify({"error": f"Anthropic API error: {exc}"}), 502

    llm_elapsed = time.perf_counter() - t_llm
    log.info("LLM response received (%.2fs, %d chars)", llm_elapsed, len(raw_code))

    code = _strip_code_fences(raw_code)

    scene_name = _extract_scene_name(code)
    if not scene_name:
        log.error("No Scene subclass found in generated code")
        return jsonify({
            "error": "Could not find a Scene subclass in the generated code",
            "generated_code": code,
        }), 500

    log.info("Extracted scene class: %s", scene_name)

    # -- 2. Write to a temp dir & render -----------------------------------
    tmp_dir = tempfile.mkdtemp(prefix="visimath_")
    script_path = os.path.join(tmp_dir, "scene.py")
    log.info("Temp dir: %s", tmp_dir)

    try:
        with open(script_path, "w") as f:
            f.write(code)
        log.info("Wrote generated script to %s (%d lines)", script_path, code.count("\n") + 1)

        manim_cmd = [
            "manim",
            "-ql",                          # low quality (fast)
            "--media_dir", tmp_dir,         # render output here
            script_path,
            scene_name,
        ]
        log.info("Running: %s", " ".join(manim_cmd))

        t_render = time.perf_counter()
        result = subprocess.run(
            manim_cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )
        render_elapsed = time.perf_counter() - t_render

        if result.returncode != 0:
            log.error("Manim failed (exit %d, %.2fs). stderr:\n%s",
                      result.returncode, render_elapsed, result.stderr)
            return jsonify({
                "error": "Manim rendering failed",
                "stderr": result.stderr,
                "generated_code": code,
            }), 500

        log.info("Manim rendering succeeded (%.2fs)", render_elapsed)

        video_path = _find_video(tmp_dir)
        if not video_path:
            log.error("No .mp4 found in %s after successful render", tmp_dir)
            return jsonify({
                "error": "Rendering succeeded but no .mp4 was found",
                "stdout": result.stdout,
                "stderr": result.stderr,
            }), 500

        video_size_mb = os.path.getsize(video_path) / (1024 * 1024)
        log.info("Video ready: %s (%.2f MB)", video_path, video_size_mb)

        # -- 3. Copy to videos/ and return URL -----------------------------
        filename = f"{uuid.uuid4().hex}.mp4"
        dest_path = os.path.join(VIDEOS_DIR, filename)
        shutil.copy2(video_path, dest_path)
        shutil.rmtree(tmp_dir, ignore_errors=True)
        log.info("Saved video to %s", dest_path)

        video_url = f"{BASE_URL.rstrip('/')}/videos/{filename}"
        total_elapsed = time.perf_counter() - t_start

        log.info("Responding with URL — total request time: %.2fs (LLM %.2fs + render %.2fs)",
                 total_elapsed, llm_elapsed, render_elapsed)
        return jsonify({"url": video_url})

    except subprocess.TimeoutExpired:
        log.error("Manim timed out after 120s")
        shutil.rmtree(tmp_dir, ignore_errors=True)
        return jsonify({"error": "Manim rendering timed out (120s limit)"}), 504

    except Exception as exc:
        log.error("Unexpected error after %.2fs: %s", time.perf_counter() - t_start, exc, exc_info=True)
        shutil.rmtree(tmp_dir, ignore_errors=True)
        return jsonify({"error": f"Unexpected error: {exc}"}), 500


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=True)
