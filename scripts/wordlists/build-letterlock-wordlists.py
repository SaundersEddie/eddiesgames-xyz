from wordfreq import top_n_list, zipf_frequency
import json, re, datetime, pathlib

OUT = pathlib.Path('/mnt/data/letterlock_poc_build')
(OUT/'public/wordlists').mkdir(parents=True, exist_ok=True)
(OUT/'public/games/letterlock').mkdir(parents=True, exist_ok=True)
(OUT/'src/data').mkdir(parents=True, exist_ok=True)

manual_blocked = sorted(set('''
anal anus arse ass balls bastard bitch bitches boobs cock cocaine cunt damn dick drugs fuck fucked fuckin fucking goddamn guns hamas hitler isis knife knives naked nazi nazis nude penis piss pistol porn pussy rape raped rifle rifles sex sexy shit shitty shotgun sperm suicide tits toxic vagina vodka weed whore heroin cannabis cocaine meth opioid opioids heroin racist racism slavery slave slaves genocide terrorist terror terrorism kill killer killing murder murdered abuse abused abortion nazi nazis hitler condoms condom booze
'''.split()))

# Extra removals for answer list only: too political, too proper-noun-ish, too ugly for a casual daily answer.
answer_remove = set('''
aaron abbas abbie abbott abdel abdul abdullah aberdeen abigail abraham afghan africa african afghans alabama alaska albert alex alexander alfred alice allah amanda america american americans anderson andre andrea andrew angela angeles anna anne anthony arab arabia arabic arabs argentina arizona armenia armenian arnold arsenal asia asian atlanta austin australia austria austrian bailey baltimore bangkok barack barbara barcelona barry beatles beijing belgian belgium benjamin berlin betty biden birmingham blair boeing boston brazil brisbane bristol britain british brooklyn bruce brussels bryan buffalo bush cairo calgary california cambodia canada canadian carlos carolina caroline carter castro catholic cbs chelsea chicago chile china chinese christ christian christians clark clarke clinton cnn colin colorado columbus congo copenhagen costa croatia cuba cuban dallas daniel danish darwin david davis denmark dennis denver detroit diana disney donald douglas dublin duncan dutch edinburgh edward edwards egypt egyptian england english eric essex ethiopia europe european evans facebook fifa finland florida france francis frank franklin fred freeman french gaza geneva georgia germany ghana glasgow google gordon graham greece greek greg harold harper harris harry harvard hawaii helen henry hindu hitler holland holmes houston india indian indiana indians instagram iran iraq iraqi ireland irish islam islamic israel israeli italy italian jamaica james japanese jason jesus jewish jews john johnny johnson jordan joseph joshua julia justin kansas karen karl kate kennedy kentucky kevin korean korea kyle laura lebanon lebanese leeds lewis libya linda lisa london louis lucas luther madrid malcolm manchester marie mario mark martha martin mary maryland matthew melbourne mercedes mexico mexican michael michelle mickey milan milton missouri mitchell montana montreal morgan morocco moscow muhammad muslim muslims nancy nash nebraska netflix nevada newton nigerian nintendo nixon obama ohio oliver ontario oregon orlando oscar ottawa oxford paris patrick paul pennsylvania perry peter phil philip philippines phoenix pierre poland pope portugal prague puerto putin quebec rachel ralph reagan rebecca richard richmond riley robert roberts robin robinson roman romans romania rome ronald ross russia russian russians samsung santa scotland scottish seattle shanghai silicon simpson singapore sony spain spanish stanley stephen steven stockholm sudan susan sweden swedish sydney syria syrian taiwan taylor texas thailand thomas thompson tokyo tony toronto trump turkey turkish ukraine ukrainian united utah vatican vegas venice victoria vienna vietnam virginia vladimir wales walmart washington watson wayne welsh wendy william williams wilson winnipeg yahoo youtube zelda zealand zimbabwe zionist zurich wyatt wyoming xavier yates yemen yorker youre zhang edwin isaiah maggie soviet tiffany delhi edison whatsapp sharon toledo hayden ambrose julius blake miguel murphy congress
'''.split())

# Build a broad-but-browser-acceptable valid list.
raw = top_n_list('en', 220000)
valid = []
seen = set()
for w in raw:
    w = w.lower().strip()
    if not re.fullmatch(r'[a-z]+', w):
        continue
    if re.search(r'([a-z])\1\1', w):
        continue
    if not (3 <= len(w) <= 12):
        continue
    if zipf_frequency(w, 'en') < 2.3:
        continue
    if w in manual_blocked:
        continue
    if w in seen:
        continue
    seen.add(w)
    valid.append(w)

# Make answer words more conservative: common-ish, 5-8 chars, no blocked/manual proper words, no obvious odd forms.
answers=[]
for w in valid:
    if not (5 <= len(w) <= 8):
        continue
    if w in answer_remove:
        continue
    z = zipf_frequency(w, 'en')
    if z < 3.45:
        continue
    # avoid awkward plural/inflection-heavy daily master words; valid list still accepts them.
    if len(w) >= 6 and (w.endswith('ings') or w.endswith('edly')):
        continue
    if w.endswith('ies') and len(w) > 6:
        continue
    answers.append(w)
# sort by alpha for deterministic fetch; puzzle RNG shuffles anyway.
answers = sorted(set(answers))
valid = sorted(valid)

meta = {
    'version': 'letterlock-poc-2026-06-18',
    'purpose': 'Shared eddiesgames.xyz wordlist proof of concept for LETTERLOCK first.',
    'source': 'Generated from the Python wordfreq English frequency list available in the build environment, then filtered for browser word-game use.',
    'validCount': len(valid),
    'answerCount': len(answers),
    'blockedCount': len(manual_blocked),
    'validRules': ['lowercase a-z only', '3-12 letters', 'minimum frequency threshold', 'manual blocked words removed'],
    'answerRules': ['subset of validWords', '5-8 letters', 'common-ish frequency threshold', 'manual answer removals for proper nouns/sensitive topics'],
    'createdAt': datetime.datetime.now(datetime.UTC).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
}
for name, data in [('validWords.json', valid), ('answerWords.json', answers), ('blockedWords.json', manual_blocked), ('wordMeta.json', meta)]:
    with open(OUT/'public/wordlists'/name, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
print(meta)
print('sample valid', valid[:20], valid[-20:])
print('sample answers', answers[:50], answers[-50:])
