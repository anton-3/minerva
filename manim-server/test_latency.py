"""Quick OpenAI latency test — sends a tiny prompt and logs timing."""

import os
import time

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    api_key=os.environ["OPENAI_API_KEY"],
    base_url=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
)
model = os.environ.get("OPENAI_MODEL", "gpt-4.1-nano")

prompt = "What is 2 + 2? Reply with just the number."

print(f"Model:  {model}")
print(f"Prompt: {prompt!r}")
print()

t0 = time.perf_counter()
print(f"[{time.strftime('%H:%M:%S')}] Sending request...")

completion = client.chat.completions.create(
    model=model,
    messages=[{"role": "user", "content": prompt}],
)

t1 = time.perf_counter()
reply = completion.choices[0].message.content
usage = completion.usage

print(f"[{time.strftime('%H:%M:%S')}] Response received in {t1 - t0:.2f}s")
print()
print(f"Reply:          {reply}")
print(f"Prompt tokens:  {usage.prompt_tokens}")
print(f"Output tokens:  {usage.completion_tokens}")
if hasattr(usage, "completion_tokens_details") and usage.completion_tokens_details:
    print(f"Details:        {usage.completion_tokens_details}")
print(f"Total tokens:   {usage.total_tokens}")
print(f"Latency:        {t1 - t0:.2f}s")
