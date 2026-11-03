"""Exercise the actual student/teacher flow in an isolated Chromium profile."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import re
import subprocess
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "test-results"
OUT.mkdir(exist_ok=True)
ANSWERS = [
    ["paintings", "left", "prefer"],
    ["Which", "seems", "more", "order"],
    ["plates", "plate", "choose", "better", "seems", "more unique"],
    ["gift", "one", "flowers", "more"],
    ["exhibitions", "prefer", "mask", "seen", "sure", "next", "watch", "first"],
]
COUNTS = [8, 8, 8, 6, 20]
LABELS = ["A1", "A2", "A3", "A4", "C"]
passed = []


def check(name, condition=True):
    assert condition, name
    passed.append(name)
    print("PASS:", name, flush=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
url = f"http://127.0.0.1:{server.server_port}/Joseon_Museum_Dictation.html"

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce")
        page = context.new_page()
        errors, requests = [], []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("request", lambda r: requests.append(r.url))
        response = page.goto(url)
        page.evaluate("document.fonts.ready")
        check("Built page serves successfully", response.status == 200)
        check("Bundled Korean font loads", page.evaluate("async()=> (await document.fonts.load('16px MuseumSerif')).length > 0"))
        page.screenshot(path=str(OUT / "01-entrance.png"), full_page=True, animations="disabled")
        page.locator("#visitor-name").fill("   ")
        page.locator("#entry-form button").click()
        check("Blank name cannot enter", page.locator("#entry-form").is_visible())
        page.locator("#visitor-name").fill("김하늘")
        page.locator("#visitor-class").fill("3학년 2반 7번")
        page.locator("#entry-form button").click()
        check("All five museum rooms are available", page.locator(".room-door").count() == 5)
        check("Certificate is locked before five stamps", page.locator('[data-action="certificate"]').is_disabled())
        page.screenshot(path=str(OUT / "02-museum.png"), full_page=True, animations="disabled")
        page.locator(".room-door").nth(4).click()
        check("Fifth room supports free visit order", "탈 전시실" in page.locator("h1").inner_text())
        page.locator('.route-dot[data-index="0"]').click()
        page.locator('[data-action="grade"]').click()
        check("Empty submission does not count as an attempt", page.evaluate("state.progress[0].attempts") == 0)

        # A wrong answer, hints, and a revealed answer must not award a stamp.
        page.locator("input.answer").nth(0).fill("wrong")
        for attempt in range(3):
            page.locator('[data-action="grade"]').click()
            check(f"Wrong submission {attempt + 1} cannot complete room", not page.evaluate("state.progress[0].completed"))
            if attempt == 1:
                check("Second error exposes first-letter hint", "첫 글자: p" in page.locator(".dialogue").inner_text())
        page.locator('[data-action="reveal"]').click()
        check("Third error can reveal answer without autofilling", "정답: paintings" in page.locator(".dialogue").inner_text() and page.locator("input.answer").nth(0).input_value() == "wrong")
        page.reload()
        page.locator(".room-door").nth(0).click()
        check("Unfinished answers and hints survive reload", page.locator("input.answer").nth(0).input_value() == "wrong" and "정답: paintings" in page.locator(".dialogue").inner_text())
        page.locator('[data-action="full-audio"]').click()
        page.wait_for_function("playback && !playback.loading")
        check("Audio locks grading while playing", page.locator("#check-button").is_disabled())
        check("Answers are visually hidden during listening", page.locator("input.answer").nth(0).evaluate("e=>getComputedStyle(e).color") == "rgba(0, 0, 0, 0)")
        page.locator('[data-action="stop-audio"]').click()
        check("Stop immediately releases inputs", not page.locator("#check-button").is_disabled() and not page.evaluate("playback"))
        page.locator('[data-action="line-audio"]').nth(0).click()
        page.locator('[data-action="line-audio"]').nth(1).click()
        page.wait_for_function("playback && !playback.loading && playback.lineIndex===1")
        check("Rapid sentence changes use only the latest request", page.evaluate("playback.lineIndex") == 1)
        page.locator('[data-action="museum"]').first.click()
        check("Navigation stops playback", page.evaluate("playback===null && source===null"))

        # Verify every actual sentence playback and sample range, using the UI's 1.15x setting.
        for room, expected in enumerate(ANSWERS):
            page.locator(".room-door").nth(room).click()
            page.locator("#speed").select_option("1.15")
            check(f"{LABELS[room]} matches worksheet blanks and sentence count", page.locator("input.answer").count() == len(expected) and page.locator(".line-listen").count() == COUNTS[room])
            bounds = page.evaluate("""async () => {
              const l=LESSONS[stageIndex],b=await getBuffer(l.audio),samples=b.getChannelData(0);
              return l.lines.map(x=>{
                let energy=0;const start=Math.floor(x.start*b.sampleRate),end=Math.floor(x.end*b.sampleRate);
                for(let n=start;n<end;n+=40)energy+=samples[n]*samples[n];
                return {valid:x.start>=0&&x.end<=b.duration&&x.end>x.start,energy};
              });
            }""")
            check(f"{LABELS[room]} has valid non-silent audio slices", all(x["valid"] and x["energy"] > 0.01 for x in bounds))
            for line in range(COUNTS[room]):
                page.locator('[data-action="line-audio"]').nth(line).click()
                page.wait_for_function("playback && !playback.loading")
                duration = page.evaluate("(playback.end-playback.start)/playback.rate")
                started = time.monotonic()
                page.wait_for_function("playback===null", timeout=(duration+2)*1000)
                elapsed = time.monotonic()-started
                assert max(0,duration-.5) <= elapsed <= duration+1, (room,line,duration,elapsed)
                assert not page.locator("#check-button").is_disabled()
            check(f"{LABELS[room]}: all {COUNTS[room]} sentences stop at their scheduled end")
            page.locator("#speed").select_option("1")
            for j, answer in enumerate(expected):
                # Punctuation, capitalization and whitespace tolerance, including a multiword answer.
                page.locator("input.answer").nth(j).fill("  " + answer.upper().replace(" ", "   ") + ".  ")
            if room == 0:
                page.screenshot(path=str(OUT / "03-dictation.png"), full_page=True, animations="disabled")
                page.locator("input.answer").last.press("Enter")
            else:
                page.locator('[data-action="grade"]').click()
            check(f"{LABELS[room]} awards stamp only after all answers", page.locator("dialog[open]").is_visible() and page.evaluate(f"state.progress[{room}].completed"))
            if room == 4:
                page.locator('#dialog [data-action="certificate"]').click()
            else:
                page.locator('#dialog [data-action="museum"]').click()
                if room == 3:
                    check("Four stamps keep the certificate locked", page.locator('[data-action="certificate"]').is_disabled())
                    check("Four stamps show 80 percent progress", page.locator('.passport-aside .progress-track span').evaluate("e=>e.style.width") == "80%")
        check("Five stamps unlock personalized certificate", page.locator(".certificate-stamps .ink-stamp").count() == 5 and "김하늘" in page.locator(".recipient").inner_text())
        check("Certificate starts with an empty teacher seal area", page.locator(".seal-space").count() == 1 and page.locator(".royal-seal").count() == 0)
        page.screenshot(path=str(OUT / "04-certificate.png"), full_page=True, animations="disabled")
        page.pdf(path=str(OUT / "certificate-unsealed.pdf"), format="A4", print_background=True, prefer_css_page_size=True)
        page.locator('[data-action="teacher"]').click()
        page.locator("#teacher-code").fill("0000")
        page.locator('#teacher-form button[type="submit"]').click()
        check("Wrong teacher code cannot issue a seal", not page.evaluate("state.sealed") and page.locator("#teacher-error").inner_text() != "")
        page.locator("#teacher-code").fill("1234")
        page.locator('#teacher-form button[type="submit"]').click()
        check("Correct teacher code issues royal seal", page.locator(".royal-seal").count() == 1)
        page.pdf(path=str(OUT / "certificate-sealed.pdf"), format="A4", print_background=True, prefer_css_page_size=True)
        for pdf in OUT.glob("certificate-*.pdf"):
            result = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True)
            check(f"{pdf.name} prints on one A4 page", re.search(r"Pages:\s+1\b", result.stdout) is not None)
        page.reload()
        check("All five stamps survive reload", page.locator(".room-door.done").count() == 5)
        page.locator('[data-action="certificate"]').click()
        check("Teacher seal and student identity survive reload", page.locator(".royal-seal").count() == 1 and "김하늘" in page.locator(".recipient").inner_text())

        # No network requests are needed after the document is loaded.
        context.set_offline(True)
        page.locator('[data-action="museum"]').first.click()
        page.locator(".room-door").nth(1).click()
        page.locator('[data-action="line-audio"]').nth(1).click()
        page.wait_for_function("playback && !playback.loading")
        page.wait_for_function("playback===null", timeout=5000)
        check("Embedded audio works without a network connection")
        context.set_offline(False)

        # Check mobile page bounds and usable controls at small widths.
        for width in [390, 320]:
            page.set_viewport_size({"width": width, "height": 844})
            page.locator('[data-action="museum"]').first.click()
            check(f"Museum fits {width}px screen", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            if width == 390:
                page.screenshot(path=str(OUT / "05-mobile-museum.png"), full_page=True, animations="disabled")
            page.locator(".room-door").nth(4).click()
            check(f"Dictation fits {width}px screen", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            if width == 390:
                page.screenshot(path=str(OUT / "06-mobile-dictation.png"), full_page=True, animations="disabled")
            page.locator('[data-action="museum"]').first.click()
            page.locator('[data-action="certificate"]').click()
            check(f"Certificate fits {width}px screen", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            check(f"All five certificate stamps are visible at {width}px", page.evaluate("""() => {
                const paper=document.querySelector('.certificate').getBoundingClientRect();
                return [...document.querySelectorAll('.certificate-stamps .ink-stamp')].every(e=>{
                    const r=e.getBoundingClientRect();return r.left>=paper.left&&r.right<=paper.right;
                });
            }"""))
            if width == 390:
                page.screenshot(path=str(OUT / "07-mobile-certificate.png"), full_page=True, animations="disabled")

        page.locator('[data-action="reset"]').click()
        page.locator('#dialog [data-action="close"]').click()
        check("Cancel reset preserves progress", page.evaluate("state.sealed && allComplete()"))
        page.locator('[data-action="reset"]').click()
        page.locator('[data-action="confirm-reset"]').click()
        check("Confirmed reset clears student and all stamps", page.locator("#entry-form").is_visible() and page.evaluate("!state.name && completedCount()===0"))
        check("Entrance fits a 320px screen", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
        page.locator("#visitor-name").fill('<img src=x onerror=1>')
        page.locator('#entry-form button').click()
        check("Student input is rendered as text", page.locator("img").count() == 0 and '<img' in page.locator(".visitor-name").inner_text())
        check("No external resource requests", all(r.startswith(url.split('/Joseon')[0]) or r.startswith('data:') for r in requests))
        check("No browser runtime errors", errors == [])

        # Restricted storage still permits the activity, with a visible notice.
        restricted = browser.new_context(reduced_motion="reduce")
        restricted.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('disabled')}})")
        rp = restricted.new_page()
        rp.goto(url)
        rp.locator('#visitor-name').fill('방문객')
        rp.locator('#entry-form button').click()
        check("Storage-disabled browsers remain usable", rp.locator('#storage-notice').is_visible() and rp.locator('.room-door').count() == 5)
        restricted.close()

        # A real four-room version signature must preserve existing study records.
        old_state = {
            "signature": 2413794376, "name": "이어하기", "className": "3학년 1반",
            "progress": [{"answers": answers, "checked": [True]*len(answers),
                          "failures": [0]*len(answers), "revealed": [False]*len(answers),
                          "attempts": 2, "completed": True} for answers in ANSWERS[:4]],
            "completedAt": "2026-11-02T03:00:00Z", "sealed": True,
        }
        migration = browser.new_context(reduced_motion="reduce")
        migration.add_init_script("localStorage.setItem('joseon-museum-dictation-v1'," + json.dumps(json.dumps(old_state, ensure_ascii=False)) + ")")
        mp = migration.new_page()
        mp.goto(url)
        check("Four-room save preserves visitor and earned stamps", mp.locator('.room-door.done').count() == 4 and "이어하기" in mp.locator('.visitor-name').inner_text())
        check("Migrated save requires the new fifth stamp", mp.locator('[data-action="certificate"]').is_disabled() and mp.evaluate("state.progress[4].answers.length === 8 && !state.progress[4].completed && !state.sealed"))
        mp.locator('.room-door').nth(4).click()
        for j, answer in enumerate(ANSWERS[4]):
            mp.locator('input.answer').nth(j).fill(answer)
        mp.locator('[data-action="grade"]').click()
        mp.locator('#dialog [data-action="certificate"]').click()
        check("Migrated student unlocks five-stamp certificate after new room", mp.locator('.certificate-stamps .ink-stamp').count() == 5 and mp.locator('.seal-space').count() == 1)
        migration.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()

(OUT / "results.json").write_text(json.dumps({"passed": len(passed), "checks": passed}, ensure_ascii=False, indent=2))
print(f"Completed: {len(passed)} checks passed.", flush=True)
