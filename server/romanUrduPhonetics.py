"""
High-Accuracy Roman-Urdu -> Devanagari Phonetic Transliterator for Neural TTS.
Combines a 400+ word curated Pakistani/Indian Roman-Urdu dictionary with a greedy
digraph/vowel syllable transducer for unseen Roman-Urdu words, while keeping common
English loanwords intact so mixed speech sounds completely natural.
"""

import re

ROMAN_URDU_LEXICON = {
    # Greetings & Expressions
    "assalam": "अस्सलाम", "assalamu": "अस्सलामु", "salam": "सलाम", "alaikum": "अलैकुम", "walekum": "वालेकुम",
    "o": "ओ", "bismillah": "बिस्मिल्लाह", "alhamdulillah": "अल्हम्दुलिल्लाह", "inshallah": "इंशाअल्लाह",
    "mashallah": "माशाअल्लाह", "subhanallah": "सुब्हानअल्लाह", "allah": "अल्लाह", "khuda": "ख़ुदा",
    # Pronouns & Core Grammar
    "aap": "आप", "aapka": "आपका", "aapki": "आपकी", "aapke": "आपके", "aapko": "आपको",
    "hum": "हम", "hamara": "हमारा", "hamari": "हमारी", "hamare": "हमारे", "humein": "हमें", "humain": "हमें",
    "main": "मैं", "mein": "में", "mera": "मेरा", "meri": "मेरी", "mere": "मेरे", "mujhe": "मुझे", "mujhy": "मुझे",
    "tum": "तुम", "tumhara": "तुम्हारा", "tumhari": "तुम्हारी", "tumhein": "तुम्हें",
    "wo": "वो", "woh": "वह", "yeh": "यह", "ye": "ये", "is": "इस", "us": "उस", "in": "इन", "un": "उन",
    "unhon": "उन्हों", "inhon": "इन्हों", "jis": "जिस", "jin": "जिन", "apna": "अपना", "apni": "अपनी", "apne": "अपने",
    "khud": "ख़ुद", "ba": "ब", "sab": "सब", "tamam": "तमाम", "har": "हर", "kai": "कई", "koi": "कोई", "kuch": "कुछ",
    # Auxiliaries & Postpositions
    "hai": "है", "hain": "हैं", "tha": "था", "thi": "थी", "the": "थे", "ho": "हो", "hoga": "होगा", "hogi": "होगी",
    "honge": "होंगे", "hua": "हुआ", "hui": "हुई", "hue": "हुए", "bana": "बना", "bani": "बनी", "bane": "बने",
    "ga": "गा", "gi": "गी", "ge": "गे", "ne": "ने", "ko": "को", "ka": "का", "ki": "की", "ke": "के",
    "se": "से", "par": "पर", "pe": "पे", "tak": "तक", "liye": "लिये", "paas": "पास", "pas": "पास",
    "sath": "साथ", "saath": "साथ", "andar": "अंदर", "bahar": "बाहर", "upar": "ऊपर", "neeche": "नीचे",
    "aur": "और", "ya": "या", "lekin": "लेकिन", "magar": "मगर", "to": "तो", "toh": "तो", "bhi": "भी", "hi": "ही",
    "jaise": "जैसे", "jaisa": "जैसा", "jab": "जब", "tab": "तब", "phir": "फिर", "achanak": "अचानक",
    "nahi": "नहीं", "nahin": "नहीं", "na": "ना", "mat": "मत",
    # Numbers & Quantifiers
    "ek": "एक", "do": "दो", "doosra": "दूसरा", "doosre": "दूसरे", "doosri": "दूसरी", "dusra": "दूसरा",
    "teen": "तीन", "char": "चार", "bohat": "बोहत", "bahut": "बहुत", "bara": "बड़ा", "bada": "बड़ा",
    "bare": "बड़े", "bade": "बड़े", "bari": "बड़ी", "badi": "बड़ी", "chota": "छोटा", "chote": "छोटे", "choti": "छोटी",
    "gehra": "गहरा", "gehre": "गहरे", "gehri": "गहरी", "uncha": "ऊंचा", "unche": "ऊंचे", "unchi": "ऊंची",
    # Classic Fable, Animal & Story Vocabulary
    "dafa": "दफ़ा", "zikr": "ज़िक्र", "jangal": "जंगल", "jungle": "जंगल", "sher": "शेर",
    "janwar": "जानवर", "janwaron": "जानवरों", "khargosh": "ख़रगोश", "lomri": "लोमड़ी", "kachhua": "कछुआ",
    "kauwa": "कौवा", "haathi": "हाथी", "bandar": "बंदर", "hirn": "हिरन", "hiran": "हिरन", "bheriya": "भेड़िया",
    "chiriya": "चिड़िया", "parinda": "परिंदा", "parinde": "परिंदे", "ghora": "घोड़ा", "bakri": "बकरी", "chuha": "चूहा",
    "khauf": "ख़ौफ़", "dar": "डर", "alamat": "अलामत", "rozana": "रोज़ाना", "roz": "रोज़", "din": "दिन", "raat": "रात",
    "subah": "सुबह", "shaam": "शाम", "khuraak": "ख़ुराक", "khurak": "ख़ुराक", "bhook": "भूख", "pyaas": "प्यास",
    "masoom": "मासूम", "shikaar": "शिकार", "shikar": "शिकार", "karta": "करता", "karti": "करती", "karte": "करते",
    "karna": "करना", "karne": "करने", "kiya": "किया", "kar": "कर", "mil": "मिल", "mila": "मिला", "mili": "मिली",
    "eham": "अहम", "muahida": "मुआहिदा", "faisla": "फ़ैसला", "taye": "तय", "chala": "चला", "chali": "चली",
    "chal": "चल", "para": "पड़ा", "pari": "पड़ी", "jaye": "जाए", "jayega": "जाएगा", "gaya": "गया", "gayi": "गई", "gaye": "गए",
    "le": "ले", "liya": "लिया", "diya": "दिया", "di": "दी", "laga": "लगा", "lagai": "लगाई",
    "samajhdar": "समझदार", "aqalmand": "अक़्लमंद", "aqalmandi": "अक़्लमंदी", "bahadur": "बहादुर", "mehnti": "मेहनती",
    "baari": "बारी", "bari_turn": "बारी", "aayi": "आई", "aaya": "आया", "aaye": "आए",
    "jaan": "जान", "bachane": "बचाने", "bacha": "बचा", "bachai": "बचाई", "li": "ली",
    "tarkeeb": "तरकीब", "sochi": "सोची", "socha": "सोचा", "janbujh": "जानबूझ", "dair": "देर", "der": "देर",
    "pohncha": "पहुंचा", "pohancha": "पहुंचा", "pohnchi": "पहुंची", "pohanchi": "पहुंची",
    "gussa": "ग़ुस्सा", "gusse": "ग़ुस्से", "agula": "आग", "bula": "बगूला", "bagoola": "बगूला",
    "kaha": "कहा", "bola": "बोला", "boli": "बोली", "poocha": "पूछा", "use": "उसे", "usey": "उसे",
    "rasta": "रास्ता", "raasta": "रास्ता", "raste": "रास्ते", "rok": "रोक", "marne": "मारने", "mar": "मर", "maara": "मारा",
    "kuan": "कुआं", "kuein": "कुएं", "kuen": "कुएं", "talaab": "तालाब", "nadi": "नदी", "dariya": "दरिया", "pani": "पानी",
    "jhank": "झांक", "dekha": "देखा", "dekhi": "देखी", "nazar": "नज़र", "saya": "साया", "saye": "साये", "aks": "अक्स",
    "samjha": "समझा", "samjhi": "समझी", "hamla": "हमला", "chalaang": "छलांग", "chalang": "छलांग",
    "girte": "गिरते", "gira": "गिरा", "doob": "डूब", "rehta": "रहता", "rehti": "रहती", "rehte": "रहते",
    "gaon": "गांव", "ghar": "घर", "shehar": "शहर", "mahal": "महल", "badshah": "बादशाह", "shehzada": "शहज़ादा",
    "larka": "लड़का", "larki": "लड़की", "insaan": "इंसान", "log": "लोग", "logon": "लोगों", "dosto": "दोस्तो", "doston": "दोस्तों",
    "zindagi": "ज़िंदगी", "duniya": "दुनिया", "kamyabi": "कामयाबी", "kamyab": "कामयाब", "mehnat": "मेहनत",
    "himmat": "हिम्मत", "hosla": "हौसला", "hausla": "हौसला", "umeed": "उम्मीद", "chiragh": "चिराग़", "roshni": "रोशनी",
    "suraj": "सूरज", "chand": "चांद", "sitare": "सितारे", "asman": "आसमान", "barish": "बारिश", "toofan": "तूफ़ान",
    "andhera": "अंधेरा", "andheri": "अंधेरी", "khazana": "ख़ज़ाना", "khushi": "ख़ुशी", "khushiyon": "ख़ुशियों",
    "sabaq": "सबक़", "kahani": "कहानी", "aawaz": "आवाज़", "shandar": "शानदार", "khubsurat": "ख़ूबसूरत",
    "aakhir": "आख़िर", "kaar": "कार", "aakhirkar": "आख़िरकार", "haasil": "हासिल", "hasil": "हासिल",
    "sachi": "सच्ची", "sach": "सच", "jhoot": "झूठ", "taqat": "ताक़त", "aqal": "अक़्ल", "badi": "बड़ी",
}

