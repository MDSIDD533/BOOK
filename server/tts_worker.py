#!/usr/bin/env python3
"""
Persistent High-Speed Neural TTS + Polyphonic Music Engine for NoorStudio AI.
Powered locally by Kokoro-82M (q8 ONNX) + espeak-ng multi-language phonemizer + SciPy DSP.
Supports English (US/UK), Roman Urdu, Urdu (اردو), Hindi (हिंदी), Arabic, Spanish, French,
custom dual-voice blending, word-level caption timestamps, waveform envelopes, and stereo music.
"""

import glob
import json
import math
import os
import re
import sys
import time
import traceback
import numpy as np
from scipy.io import wavfile
from scipy import signal
from kokoro_onnx import Kokoro
from romanUrduPhonetics import (
    strip_markdown,
    detect_story_language,
    transliterate_roman_urdu,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CACHE_DIR = "/tmp/noorstudio-kokoro-cache"
SAMPLE_RATE = 24000

# Comprehensive Roman-Urdu -> Devanagari phonetic lexicon so common Pakistani/Indian
# Roman-Urdu words receive authentic Hindustani vowels, retroflexes, and nasals!
ROMAN_URDU_LEXICON = {
    "assalam": "अस्सलाम", "assalamu": "अस्सलामु", "salam": "सलाम", "alaikum": "अलैकुम", "walekum": "वालेकुम",
    "o": "ओ", "bismillah": "बिस्मिल्लाह", "alhamdulillah": "अल्हम्दुलिल्लाह", "inshallah": "इंशाअल्लाह",
    "mashallah": "माशाअल्लाह", "subhanallah": "सुब्हानअल्लाह", "allah": "अल्लाह", "khuda": "ख़ुदा",
    "dosto": "दोस्तो", "doston": "दोस्तों", "dost": "दोस्त", "bhai": "भाई", "bhaiyo": "भाइयो", "behno": "बहनो",
    "aap": "आप", "aapka": "आपका", "aapki": "आपकी", "aapke": "आपके", "aapko": "आपको",
    "hum": "हम", "hamara": "हमारा", "hamari": "हमारी", "hamare": "हमारे", "humein": "हमें", "humain": "हमें",
    "main": "मैं", "mein": "में", "mera": "मेरा", "meri": "मेरी", "mere": "मेरे", "mujhe": "मुझे", "mujhy": "मुझे",
    "tum": "तुम", "tumhara": "तुम्हारा", "tumhari": "तुम्हारी", "tumhein": "तुम्हें",
    "yeh": "यह", "ye": "ये", "woh": "वह", "wo": "वो", "is": "इस", "us": "उस", "in": "इन", "un": "उन",
    "hai": "है", "hain": "हैं", "tha": "था", "thi": "थी", "the": "थे", "ho": "हो", "hoga": "होगा", "hogi": "होगी",
    "honge": "होंगे", "hota": "होता", "hoti": "होती", "hote": "होते", "hua": "हुआ", "hui": "हुई", "hue": "हुए",
    "kya": "क्या", "kyun": "क्यूं", "kaise": "कैसे", "kaisa": "कैसा", "kaisi": "कैसी", "kahan": "कहां", "kab": "कब", "kaun": "कौन",
    "aur": "और", "ya": "या", "lekin": "लेकिन", "magar": "मगर", "phir": "फिर", "bhi": "भी", "hi": "ही", "toh": "तो", "to": "तो",
    "se": "से", "ko": "को", "ka": "का", "ki": "की", "ke": "के", "par": "पर", "pe": "पे", "tak": "तक", "liye": "लिये",
    "sath": "साथ", "saath": "साथ", "bina": "बिना", "andar": "अंदर", "bahar": "बाहर", "upar": "ऊपर", "neeche": "नीचे",
    "ek": "एक", "do": "दो", "teen": "तीन", "char": "चार", "paanch": "पांच", "das": "दस", "sau": "सौ", "hazar": "हज़ार", "lakh": "लाख", "crore": "करोड़",
    "aaj": "आज", "kal": "कल", "ab": "अब", "abhi": "अभी", "hamesha": "हमेशा", "kabhi": "कभी", "roz": "रोज़", "waqt": "वक़्त",
    "din": "दिन", "raat": "रात", "subah": "सुबह", "shaam": "शाम", "saal": "साल", "mahina": "महीना", "pal": "पल",
    "nahi": "नहीं", "nahin": "नहीं", "na": "ना", "mat": "मत", "haan": "हां", "ji": "जी", "jee": "जी", "bilkul": "बिल्कुल", "zaroor": "ज़रूर",
    "bahut": "बहुत", "bohat": "बोहत", "zyada": "ज़्यादा", "kam": "कम", "sab": "सब", "sabse": "सबसे", "har": "हर", "kuch": "कुछ", "koi": "कोई",
    "naya": "नया", "nayi": "नई", "naye": "नए", "purana": "पुराना", "bada": "बड़ा", "badi": "बड़ी", "bade": "बड़े", "chota": "छोटा", "choti": "छोटी",
    "acha": "अच्छा", "accha": "अच्छा", "achi": "अच्छी", "ache": "अच्छे", "behtareen": "बेहतरीन", "shandar": "शानदार", "kamaal": "कमाल",
    "khubsurat": "ख़ूबसूरत", "khoobsurat": "ख़ूबसूरत", "pyara": "प्यारा", "pyari": "प्यारी", "asli": "असली", "asaan": "आसान", "mushkil": "मुश्किल",
    "zindagi": "ज़िंदगी", "duniya": "दुनिया", "insaan": "इंसान", "log": "लोग", "logon": "लोगों", "dil": "दिल", "dimagh": "दिमाग़",
    "kamyabi": "कामयाबी", "kamyab": "कामयाब", "mehnat": "मेहनत", "himmat": "हिम्मत", "hosla": "हौसला", "hausla": "हौसला",
    "khwab": "ख़्वाब", "sapne": "सपने", "sapna": "सपना", "manzil": "मंज़िल", "safar": "सफ़र", "raasta": "रास्ता", "rasta": "रास्ता",
    "kahani": "कहानी", "baat": "बात", "baatein": "बातें", "sach": "सच", "raaz": "राज़", "sawal": "सवाल", "jawab": "जवाब",
    "aawaz": "आवाज़", "awaz": "आवाज़", "tasveer": "तस्वीर", "rang": "रंग", "roshni": "रोशनी", "noor": "नूर", "sitare": "सितारे",
    "asman": "आसमान", "aasman": "आसमान", "zameen": "ज़मीन", "samandar": "समंदर", "pahar": "पहाड़", "hawa": "हवा", "पानी": "पानी", "pani": "पानी",
    "shehar": "शहर", "karachi": "कराची", "lahore": "लाहौर", "islamabad": "इस्लामाबाद", "pakistan": "पाकिस्तान", "hindustan": "हिंदुस्तान",
    "karna": "करना", "karein": "करें", "karen": "करें", "karo": "करो", "karte": "करते", "karti": "करती", "karta": "करता", "kiya": "किया", "kr": "कर", "saky": "सकें", "sakein": "सकें", "sakte": "सकते", "sakti": "सकती", "sakta": "सकता",
    "banana": "बनाना", "banaye": "बनाएं", "banayein": "बनाएं", "banayenge": "बनाएंगे", "banaogy": "बनाओगे", "banaoge": "बनाओगे", "banani": "बनानी", "banane": "बनाने", "bana": "बना",
    "dekhna": "देखना", "dekhein": "देखें", "dekho": "देखो", "dekhenge": "देखेंगे", "dekhte": "देखते",
    "sunna": "सुनना", "sunein": "सुनें", "suno": "सुनो", "seekhein": "सीखें", "janein": "जानें", "jaante": "जानते",
    "chalo": "चलो", "chalein": "चलें", "shuru": "शुरू", "khatam": "ख़त्म", "aage": "आगे", "pehle": "पहले", "baad": "बाद",
    "paisa": "पैसा", "paise": "पैसे", "karobar": "कारोबार", "mustaqbil": "मुस्तक़बिल", "taqat": "ताक़त", "ilm": "इल्म",
    "sabr": "सब्र", "shukar": "शुक्र", "dua": "दुआ", "umeed": "उम्मीद", "yaqeen": "यक़ीन", "mohabbat": "मोहब्बत", "khushi": "ख़ुशी",
    "chahiye": "चाहिये", "zaroorat": "ज़रूरत", "sirf": "सिर्फ़", "chand": "चांद", "minute": "मिनट", "second": "सेकंड",
    # Storytelling & Narrative Lexicon
    "gaon": "गांव", "shehzada": "शहज़ादा", "shehzadi": "शहज़ादी", "badshah": "बादशाह", "malika": "मलिका",
    "larka": "लड़का", "larke": "लड़के", "larki": "लड़की", "bacha": "बच्चा", "bache": "बच्चे", "budha": "बूढ़ा", "buzurg": "बुज़ुर्ग",
    "rehta": "रहता", "rehti": "रहती", "rehte": "रहते", "rehna": "रहना", "ghar": "घर", "gharon": "घरों",
    "ghareeb": "ग़रीब", "garib": "ग़रीब", "ameer": "अमीर", "mehnti": "मेहनती", "imandar": "ईमानदार", "neik": "नेक",
    "jangal": "जंगल", "jungle": "जंगल", "drakht": "दरख़्त", "ped": "पेड़", "nadi": "नदी", "dariya": "दरिया", "khet": "खेत", "kheton": "खेतों",
    "kashti": "कश्ती", "mahal": "महल", "qila": "क़िला", "darwaza": "दरवाज़ा", "khirki": "खिड़की", "chiragh": "चिराग़", "diya": "दिया",
    "suraj": "सूरज", "nikalne": "निकलने", "nikla": "निकला", "doob": "डूब", "andhera": "अंधेरा", "andheri": "अंधेरी", "ujala": "उजाला",
    "barish": "बारिश", "toofan": "तूफ़ान", "bijli": "बिजली", "badal": "बादल", "baraf": "बरफ़", "registan": "रेगिस्तान", "sahra": "सहरा",
    "achanak": "अचानक", "aakhir": "आख़िर", "kaar": "कार", "aakhirkar": "आख़िरकार", "tabhi": "तभी", "wahan": "वहां", "yahan": "यहां", "jahan": "जहां",
    "taraf": "तरफ़", "raste": "रास्ते", "chalta": "चलता", "chalti": "चलती", "chalte": "चलते", "chala": "चला", "chali": "चली", "gaya": "गया", "gayi": "गई", "gaye": "गए",
    "aaya": "आया", "aayi": "आई", "aaye": "आए", "pohancha": "पहुंचा", "pohanchi": "पहुंची", "mila": "मिला", "mili": "मिली", "mile": "मिले",
    "dekha": "देखा", "dekhi": "देखी", "suna": "सुना", "suni": "सुनी", "kaha": "कहा", "bola": "बोला", "boli": "बोली", "poocha": "पूछा", "socha": "सोचा",
    "haari": "हारी", "hara": "हारा", "jeeta": "जीता", "jeet": "जीत", "haar": "हार", "rang": "रंग", "layi": "लाई", "laya": "लाया",
    "khazana": "ख़ज़ाना", "khazane": "ख़ज़ाने", "sona": "सोना", "chandi": "चांदी", "heera": "हीरा", "jadoo": "जादू", "chamak": "चमक", "chamakta": "चमकता",
    "parinda": "परिंदा", "parinde": "परिंदे", "sher": "शेर", "ghora": "घोड़ा", "musafir": "मुसाफ़िर", "kisan": "किसान",
    "maa": "मां", "baap": "बाप", "walid": "वालिद", "beta": "बेटा", "beti": "बेटी", "ustad": "उस्ताद", "kitab": "किताब", "kitabein": "किताबें",
    "khamoshi": "ख़ामोशी", "khamosh": "ख़ामोश", "khauf": "ख़ौफ़", "dar": "डर", "bahadur": "बहादुर", "aqalmand": "अक़्लमंद",
    "madad": "मदद", "badal": "बदल", "di": "दी", "diya": "दिया", "liya": "लिया", "sabaq": "सबक़", "seekh": "सीख", "poore": "पूरे", "poora": "पूरा", "poori": "पूरी",
}

ROMAN_URDU_MARKERS = {
    "hai", "hain", "kya", "kaise", "aur", "bhi", "nahi", "nahin", "mujhe", "mujhy",
    "aap", "hum", "mein", "main", "dosto", "doston", "aaj", "shandar", "zindagi",
    "duniya", "kamyabi", "mehnat", "banani", "banaogy", "saky", "sakte", "karein",
    "dekhein", "assalam", "alaikum", "bahut", "bohat", "chahiye", "lekin", "kyun",
    "hamara", "hamari", "aapka", "aapki", "aawaz", "awaz", "kahani", "safar", "khwab",
}

ENGLISH_TECH_WORDS = {
    "ai", "video", "videos", "voice", "voices", "studio", "youtube", "shorts", "reels",
    "tiktok", "instagram", "application", "app", "online", "digital", "brand", "business",
    "channel", "subscribe", "like", "share", "comment", "creator", "creators", "podcast",
    "music", "hd", "mp4", "mp3", "technology", "future", "smart", "pro", "design", "code",
}


def detect_language(text: str, requested_lang: str = "auto") -> str:
    if requested_lang and requested_lang != "auto":
        return requested_lang
    if re.search(r"[\u0600-\u06FF]", text):
        return "ur"
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"
    words = re.findall(r"[a-zA-Z]+", text.lower())
    if words:
        hits = sum(1 for w in words if w in ROMAN_URDU_MARKERS)
        if hits >= 2 or (len(words) <= 6 and hits >= 1):
            return "roman-urdu"
    return "en-us"


def transliterate_roman_urdu_to_devanagari(text: str) -> str:
    def replace_word(match):
        word = match.group(0)
        low = word.lower()
        if low in ENGLISH_TECH_WORDS:
            return word
        if low in ROMAN_URDU_LEXICON:
            return ROMAN_URDU_LEXICON[low]
        return word

    return re.sub(r"[A-Za-z]+", replace_word, text)


def ensure_kokoro_assets():
    os.makedirs(CACHE_DIR, exist_ok=True)
    onnx_path = os.path.join(CACHE_DIR, "kokoro-q8.onnx")
    voices_path = os.path.join(CACHE_DIR, "voices-v1.0.bin")

    if not os.path.exists(onnx_path) or os.path.getsize(onnx_path) < 90_000_000:
        parts = sorted(glob.glob(os.path.join(ROOT_DIR, "node_modules/kokoro-q8-shards/kokoro-q8.part*.bin")))
        if not parts:
            raise RuntimeError("kokoro-q8-shards not found in node_modules")
        tmp_onnx = onnx_path + ".tmp"
        with open(tmp_onnx, "wb") as out:
            for p in parts:
                with open(p, "rb") as inp:
                    out.write(inp.read())
        os.replace(tmp_onnx, onnx_path)

    if not os.path.exists(voices_path) or os.path.getsize(voices_path) < 1_000_000:
        voice_files = sorted(glob.glob(os.path.join(ROOT_DIR, "node_modules/kokoro-local-runtime/voices/*.bin")))
        if not voice_files:
            raise RuntimeError("kokoro-local-runtime voices not found in node_modules")
        voices = {}
        for vp in voice_files:
            vid = os.path.splitext(os.path.basename(vp))[0]
            voices[vid] = np.fromfile(vp, dtype=np.float32).reshape(-1, 1, 256)
        tmp_voices = voices_path + ".tmp"
        with open(tmp_voices, "wb") as f:
            np.savez(f, **voices)
        os.replace(tmp_voices, voices_path)

    return onnx_path, voices_path


def split_sentences(text: str):
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return []
    parts = re.split(r"(?<=[.!?۔।])\s+", cleaned)
    chunks = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        words = part.split(" ")
        if len(words) <= 32:
            chunks.append(part)
        else:
            for i in range(0, len(words), 28):
                chunks.append(" ".join(words[i : i + 28]))
    return chunks


def compose_background_music(duration_sec: float, style: str, sr: int = SAMPLE_RATE, speech_envelope=None, exact_samples: int = None):
    """Synthesizes lush stereo harmonic music & soundscape matching exact sample count."""
    n = exact_samples if exact_samples is not None else max(int(round(duration_sec * sr)), sr)
    t = np.linspace(0.0, n / sr, n, endpoint=False, dtype=np.float32)

    presets = {
        "cinematic_epic": {
            "chords": [[130.81, 196.00, 261.63, 311.13], [103.83, 155.56, 207.65, 311.13], [116.54, 174.61, 233.08, 293.66], [98.00, 146.83, 196.00, 293.66]],
            "bpm": 72, "arp_mult": 2.0, "bass": 0.42, "pad": 0.55, "pulse": 0.28, "cutoff": 2600,
        },
        "inspirational_piano": {
            "chords": [[261.63, 329.63, 392.00, 523.25], [196.00, 246.94, 392.00, 493.88], [220.00, 261.63, 329.63, 440.00], [174.61, 220.00, 261.63, 349.23]],
            "bpm": 84, "arp_mult": 1.0, "bass": 0.25, "pad": 0.45, "pulse": 0.35, "cutoff": 3400,
        },
        "lofi_chill": {
            "chords": [[220.00, 261.63, 329.63, 392.00], [174.61, 220.00, 261.63, 329.63], [196.00, 246.94, 293.66, 369.99], [164.81, 196.00, 246.94, 329.63]],
            "bpm": 76, "arp_mult": 1.0, "bass": 0.34, "pad": 0.50, "pulse": 0.22, "cutoff": 1500,
        },
        "tech_pulse": {
            "chords": [[146.83, 220.00, 293.66, 440.00], [130.81, 196.00, 261.63, 392.00], [110.00, 164.81, 220.00, 329.63], [130.81, 196.00, 293.66, 440.00]],
            "bpm": 112, "arp_mult": 2.0, "bass": 0.45, "pad": 0.38, "pulse": 0.44, "cutoff": 3800,
        },
        "spiritual_ambient": {
            "chords": [[146.83, 220.00, 293.66, 329.63], [130.81, 196.00, 261.63, 329.63], [116.54, 174.61, 261.63, 293.66], [146.83, 220.00, 293.66, 440.00]],
            "bpm": 60, "arp_mult": 1.0, "bass": 0.30, "pad": 0.65, "pulse": 0.10, "cutoff": 1900,
        },
        "dramatic_tension": {
            "chords": [[110.00, 164.81, 220.00, 261.63], [103.83, 155.56, 207.65, 246.94], [98.00, 146.83, 220.00, 261.63], [87.31, 130.81, 174.61, 261.63]],
            "bpm": 90, "arp_mult": 1.0, "bass": 0.52, "pad": 0.48, "pulse": 0.36, "cutoff": 2100,
        },
        "upbeat_pop": {
            "chords": [[261.63, 329.63, 392.00, 523.25], [293.66, 369.99, 440.00, 587.33], [220.00, 261.63, 329.63, 440.00], [196.00, 246.94, 293.66, 392.00]],
            "bpm": 118, "arp_mult": 2.0, "bass": 0.38, "pad": 0.40, "pulse": 0.45, "cutoff": 4200,
        },
    }
    cfg = presets.get(style, presets["cinematic_epic"])
    beat_sec = 60.0 / cfg["bpm"]
    bar_sec = beat_sec * 4.0

    left = np.zeros(n, dtype=np.float32)
    right = np.zeros(n, dtype=np.float32)

    num_bars = int(math.ceil((n / sr) / bar_sec)) + 1
    fade_samples = min(int(0.18 * sr), int(bar_sec * sr * 0.25))

    for b in range(num_bars):
        start = int(b * bar_sec * sr)
        end = min(n, int((b + 1) * bar_sec * sr) + fade_samples)
        if start >= n or end <= start:
            break
        seg_len = end - start
        lt = t[start:end] - t[start]
        chord = cfg["chords"][b % len(cfg["chords"])]

        # Smooth crossfade window per bar
        win = np.ones(seg_len, dtype=np.float32)
        if fade_samples > 0 and seg_len > fade_samples * 2:
            win[:fade_samples] = np.linspace(0.0, 1.0, fade_samples, dtype=np.float32)
            win[-fade_samples:] = np.linspace(1.0, 0.0, fade_samples, dtype=np.float32)

        # Warm stereo pad + subtle detuned chorus
        pad_l = np.zeros(seg_len, dtype=np.float32)
        pad_r = np.zeros(seg_len, dtype=np.float32)
        for idx, freq in enumerate(chord):
            vib = 1.0 + 0.0025 * np.sin(2.0 * np.pi * (0.35 + 0.1 * idx) * lt)
            pad_l += (0.55 * np.sin(2.0 * np.pi * freq * 0.998 * lt * vib) + 0.2 * np.sin(2.0 * np.pi * freq * 2.0 * lt))
            pad_r += (0.55 * np.sin(2.0 * np.pi * freq * 1.002 * lt * vib) + 0.2 * np.sin(2.0 * np.pi * freq * 2.003 * lt))

        # Warm sub-bass root note
        root = chord[0] * 0.5
        bass = np.sin(2.0 * np.pi * root * lt) + 0.35 * np.sin(2.0 * np.pi * chord[0] * lt)

        # Gentle arpeggio plucks on eighth/quarter notes
        arp_l = np.zeros(seg_len, dtype=np.float32)
        arp_r = np.zeros(seg_len, dtype=np.float32)
        step_sec = beat_sec * 0.5
        steps_in_bar = 8
        for s_idx in range(steps_in_bar):
            ns = int(s_idx * step_sec * sr)
            ne = min(seg_len, ns + int(step_sec * 1.6 * sr))
            if ns >= seg_len or ne <= ns:
                continue
            nt = np.linspace(0.0, (ne - ns) / sr, ne - ns, endpoint=False, dtype=np.float32)
            note_f = chord[s_idx % len(chord)] * cfg["arp_mult"]
            env = np.exp(-4.2 * nt) * np.minimum(1.0, nt / 0.012)
            tone = (np.sin(2.0 * np.pi * note_f * nt) + 0.3 * np.sin(2.0 * np.pi * note_f * 2.0 * nt)) * env
            pan = 0.65 if (s_idx % 2 == 0) else 0.35
            arp_l[ns:ne] += tone * pan
            arp_r[ns:ne] += tone * (1.0 - pan)

        left[start:end] += win * (cfg["pad"] * pad_l * 0.25 + cfg["bass"] * bass * 0.32 + cfg["pulse"] * arp_l * 0.32)
        right[start:end] += win * (cfg["pad"] * pad_r * 0.25 + cfg["bass"] * bass * 0.32 + cfg["pulse"] * arp_r * 0.32)

    # Warm lowpass filter for smooth studio polish
    sos = signal.butter(3, min(cfg["cutoff"], sr * 0.42), btype="low", fs=sr, output="sos")
    left = signal.sosfilt(sos, left).astype(np.float32)
    right = signal.sosfilt(sos, right).astype(np.float32)

    # Automatic sidechain ducking when narrator speaks
    if speech_envelope is not None and len(speech_envelope) == n:
        duck = 1.0 - 0.52 * speech_envelope
        left *= duck
        right *= duck

    # Smooth fade-in and fade-out
    fi = min(int(0.6 * sr), n // 4)
    fo = min(int(1.2 * sr), n // 3)
    if fi > 0:
        ramp_in = np.linspace(0.0, 1.0, fi, dtype=np.float32)
        left[:fi] *= ramp_in
        right[:fi] *= ramp_in
    if fo > 0:
        ramp_out = np.linspace(1.0, 0.0, fo, dtype=np.float32)
        left[-fo:] *= ramp_out
        right[-fo:] *= ramp_out

    peak = max(float(np.max(np.abs(left))), float(np.max(np.abs(right))), 1e-5)
    stereo = np.stack([left / peak, right / peak], axis=1)
    return stereo


class SynthEngine:
    def __init__(self):
        onnx_path, voices_path = ensure_kokoro_assets()
        self.kokoro = Kokoro(onnx_path, voices_path)

    def synthesize_segment(self, text: str, voice: str, speed: float, lang: str, blend_voice=None, blend_ratio: float = 0.0):
        clean_input = strip_markdown(text)
        resolved_lang = detect_story_language(clean_input, lang)

        # Register custom blended voice vector on the fly if requested
        target_voice = voice if voice in self.kokoro.voices else "af_heart"
        if blend_voice and blend_voice in self.kokoro.voices and 0.01 <= blend_ratio <= 0.99:
            mix_key = f"mix_{target_voice}_{blend_voice}_{int(blend_ratio * 100)}"
            if mix_key not in self.kokoro.voices:
                va = self.kokoro.voices[target_voice]
                vb = self.kokoro.voices[blend_voice]
                self.kokoro.voices[mix_key] = ((1.0 - blend_ratio) * va + blend_ratio * vb).astype(np.float32)
            target_voice = mix_key

        sentences = split_sentences(clean_input)
        if not sentences:
            sentences = ["Hello!"]

        all_audio = []
        sentence_timings = []
        cursor_sec = 0.08  # Leading studio breath pad
        all_audio.append(np.zeros(int(0.08 * SAMPLE_RATE), dtype=np.float32))

        for sent in sentences:
            proc_text = sent
            espeak_lang = resolved_lang
            if resolved_lang == "roman-urdu":
                proc_text = transliterate_roman_urdu(sent)
                espeak_lang = "hi"
            elif resolved_lang == "en-gb":
                espeak_lang = "en-gb"
            elif resolved_lang not in ("en-us", "ur", "hi", "ar", "es", "fr"):
                espeak_lang = "en-us"

            phonemes = self.kokoro.tokenizer.phonemize(proc_text, lang=espeak_lang)
            # Strip inline language-switch markers like (en) or (hi) injected by espeak-ng
            phonemes = re.sub(r"\([a-zA-Z-]+\)", "", phonemes).strip()
            if not phonemes:
                continue

            samples, sr = self.kokoro.create(
                phonemes,
                voice=target_voice,
                speed=float(max(0.55, min(1.85, speed))),
                is_phonemes=True,
            )
            dur = len(samples) / float(sr)
            sentence_timings.append({
                "text": sent,
                "start": round(cursor_sec, 3),
                "end": round(cursor_sec + dur, 3),
            })
            all_audio.append(samples.astype(np.float32))
            pause = np.zeros(int(0.18 * SAMPLE_RATE), dtype=np.float32)
            all_audio.append(pause)
            cursor_sec += dur + 0.18

        full = np.concatenate(all_audio) if all_audio else np.zeros(SAMPLE_RATE, dtype=np.float32)
        peak = float(np.max(np.abs(full)))
        if peak > 1e-5:
            full = (full / peak) * 0.90

        # Compute 64-bin amplitude envelope for UI waveform display
        bins = 64
        chunk_sz = max(1, len(full) // bins)
        waveform = []
        for i in range(bins):
            sl = full[i * chunk_sz : (i + 1) * chunk_sz]
            val = float(np.sqrt(np.mean(sl * sl))) * 2.6 if len(sl) > 0 else 0.05
            waveform.append(round(min(1.0, max(0.06, val)), 3))

        return full, resolved_lang, sentence_timings, waveform


def save_wav_stereo_or_mono(path: str, audio: np.ndarray, sr: int = SAMPLE_RATE):
    pcm = np.clip(audio * 32767.0, -32768.0, 32767.0).astype(np.int16)
    wavfile.write(path, sr, pcm)


def main():
    engine = SynthEngine()
    sys.stdout.write(json.dumps({"ready": True, "voices": list(engine.kokoro.get_voices())}) + "\n")
    sys.stdout.flush()

    for raw_line in sys.stdin:
        raw_line = raw_line.strip()
        if not raw_line:
            continue
        req_id = None
        try:
            req = json.loads(raw_line)
            req_id = req.get("id")
            cmd = req.get("cmd", "tts")

            if cmd == "tts":
                t0 = time.time()
                audio, resolved_lang, timings, waveform = engine.synthesize_segment(
                    text=req["text"],
                    voice=req.get("voice", "af_heart"),
                    speed=float(req.get("speed", 1.0)),
                    lang=req.get("lang", "auto"),
                    blend_voice=req.get("blend_voice"),
                    blend_ratio=float(req.get("blend_ratio", 0.0)),
                )
                music_style = req.get("music_style", "none")
                music_volume = float(req.get("music_volume", 0.22))
                duration = len(audio) / float(SAMPLE_RATE)

                if music_style and music_style != "none" and music_volume > 0.01:
                    # Smooth speech envelope for natural music ducking
                    win = int(0.15 * SAMPLE_RATE)
                    env = np.convolve(np.abs(audio), np.ones(win, dtype=np.float32) / max(1, win), mode="same")
                    env = np.clip(env * 3.0, 0.0, 1.0)
                    pad_tail = np.zeros(int(0.6 * SAMPLE_RATE), dtype=np.float32)
                    voice_padded = np.concatenate([audio, pad_tail])
                    env_padded = np.concatenate([env, np.zeros(len(pad_tail), dtype=np.float32)])
                    music_stereo = compose_background_music(
                        len(voice_padded) / float(SAMPLE_RATE),
                        music_style,
                        SAMPLE_RATE,
                        env_padded,
                        exact_samples=len(voice_padded),
                    )
                    voice_stereo = np.stack([voice_padded, voice_padded], axis=1)
                    mlen = min(len(voice_stereo), len(music_stereo))
                    mixed = voice_stereo[:mlen] * 0.92 + music_stereo[:mlen] * music_volume
                    peak = max(float(np.max(np.abs(mixed))), 1e-5)
                    if peak > 0.96:
                        mixed = mixed * (0.95 / peak)
                    save_wav_stereo_or_mono(req["out_wav"], mixed, SAMPLE_RATE)
                    duration = len(voice_padded) / float(SAMPLE_RATE)
                else:
                    save_wav_stereo_or_mono(req["out_wav"], audio, SAMPLE_RATE)

                resp = {
                    "id": req_id,
                    "ok": True,
                    "duration": round(duration, 3),
                    "resolved_lang": resolved_lang,
                    "timings": timings,
                    "waveform": waveform,
                    "elapsed_ms": int((time.time() - t0) * 1000),
                }
            elif cmd == "batch_scenes":
                # Synthesize multiple video scenes + unified continuous musical score seamlessly!
                t0 = time.time()
                scenes_in = req["scenes"]
                voice = req.get("voice", "af_heart")
                speed = float(req.get("speed", 1.0))
                lang = req.get("lang", "auto")
                blend_voice = req.get("blend_voice")
                blend_ratio = float(req.get("blend_ratio", 0.0))
                music_style = req.get("music_style", "cinematic_epic")
                music_volume = float(req.get("music_volume", 0.24))

                scene_results = []
                combined_chunks = []
                global_cursor = 0.0

                # Subtle 0.25s intro pad
                intro_pad = np.zeros(int(0.25 * SAMPLE_RATE), dtype=np.float32)
                combined_chunks.append(intro_pad)
                global_cursor += 0.25

                for idx, sc in enumerate(scenes_in):
                    audio, resolved_lang, timings, waveform = engine.synthesize_segment(
                        text=sc["narration"],
                        voice=sc.get("voice") or voice,
                        speed=speed,
                        lang=lang,
                        blend_voice=blend_voice,
                        blend_ratio=blend_ratio,
                    )
                    tail_pad = np.zeros(int(0.35 * SAMPLE_RATE), dtype=np.float32)
                    sc_audio = np.concatenate([audio, tail_pad])
                    sc_dur = len(sc_audio) / float(SAMPLE_RATE)

                    shifted_timings = [
                        {
                            "text": tm["text"],
                            "start": round(global_cursor + tm["start"], 3),
                            "end": round(global_cursor + tm["end"], 3),
                        }
                        for tm in timings
                    ]
                    scene_results.append({
                        "index": idx,
                        "start": round(global_cursor if idx > 0 else 0.0, 3),
                        "voice_start": round(global_cursor, 3),
                        "end": round(global_cursor + sc_dur, 3),
                        "duration": round(sc_dur + (0.25 if idx == 0 else 0.0), 3),
                        "resolved_lang": resolved_lang,
                        "timings": shifted_timings,
                        "waveform": waveform,
                    })
                    combined_chunks.append(sc_audio)
                    global_cursor += sc_dur
                    sys.stdout.write(json.dumps({
                        "progress_id": req_id,
                        "scene_done": idx + 1,
                        "scene_total": len(scenes_in),
                    }) + "\n")
                    sys.stdout.flush()

                # Gentle 0.55s musical outro tail on the final scene
                outro_pad = np.zeros(int(0.55 * SAMPLE_RATE), dtype=np.float32)
                combined_chunks.append(outro_pad)
                global_cursor += 0.55
                if scene_results:
                    scene_results[-1]["end"] = round(global_cursor, 3)
                    scene_results[-1]["duration"] = round(
                        scene_results[-1]["end"] - scene_results[-1]["start"], 3
                    )

                full_voice = np.concatenate(combined_chunks)
                total_dur = len(full_voice) / float(SAMPLE_RATE)

                if music_style and music_style != "none" and music_volume > 0.01:
                    win = int(0.18 * SAMPLE_RATE)
                    env = np.convolve(np.abs(full_voice), np.ones(win, dtype=np.float32) / max(1, win), mode="same")
                    env = np.clip(env * 3.2, 0.0, 1.0)
                    music_stereo = compose_background_music(
                        total_dur,
                        music_style,
                        SAMPLE_RATE,
                        env,
                        exact_samples=len(full_voice),
                    )
                    voice_stereo = np.stack([full_voice, full_voice], axis=1)
                    mlen = min(len(voice_stereo), len(music_stereo))
                    mixed = voice_stereo[:mlen] * 0.94 + music_stereo[:mlen] * music_volume
                    peak = max(float(np.max(np.abs(mixed))), 1e-5)
                    if peak > 0.96:
                        mixed = mixed * (0.95 / peak)
                    save_wav_stereo_or_mono(req["out_wav"], mixed, SAMPLE_RATE)
                else:
                    save_wav_stereo_or_mono(req["out_wav"], full_voice, SAMPLE_RATE)

                resp = {
                    "id": req_id,
                    "ok": True,
                    "total_duration": round(total_dur, 3),
                    "scenes": scene_results,
                    "elapsed_ms": int((time.time() - t0) * 1000),
                }
            else:
                resp = {"id": req_id, "ok": False, "error": f"Unknown command: {cmd}"}

            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()
        except Exception as exc:
            err_resp = {"id": req_id, "ok": False, "error": str(exc), "trace": traceback.format_exc()}
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
