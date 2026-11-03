'use strict';

// 선생님 수정: 빈칸/문장은 src/lessons.json, 교실용 확인 번호는 아래 값입니다.
// 이 번호는 교실 운영을 위한 편의 기능이며 보안 인증이 아닙니다.
const TEACHER_CODE = '1234';
const RAW_LESSONS = JSON.parse(document.getElementById('lesson-data').textContent);
const LESSONS = RAW_LESSONS.map(lesson => {
  const answers = [];
  const lines = lesson.lines.map(line => {
    const parts = []; let cursor = 0;
    for (const match of line.text.matchAll(/\[([^\]]+)\]/g)) {
      parts.push({text: line.text.slice(cursor, match.index)});
      parts.push({answer: match[1], index: answers.length});
      answers.push(match[1]); cursor = match.index + match[0].length;
    }
    parts.push({text: line.text.slice(cursor)});
    return {...line, parts};
  });
  return {...lesson, answers, lines};
});
const TOTAL_BLANKS = LESSONS.reduce((n, l) => n + l.answers.length, 0);
const TOTAL_SENTENCES = LESSONS.reduce((n, l) => n + l.lines.length, 0);
const lessonSignature = lessons => JSON.stringify(lessons).split('').reduce((n,c) => Math.imul(n ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
const SIGNATURE = lessonSignature(RAW_LESSONS);
// The original four rooms are unchanged. Keep their progress when adding room five.
const FOUR_ROOM_SIGNATURE = lessonSignature(RAW_LESSONS.slice(0, 4));
const STORAGE_KEY = 'joseon-museum-dictation-v1';
const $ = id => document.getElementById(id);
const escapeHTML = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (id,cls='') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${id}"></use></svg>`;
const normalize = v => String(v).normalize('NFKC').replace(/[‘’ʼ]/g,"'").replace(/[.,!?;:]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
const countCorrect = p => p.checked.filter(Boolean).length;
const completedCount = () => state.progress.filter(p => p.completed).length;
const allComplete = () => completedCount() === LESSONS.length;
const freshProgress = l => ({answers:l.answers.map(()=>''), checked:l.answers.map(()=>null), failures:l.answers.map(()=>0), revealed:l.answers.map(()=>false), attempts:0, completed:false});
const freshState = () => ({signature:SIGNATURE,name:'',className:'',progress:LESSONS.map(freshProgress),completedAt:'',sealed:false});
function restore(raw) {
  const result = freshState();
  if (!raw || !Array.isArray(raw.progress)) return result;
  const compatibleFourRoomSave = raw.signature === FOUR_ROOM_SIGNATURE && raw.progress.length === 4;
  if (raw.signature !== SIGNATURE && !compatibleFourRoomSave) return result;
  result.name = typeof raw.name === 'string' ? raw.name.trim().slice(0,24) : '';
  result.className = typeof raw.className === 'string' ? raw.className.trim().slice(0,32) : '';
  result.progress = LESSONS.map((l,i) => {
    const p = freshProgress(l), old = raw.progress[i] || {};
    l.answers.forEach((a,j) => {
      p.answers[j] = typeof old.answers?.[j] === 'string' ? old.answers[j].slice(0,120) : '';
      p.checked[j] = old.checked?.[j] === true && normalize(p.answers[j]) === normalize(a) ? true : old.checked?.[j] === false ? false : null;
      p.failures[j] = Number.isInteger(old.failures?.[j]) ? Math.max(0,Math.min(999,old.failures[j])) : 0;
      p.revealed[j] = old.revealed?.[j] === true && p.failures[j] >= 3;
    });
    p.attempts = Number.isInteger(old.attempts) ? Math.max(0,Math.min(99999,old.attempts)) : 0;
    p.completed = old.completed === true && l.answers.every((a,j)=>normalize(p.answers[j])===normalize(a));
    if (p.completed) p.checked.fill(true);
    return p;
  });
  const complete = result.progress.every(p=>p.completed);
  if (complete && typeof raw.completedAt === 'string' && Number.isFinite(Date.parse(raw.completedAt))) result.completedAt = raw.completedAt;
  result.sealed = complete && raw.sealed === true;
  return result;
}
let state = freshState(), view = 'welcome', stageIndex = 0, speed = 1, toastTimer, returnFocus;
try { state = restore(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
catch { $('storage-notice').hidden = false; }
if (state.name) view = 'museum';
function save() { try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); } catch { $('storage-notice').hidden = false; } }
function announce(message) { $('live').textContent = message; }
function toast(message) { clearTimeout(toastTimer); $('toast').textContent=message; $('toast').hidden=false; announce(message); toastTimer=setTimeout(()=>$('toast').hidden=true,4200); }

// All artwork is embedded vector art; no external image or font requests.
function cat(x,y,flip=false) {
  return `<g transform="translate(${x} ${y}) ${flip?'scale(-1 1)':''}" fill="#b38a59" stroke="#6e644d" stroke-width="1.6"><path d="M-22 23q-8-29 11-38 16-10 27 8 20 30 11 49H-15Z"/><path d="M-24 11q-26-19-25 5 2 24 28 22" fill="none" stroke-width="7"/><path d="m-18-11-3-20 14 10 15-2 13-11 1 25q-2 19-19 18-18 1-21-20Z" fill="#bba078"/><path d="m-9-17 3 4m12-4 3 4m-17 8 7 2 6-3m-22-4-14-4m15 10-16 1m36-7 13-7m-14 12 16 1" fill="none"/><path d="m-9 11 12 6m-9 5 13 5m-7 4 13 5" fill="none" stroke-width="3" opacity=".6"/></g>`;
}
function exhibit(type) {
  const base = `<rect width="500" height="290" fill="#ddd0b2"/><path d="M0 0h500v38H0Z" fill="#4b6654"/><path d="M0 8h500M0 27h500" stroke="#c2a16b" stroke-width="2"/><path d="M0 19h500" stroke="#9c6650" stroke-width="7"/><path d="M0 240h500v50H0Z" fill="#b59b75"/><path d="M0 246h500M100 246l-10 44m170-44v44m150-44 10 44" stroke="#9d7e55" opacity=".6"/><path d="M20 36h18v210H20zm442 0h18v210h-18Z" fill="#7b5a3c"/><path d="M44 239h412" stroke="#745437" stroke-width="6"/><path d="M95 39 35 235h190L165 39m185 0-65 196h185L410 39" fill="#fff8dc" opacity=".17"/>`;
  let art = '';
  if(type==='cat') art=`<g stroke="#927953"><path d="M77 54h152v160H77zm195 0h152v160H272Z" fill="#9f8056"/><path d="M84 61h138v146H84zm195 0h138v146H279Z" fill="#ece1c3" stroke="#d1bf95"/></g><path d="M94 189q25-12 54-3t61-12M288 188q48 1 101-16" fill="none" stroke="#a7a282"/><path d="M99 173q5-43 47-53m-41 40q-18-23-8-40m25 20q-2-34 25-45M384 171q-18-54-69-75m49 48q22-23 31-16" fill="none" stroke="#7b8560" stroke-width="2"/><g fill="#9a9869"><ellipse cx="114" cy="144" rx="15" ry="5" transform="rotate(-30 114 144)"/><ellipse cx="138" cy="119" rx="12" ry="4" transform="rotate(-25 138 119)"/><ellipse cx="384" cy="133" rx="12" ry="4" transform="rotate(-30 384 133)"/></g>${cat(161,155)}${cat(339,153,true)}<path d="M359 97q8-15 18-7l16-5-9 13-14 1-9 8Z" fill="#6b6b53"/><circle cx="378" cy="91" r="1" fill="#efe5c8"/><path d="M129 227h48m144 0h48" stroke="#eee2bf" stroke-width="6"/>`;
  if(type==='bowl') art=`<path d="M90 207h322l-16 12H104Z" fill="#765739"/><path d="M109 219h9v34h-9m270-34h9v34h-9" fill="#6d5035"/><path d="M119 153q8 64 72 63 56 0 64-63Z" fill="#354b40"/><ellipse cx="187" cy="154" rx="69" ry="24" fill="#314f40"/><ellipse cx="187" cy="152" rx="58" ry="18" fill="#e0c88d"/><path d="M138 148q11-20 28-8m-3 18 13-20m30 3 24 11m-37-14 7 25" stroke="#71965c" stroke-width="10"/><path d="m157 153 12 7m43-19 12 3" stroke="#bc6142" stroke-width="8"/><ellipse cx="188" cy="150" rx="21" ry="13" fill="#f7ebcf"/><ellipse cx="188" cy="150" rx="9" ry="8" fill="#d7aa45"/><path d="M300 170q3 41 41 41t42-41Z" fill="#aa7855"/><ellipse cx="342" cy="170" rx="43" ry="15" fill="#724d34"/><ellipse cx="342" cy="170" rx="35" ry="10" fill="#bc9b68"/><path d="m326 168 12-2 9 6 15-4" fill="none" stroke="#749260" stroke-width="5"/><path d="M157 119q-16-16 0-30t0-24m36 48q-15-18 0-34m143 67q-16-18 0-34" fill="none" stroke="#fbf3da" stroke-width="4" opacity=".75"/><path d="m264 142 12 56m-6-59 12 56" stroke="#927a51" stroke-width="3"/><rect x="214" y="58" width="75" height="42" fill="#345441" stroke="#b89960"/><text x="251" y="87" text-anchor="middle" fill="#e2cd96" font-size="20" font-family="serif">水剌</text>`;
  if(type==='vase') art=`<rect x="86" y="68" width="329" height="158" fill="#e8e4cb" stroke="#a08b67"/><path d="M96 78h310v139H96Z" fill="#d4d3b5"/><path d="M102 219h299v25H102Z" fill="#977e58"/><path d="M115 219h136v-45H115zm177 0h96v-34h-96Z" fill="#bbb194"/><ellipse cx="182" cy="136" rx="60" ry="58" fill="#83a28b" stroke="#62836b" stroke-width="3"/><ellipse cx="182" cy="136" rx="44" ry="43" fill="#a0b298" stroke="#b7c5a6" stroke-width="2"/><g fill="none" stroke="#618471" stroke-width="1.5"><path d="M163 154q-3-33 31-47m-20 36q-8-7-5-17m14 8q19-2 22-15"/><path d="m159 122 11 3-6-14m22 18 12 3-1-12"/></g><ellipse cx="338" cy="145" rx="48" ry="47" fill="#f1ecdb" stroke="#cec7ab" stroke-width="3"/><ellipse cx="338" cy="145" rx="34" ry="33" fill="none" stroke="#d9d1b6" stroke-width="2"/><path d="M109 77v130m0-72 293-46" stroke="#ffffff" stroke-width="3" opacity=".22"/><path d="M167 235h29m157 0h28" stroke="#e6d6ae" stroke-width="5"/>`;
  if(type==='bag') art=`<path d="M84 79h336v9H84Z" fill="#8d6b46"/><path d="M100 59v171m300-171v171" stroke="#7b5f40" stroke-width="7"/><path d="M111 230h278v12H111Z" fill="#9a7e58"/><path d="M143 127q-4-39 28-40 32 0 28 40m90-1q-4-39 28-40 32 0 28 40" fill="none" stroke="#8d6e47" stroke-width="5"/><path d="M127 125h91l-4 88q-43 20-84 0Z" fill="#c2a875" stroke="#967e50" stroke-width="2"/><path d="M274 125h91l-4 88q-43 20-84 0Z" fill="#8a9a77" stroke="#657456" stroke-width="2"/><path d="M172 200q-13-41 10-55m-12 37-20-18m23 2 22-13" fill="none" stroke="#6c8255" stroke-width="2"/><g fill="#b56b55"><circle cx="179" cy="151" r="9"/><circle cx="188" cy="151" r="8"/><circle cx="181" cy="142" r="8"/><circle cx="151" cy="169" r="7"/><circle cx="195" cy="160" r="7"/></g><circle cx="182" cy="150" r="4" fill="#e2c779"/><path d="m309 193-12-21 11-13 5-15 9 14 15 6 5 18-13 16Z" fill="#b8ae7f"/><path d="M307 192q-23 3-20-15" fill="none" stroke="#b8ae7f" stroke-width="6"/><path d="m314 164 3 3m8-3 3 3m-9 7 6 1" stroke="#617254" stroke-width="2"/><path d="M156 238h33m145 0h31" stroke="#e6d6ae" stroke-width="5"/>`;
  if(type==='mask') art=`<path d="M85 66h330v158H85Z" fill="#b9a17c" stroke="#8e704f" stroke-width="3"/><path d="M96 77h308v135H96Z" fill="#cec0a2"/><path d="M105 221h290v21H105Z" fill="#826143"/><path d="M174 81V65m150 16V65" stroke="#655945" stroke-width="2"/><g transform="translate(174 145)"><path d="M-46-40q46-22 92 0l-3 14h-86Z" fill="#3a4436"/><path d="M-43-27q0-17 43-14 43-3 43 14L38 20Q25 58 0 62-28 53-39 20Z" fill="#b77d49" stroke="#855938" stroke-width="2"/><path d="M-34-8q12-13 25-7m18 0q13-6 25 7" fill="none" stroke="#5a412e" stroke-width="5" stroke-linecap="round"/><path d="M-31-2q12-10 23 0-12 8-23 0Zm39 0q12-10 23 0-12 8-23 0Z" fill="#ede0bb"/><path d="M-5-11q-2 12-11 24 15 11 32 0Q6 2 5-11" fill="#cb9860" stroke="#895b38" stroke-width="2"/><path d="M-28 30q28 21 56 0-13 30-29 27-18 0-27-27Z" fill="#5f3829"/><path d="M-23 32q23 13 46 0l-4 10q-19 10-38-1Z" fill="#ead7aa"/><path d="m-35 15 14 4m42 0 14-4" stroke="#98603d" stroke-width="3"/></g><g transform="translate(325 147)"><path d="M-38-34q5-30 38-30 31 0 38 30l-8 12h-60Z" fill="#455143"/><path d="M-36-30q36-16 72 0l-4 58Q16 52 0 54-19 49-32 28Z" fill="#d7b684" stroke="#a38557" stroke-width="2"/><path d="M-26-9q9-8 17-3m18 0q8-5 17 3" fill="none" stroke="#6a543b" stroke-width="3" stroke-linecap="round"/><path d="M-26-2q9-6 18 0m16 0q9-6 18 0" fill="none" stroke="#4e4c3b" stroke-width="2"/><path d="M-3-6-9 16q9 7 18 0L3-6" fill="#c69a62"/><circle cx="-24" cy="20" r="6" fill="#b27052" opacity=".65"/><circle cx="24" cy="20" r="6" fill="#b27052" opacity=".65"/><path d="M-15 32q15-6 30 0-15 13-30 0Z" fill="#9c5742"/></g><path d="M155 234h38m113 0h38" stroke="#e6d6ae" stroke-width="5"/>`;
  return `<svg viewBox="0 0 500 290" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${base}${art}</svg>`;
}
function entranceArt(){
  const tiles=Array.from({length:29},(_,i)=>`<path d="M${164+i*18} 217q1 25 ${-23+i*1.6} 68" fill="none" stroke="#6f7b68" stroke-width="2" opacity=".6"/>`).join('');
  const doors=Array.from({length:6},(_,i)=>`<g transform="translate(${235+i*58} 303)"><rect width="48" height="107" fill="#bdba96" stroke="#715f43" stroke-width="4"/><path d="M12 3v100m12-100v100m12-100v100M3 20h42M3 40h42M3 60h42M3 80h42" stroke="#837556" stroke-width="2"/></g>`).join('');
  return `<svg class="entry-art" viewBox="0 0 900 540" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="448" cy="482" rx="390" ry="46" fill="#c5c5aa" opacity=".35"/><path d="M0 310q115-189 231-104 128-154 281-76Q656 20 900 226v230H0" fill="#bdc5aa" opacity=".5"/><path d="M0 348q106-156 243-74 137-133 299-85 167-135 358 59v210H0" fill="#aebba1" opacity=".3"/><circle cx="691" cy="170" r="38" fill="#dbbc80" opacity=".45"/><path d="M109 443h619v29H109Z" fill="#aaa990"/><path d="M124 426h592v22H124Z" fill="#bdb89b"/><path d="M139 413h563v17H139Z" fill="#d0c6a6"/><path d="M183 284h478v129H183Z" fill="#d8c6a2"/>${doors}<path d="M184 286h18v133h-18m201-133h20v133h-20m246-133h18v133h-18" fill="#76533b"/><path d="M172 282h500v16H172Z" fill="#a78351"/><path d="M175 282h496v10H175Z" fill="#486b51"/><path d="M181 275h479v8H181Z" fill="#b9664d"/><path d="M163 266h518v10H163Z" fill="#b8a46b"/><path d="M157 215q98 11 265-60 161 67 265 60-37 35 62 67-162 17-327-8-170 26-326 9 89-35 61-68Z" fill="#405448"/><path d="M157 215q108 6 265-60 153 66 265 60" fill="none" stroke="#889078" stroke-width="7"/>${tiles}<path d="M97 283q160 9 325-9 169 17 327 8" fill="none" stroke="#293d33" stroke-width="8"/><path d="M372 274h100v36H372Z" fill="#273e31" stroke="#b29b64" stroke-width="2"/><text x="422" y="299" fill="#d4c092" font-family="serif" font-size="20" text-anchor="middle" letter-spacing="5">聽書閣</text><path d="M398 315h47v98h-47Z" fill="#243e32"/><path d="M397 315h24v97h-24" fill="#88704a"/><path d="M406 319v88m9-88v88" stroke="#b49b68"/><path d="M368 470h106l27 18H340Zm-22 18h151l25 15H322Z" fill="#c0b598"/><path d="M90 429q20-108-11-177m14 91q-46-52-68-47m61 1q39-36 78-29" fill="none" stroke="#7c7652" stroke-width="9"/><g fill="#6f8a68"><ellipse cx="42" cy="278" rx="63" ry="27"/><ellipse cx="91" cy="239" rx="66" ry="28"/><ellipse cx="144" cy="272" rx="50" ry="22"/></g><path d="M761 455q-3-105 38-167m-30 95q43-35 88-18m-60-56q-44-20-72-3" fill="none" stroke="#7a7851" stroke-width="8"/><g fill="#80926a"><ellipse cx="794" cy="281" rx="67" ry="27"/><ellipse cx="738" cy="301" rx="53" ry="24"/><ellipse cx="841" cy="352" rx="61" ry="29"/></g><g fill="#a4a585"><ellipse cx="114" cy="461" rx="38" ry="10"/><ellipse cx="758" cy="473" rx="42" ry="12"/></g></svg>`;
}
function stamp(i,large=false){const l=LESSONS[i];return `<div class="ink-stamp s${i}${large?' large stamp-pop':''}" role="img" aria-label="${l.title} 관람 완료 도장"><span class="stamp-hanja">${l.hanja}</span><span class="stamp-name">${l.stamp} · 관람완료</span><span class="stamp-label">JOSEON MUSEUM</span></div>`;}
function royalSeal(){return '<div class="royal-seal stamp-pop" role="img" aria-label="선생님 확인 옥새"><span>學</span><span>業</span><span>成</span><span>就</span></div>';}
function renderWelcome(){return `<section class="page-enter"><div class="arrival"><div class="arrival-copy"><div class="eyebrow">A LITTLE JOURNEY INTO JOSEON</div><h1>조선의 방에<br><em>귀를 기울이다</em></h1><p>오래된 그림 속 이야기, 소박한 그릇에 담긴 취향.<br>다섯 개의 방에서 영어로 만나는 조선의 하루.</p></div><span class="arrival-tag">조선의 아름다움을 듣다</span>${entranceArt()}<div class="entry-card"><div class="eyebrow">YOUR MUSEUM PASS</div>${icon('gate','entry-emblem')}<h2>관람첩</h2><p class="english-ticket">A visit worth remembering</p><div class="entry-divider"></div><form id="entry-form"><div class="field"><label for="visitor-name">관람객 이름</label><input id="visitor-name" name="name" placeholder="이름을 적어 주세요" maxlength="24" required autocomplete="off" value="${escapeHTML(state.name)}"></div><div class="field"><label for="visitor-class">학년 · 반 · 번호 <span>선택</span></label><input id="visitor-class" name="className" placeholder="예: 3학년 2반 7번" maxlength="32" autocomplete="off" value="${escapeHTML(state.className)}"></div><button class="button" type="submit">박물관 입장하기 ${icon('arrow')}</button><p class="entry-note">관람 기록은 이 브라우저에 자동으로 남아요.</p></form></div></div><div class="journey-guide"><div class="journey-step"><span>01</span><div><b>문을 열고, 귀를 기울여요</b><p>마음에 드는 전시실에서 대화 듣기</p></div></div><div class="journey-step"><span>02</span><div><b>한 문장씩, 배움을 새겨요</b><p>빈칸을 모두 채우면 관람 도장 하나</p></div></div><div class="journey-step"><span>03</span><div><b>다섯 개의 도장, 하나의 윤허</b><p>윤허 증서를 들고 선생님의 옥새 받기</p></div></div></div></section>`;}
function renderMuseum(){
  const n=completedCount();
  return `<section class="page-enter"><div class="section-top"><div><div class="eyebrow">THE MUSEUM · 나의 관람 여정</div><h1>어느 방부터 둘러볼까요?</h1><p>전시실을 눌러 이야기를 들어 보세요. 관람 순서는 자유로워요.</p></div><div class="museum-heading-note"><span></span>문장마다 듣고, 천천히 기록하세요</div></div><div class="museum-layout"><div><div class="museum-hall"><div class="hall-lintel"><span>聽 · 書 · 印</span><span class="hall-plaque">조선문화박물관</span><span>常設展示</span></div><div class="museum-rooms">${LESSONS.map((l,i)=>`<button class="room-door${state.progress[i].completed?' done':''}" data-action="room" data-index="${i}" aria-label="${l.title}${state.progress[i].completed?', 관람 완료':''} 들어가기"><div class="room-picture"><span class="room-number">0${i+1}</span><span class="room-tag">${state.progress[i].completed?'도장 획득':`${l.lines.length}문장 · ${l.answers.length}빈칸`}</span>${exhibit(l.icon)}</div><div class="room-caption"><div><h2>${l.title}</h2><p>${l.english}</p></div><span class="room-arrow">${icon(state.progress[i].completed?'check':'arrow')}</span></div></button>`).join('')}</div><div class="hall-carpet">이야기가 머무는 곳, 배움이 시작되는 곳</div></div><div class="museum-caption"><span>상설전시 · 다섯 개의 방</span><span>LISTEN & TALK A1 — A4 · C</span></div><div class="royal-invite"><div class="royal-mark">御賜</div><div class="invite-copy"><h2>${allComplete()?'그대의 배움을 윤허하노라':'배움의 끝에서, 왕의 윤허를'}</h2><p>${allComplete()?'다섯 개의 관람 도장이 모두 모였습니다. 이제 윤허 증서를 펼쳐 보세요.':'다섯 전시실의 도장을 모으면, 선생님의 옥새를 받을 윤허 증서가 열려요.'}</p></div><button class="button gold" data-action="certificate" ${!allComplete()?'disabled':''}>${icon(allComplete()?'arrow':'lock')} 윤허 증서</button></div></div><aside class="passport-aside" aria-label="나의 관람첩"><div class="passport-info"><div class="eyebrow">MY MUSEUM PASS</div><h2>나의 관람첩</h2><p class="visitor-name">${escapeHTML(state.name)} 님의 조선 산책</p><div class="stamp-count"><strong>${n}</strong><span>/ ${LESSONS.length}</span><small>관람 도장</small></div><div class="progress-track" role="progressbar" aria-label="모은 도장" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="${LESSONS.length}"><span style="width:${n/LESSONS.length*100}%"></span></div></div><div class="stamp-grid">${LESSONS.map((l,i)=>state.progress[i].completed?stamp(i):`<div class="stamp-slot" aria-label="${l.title} 도장 미획득"><span>${l.hanja}</span><small>${l.stamp} 도장</small></div>`).join('')}</div><div class="passport-bottom"><p class="subtle">한 번에 다 맞히지 않아도 괜찮아요.<br>틀린 문장만 다시 듣고, 나만의 속도로<br>관람첩을 완성해 보세요.</p><button class="button outline" data-action="guide">관람 방법 살펴보기 ${icon('arrow')}</button></div></aside></div></section>`;
}
function blankHTML(part,lineIndex){
  const p=state.progress[stageIndex],j=part.index,status=p.checked[j],failure=p.failures[j];
  const hint=status!==true && failure>=2 ? `<span class="blank-hint">${p.revealed[j]?'정답: '+escapeHTML(part.answer):'첫 글자: '+escapeHTML(part.answer[0])}</span>` : '';
  const reveal=status!==true && failure>=3 && !p.revealed[j] ? `<button class="reveal" data-action="reveal" data-blank="${j}">${j+1}번 정답 살펴보기</button>`:'';
  const feedback=status===true?'✓ 맞았어요':status===false?(normalize(p.answers[j])?'다시 들어 보세요':'빈칸을 채워 주세요'):'';
  return `<span class="blank"><input class="answer${status===true?' correct':status===false?' wrong':''}" data-blank="${j}" data-line="${lineIndex}" value="${escapeHTML(p.answers[j])}" aria-label="${lineIndex+1}번 문장, ${j+1}번 빈칸" aria-describedby="feedback-${j}" aria-invalid="${status===false}" style="--input-width:${Math.max(6,Math.min(17,part.answer.length+2))}ch" maxlength="120" autocomplete="off" autocapitalize="off" spellcheck="false" ${status===true?'readonly':''}><span id="feedback-${j}" class="blank-status ${status===true?'good':status===false?'bad':''}">${feedback}</span>${hint}${reveal}</span>`;
}
function renderRoom(){
  const l=LESSONS[stageIndex],p=state.progress[stageIndex],correct=countCorrect(p),percent=Math.round(correct/l.answers.length*100);
  return `<section class="page-enter"><div class="room-topbar"><button class="text-button" data-action="museum">${icon('back')} 박물관 둘러보기</button><nav class="mini-route" aria-label="전시실 이동">${LESSONS.map((r,i)=>`<button class="route-dot${i===stageIndex?' current':''}${state.progress[i].completed?' done':''}" data-action="room" data-index="${i}" aria-label="${r.title}" ${i===stageIndex?'aria-current="page"':''}>${state.progress[i].completed?icon('check'):i+1}</button>`).join('')}</nav></div><div class="room-heading"><div><div class="eyebrow">ROOM 0${stageIndex+1} · ${l.english}</div><h1>${l.title}</h1><p class="subtle">${l.description}</p></div><span class="room-seal">${l.hanja}</span></div>${p.completed?`<div class="complete-banner">${icon('check')} 이 방의 도장을 받았어요. 대화를 다시 들으며 여운을 즐겨 보세요.</div>`:''}<div class="study-layout"><div class="worksheet"><div class="audio-toolbar"><button class="button" data-action="full-audio" aria-pressed="false">${icon('play')} 대화 전체 듣기</button><button class="button outline" id="stop-audio" data-action="stop-audio" disabled>${icon('stop')} 정지</button><label>재생 속도<select id="speed" aria-label="재생 속도"><option value="0.85" ${speed===.85?'selected':''}>천천히 · 0.85×</option><option value="1" ${speed===1?'selected':''}>보통 · 1×</option><option value="1.15" ${speed===1.15?'selected':''}>빠르게 · 1.15×</option></select></label></div><div class="audio-track"><span id="audio-progress"></span></div><div class="audio-status"><span class="status-dot"></span><span id="audio-label">문장 옆 듣기 버튼을 눌러 보세요. 재생 중에는 답과 힌트가 잠시 가려져요.</span></div><div class="dialogue">${l.lines.map((line,i)=>`<div class="dialogue-row" data-line="${i}"><span class="speaker ${line.speaker.toLowerCase()}" aria-label="${line.speaker==='G'?'여학생':'남학생'}">${line.speaker}</span><div class="sentence" lang="en">${line.parts.map(part=>part.answer!==undefined?blankHTML(part,i):escapeHTML(part.text)).join('')}</div><button class="line-listen" data-action="line-audio" data-line="${i}" aria-label="${i+1}번 문장 듣기" aria-pressed="false">${icon('sound')}<span>${i+1}번 듣기</span></button></div>`).join('')}</div><div class="worksheet-end"><p id="check-message" role="status">${p.completed?'모든 빈칸을 완성했어요. 관람첩에 도장이 남았습니다.':p.attempts?`${correct} / ${l.answers.length}개 정답 · 틀린 부분만 다시 들어 보세요.`:'빈칸을 채운 뒤 확인해 보세요. 대소문자와 문장부호 차이는 괜찮아요.'}</p><button id="check-button" class="button" data-action="${p.completed?'museum':'grade'}">${p.completed?'관람첩으로':'답 확인하기'} ${icon(p.completed?'arrow':'check')}</button></div></div><aside class="study-aside" aria-label="받아쓰기 기록"><div class="mini-exhibit">${exhibit(l.icon)}</div><div class="eyebrow">A NOTE FROM THIS ROOM</div><h2>천천히, 한 문장씩</h2><div class="study-stats"><div><span>확인한 횟수</span><strong>${p.attempts}</strong><small>회</small></div><div><span>현재 정답률</span><strong>${p.attempts?percent:'—'}</strong><small>${p.attempts?'%':''}</small></div></div><div><div class="count-label"><span>완성한 빈칸</span><strong>${correct} / ${l.answers.length}</strong></div><div class="progress-track" role="progressbar" aria-label="완성한 빈칸" aria-valuenow="${correct}" aria-valuemin="0" aria-valuemax="${l.answers.length}"><span style="width:${percent}%"></span></div></div><div class="tips"><h3>조금 어려울 때에는</h3><p>두 번 틀리면 첫 글자 힌트가 나와요.<br>세 번 틀리면 정답을 볼 수 있어요.<br>본 정답은 직접 적어 보세요.<br>모두 맞히면 이 방의 도장 획득!</p></div>${p.completed?stamp(stageIndex):''}</aside></div></section>`;
}
function dateLabel(){return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'}).format(new Date(state.completedAt||Date.now()));}
function renderCertificate(){return `<section class="page-enter"><div class="certificate-intro"><div class="eyebrow">FIVE STAMPS, ONE ROYAL HONOUR</div><h1>${state.sealed?'그대의 배움에, 옥새를 내리노라':'그대의 배움을 윤허하노라'}</h1><p>${state.sealed?'선생님의 옥새가 찍힌 특별한 관람 기록입니다.':'다섯 개의 방을 성실히 둘러본 그대에게, 왕의 옥새를 청할 자격을 드립니다.'}<br>${state.sealed?'이날의 배움을 한 장의 증서로 간직해 보세요.':'아래 증서를 선생님께 보여 드리고, 마지막 옥새를 받아 보세요.'}</p></div><div class="certificate-wrap"><div class="scroll-rod"></div><article class="certificate" aria-label="인쇄용 윤허 증서"><div class="certificate-top"><span>朝鮮文化博物館</span>${icon('flower')}<span>聽書之旅 · 제8장</span></div><h2>윤허 증서</h2><p class="certificate-en">ROYAL CERTIFICATE OF LEARNING</p><p class="recipient"><span>${escapeHTML(state.name)}</span> 에게</p><p class="student-class">${escapeHTML(state.className||'조선문화박물관 관람객')}</p><p class="decree">그대는 조선의 다섯 전시실을 두루 살피며<br>이야기에 귀를 기울이고 배움을 글로 새겼으니,<br>그 정성과 끈기를 높이 여기는 바이다.<br><br>이에 다섯 개의 관람 도장을 모은 그대에게<br><b>왕의 옥새를 청할 자격을 윤허하노라.</b></p><div class="certificate-stamps">${LESSONS.map((_,i)=>stamp(i)).join('')}</div><p class="certificate-date">${dateLabel()}</p><div class="royal-signature"><div class="signature-copy">조선문화박물관<small>왕을 대신하여, 선생님</small></div>${state.sealed?royalSeal():'<div class="seal-space"><b>御璽</b><span>선생님의 옥새 자리</span></div>'}</div><p class="certificate-foot">${LESSONS.length}개 전시실 · ${TOTAL_SENTENCES}문장 · ${TOTAL_BLANKS}개 빈칸에 담긴 배움의 기록</p></article><div class="scroll-rod"></div></div><div class="certificate-actions"><button class="button" data-action="print">${icon('print')} 증서 인쇄 · PDF 저장</button><button class="button outline" data-action="museum">관람첩으로 ${icon('arrow')}</button></div><p class="certificate-hint">인쇄 창에서 ‘PDF로 저장’을 고를 수 있어요. 종이 증서에 선생님의 실제 도장을 받아도 좋아요.</p>${!state.sealed?'<button class="text-button teacher-link" data-action="teacher">선생님 · 화면에 옥새 내리기</button>':''}</section>`;}
function render(){
  $('app').innerHTML = view==='welcome'?renderWelcome():view==='museum'?renderMuseum():view==='room'?renderRoom():renderCertificate();
  $('visitor-label').textContent=state.name?state.name+' 님의 관람첩':'';
  $('reset-button').hidden=!state.name;
}
function navigate(next,index=stageIndex){
  if(next!=='welcome'&&!state.name) next='welcome';
  if(next==='certificate'&&!allComplete()){toast('다섯 전시실의 도장을 먼저 모아 주세요.');return;}
  if(next==='room'&&(!Number.isInteger(index)||!LESSONS[index]))return;
  stopAudio();closeDialog();stageIndex=index;view=next;render();
  window.scrollTo({top:0,behavior:'instant'});$('app').focus({preventScroll:true});
}
function openDialog(html,cls=''){stopAudio();returnFocus=document.activeElement;$('dialog').className='dialog '+cls;$('dialog').innerHTML=html;$('dialog').showModal();}
function closeDialog(){if($('dialog').open)$('dialog').close();}
$('dialog').addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
function showGuide(){openDialog(`<div class="eyebrow">MUSEUM GUIDE</div><h2 id="dialog-title">관람을 시작하기 전에</h2><div class="guide-step"><span>01</span><p><strong>마음에 드는 방을 골라요</strong>다섯 전시실은 어떤 순서로든 둘러볼 수 있어요.</p></div><div class="guide-step"><span>02</span><p><strong>듣고, 멈추고, 적어요</strong>대화 전체 또는 한 문장씩 들을 수 있어요. 소리가 끝나면 학습지의 빈칸을 채워 보세요.</p></div><div class="guide-step"><span>03</span><p><strong>틀려도 괜찮아요</strong>두 번 틀리면 첫 글자, 세 번 틀리면 정답 보기가 열려요. 정답은 직접 입력해야 해요.</p></div><div class="guide-step"><span>04</span><p><strong>네 도장으로 윤허 증서를 받아요</strong>${TOTAL_BLANKS}개 빈칸을 모두 완성하면 증서를 펼칠 수 있어요. 선생님께 마지막 옥새를 청해 보세요.</p></div><p class="guide-note">Enter로 답을 확인할 수 있어요. 같은 브라우저에서 다시 열면 이어서 관람할 수 있습니다. 다른 학생이 시작할 때는 ‘새 관람객’을 눌러 주세요.</p><div class="dialog-actions"><button class="button" data-action="close">알겠습니다 ${icon('check')}</button></div>`);}
function grade(){
  if(view!=='room'||playback)return;
  const l=LESSONS[stageIndex],p=state.progress[stageIndex];
  if(p.completed)return;
  if(!p.answers.some(a=>normalize(a))){toast('빈칸에 들은 말을 먼저 적어 주세요.');return;}
  p.attempts++;
  l.answers.forEach((a,j)=>{p.checked[j]=normalize(a)===normalize(p.answers[j]);if(!p.checked[j]&&normalize(p.answers[j]))p.failures[j]++;});
  p.completed=p.checked.every(Boolean);
  if(allComplete()&&!state.completedAt)state.completedAt=new Date().toISOString();
  save();render();
  if(p.completed){
    openDialog(`<div class="eyebrow">A MEMORY, SEALED.</div><h2 id="dialog-title">${l.title} 관람 완료</h2>${stamp(stageIndex,true)}<p>잘 듣고, 끝까지 써 내려간 그대에게<br>이 방의 관람 도장을 드립니다.</p><p style="margin-top:13px">지금까지 모은 도장 <b>${completedCount()} / ${LESSONS.length}</b></p><div class="dialog-actions"><button class="button" data-action="${allComplete()?'certificate':'museum'}">${allComplete()?'윤허 증서 펼치기':'다음 방 둘러보기'} ${icon('arrow')}</button></div>`,'success');
    announce(l.title+' 도장을 받았습니다.');
  } else {
    const first=$('app').querySelector('input.answer:not([readonly])');first?.focus({preventScroll:true});
    announce(`${countCorrect(p)}개를 맞혔어요. 틀린 빈칸을 다시 들어 보세요.`);
  }
}

// Web Audio schedules the exact slice, including its end, even in a background tab.
let audioContext, audioData, source, playback=null, playToken=0, frame=0;
const audioBuffers=new Map();
function getContext(){if(!audioContext){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('최신 Chrome, Edge 또는 Safari에서 열어 주세요.');audioContext=new AC();}return audioContext;}
async function getBuffer(key){
  if(!audioBuffers.has(key)){
    const pending=(async()=>{if(!audioData)audioData=JSON.parse($('audio-data').textContent);const bytes=Uint8Array.from(atob(audioData[key]),c=>c.charCodeAt(0));return getContext().decodeAudioData(bytes.buffer);})();
    audioBuffers.set(key,pending);pending.catch(()=>audioBuffers.delete(key));
  }
  return audioBuffers.get(key);
}
function listeningUI(active,label=''){
  document.body.classList.toggle('is-listening',active);
  if(view!=='room')return;
  $('stop-audio').disabled=!active;$('check-button').disabled=active;
  $('audio-label').textContent=label||'문장 옆 듣기 버튼을 눌러 보세요. 재생 중에는 답과 힌트가 잠시 가려져요.';
  $('app').querySelectorAll('input.answer').forEach(input=>input.readOnly=active||state.progress[stageIndex].checked[Number(input.dataset.blank)]===true);
  $('app').querySelectorAll('[data-action="line-audio"],[data-action="full-audio"]').forEach(b=>b.setAttribute('aria-pressed',String(Boolean(active&&playback&&(b.dataset.action==='full-audio'?playback.lineIndex===null:playback.lineIndex===Number(b.dataset.line))))));
  if(!active){$('audio-progress').style.width='0%';$('app').querySelectorAll('.dialogue-row.active').forEach(row=>row.classList.remove('active'));}
}
function stopAudio(){
  playToken++;cancelAnimationFrame(frame);frame=0;
  if(source){source.onended=null;try{source.stop();}catch{}try{source.disconnect();}catch{}source=null;}
  playback=null;listeningUI(false);
}
async function playAudio(lineIndex=null){
  if(view!=='room')return;
  stopAudio();const token=++playToken,currentStage=stageIndex,l=LESSONS[currentStage],range=lineIndex===null?l:l.lines[lineIndex];
  if(!range)return;
  playback={lineIndex,start:range.start,end:range.end,rate:speed,loading:true};listeningUI(true,'음원을 준비하고 있어요…');
  try{
    const ctx=getContext(),resumed=ctx.resume();const buffer=await getBuffer(l.audio);await resumed;
    if(token!==playToken||view!=='room'||stageIndex!==currentStage)return;
    if(range.start<0||range.end>buffer.duration+.1||range.end<=range.start)throw new Error('음원 재생 구간을 확인해 주세요.');
    source=ctx.createBufferSource();source.buffer=buffer;source.playbackRate.value=speed;source.connect(ctx.destination);
    const began=ctx.currentTime,rate=speed;playback.loading=false;
    listeningUI(true,`${lineIndex===null?'대화 전체':(lineIndex+1)+'번 문장'} 듣는 중 · ${rate}×`);
    source.onended=()=>{if(token!==playToken)return;stopAudio();announce('재생이 끝났어요. 들은 말을 적어 보세요.');};
    source.start(0,range.start,Math.min(buffer.duration,range.end)-range.start);
    function tick(){if(token!==playToken||!playback)return;const pos=range.start+(ctx.currentTime-began)*rate;$('audio-progress').style.width=Math.min(100,(pos-range.start)/(range.end-range.start)*100)+'%';$('app').querySelectorAll('.dialogue-row').forEach(row=>{const line=l.lines[Number(row.dataset.line)];row.classList.toggle('active',pos>=line.start&&pos<=line.end);});frame=requestAnimationFrame(tick);}
    tick();
  }catch(error){if(token!==playToken)return;stopAudio();toast(error.message.includes('구간')?error.message:'소리를 재생하지 못했어요. 파일을 내려받아 Chrome, Edge 또는 Safari에서 다시 열어 주세요.');}
}

document.addEventListener('submit',event=>{
  if(event.target.id==='entry-form'){
    event.preventDefault();const name=$('visitor-name').value.trim();if(!name){$('visitor-name').setCustomValidity('이름을 적어 주세요.');$('visitor-name').reportValidity();return;}
    state.name=name.slice(0,24);state.className=$('visitor-class').value.trim().slice(0,32);save();navigate('museum');
  }
  if(event.target.id==='teacher-form'){
    event.preventDefault();if(!allComplete())return;
    if($('teacher-code').value!==TEACHER_CODE){$('teacher-error').textContent='확인 번호를 다시 확인해 주세요.';$('teacher-code').select();return;}
    state.sealed=true;save();navigate('certificate');toast('선생님의 옥새가 내려졌습니다. 배움의 여정을 축하해요.');
  }
});
document.addEventListener('input',event=>{
  if(event.target.id==='visitor-name')event.target.setCustomValidity('');
  if(!event.target.matches('input.answer')||view!=='room')return;
  const j=Number(event.target.dataset.blank),p=state.progress[stageIndex];if(p.completed||event.target.readOnly)return;
  p.answers[j]=event.target.value;p.checked[j]=null;event.target.classList.remove('wrong');event.target.setAttribute('aria-invalid','false');$('feedback-'+j).textContent='';save();
});
document.addEventListener('change',event=>{if(event.target.id==='speed'){const line=playback?.lineIndex;const active=Boolean(playback);speed=Number(event.target.value);if(active)playAudio(line);}});
document.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('input.answer')&&!event.isComposing){event.preventDefault();grade();}});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action;
  switch(action){
    case 'home':navigate(state.name?'museum':'welcome');break;
    case 'museum':navigate('museum');break;
    case 'room':navigate('room',Number(button.dataset.index));break;
    case 'certificate':navigate('certificate');break;
    case 'guide':showGuide();break;
    case 'close':closeDialog();break;
    case 'full-audio':playAudio();break;
    case 'line-audio':playAudio(Number(button.dataset.line));break;
    case 'stop-audio':stopAudio();break;
    case 'grade':grade();break;
    case 'reveal':{const j=Number(button.dataset.blank),p=state.progress[stageIndex];if(playback||p.failures[j]<3)return;p.revealed[j]=true;save();const scroll=window.scrollY;render();window.scrollTo(0,scroll);$('app').querySelector(`[data-blank="${j}"].answer`)?.focus({preventScroll:true});break;}
    case 'reset':openDialog(`<div class="eyebrow">A NEW VISITOR</div><h2 id="dialog-title">새 관람첩을 펼칠까요?</h2><p>현재 관람객의 이름, 받아쓰기 기록, 도장이 이 브라우저에서 지워져요. 증서가 필요하면 먼저 인쇄해 주세요.</p><div class="dialog-actions"><button class="button outline" data-action="close">취소</button><button class="button red" data-action="confirm-reset">새로 시작하기</button></div>`);break;
    case 'confirm-reset':state=freshState();save();navigate('welcome');break;
    case 'print':if(view==='certificate'&&allComplete()){stopAudio();window.print();}break;
    case 'teacher':if(!allComplete())return;openDialog(`<div class="eyebrow">BY ROYAL APPROVAL</div><h2 id="dialog-title">그대의 배움에 옥새를</h2><p>${escapeHTML(state.name)} 학생의 다섯 전시실 관람을 확인하셨다면, 선생님의 확인 번호를 입력해 주세요.</p><form id="teacher-form"><div class="field"><label for="teacher-code">선생님 확인 번호</label><input id="teacher-code" type="password" inputmode="numeric" autocomplete="off" required maxlength="20"></div><p id="teacher-error" class="form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button outline" data-action="close">취소</button><button type="submit" class="button red">옥새 내리기</button></div></form>`);$('teacher-code').focus();break;
  }
});
window.addEventListener('pagehide',()=>{save();stopAudio();});
document.querySelector('.brand-mark').innerHTML=icon('gate');
render();
