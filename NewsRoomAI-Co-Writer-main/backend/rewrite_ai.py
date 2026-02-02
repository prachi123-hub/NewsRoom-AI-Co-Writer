import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("LLM_API_KEY"))

REWRITE_PROMPT = """
You are a professional neutral news editor.

Rewrite the given news article in a completely neutral and unbiased tone.

Rules:
- Do not add new facts
- Do not remove important facts
- Keep meaning same
- Remove emotional, political, or opinionated words
- Keep it clear, simple, and professional
- Output ONLY the rewritten article text (no headings, no JSON)

Article:
"""

def rewrite_article_neutral(text: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": REWRITE_PROMPT},
            {"role": "user", "content": text},
        ],
        temperature=0.3,
        max_tokens=800
    )

    return response.choices[0].message.content.strip()