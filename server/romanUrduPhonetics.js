/*
 * Pure-JavaScript Multilingual & Roman-Urdu / Urdu / Hindi / Arabic / Romance
 * Phonetic & IPA Transduction Engine for Kokoro-82M Neural Speech Synthesis.
 * 100% Cross-Platform (Windows, macOS, Linux) — Zero Python dependency required.
 */

const ROMAN_URDU_PHRASES = [
  [/\bagula\s+bula\b/gi, 'आग बगूला'],
  [/\baag\s+bagula\b/gi, 'आग बगूला'],
  [/\bkhud\s+ba\s+khud\b/gi, 'ख़ुद ब ख़ुद'],
  [/\bjan\s*bujh\s+kar\b/gi, 'जान बूझ कर'],
  [/\bjaan\s*boojh\s+kar\b/gi, 'जान बूझ कर'],
  [/\bek\s+dafa\s+ka\s+zikr\s+hai\b/gi, 'एक दफ़ा का ज़िक्र है'],
  [/\bassalam\s*o?\s*alaikum\b/gi, 'अस्सलामु अलैकुम'],
  [/\bin\s*sha\s*allah\b/gi, 'इन शा अल्लाह'],
  [/\bma\s*sha\s*allah\b/gi, 'मा शा अल्लाह'],
  [/\bsallallahu\s+alaihi\s+wasallam\b/gi, 'सल्लल्लाहु अलैहि वसल्लम'],
];

