import os
import json
from typing import Dict
from dotenv import load_dotenv
from openai import OpenAI
from newspaper import Article


load_dotenv()
client = OpenAI(api_key=os.getenv("LLM_API_KEY"))

FINAL_PROMPT = """
You are an advanced civilizational news analysis system.

Your task is to analyze the given news article using the
PASSIONIT–PRUTL–KALKI–AIDHARMA framework.

You must reason deeply, causally, and ethically — not descriptively.

────────────────────────────────
ANALYTICAL FRAMEWORK
────────────────────────────────

1. PASSIONIT (ALL 9 DIMENSIONS – MUST BE USED)
- Probing: Does governance deeply examine root causes or avoid them?
- Innovating: Is there evidence of adaptive or novel response?
- Acting: Are actions corrective or merely punitive/reactive?
- Scoping: How is the problem framed (narrow vs systemic)?
- Setting: What narrative or moral battlefield is being established?
- Owning: Does authority accept responsibility for contributing causes?
- Nurturing: Are people’s dignity, safety, and future being cared for?
- Integrated: Are law, policy, ethics, and culture harmonized or fused?
- Transformation: Does the response enable long-term change or resist it?

2. PRUTL (MORAL–MATERIAL ANALYSIS)
You MUST classify signals from the article into:

- Positive Soul: peace, respect, trust, unity, love
- Negative Soul: pride, rule, usurp, temptation/lust for control
- Positive Materialism: protector, recycler (feedback), positive utility,
  tangibility (real-world benefit), longevity
- Negative Materialism: possession, rot, negative utility, trade (fear for compliance),
  lessen (reduction of human value)

3. GOVERNANCE–SOUL–CULTURE TRINITY
Explicitly connect analysis to:
- Governance → Father (authority, protection, justice)
- Soul / People → Son (conscience, dignity, lived experience)
- Culture → Spirit (shared meaning, values, narrative)

4. KALKI–AIDHARMA & FAITH PRINCIPLES (INTERPRETIVE ONLY)
Apply universal ethical principles WITHOUT preaching or adding facts:
- Sanatan (non-religious layer): balance, duty, truth, protection
- Hinduism (as one religion): Dharma of the ruler (Raj Dharma)
- Other global faith convergence (high-level only):
  justice, humility, compassion, truth, responsibility, balance

────────────────────────────────
STRICT RULES
────────────────────────────────
- DO NOT introduce facts, actors, motives, or events not present in the article
- DO NOT moralize emotionally; be analytical and causal
- DO NOT use tables, bullet-only dashboards, or UI cards
- DO NOT replace PASSIONIT or PRUTL with generic frameworks
- Tone must be neutral, rigorous, and academic
- Output MUST be valid JSON ONLY (no markdown, no commentary)

────────────────────────────────
OUTPUT FORMAT (STRICT JSON)
────────────────────────────────
{
  "bias_score": <integer 0-100>,
  "bias_label": "<Low | Moderate | High>",
  "summary": "<3–4 sentence neutral factual summary>",
  "perspectives": [
    "<authority or policy perspective>",
    "<societal or public response perspective>"
  ],
  "explanation": "<short explanation of bias and framing>",
  "deep_analysis": {
    "PASSIONIT": {
      "Probing": "<analysis>",
      "Innovating": "<analysis>",
      "Acting": "<analysis>",
      "Scoping": "<analysis>",
      "Setting": "<analysis>",
      "Owning": "<analysis>",
      "Nurturing": "<analysis>",
      "Integrated": "<analysis>",
      "Transformation": "<analysis>"
    },
    "PRUTL": {
      "Positive_Soul": "<analysis>",
      "Negative_Soul": "<analysis>",
      "Positive_Materialism": "<analysis>",
      "Negative_Materialism": "<analysis>"
    },
    "governance_soul_culture": {
      "Governance_Father": "<analysis>",
      "Soul_Son": "<analysis>",
      "Culture_Spirit": "<analysis>"
    },
    "kalki_aidharma": "<civilizational and faith-principle interpretation>"
  }
}

Article:

"""

def parse_llm_output(raw_text: str) -> Dict:
    start = raw_text.find("{")
    end = raw_text.rfind("}") + 1
    if start == -1 or end == -1:
        raise ValueError("LLM did not return valid JSON")

    return json.loads(raw_text[start:end])

def analyze_text(text: str) -> Dict:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": FINAL_PROMPT},
            {"role": "user", "content": text}
        ],
        temperature=0.2
    )

    raw_output = response.choices[0].message.content
    data = parse_llm_output(raw_output)

 
    deep_analysis = data.get("deep_analysis")
    if deep_analysis == "null":
        deep_analysis = None

    explanation = data.get("explanation")
    if isinstance(explanation, dict):
        explanation = json.dumps(explanation, indent=2)

    return {
        "bias_score": int(data["bias_score"]),
        "bias_label": data["bias_label"],
        "summary": data["summary"],
        "perspectives": data["perspectives"],
        "explanation": explanation,          
        "deep_analysis": deep_analysis        
    }

def fetch_article_from_link(url: str) -> str:
    article = Article(url)
    article.download()
    article.parse()

    if not article.text.strip():
        raise Exception("Failed to extract article text")

    return article.title, article.text