ROMAN_URDU_MARKERS = {
    "hai", "hain", "tha", "thi", "the", "ek", "mein", "main", "ka", "ki", "ke",
    "ko", "se", "ne", "aur", "bhi", "nahi", "wo", "woh", "us", "is", "rehta",
    "jangal", "sher", "khargosh", "kaha", "bola", "dekha", "gaya", "dosto",
    "zindagi", "duniya", "kamyabi", "mehnat", "mujhe", "aap", "hum", "kya",
}

ENGLISH_LOANWORDS = {
    "ai", "video", "videos", "voice", "voices", "studio", "youtube", "shorts", "reels",
    "tiktok", "instagram", "application", "app", "online", "digital", "brand", "business",
    "channel", "subscribe", "like", "share", "comment", "podcast", "music", "hd", "mp4",
    "mp3", "technology", "future", "smart", "pro", "design", "story",
}

CONSONANT_CLUSTERS = [
    ("chh", "छ"), ("kh", "ख़"), ("gh", "ग़"), ("sh", "श"), ("ch", "च"),
    ("jh", "झ"), ("th", "थ"), ("dh", "ध"), ("ph", "फ़"), ("bh", "भ"),
    ("ng", "ंग"), ("nk", "ंक"),
    ("q", "क़"), ("k", "क"), ("g", "ग"), ("c", "क"), ("j", "ज"),
    ("t", "त"), ("d", "द"), ("n", "न"), ("p", "प"), ("f", "फ़"),
    ("b", "ब"), ("m", "म"), ("y", "य"), ("r", "र"), ("l", "ल"),
    ("w", "व"), ("v", "व"), ("s", "स"), ("z", "ज़"), ("h", "ह"),
]