const ROMAN_URDU_LEXICON = {
  // Core grammar & connectors
  hai: 'है', hain: 'हैं', था: 'था', tha: 'था', thi: 'थी', the: 'थे', thay: 'थे',
  ho: 'हो', hoon: 'हूँ', hun: 'हूँ', hua: 'हुआ', hui: 'हुई', hue: 'हुए', hote: 'होते', hota: 'होता', hoti: 'होती',
  ka: 'का', ki: 'की', ke: 'के', ko: 'को', se: 'से', mein: 'में', main: 'मैं', par: 'पर', pe: 'पे',
  ne: 'ने', to: 'तो', toh: 'तोह', bhi: 'भी', hi: 'ही', aur: 'और', ya: 'या', magar: 'मगर', lekin: 'लेकिन',
  agar: 'अगर', warna: 'वरना', phir: 'फिर', ab: 'अब', jab: 'जब', tab: 'तब', kab: 'कब', kahan: 'कहाँ',
  wahan: 'वहाँ', yahan: 'यहाँ', jahan: 'जहाँ', kaise: 'कैसे', kaisa: 'कैसा', kaisi: 'कैसी', kya: 'क्या', kyun: 'क्यूँ',
  kyunke: 'क्यूँके', taake: 'ताके', tak: 'तक', sath: 'साथ', saath: 'साथ', paas: 'पास', pas: 'पास',
  andar: 'अंदर', bahar: 'बाहर', upar: 'ऊपर', neeche: 'नीचे', aage: 'आगे', peeche: 'पीछे', samne: 'सामने',
  // Pronouns & numbers
  ek: 'एक', do: 'दो', doosra: 'दूसरा', doosre: 'दूसरे', doosri: 'दूसरी', teesra: 'तीसरा', char: 'चार', paanch: 'पाँच',
  wo: 'वो', woh: 'वोह', ye: 'ये', yeh: 'येह', is: 'इस', us: 'उस', in: 'इन', un: 'उन',
  use: 'उसे', usay: 'उसे', ise: 'इसे', unhon: 'उन्होंने', unho: 'उन्होंने', inhon: 'इन्होंने',
  apna: 'अपना', apni: 'अपनी', apne: 'अपने', aap: 'आप', aapka: 'आपका', aapki: 'आपकी', aapke: 'आपके',
  hum: 'हम', hamara: 'हमारा', hamari: 'हमारी', hamare: 'हमारे', tum: 'तुम', mera: 'मेरा', meri: 'मेरी', mere: 'मेरे',
  mujhe: 'मुझे', mujhy: 'मुझे', sab: 'सब', tamam: 'तमाम', har: 'हर', कोई: 'कोई', koi: 'कोई', kuch: 'कुछ', kai: 'कई',
  bohat: 'बोहत', bahut: 'बहुत', bara: 'बड़ा', bare: 'बड़े', bari: 'बड़ी', chota: 'छोटा', choti: 'छोटी', chote: 'छोटे',
  // Story & fable vocabulary
  dafa: 'दफ़ा', zikr: 'ज़िक्र', jangal: 'जंगल', sher: 'शेर', rehta: 'रहता', rehti: 'रहती', rehte: 'रहते',
  janwar: 'जानवर', janwaron: 'जानवरों', liye: 'लिये', khauf: 'ख़ौफ़', alamat: 'अलामत', bana: 'बना', bani: 'बनी',
  rozana: 'रोज़ाना', roz: 'रोज़', khuraak: 'ख़ुराक', khurak: 'ख़ुराक', masoom: 'मासूम', shikaar: 'शिकार', shikar: 'शिकार',
  karta: 'करता', karti: 'करती', karte: 'करते', kiya: 'किया', kar: 'कर', करके: 'करके', karke: 'करके', karne: 'करने',
  din: 'दिन', raat: 'रात', subah: 'सुबह', shaam: 'शाम', waqt: 'वक़्त', dair: 'देर', der: 'देर',
  mil: 'मिल', mila: 'मिला', mili: 'मिली', mile: 'मिले', eham: 'अहम', muahida: 'मुआहिदा', faisla: 'फ़ैसला',
  taye: 'तय', tay: 'तय', khud: 'ख़ुद', chala: 'चला', chali: 'चली', chale: 'चले', chal: 'चल', para: 'पड़ा', pari: 'पड़ी',
  jaye: 'जाए', jaaye: 'जाए', ga: 'गा', gi: 'गी', ge: 'गे', gaya: 'गया', gayi: 'गयी', gaye: 'गये',
  samajhdar: 'समझदार', aqalmand: 'अक़्लमंद', aqalmandi: 'अक़्लमंदी', khargosh: 'ख़रगोश', hiran: 'हिरन', parinda: 'परिंदा', parinde: 'परिंदे',
  baari: 'बारी', bari_turn: 'बारी', aayi: 'आयी', aaya: 'आया', aaye: 'आये', jaan: 'जान', bachane: 'बचाने', bacha: 'बचा', li: 'ली', liya: 'लिया',
  tarkeeb: 'तरकीब', sochi: 'सोची', socha: 'सोचा', janbujh: 'जानबूझ', pohncha: 'पहुँचा', pahuncha: 'पहुँचा',
  jis: 'जिस', gusse: 'ग़ुस्से', gussa: 'ग़ुस्सा', kaha: 'कहा', bola: 'बोला', boli: 'बोली', raste: 'रास्ते', rasta: 'रास्ता',
  aur_ek: 'और', rok: 'रोक', marne: 'मारने', mar: 'मर', maar: 'मार', gehre: 'गहरे', gehra: 'गहरा',
  kuein: 'कुएँ', kuan: 'कुआँ', kuen: 'कुएँ', le: 'ले', jaise: 'जैसे', jhank: 'झाँक', dekha: 'देखा', dekhi: 'देखी', dekhein: 'देखें',
  pani: 'पानी', paani: 'पानी', saya: 'साया', saye: 'साये', nazar: 'नज़र', samjha: 'समझा', samjhi: 'समझी',
  hamla: 'हमला', chalaang: 'छलांग', chalang: 'छलांग', laga: 'लगा', lagayi: 'लगायी', di: 'दी', diya: 'दिया',
  girte: 'गिरते', gira: 'गिरा', doob: 'डूब', sabaq: 'सबक़', kahani: 'कहानी', duniya: 'दुनिया', zindagi: 'ज़िंदगी',
  kamyabi: 'कामयाबी', mehnat: 'मेहनत', hosla: 'हौसला', sabr: 'सब्र', shukar: 'शुक्र', dua: 'दुआ', allah: 'अल्लाह',
  khuda: 'ख़ुदा', masjid: 'मस्जिद', noor: 'नूर', chand: 'चाँद', sitare: 'सितारे', aasman: 'आसमान', samandar: 'समंदर',
  kashti: 'कश्ती', toofan: 'तूफ़ान', barish: 'बारिश', bijli: 'बिजली', gaon: 'गाँव', kisan: 'किसान', ghar: 'घर',
  maa: 'माँ', baap: 'बाप', walid: 'वालिद', beta: 'बेटा', beti: 'बेटी', bacha_child: 'बच्चा', buzurg: 'बुज़ुर्ग',
  badshah: 'बादशाह', mahal: 'महल', saltanat: 'सल्तनत', musafir: 'मुसाफ़िर', safar: 'सफ़र', pahar: 'पहाड़',
  khazana: 'ख़ज़ाना', roshni: 'रोशनी', andhera: 'अंधेरा', sach: 'सच', jhoot: 'झूठ', insaan: 'इंसान', dost: 'दोस्त', dosto: 'दोस्तो',
  nahi: 'नहीं', nahin: 'नहीं', mat: 'मत', zaroor: 'ज़रूर', bilkul: 'बिलकुल', shandar: 'शानदार', behtareen: 'बेहतरीन',
};

