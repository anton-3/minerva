import glob
import json
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

VIDEOS_DIR = os.environ.get("VIDEOS_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "videos"))
os.makedirs(VIDEOS_DIR, exist_ok=True)

DB_PATH = os.path.join(VIDEOS_DIR, "videos.json")

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


def _get_video_duration(filepath: str) -> float | None:
    """Return the duration in seconds of a video file using ffprobe, or None on failure."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                filepath,
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            return round(float(result.stdout.strip()), 2)
    except (subprocess.TimeoutExpired, ValueError, OSError):
        pass
    return None


def _validate_db(records: list[dict]) -> list[dict]:
    """Validate DB records: remove entries for missing files, ensure lengths are accurate."""
    validated = []
    changed = False
    for rec in records:
        filepath = os.path.join(VIDEOS_DIR, rec["filename"])
        if not os.path.isfile(filepath):
            changed = True
            log.info("DB cleanup: removing entry for missing file %s", rec["filename"])
            continue
        duration = _get_video_duration(filepath)
        if rec.get("length") != duration:
            rec["length"] = duration
            changed = True
        validated.append(rec)
    if changed:
        with open(DB_PATH, "w") as f:
            json.dump(validated, f, indent=2)
    return validated


def _load_db() -> list[dict]:
    """Load the video DB from *DB_PATH*, validate entries, and return the list."""
    try:
        with open(DB_PATH, "r") as f:
            data = json.load(f)
        if isinstance(data, list):
            return _validate_db(data)
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    return []


def _save_to_db(filename: str, prompt: str) -> None:
    """Append a {filename, prompt, length} record to the JSON video DB."""
    records = _load_db()
    filepath = os.path.join(VIDEOS_DIR, filename)
    duration = _get_video_duration(filepath)
    records.append({"filename": filename, "prompt": prompt, "length": duration})
    with open(DB_PATH, "w") as f:
        json.dump(records, f, indent=2)


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


@app.delete("/videos/<filename>")
def delete_video(filename):
    """Delete a previously generated video from disk and the DB."""
    if "/" in filename or "\\" in filename or ".." in filename:
        return jsonify({"error": "Invalid filename"}), 400

    video_path = os.path.join(VIDEOS_DIR, filename)
    if not os.path.isfile(video_path):
        return jsonify({"error": "Video not found"}), 404

    os.remove(video_path)
    log.info("Deleted video file: %s", video_path)

    # Remove the corresponding DB entry
    records = _load_db()
    records = [r for r in records if r["filename"] != filename]
    with open(DB_PATH, "w") as f:
        json.dump(records, f, indent=2)
    log.info("Removed DB entry for %s", filename)

    return jsonify({"deleted": filename})


@app.get("/exists")
def exists():
    """Return all previously generated videos and their prompts."""
    records = _load_db()
    return jsonify({"videos": records})


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

    MAX_ATTEMPTS = 4
    last_error_response = None

    for attempt in range(1, MAX_ATTEMPTS + 1):
        if attempt > 1:
            log.info("Retry %d/%d for prompt: %s", attempt, MAX_ATTEMPTS, prompt)

        # -- 1. Call the LLM -----------------------------------------------
        log.info("[Attempt %d/%d] Calling Anthropic model=%s ...", attempt, MAX_ATTEMPTS, ANTHROPIC_MODEL)
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
            llm_elapsed = time.perf_counter() - t_llm
            log.error("[Attempt %d/%d] Anthropic API error after %.2fs: %s", attempt, MAX_ATTEMPTS, llm_elapsed, exc)
            last_error_response = (jsonify({"error": f"Anthropic API error: {exc}"}), 502)
            continue

        llm_elapsed = time.perf_counter() - t_llm
        log.info("[Attempt %d/%d] LLM response received (%.2fs, %d chars)", attempt, MAX_ATTEMPTS, llm_elapsed, len(raw_code))

        code = _strip_code_fences(raw_code)

        scene_name = _extract_scene_name(code)
        if not scene_name:
            log.error("[Attempt %d/%d] No Scene subclass found in generated code", attempt, MAX_ATTEMPTS)
            last_error_response = (jsonify({
                "error": "Could not find a Scene subclass in the generated code",
                "generated_code": code,
            }), 500)
            continue

        log.info("[Attempt %d/%d] Extracted scene class: %s", attempt, MAX_ATTEMPTS, scene_name)

        # -- 2. Write to a temp dir & render -------------------------------
        tmp_dir = tempfile.mkdtemp(prefix="visimath_")
        script_path = os.path.join(tmp_dir, "scene.py")
        log.info("[Attempt %d/%d] Temp dir: %s", attempt, MAX_ATTEMPTS, tmp_dir)

        try:
            with open(script_path, "w") as f:
                f.write(code)
            log.info("[Attempt %d/%d] Wrote generated script to %s (%d lines)",
                     attempt, MAX_ATTEMPTS, script_path, code.count("\n") + 1)

            manim_cmd = [
                "manim",
                "-ql",                          # low quality (fast)
                "--media_dir", tmp_dir,         # render output here
                script_path,
                scene_name,
            ]
            log.info("[Attempt %d/%d] Running: %s", attempt, MAX_ATTEMPTS, " ".join(manim_cmd))

            t_render = time.perf_counter()
            result = subprocess.run(
                manim_cmd,
                capture_output=True,
                text=True,
                timeout=120,
            )
            render_elapsed = time.perf_counter() - t_render

            if result.returncode != 0:
                log.error("[Attempt %d/%d] Manim failed (exit %d, %.2fs). stderr:\n%s",
                          attempt, MAX_ATTEMPTS, result.returncode, render_elapsed, result.stderr)
                shutil.rmtree(tmp_dir, ignore_errors=True)
                last_error_response = (jsonify({
                    "error": "Manim rendering failed",
                    "stderr": result.stderr,
                    "generated_code": code,
                }), 500)
                continue

            log.info("[Attempt %d/%d] Manim rendering succeeded (%.2fs)", attempt, MAX_ATTEMPTS, render_elapsed)

            video_path = _find_video(tmp_dir)
            if not video_path:
                log.error("[Attempt %d/%d] No .mp4 found in %s after successful render",
                          attempt, MAX_ATTEMPTS, tmp_dir)
                shutil.rmtree(tmp_dir, ignore_errors=True)
                last_error_response = (jsonify({
                    "error": "Rendering succeeded but no .mp4 was found",
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                }), 500)
                continue

            video_size_mb = os.path.getsize(video_path) / (1024 * 1024)
            log.info("[Attempt %d/%d] Video ready: %s (%.2f MB)", attempt, MAX_ATTEMPTS, video_path, video_size_mb)

            # -- 3. Copy to videos/ and return URL -------------------------
            filename = f"{uuid.uuid4().hex}.mp4"
            dest_path = os.path.join(VIDEOS_DIR, filename)
            shutil.copy2(video_path, dest_path)
            shutil.rmtree(tmp_dir, ignore_errors=True)
            log.info("Saved video to %s", dest_path)

            _save_to_db(filename, prompt)
            log.info("Recorded video in DB: %s", filename)

            video_url = f"{BASE_URL.rstrip('/')}/videos/{filename}"
            total_elapsed = time.perf_counter() - t_start

            log.info("Responding with URL — total request time: %.2fs (LLM %.2fs + render %.2fs)",
                     total_elapsed, llm_elapsed, render_elapsed)
            return jsonify({"url": video_url})

        except subprocess.TimeoutExpired:
            log.error("[Attempt %d/%d] Manim timed out after 120s", attempt, MAX_ATTEMPTS)
            shutil.rmtree(tmp_dir, ignore_errors=True)
            last_error_response = (jsonify({"error": "Manim rendering timed out (120s limit)"}), 504)
            continue

        except Exception as exc:
            log.error("[Attempt %d/%d] Unexpected error after %.2fs: %s",
                      attempt, MAX_ATTEMPTS, time.perf_counter() - t_start, exc, exc_info=True)
            shutil.rmtree(tmp_dir, ignore_errors=True)
            last_error_response = (jsonify({"error": f"Unexpected error: {exc}"}), 500)
            continue

    # All attempts exhausted
    log.error("All %d attempts failed for prompt: %s", MAX_ATTEMPTS, prompt)
    return last_error_response


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=True)
