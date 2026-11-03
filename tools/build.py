#!/usr/bin/env python3
"""Build the offline museum as one HTML file. Python standard library only."""
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build():
    lessons = json.loads((ROOT / "src/lessons.json").read_text())
    audio = {
        lesson["audio"]: base64.b64encode(
            (ROOT / "assets" / (lesson["audio"] + ".mp3")).read_bytes()
        ).decode("ascii")
        for lesson in lessons
    }
    replacements = {
        "<!-- STYLES -->": "<style>" + (ROOT / "src/styles.css").read_text() + "</style>",
        "<!-- LESSONS -->": '<script type="application/json" id="lesson-data">'
        + json.dumps(lessons, ensure_ascii=False).replace("</", "<\\/") + "</script>",
        "<!-- AUDIO -->": '<script type="application/json" id="audio-data">'
        + json.dumps(audio) + "</script>",
        "<!-- APP -->": "<script>" + (ROOT / "src/app.js").read_text() + "</script>",
    }
    font = ROOT / "assets/museum-serif.woff2"
    if font.exists():
        encoded = base64.b64encode(font.read_bytes()).decode("ascii")
        replacements["<!-- FONT -->"] = (
            "<!--\n" + (ROOT / "assets/FONT-LICENSE.txt").read_text().replace("--", "—") + "\n-->"
            + "<style>@font-face{font-family:MuseumSerif;src:url(data:font/woff2;base64,"
            + encoded + ") format('woff2');font-display:swap;font-weight:400}</style>"
        )
    else:
        replacements["<!-- FONT -->"] = ""
    html = (ROOT / "src/index.template.html").read_text()
    for marker, value in replacements.items():
        assert marker in html, f"Missing template marker: {marker}"
        html = html.replace(marker, value)
    output = ROOT / "Joseon_Museum_Dictation.html"
    output.write_text(html)
    print(f"Built {output.name}: {output.stat().st_size:,} bytes; {len(lessons)} rooms")


if __name__ == "__main__":
    build()
