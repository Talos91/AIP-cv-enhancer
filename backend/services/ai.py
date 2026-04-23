"""OpenAI wrappers: parse CV, score ATS, match JD, rewrite bullets, cover letter."""
from __future__ import annotations

import json
import os
from typing import Any

from openai import OpenAI


def _client() -> OpenAI:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY not set")
    return OpenAI(api_key=key)


def _model() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")


# --- Canonical CV JSON shape used throughout the app ---------------------------
CV_SCHEMA_HINT = """
{
  "full_name": "string",
  "headline": "string (one-line title, e.g. 'Senior Product Designer')",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin": "string",
  "website": "string",
  "summary": "string (3-5 sentences, first person neutral)",
  "experience": [
    {
      "title": "string",
      "company": "string",
      "location": "string",
      "start": "string (e.g. 'Jan 2021')",
      "end": "string ('Present' or 'Dec 2023')",
      "bullets": ["string (action + metric)", "..."]
    }
  ],
  "education": [
    { "degree": "string", "school": "string", "location": "string", "start": "string", "end": "string", "details": "string" }
  ],
  "skills": {
    "technical": ["string", "..."],
    "soft": ["string", "..."],
    "languages": ["string", "..."],
    "tools": ["string", "..."]
  },
  "certifications": [ { "name": "string", "issuer": "string", "year": "string" } ],
  "projects": [ { "name": "string", "description": "string", "link": "string" } ]
}
""".strip()


def parse_cv(raw_text: str) -> dict[str, Any]:
    """Turn raw CV text into the canonical CV JSON."""
    system = (
        "You are an expert CV parser. Extract information from the candidate's CV "
        "into strict JSON matching the provided schema. Do NOT invent facts, do NOT "
        "embellish skills or experience. If a field is missing, leave it empty. "
        "Keep bullet points concise (max ~20 words each), starting with an action verb."
    )
    user = (
        f"Schema:\n{CV_SCHEMA_HINT}\n\n"
        "Return ONLY a JSON object with those keys. No prose.\n\n"
        f"CV TEXT:\n{raw_text[:15000]}"
    )

    resp = _client().chat.completions.create(
        model=_model(),
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    data = json.loads(resp.choices[0].message.content or "{}")
    return _normalise(data)


def score_ats(cv: dict[str, Any]) -> dict[str, Any]:
    """Return an ATS-friendliness score + actionable suggestions."""
    system = (
        "You are an ATS (applicant tracking system) reviewer. Evaluate the given CV JSON "
        "on: keywords, structure, quantified impact, clarity, length. Return JSON with "
        "fields: overall (0-100), section_scores {summary, experience, skills, education, formatting}, "
        "strengths (array of short bullets), weaknesses (array), suggestions (array of specific, "
        "actionable fixes, each <=20 words)."
    )
    user = f"CV JSON:\n{json.dumps(cv)[:12000]}"
    resp = _client().chat.completions.create(
        model=_model(),
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    return json.loads(resp.choices[0].message.content or "{}")


def match_jd(cv: dict[str, Any], jd_text: str) -> dict[str, Any]:
    """Compare CV against a job description, return match + gap analysis."""
    system = (
        "You match a candidate's CV against a job description. Return JSON with: "
        "match_score (0-100), matched_keywords (array), missing_keywords (array, most important first), "
        "matched_skills (array), missing_skills (array), alignment_notes (array of 1-line bullets), "
        "tailoring_tips (array of concrete edits the candidate could make)."
    )
    user = (
        f"CV JSON:\n{json.dumps(cv)[:8000]}\n\n"
        f"JOB DESCRIPTION:\n{jd_text[:6000]}"
    )
    resp = _client().chat.completions.create(
        model=_model(),
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    return json.loads(resp.choices[0].message.content or "{}")


def tailor_cv_for_jd(cv: dict[str, Any], jd_text: str) -> dict[str, Any]:
    """Return a rewritten CV tailored to the JD (same schema)."""
    system = (
        "Rewrite the candidate's CV to better match the job description WITHOUT fabricating "
        "experience, companies, titles, dates, or degrees. You may: rephrase bullets to emphasise "
        "relevant impact, re-order skills, add truthful synonyms of existing skills, rewrite the "
        "summary. Return the full CV JSON in the same schema."
    )
    user = (
        f"Schema:\n{CV_SCHEMA_HINT}\n\n"
        f"CURRENT CV:\n{json.dumps(cv)[:10000]}\n\n"
        f"JOB DESCRIPTION:\n{jd_text[:6000]}"
    )
    resp = _client().chat.completions.create(
        model=_model(),
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        response_format={"type": "json_object"},
        temperature=0.3,
    )
    return _normalise(json.loads(resp.choices[0].message.content or "{}"))


def rewrite_bullet(bullet: str, style: str = "quantified") -> str:
    """Rewrite a single bullet in one of: quantified, concise, stronger, softer."""
    style_hint = {
        "quantified": "Rewrite to include a plausible metric placeholder like [X%] if no number exists. Keep factual.",
        "concise": "Rewrite in fewer than 15 words, action-verb first.",
        "stronger": "Use a more impactful action verb and emphasise outcome.",
        "softer": "Make the tone more collaborative and less assertive.",
    }.get(style, "Rewrite clearly, action-verb first.")
    system = (
        "You rewrite resume bullet points. Never invent employers, projects, or facts. "
        "Return ONLY the rewritten bullet, no prefix, no quotes."
    )
    user = f"{style_hint}\n\nBullet: {bullet}"
    resp = _client().chat.completions.create(
        model=_model(),
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.4,
    )
    return (resp.choices[0].message.content or "").strip().strip('"')


def generate_cover_letter(cv: dict[str, Any], jd_text: str, tone: str = "professional") -> str:
    system = (
        "Write a cover letter from the candidate to a hiring manager. 3 short paragraphs. "
        "Plain prose, no markdown, no lists, no header block. Use only facts present in the CV. "
        f"Tone: {tone}."
    )
    user = f"CV:\n{json.dumps(cv)[:8000]}\n\nJOB DESCRIPTION:\n{jd_text[:6000]}"
    resp = _client().chat.completions.create(
        model=_model(),
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.5,
    )
    return (resp.choices[0].message.content or "").strip()


# --- Shape helpers -------------------------------------------------------------
def _normalise(d: dict[str, Any]) -> dict[str, Any]:
    """Ensure missing keys exist so the frontend never crashes on undefined."""
    out = {
        "full_name": "",
        "headline": "",
        "email": "",
        "phone": "",
        "location": "",
        "linkedin": "",
        "website": "",
        "summary": "",
        "experience": [],
        "education": [],
        "skills": {"technical": [], "soft": [], "languages": [], "tools": []},
        "certifications": [],
        "projects": [],
    }
    if not isinstance(d, dict):
        return out
    for k, v in d.items():
        out[k] = v
    # Normalise skills shape if model returned a flat list
    s = out.get("skills")
    if isinstance(s, list):
        out["skills"] = {"technical": s, "soft": [], "languages": [], "tools": []}
    elif isinstance(s, dict):
        out["skills"] = {
            "technical": s.get("technical") or [],
            "soft": s.get("soft") or [],
            "languages": s.get("languages") or [],
            "tools": s.get("tools") or [],
        }
    else:
        out["skills"] = {"technical": [], "soft": [], "languages": [], "tools": []}
    return out