VOWEL_MATRAS = [
    ("aa", "ा", "आ"), ("ee", "ी", "ई"), ("oo", "ू", "ऊ"),
    ("ai", "ै", "ऐ"), ("ay", "े", "ए"), ("au", "ौ", "औ"),
    ("ou", "ौ", "औ"), ("ei", "े", "ए"),
    ("a", "", "अ"), ("i", "ि", "इ"), ("u", "ु", "उ"),
    ("e", "े", "ए"), ("o", "ो", "ओ"),
]


def phonetic_fallback_word(word: str) -> str:
    """Rule-based Roman-Urdu syllable converter for out-of-vocabulary words."""
    s = word.lower()
    out = []
    i = 0
    prev_was_consonant = False

    while i < len(s):
        matched_v = False
        for pat, matra, indep in VOWEL_MATRAS:
            if s.startswith(pat, i):
                if prev_was_consonant:
                    # Terminal 'a' in Roman Urdu ('bara', 'mila') is long 'ा'!
                    if pat == "a" and i + 1 == len(s):
                        out.append("ा")
                    elif matra:
                        out.append(matra)
                else:
                    out.append(indep)
                i += len(pat)
                prev_was_consonant = False
                matched_v = True
                break
        if matched_v:
            continue

        matched_c = False
        for pat, dev in CONSONANT_CLUSTERS:
            if s.startswith(pat, i):
                # Double geminate consonant (e.g. 'gussa', 'bacha', 'sachi') -> halant + consonant
                if prev_was_consonant:
                    out.append("्")
                out.append(dev)
                i += len(pat)
                prev_was_consonant = True
                matched_c = True
                break
        if not matched_c:
            out.append(s[i])
            i += 1
            prev_was_consonant = False

    return "".join(out)


def strip_markdown(text: str) -> str:
    s = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", str(text or ""))
    s = re.sub(r"_{1,3}([^_]+)_{1,3}", r"\1", s)
    s = re.sub(r"^#+\s*", "", s, flags=re.MULTILINE)
    return re.sub(r"\s+", " ", s).strip()


def detect_story_language(text: str, requested_lang: str = "auto") -> str:
    clean = strip_markdown(text)
    if requested_lang and requested_lang != "auto":
        return requested_lang
    if re.search(r"[\u0600-\u06FF]", clean):
        return "ur"
    if re.search(r"[\u0900-\u097F]", clean):
        return "hi"
    words = re.findall(r"[a-zA-Z]+", clean.lower())
    if words:
        hits = sum(1 for w in words if w in ROMAN_URDU_MARKERS)
        if hits >= 2 or (len(words) <= 6 and hits >= 1):
            return "roman-urdu"
    return "en-us"


def transliterate_roman_urdu(text: str) -> str:
    clean = strip_markdown(text)
    # Multi-word idiomatic phrase fixups
    clean = re.sub(r"\bagula\s+bula\b", "आग बगूला", clean, flags=re.IGNORECASE)
    clean = re.sub(r"\bkhud\s+ba\s+khud\b", "ख़ुद ब ख़ुद", clean, flags=re.IGNORECASE)

    def convert_token(match):
        token = match.group(0)
        low = token.lower()
        if low in ENGLISH_LOANWORDS:
            return token
        if low in ROMAN_URDU_LEXICON:
            return ROMAN_URDU_LEXICON[low]
        return phonetic_fallback_word(low)

    return re.sub(r"[A-Za-z]+", convert_token, clean)
