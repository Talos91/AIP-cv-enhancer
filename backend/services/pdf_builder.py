"""Convert our DOCX output to PDF using pypandoc (requires pandoc + a LaTeX
engine OR LibreOffice on the server). Falls back to raising a clear error so
the frontend can surface it."""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile


class PDFBuildError(RuntimeError):
    pass


def docx_bytes_to_pdf(docx_bytes: bytes) -> bytes:
    tmpdir = tempfile.mkdtemp(prefix="cv_pdf_")
    try:
        docx_path = os.path.join(tmpdir, "cv.docx")
        with open(docx_path, "wb") as f:
            f.write(docx_bytes)

        soffice = shutil.which("soffice") or shutil.which("libreoffice")
        if soffice:
            try:
                subprocess.run(
                    [soffice, "--headless", "--convert-to", "pdf", "--outdir", tmpdir, docx_path],
                    check=True, capture_output=True, timeout=60,
                )
                pdf_path = os.path.join(tmpdir, "cv.pdf")
                if os.path.exists(pdf_path):
                    with open(pdf_path, "rb") as f:
                        return f.read()
            except Exception as e:
                raise PDFBuildError(f"LibreOffice conversion failed: {e}")

        try:
            import pypandoc
            pdf_path = os.path.join(tmpdir, "cv.pdf")
            pypandoc.convert_file(docx_path, "pdf", outputfile=pdf_path)
            with open(pdf_path, "rb") as f:
                return f.read()
        except Exception as e:
            raise PDFBuildError(
                "PDF export requires LibreOffice or pandoc+LaTeX on the server. "
                f"Last error: {e}"
            )
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
