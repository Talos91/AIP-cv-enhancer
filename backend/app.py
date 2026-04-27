"""AIP CV Enhancer - Flask JSON API.

All state lives client-side (localStorage). This server is stateless: it parses,
scores, rewrites, exports. No sessions, no DB.
"""
from __future__ import annotations

import io
import os
import traceback

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

load_dotenv()

from services import ai, parser
from services.docx_builder import build_docx
from services.pdf_builder import PDFBuildError, docx_bytes_to_pdf


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 15 * 1024 * 1024  # 15 MB uploads
app.secret_key = os.getenv("FLASK_SECRET_KEY", os.urandom(32))

_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
CORS(app, resources={r"/api/*": {"origins": [_origin, "http://localhost:5173", "http://127.0.0.1:5173"]}})


ALLOWED_EXTS = {".pdf", ".docx"}


# --- helpers -------------------------------------------------------------------
def _json_error(msg: str, status: int = 400):
    return jsonify({"error": msg}), status


def _payload():
    data = request.get_json(silent=True) or {}
    return data


# --- routes --------------------------------------------------------------------
@app.get("/api/health")
def health():
    return jsonify({"ok": True, "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini")})


@app.post("/api/parse")
def parse():
    """Upload a PDF/DOCX -> return canonical CV JSON."""
    if "file" not in request.files:
        return _json_error("No file part")
    f = request.files["file"]
    if not f.filename:
        return _json_error("Empty filename")
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in ALLOWED_EXTS:
        return _json_error(f"Unsupported file type: {ext}")

    data = f.read()
    text = parser.extract_text(f.filename, data)
    if len(text.strip()) < 40:
        return _json_error("Could not extract text from the uploaded file.")

    sniffed = parser.sniff_contacts(text)
    try:
        cv = ai.parse_cv(text)
    except Exception as e:
        traceback.print_exc()
        return _json_error(f"AI parse failed: {e}", 502)

    # Fill in contacts if the model missed them
    for k, v in sniffed.items():
        if not cv.get(k) and v:
            cv[k] = v

    return jsonify({"cv": cv, "raw_text_preview": text[:1500]})


@app.post("/api/ats-score")
def ats_score():
    cv = (_payload() or {}).get("cv")
    if not cv:
        return _json_error("Missing cv")
    try:
        return jsonify(ai.score_ats(cv))
    except Exception as e:
        traceback.print_exc()
        return _json_error(f"ATS scoring failed: {e}", 502)


@app.post("/api/jd-match")
def jd_match():
    p = _payload()
    cv = p.get("cv")
    jd = (p.get("jd") or "").strip()
    if not cv:
        return _json_error("Missing cv")
    if not jd:
        return _json_error("Missing jd")
    try:
        return jsonify(ai.match_jd(cv, jd))
    except Exception as e:
        traceback.print_exc()
        return _json_error(f"JD match failed: {e}", 502)


@app.post("/api/tailor")
def tailor():
    p = _payload()
    cv = p.get("cv")
    jd = (p.get("jd") or "").strip()
    if not cv or not jd:
        return _json_error("Missing cv or jd")
    try:
        return jsonify({"cv": ai.tailor_cv_for_jd(cv, jd)})
    except Exception as e:
        traceback.print_exc()
        return _json_error(f"Tailor failed: {e}", 502)


@app.post("/api/rewrite-bullet")
def rewrite_bullet():
    p = _payload()
    bullet = (p.get("bullet") or "").strip()
    style = (p.get("style") or "stronger").strip()
    if not bullet:
        return _json_error("Missing bullet")
    try:
        return jsonify({"bullet": ai.rewrite_bullet(bullet, style)})
    except Exception as e:
        traceback.print_exc()
        return _json_error(f"Rewrite failed: {e}", 502)


@app.post("/api/cover-letter")
def cover_letter():
    p = _payload()
    cv = p.get("cv")
    jd = (p.get("jd") or "").strip()
    tone = (p.get("tone") or "professional").strip()
    if not cv or not jd:
        return _json_error("Missing cv or jd")
    try:
        return jsonify({"letter": ai.generate_cover_letter(cv, jd, tone)})
    except Exception as e:
        traceback.print_exc()
        return _json_error(f"Cover letter failed: {e}", 502)


@app.post("/api/export/docx")
def export_docx():
    p = _payload()
    cv = p.get("cv")
    template = (p.get("template") or "minimal").lower()
    if not cv:
        return _json_error("Missing cv")
    try:
        docx = build_docx(cv, template)
    except Exception as e:
        traceback.print_exc()
        return _json_error(f"DOCX build failed: {e}", 500)

    fname = (cv.get("full_name") or "resume").replace(" ", "_")
    return send_file(
        io.BytesIO(docx),
        mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        as_attachment=True,
        download_name=f"{fname}.docx",
    )


@app.post("/api/export/pdf")
def export_pdf():
    p = _payload()
    cv = p.get("cv")
    template = (p.get("template") or "minimal").lower()
    if not cv:
        return _json_error("Missing cv")
    try:
        docx = build_docx(cv, template)
        pdf = docx_bytes_to_pdf(docx)
    except PDFBuildError as e:
        return _json_error(str(e), 501)
    except Exception as e:
        traceback.print_exc()
        return _json_error(f"PDF build failed: {e}", 500)

    fname = (cv.get("full_name") or "resume").replace(" ", "_")
    return send_file(
        io.BytesIO(pdf),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"{fname}.pdf",
    )


@app.errorhandler(413)
def too_large(_e):
    return _json_error("File too large (max 15 MB).", 413)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