const ROMAN_URDU_MARKERS = new Set([
  'hai', 'hain', 'tha', 'thi', 'the', 'ka', 'ki', 'ke', 'ko', 'se', 'mein', 'par', 'ne',
  'aur', 'ek', 'wo', 'woh', 'ye', 'yeh', 'us', 'is', 'sab', 'bohat', 'bahut', 'bara',
  'nahi', 'nahin', 'kya', 'kaise', 'kyun', 'aap', 'hum', 'apna', 'apni', 'apne', 'kahani',
  'jangal', 'sher', 'khargosh', 'janwar', 'gaya', 'kaha', 'bola', 'dekha', 'zindagi', 'duniya',
]);

const KEEP_ENGLISH_WORDS = new Set([
  'ai', 'video', 'videos', 'voice', 'voices', 'studio', 'youtube', 'shorts', 'reels',
  'tiktok', 'instagram', 'facebook', 'whatsapp', 'app', 'application', 'online', 'digital',
  'channel', 'subscribe', 'like', 'share', 'comment', 'hd', 'mp4', 'mp3', 'pro', 'smart',
  'code', 'github', 'laptop', 'mobile', 'computer', 'internet', 'podcast', 'technology', 'future',
]);

// High-frequency unvocalized Urdu words -> exact Devanagari phonetic equivalent so short vowels are 100% accurate
const URDU_WORD_LEXICON = {
  'ایک': 'एक', 'دفعہ': 'दफ़ा', 'کا': 'का', 'کی': 'की', 'کے': 'के', 'کو': 'को', 'ذکر': 'ज़िक्र',
  'ہے': 'है', 'ہیں': 'हैं', 'تھا': 'था', 'تھی': 'थी', 'تھے': 'थे', 'کہ': 'के', 'جنگل': 'जंगल',
  'میں': 'में', 'بہت': 'बोहत', 'بڑا': 'बड़ा', 'بڑے': 'बड़े', 'بڑی': 'बड़ी', 'شیر': 'शेर',
  'رہتا': 'रहता', 'رہتی': 'रहتی', 'رہتے': 'रहते', 'وہ': 'वो', 'یہ': 'ये', 'تمام': 'तमाम',
  'جانور': 'जानवर', 'جانوروں': 'जानवरों', 'لیے': 'लिये', 'لئے': 'लिये', 'خوف': 'ख़ौफ़',
  'علامت': 'अलामत', 'بنا': 'बना', 'ہوا': 'हुआ', 'ہوئی': 'हुई', 'روزانہ': 'रोज़ाना', 'اپنی': 'अपनी',
  'اپنا': 'अपना', 'اپنے': 'अपने', 'خوراک': 'ख़ुराक', 'کئی': 'कई', 'معصوم': 'मासूम', 'شکار': 'शिकार',
  'کرتا': 'करता', 'کرتی': 'करती', 'کرتے': 'करते', 'کیا': 'किया', 'دن': 'दिन', 'رات': 'रात',
  'سب': 'सब', 'مل': 'मिल', 'کر': 'कर', 'سے': 'से', 'اہم': 'अहम', 'معاہدہ': 'मुआहिदा',
  'کرنے': 'करने', 'فیصلہ': 'फ़ैसला', 'انہوں': 'उन्होंने', 'نے': 'ने', 'طے': 'तय', 'خود': 'ख़ुद',
  'پاس': 'पास', 'چلا': 'चला', 'جائے': 'जाए', 'گا': 'गा', 'گی': 'गी', 'گے': 'गे', 'سمجھدار': 'समझदार',
  'خرگوش': 'ख़रगोश', 'باری': 'बारी', 'آئی': 'आयी', 'آیا': 'आया', 'اس': 'उस', 'جان': 'जान',
  'بچانے': 'बचाने', 'ترکیب': 'तरकीब', 'سوچی': 'सोची', 'دیر': 'देर', 'پہنچا': 'पहुँचा', 'جس': 'जिस',
  'پر': 'पर', 'غصے': 'ग़ुस्से', 'کہا': 'कहा', 'راستے': 'रास्ते', 'اور': 'और', 'ملا': 'मिला',
  'روک': 'रोک', 'لیا': 'लिया', 'ساتھ': 'साथ', 'دوسرے': 'दूसरे', 'مارنے': 'मारने', 'چل': 'चल',
  'پڑا': 'پड़ा', 'گہرے': 'गहरे', 'کنویں': 'कुएँ', 'لے': 'ले', 'گیا': 'गया', 'بولا': 'बोला',
  'اندر': 'अंदर', 'جیسے': 'जैसे', 'ہی': 'ही', 'جھانک': 'झाँक', 'دیکھا': 'देखा', 'تو': 'तो',
  'پانی': 'पानी', 'سایہ': 'साया', 'نظر': 'नज़र', 'سمجھا': 'समझा', 'حملہ': 'हमला', 'چھلانگ': 'छलांग',
  'لگا': 'लगा', 'دی': 'दी', 'گرتے': 'गिरते', 'ڈوب': 'डूब', 'مر': 'मर', 'عقلمندی': 'अक़्लमंदी',
  'بچا': 'बचा', 'لی': 'ली', 'کہانی': 'कहानी', 'زندگی': 'ज़िंदगी', 'دنیا': 'दुनिया', 'کامیابی': 'कामयाबी',
  'محنت': 'मेहनत', 'اللہ': 'अल्लाह', 'مسجد': 'मस्जिद', 'نور': 'नूर', 'گاؤں': 'गाँव', 'کسان': 'किसान',
  'ماں': 'माँ', 'باپ': 'बाप', 'بادشاہ': 'बादशाह', 'محل': 'महल', 'مسافر': 'मुसाफ़िर', 'سفر': 'सफ़र',
  'طوفان': 'तूफ़ान', 'بارش': 'बारिश', 'سمندر': 'समंदर', 'پہاڑ': 'पहाड़', 'انسان': 'इंसान', 'دوست': 'दोस्त',
  'نہیں': 'नहीं', 'ہم': 'हम', 'آپ': 'आप', 'تم': 'तुम', 'میرا': 'मेरा', 'میری': 'मेरी',
};

