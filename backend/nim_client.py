from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY")
)

def explain_interaction(drug_a: str, drug_b: str, fda_text_a: str, fda_text_b: str) -> dict:
    """
    Uses NVIDIA NIM LLM to analyze FDA label text for two drugs and
    generate a structured plain-language explanation of their interaction.
    Returns severity, mechanism explanation, clinical significance,
    and monitoring recommendations.
    """
    prompt = f"""You are a clinical pharmacologist reviewing FDA-approved drug label data.

You are analyzing a potential drug interaction between {drug_a.upper()} and {drug_b.upper()}.

Here is the FDA label interaction text for {drug_a.upper()}:
{fda_text_a[:1500]}

Here is the FDA label interaction text for {drug_b.upper()}:
{fda_text_b[:1500]}

Based on this FDA label data, analyze the interaction between {drug_a} and {drug_b} specifically.

Respond in this exact JSON format with no additional text:
{{
  "severity": "contraindicated|major|moderate|minor|unknown",
  "interaction_exists": true or false,
  "mechanism": "2-3 sentence explanation of the biochemical mechanism behind this specific interaction",
  "clinical_significance": "1-2 sentence explanation of what this means for the patient",
  "monitoring": "1-2 sentence recommendation for what should be monitored or avoided",
  "confidence": "high|medium|low"
}}

If the FDA labels do not contain enough information to determine an interaction between these two specific drugs, set interaction_exists to false and severity to unknown."""

    response = client.chat.completions.create(
        model="meta/llama-3.1-8b-instruct",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500,
        temperature=0.1
    )

    raw = response.choices[0].message.content.strip()

    import json
    import re
    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    return {
        "severity": "unknown",
        "interaction_exists": False,
        "mechanism": raw,
        "clinical_significance": "Unable to parse structured response.",
        "monitoring": "Consult a pharmacist or physician.",
        "confidence": "low"
    }


def generate_summary(drugs: list, interactions: list) -> str:
    """
    Uses NVIDIA NIM LLM to generate an overall safety summary
    for the full set of selected drugs.
    Returns a 2-3 sentence plain-language summary of the overall risk.
    """
    interaction_descriptions = []
    for i in interactions:
        if i.get("interaction_exists"):
            interaction_descriptions.append(
                f"{i['drug_a']} + {i['drug_b']}: {i['severity']} — {i['mechanism']}"
            )

    if not interaction_descriptions:
        interactions_text = "No confirmed interactions were found between the selected drugs."
    else:
        interactions_text = "\n".join(interaction_descriptions)

    prompt = f"""You are a clinical pharmacologist. Summarize the overall safety profile for a patient taking all of these drugs together: {', '.join(drugs)}.

Known interactions identified:
{interactions_text}

Write a 2-3 sentence plain-language summary of the overall risk level and the most important thing the patient or prescriber should know. Be direct and clinically accurate. Do not use bullet points."""

    response = client.chat.completions.create(
        model="meta/llama-3.1-8b-instruct",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200,
        temperature=0.1
    )

    return response.choices[0].message.content.strip()