function stripMarkdownForSpeech(text = '') {
  return String(text || '')
    .replace(/^\s*\d+[.)]\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectLanguage(text = '', requestedLang = 'auto') {
  if (requestedLang && requestedLang !== 'auto') return requestedLang;
  if (/[\u0600-\u06FF]/.test(text)) return 'ur';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  const words = (text.toLowerCase().match(/[a-z]+/g) || []);
  if (words.length > 0) {
    let hits = 0;
    for (const w of words) {
      if (ROMAN_URDU_MARKERS.has(w)) hits++;
    }
    if (hits >= 2 || (words.length <= 6 && hits >= 1) || hits / words.length >= 0.14) {
      return 'roman-urdu';
    }
  }
  return 'en-us';
}

// Rule-based Roman-Urdu word -> IPA fallback for any unseen Roman-Urdu word
function romanUrduWordToIpa(rawWord) {
  const w = rawWord.toLowerCase();
  const tokens = [];
  let i = 0;
  const rules = [
    ['chh', 'ʧʰ'], ['kh', 'kʰ'], ['gh', 'ɡh'], ['ch', 'ʧ'], ['sh', 'ʃ'],
    ['jh', 'ʤh'], ['ph', 'pʰ'], ['bh', 'bh'], ['th', 'tʰ'], ['dh', 'dh'],
    ['zh', 'ʒ'], ['ng', 'ŋɡ'],
    ['aa', 'ɑː'], ['ee', 'iː'], ['oo', 'uː'], ['ai', 'ɛː'], ['ay', 'eː'],
    ['ei', 'eː'], ['au', 'ɔː'], ['ou', 'oː'], ['oa', 'oː'],
  ];
  const singleMap = {
    a: 'ə', b: 'b', c: 'k', d: 'd', e: 'eː', f: 'f', g: 'ɡ', h: 'h',
    i: 'ɪ', j: 'ʤ', k: 'k', l: 'l', m: 'm', n: 'n', o: 'oː', p: 'p',
    q: 'q', r: 'ɾ', s: 's', t: 't', u: 'ʊ', v: 'ʋ', w: 'ʋ', x: 'ks',
    y: 'j', z: 'z',
  };
  while (i < w.length) {
    let matched = false;
    for (const [pat, ipa] of rules) {
      if (w.startsWith(pat, i)) {
        tokens.push(ipa);
        i += pat.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const ch = w[i];
      if (ch === 'a' && i === w.length - 1 && w.length > 2) {
        tokens.push('ɑː');
      } else if (ch === 'i' && i === w.length - 1) {
        tokens.push('iː');
      } else {
        tokens.push(singleMap[ch] || '');
      }
      i++;
    }
  }
  const joined = tokens.join('');
  return joined ? addPrimaryStress(joined) : w;
}

// Full Devanagari word -> Kokoro IPA transducer with Nukta + Schwa Deletion + Nasalization + Primary Stress
const DEV_CONSONANTS = {
  'क': 'k', 'ख': 'kʰ', 'ग': 'ɡ', 'घ': 'ɡh', 'ङ': 'ŋ',
  'च': 'ʧ', 'छ': 'ʧʰ', 'ज': 'ʤ', 'झ': 'ʤh', 'ञ': 'ɲ',
  'ट': 'ʈ', 'ठ': 'ʈʰ', 'ड': 'ɖ', 'ढ': 'ɖh', 'ण': 'ɳ',
  'त': 't', 'थ': 'tʰ', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'pʰ', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'j', 'र': 'ɾ', 'ल': 'l', 'व': 'ʋ',
  'श': 'ʃ', 'ष': 'ʃ', 'स': 's', 'ह': 'h',
  'क़': 'q', 'ख़': 'x', 'ग़': 'ɣ', 'ज़': 'z', 'ड़': 'ɽ', 'ढ़': 'ɽh', 'फ़': 'f',
};

const DEV_INDEP_VOWELS = {
  'अ': 'ə', 'आ': 'ɑː', 'इ': 'ɪ', 'ई': 'iː', 'उ': 'ʊ', 'ऊ': 'uː',
  'ऋ': 'ɾɪ', 'ए': 'eː', 'ऐ': 'ɛː', 'ओ': 'oː', 'औ': 'ɔː', 'ऑ': 'ɔː',
};

const DEV_MATRAS = {
  'ा': 'ɑː', 'ि': 'ɪ', 'ी': 'iː', 'ु': 'ʊ', 'ू': 'uː',
  'ृ': 'ɾɪ', 'े': 'eː', 'ै': 'ɛː', 'ो': 'oː', 'ौ': 'ɔː', 'ॉ': 'ɔː',
};

function addPrimaryStress(ipaWord) {
  if (!ipaWord || ipaWord.includes('ˈ')) return ipaWord;
  // Place stress right before the first syllable nucleus (or second syllable if long vowel later)
  const longMatch = ipaWord.match(/[ɑiueoɛɔ]ː/);
  let targetIdx = 0;
  if (longMatch && longMatch.index > 0) {
    // Walk back 1 consonant onset before that long vowel
    let k = longMatch.index;
    while (k > 0 && !/[əɑɪiʊueɛoɔ]/.test(ipaWord[k - 1]) && ipaWord[k - 1] !== 'ː' && ipaWord[k - 1] !== '\u0303') {
      k--;
      if (k > 0 && ipaWord[k] === 'ʰ') continue;
      break;
    }
    targetIdx = k;
  }
  return ipaWord.slice(0, targetIdx) + 'ˈ' + ipaWord.slice(targetIdx);
}

function devanagariWordToIpa(word) {
  // Normalize precomposed nukta chars to base + \u093C so lookup is uniform
  const norm = word.normalize('NFC');
  const units = [];
  let i = 0;
  while (i < norm.length) {
    const ch = norm[i];
    const next = norm[i + 1];
    if (next === '़') {
      const comb = ch + next;
      const cIpa = DEV_CONSONANTS[comb] || DEV_CONSONANTS[ch] || '';
      i += 2;
      const after = norm[i];
      if (after === '्') {
        units.push({ type: 'C', ipa: cIpa });
        i++;
      } else if (after && DEV_MATRAS[after]) {
        units.push({ type: 'CV', c: cIpa, v: DEV_MATRAS[after], inherent: false });
        i++;
      } else {
        units.push({ type: 'CV', c: cIpa, v: 'ə', inherent: true });
      }
      continue;
    }
    if (DEV_CONSONANTS[ch]) {
      const cIpa = DEV_CONSONANTS[ch];
      i++;
      const after = norm[i];
      if (after === '्') {
        units.push({ type: 'C', ipa: cIpa });
        i++;
      } else if (after && DEV_MATRAS[after]) {
        units.push({ type: 'CV', c: cIpa, v: DEV_MATRAS[after], inherent: false });
        i++;
      } else {
        units.push({ type: 'CV', c: cIpa, v: 'ə', inherent: true });
      }
      continue;
    }
    if (DEV_INDEP_VOWELS[ch]) {
      units.push({ type: 'V', v: DEV_INDEP_VOWELS[ch] });
      i++;
      continue;
    }
    if (ch === 'ं' || ch === 'ँ') {
      const prev = units[units.length - 1];
      const nextCh = norm[i + 1];
      if (ch === 'ँ' || !nextCh) {
        if (prev && prev.v) prev.v += '\u0303';
        else units.push({ type: 'C', ipa: 'n' });
      } else if ('कखगघ'.includes(nextCh)) {
        units.push({ type: 'C', ipa: 'ŋ' });
      } else if ('पफबभम'.includes(nextCh)) {
        units.push({ type: 'C', ipa: 'm' });
      } else {
        units.push({ type: 'C', ipa: 'n' });
      }
      i++;
      continue;
    }
    if (ch === 'ः') {
      units.push({ type: 'C', ipa: 'h' });
      i++;
      continue;
    }
    i++;
  }

  // Indo-Aryan schwa deletion: drop word-final inherent 'ə' on multi-unit words
  if (units.length >= 2) {
    const last = units[units.length - 1];
    const prev = units[units.length - 2];
    if (last.type === 'CV' && last.inherent && prev.type !== 'C') {
      last.v = '';
    }
  }
  // Medial schwa syncope: in VC + Cə + CV sequences, drop unstressed medial inherent 'ə'
  for (let u = 1; u < units.length - 1; u++) {
    const cur = units[u];
    const prev = units[u - 1];
    const nxt = units[u + 1];
    if (
      cur.type === 'CV' &&
      cur.inherent &&
      cur.v === 'ə' &&
      (prev.type === 'V' || (prev.type === 'CV' && prev.v !== '')) &&
      nxt.type === 'CV' &&
      nxt.v !== ''
    ) {
      cur.v = '';
    }
  }

  const raw = units
    .map((u) => {
      if (u.type === 'C') return u.ipa;
      if (u.type === 'V') return u.v;
      return u.c + u.v;
    })
    .join('');

  return addPrimaryStress(raw);
}

// Pure Urdu / Arabic fallback letter-to-IPA transducer for unseen words
const ARABIC_URDU_MAP = {
  'آ': 'ɑː', 'ا': 'ɑː', 'أ': 'ə', 'إ': 'ɪ', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ٹ': 'ʈ',
  'ث': 's', 'ج': 'ʤ', 'چ': 'ʧ', 'ح': 'h', 'خ': 'x', 'د': 'd', 'ڈ': 'ɖ', 'ذ': 'z',
  'ر': 'ɾ', 'ڑ': 'ɽ', 'ز': 'z', 'ژ': 'ʒ', 'स': 's', 'س': 's', 'ش': 'ʃ', 'ص': 's',
  'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'ə', 'غ': 'ɣ', 'ف': 'f', 'ق': 'q', 'ک': 'k',
  'ك': 'k', 'گ': 'ɡ', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ں': '\u0303', 'و': 'oː', 'ؤ': 'oː',
  'ہ': 'h', 'ه': 'h', 'ھ': 'ʰ', 'ۃ': 'ɑː', 'ء': '', 'ی': 'iː', 'ي': 'iː', 'ے': 'eː',
  'ئ': 'ɛː', 'َ': 'ə', 'ِ': 'ɪ', 'ُ': 'ʊ', 'ً': 'ən', 'ٍ': 'ɪn', 'ٌ': 'ʊn', 'ْ': '', 'ّ': '',
};

function urduArabicWordToIpa(word) {
  const clean = word.trim();
  if (URDU_WORD_LEXICON[clean]) {
    return devanagariWordToIpa(URDU_WORD_LEXICON[clean]);
  }
  const out = [];
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const mapped = ARABIC_URDU_MAP[ch];
    if (mapped !== undefined) {
      // Insert epenthetic schwa between 2 consecutive stops/fricatives when unvocalized
      const prev = out[out.length - 1] || '';
      const isCons = mapped && !/[ɑiueoɛɔəɪʊ\u0303ʰ]/.test(mapped);
      const prevCons = prev && !/[ɑiueoɛɔəɪʊ\u0303]/.test(prev);
      if (isCons && prevCons && out.length >= 2) {
        out.push('ə');
      }
      out.push(mapped);
    }
  }
  return addPrimaryStress(out.join(''));
}

// Romance (Spanish / French) clean G2P for non-English Latin options
function spanishWordToIpa(word) {
  let w = word.toLowerCase();
  w = w
    .replace(/ch/g, 'ʧ')
    .replace(/ll/g, 'ʝ')
    .replace(/ñ/g, 'ɲ')
    .replace(/qu([ei])/g, 'k$1')
    .replace(/gu([ei])/g, 'ɡ$1')
    .replace(/c([ei])/g, 's$1')
    .replace(/g([ei])/g, 'x$1')
    .replace(/rr/g, 'r')
    .replace(/r/g, 'ɾ')
    .replace(/j/g, 'x')
    .replace(/v/g, 'β')
    .replace(/z/g, 's')
    .replace(/h/g, '')
    .replace(/á/g, 'ˈa')
    .replace(/é/g, 'ˈe')
    .replace(/í/g, 'ˈi')
    .replace(/ó/g, 'ˈo')
    .replace(/ú/g, 'ˈu')
    .replace(/c/g, 'k');
  return addPrimaryStress(w);
}

let cachedPhonemizer = null;
async function getEnglishPhonemizer() {
  if (!cachedPhonemizer) {
    const mod = await import('phonemizer');
    cachedPhonemizer = mod.phonemize;
  }
  return cachedPhonemizer;
}

function cleanEnglishKokoroIpa(ipa, british = false) {
  let processed = ipa
    .replace(/kəkˈoːɹoʊ/g, 'kˈoʊkəɹoʊ')
    .replace(/kəkˈɔːɹəʊ/g, 'kˈəʊkəɹəʊ')
    .replace(/ʲ/g, 'j')
    .replace(/r/g, 'ɹ')
    .replace(/ɬ/g, 'l')
    .replace(/ z(?=[;:,.!?—…"“” ]|$)/g, 'z');
  if (!british) {
    processed = processed.replace(/(?<=nˈaɪn)ti(?!ː)/g, 'di');
  }
  return processed.trim();
}

async function englishWordsToIpa(text, british = false) {
  const espeakng = await getEnglishPhonemizer();
  const locale = british ? 'en-gb' : 'en-us';
  const punctSplit = text.split(/([;:,.!?—…"“”()]+)/g).filter(Boolean);
  const parts = [];
  for (const seg of punctSplit) {
    if (/^[;:,.!?—…"“”()]+$/.test(seg)) {
      parts.push(seg);
    } else if (seg.trim()) {
      const res = await espeakng(seg, locale);
      parts.push(cleanEnglishKokoroIpa(res.join(' '), british));
    }
  }
  return parts.join(' ').replace(/\s+([;:,.!?])/g, '$1').replace(/\s+/g, ' ').trim();
}

async function textToKokoroPhonemes(rawText, requestedLang = 'auto', voiceId = 'af_heart') {
  let cleaned = stripMarkdownForSpeech(rawText)
    .replace(/[۔।]/g, '.')
    .replace(/،/g, ',')
    .replace(/؟/g, '?');

  const detectedLang = detectLanguage(cleaned, requestedLang);
  const british = detectedLang === 'en-gb' || voiceId.startsWith('b');

  if (detectedLang === 'en-us' || detectedLang === 'en-gb') {
    const phonemes = await englishWordsToIpa(cleaned, british);
    return { phonemes, detectedLang };
  }

  // Apply multi-word Roman-Urdu idiomatic phrase rules first when Roman-Urdu
  let working = cleaned;
  if (detectedLang === 'roman-urdu') {
    for (const [rx, repl] of ROMAN_URDU_PHRASES) {
      working = working.replace(rx, repl);
    }
  }

  // Tokenize preserving punctuation boundaries so Kokoro pauses naturally at commas/periods!
  const tokens = working.match(/[\u0900-\u097F]+|[\u0600-\u06FF]+|[A-Za-zÀ-ÿ0-9']+|[,.;:!?—…]+/g) || [];
  const ipaOut = [];

  for (const tok of tokens) {
    if (/^[,.;:!?—…]+$/.test(tok)) {
      ipaOut.push(tok);
      continue;
    }
    if (/[\u0900-\u097F]/.test(tok)) {
      ipaOut.push(devanagariWordToIpa(tok));
      continue;
    }
    if (/[\u0600-\u06FF]/.test(tok)) {
      ipaOut.push(urduArabicWordToIpa(tok));
      continue;
    }
    if (detectedLang === 'es' || detectedLang === 'fr') {
      ipaOut.push(spanishWordToIpa(tok));
      continue;
    }
    // Roman-Urdu token (or embedded English tech word / number)
    const low = tok.toLowerCase();
    if (ROMAN_URDU_LEXICON[low]) {
      ipaOut.push(devanagariWordToIpa(ROMAN_URDU_LEXICON[low]));
    } else if (KEEP_ENGLISH_WORDS.has(low) || /^\d+$/.test(tok)) {
      ipaOut.push(await englishWordsToIpa(tok, false));
    } else {
      ipaOut.push(romanUrduWordToIpa(tok));
    }
  }

  const phonemes = ipaOut
    .join(' ')
    .replace(/\s+([,.;:!?—…])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return { phonemes, detectedLang };
}

module.exports = {
  stripMarkdownForSpeech,
  detectLanguage,
  textToKokoroPhonemes,
};
