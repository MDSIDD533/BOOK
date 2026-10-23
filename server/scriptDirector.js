/**
 * Smart Multilingual AI Script & Storyboard Director
 * Generates complete 2–6 scene video scripts + rich visual prompts + camera motion
 * in Roman Urdu, Native Urdu (اردو), English, or Hindi (हिंदी) — zero API key required,
 * with optional external OpenAI-compatible API upgrade when configured.
 */

const CAMERA_MOTIONS = ['zoom_in', 'pan_right', 'zoom_out', 'pan_left', 'drift_up'];

const ARCHETYPES = [
  { id: 'cosmos', keywords: ['space', 'universe', 'galaxy', 'star', 'planet', 'moon', 'asman', 'sitare', 'cosmos', 'future', 'science', 'خلا', 'ستارے'] },
  { id: 'cyber_city', keywords: ['ai', 'tech', 'code', 'robot', 'cyber', 'digital', 'app', 'application', 'software', 'startup', 'mobile', 'computer', 'smart', 'modern'] },
  { id: 'golden_mountains', keywords: ['success', 'motivation', 'kamyabi', 'mehnat', 'himmat', 'hosla', 'mountain', 'pahar', 'safar', 'manzil', 'dream', 'khwab', 'sapne', 'win', 'rise', 'کامیابی', 'محنت'] },
  { id: 'mosque_spiritual', keywords: ['islam', 'allah', 'namaz', 'sabr', 'shukar', 'dua', 'ramadan', 'eid', 'quran', 'noor', 'peace', 'spiritual', 'madina', 'makkah', 'صبر', 'شکر', 'اللہ', 'نور'] },
  { id: 'ocean_sunset', keywords: ['ocean', 'sea', 'beach', 'water', 'samandar', 'calm', 'relax', 'love', 'mohabbat', 'dil', 'poetry', 'shayari', 'travel', 'karachi', 'seaview'] },
  { id: 'enchanted_forest', keywords: ['nature', 'forest', 'tree', 'green', 'earth', 'health', 'life', 'zindagi', 'morning', 'subah', 'fresh', 'garden', 'animal'] },
  { id: 'luxury_spotlight', keywords: ['product', 'brand', 'business', 'karobar', 'paisa', 'money', 'wealth', 'shop', 'fashion', 'watch', 'coffee', 'food', 'promo', 'ad', 'sale', 'launch'] },
  { id: 'rainy_midnight', keywords: ['mystery', 'night', 'raat', 'story', 'kahani', 'horror', 'dark', 'secret', 'raaz', 'rain', 'barish', 'detective', 'history'] },
];

function detectSceneArchetype(text, fallbackIdx = 0) {
  const low = (text || '').toLowerCase();
  let best = null;
  let bestHits = 0;
  for (const arch of ARCHETYPES) {
    const hits = arch.keywords.filter((k) => low.includes(k)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = arch.id;
    }
  }
  if (best) return best;
  const order = ['golden_mountains', 'cyber_city', 'cosmos', 'ocean_sunset', 'luxury_spotlight', 'enchanted_forest'];
  return order[fallbackIdx % order.length];
}

function cleanTopicSubject(prompt) {
  const cleaned = (prompt || 'AI Technology & Future')
    .replace(/^(make|create|generate|write|build)\s+(a\s+|an\s+)?(short\s+)?(video|reel|shorts|script)\s+(about|on|for)\s+/i, '')
    .replace(/\s+(ke\s+bare\s+mein|par\s+video|ki\s+video|bana\s*do|banaye|in\s+roman\s+urdu|in\s+urdu|in\s+english|in\s+hindi)\s*$/i, '')
    .trim();
  return cleaned.slice(0, 70) || 'Shandar Kamyabi';
}

function generateLocalStoryboard({
  prompt = '',
  language = 'roman-urdu',
  sceneCount = 4,
  tone = 'cinematic',
  visualStyle = 'cinematic',
}) {
  const count = Math.max(2, Math.min(6, Number(sceneCount) || 4));
  const raw = (prompt || '').trim();
  const low = raw.toLowerCase();

  // Auto-infer language if set to auto
  let lang = language;
  if (!lang || lang === 'auto') {
    if (/[\u0600-\u06FF]/.test(raw)) lang = 'ur';
    else if (/[\u0900-\u097F]/.test(raw)) lang = 'hi';
    else if (/\b(hai|hain|kya|aur|kamyabi|zindagi|dosto|kahani|mehnat|aawaz|banaye|karachi|safar)\b/i.test(raw)) lang = 'roman-urdu';
    else lang = 'en-us';
  }

  const subject = cleanTopicSubject(raw);
  const baseArch = detectSceneArchetype(raw, 0);

  // Curated rich domain templates + custom dynamic subject weaving!
  let templates;

  if (lang === 'roman-urdu') {
    if (/kamyabi|mehnat|motivation|himmat|khwab|success|manzil/.test(low)) {
      templates = [
        {
          headline: 'Bade Khwab Ki Shuruaat',
          narration: `Assalam o Alaikum dosto! Har badi kamyabi ki shuruaat ek chote magar pakke irade se hoti hai.`,
          visualPrompt: `Epic golden sunrise breaking over dramatic misty mountain peaks, lone climber silhouette looking at horizon, ${visualStyle}, ultra detailed 8k`,
          archetype: 'golden_mountains',
        },
        {
          headline: 'Mehnat Aur Hausla',
          narration: `Jab rasta mushkil lage aur log kahein ke yeh mumkin nahi, tab aapki roz ki mehnat hi aapki sabse badi taqat banti hai.`,
          visualPrompt: `Dramatic storm clouds parting with warm sunbeams illuminating a winding path upward, glowing golden particles, ${visualStyle}`,
          archetype: 'rainy_midnight',
        },
        {
          headline: 'Nayi Manzil Ki Raftar',
          narration: `Waqt kabhi kisi ka intezar nahi karta, is liye aaj uthein aur apne khwabon ko haqeeqat banana shuru karein.`,
          visualPrompt: `Futuristic glowing skyline at twilight with warm amber lights reflecting on water, inspiring atmosphere, ${visualStyle}`,
          archetype: 'cyber_city',
        },
        {
          headline: 'Aapka Waqt Aa Gaya Hai',
          narration: `Yaad rakhein, aapki manzil aapke yaqeen se zyada door nahi! Video pasand aaye toh like aur share zaroor karein.`,
          visualPrompt: `Triumphant summit view above golden clouds at sunset with radiant light rays and starry sky, ${visualStyle}`,
          archetype: 'cosmos',
        },
        {
          headline: 'Har Qadam Aage',
          narration: `Rozana sirf ek qadam behtar banein, aur dekhte hi dekhte poori duniya aapki kahani sunegi.`,
          visualPrompt: ` tranquil ocean horizon glowing with golden sunset waves and warm bokeh light, ${visualStyle}`,
          archetype: 'ocean_sunset',
        },
        {
          headline: 'NoorStudio AI Ke Saath',
          narration: `Apni aawaz aur apni kahani ko duniya tak pohanchayein, kyunke aaj ka din aapka hai!`,
          visualPrompt: `Luxury golden spotlight stage with floating light dust and dramatic cinema lens flare, ${visualStyle}`,
          archetype: 'luxury_spotlight',
        },
      ];
    } else if (/islam|sabr|shukar|allah|dua|noor|ramadan/.test(low)) {
      templates = [
        {
          headline: 'Dil Ka Sukoon Aur Noor',
          narration: `Bismillah ir-Rahman ir-Raheem. Zindagi ki har aazmaish ke peeche Allah ki behtareen hikmat chupi hoti hai.`,
          visualPrompt: `Majestic grand mosque domes and minarets glowing softly under a crescent moon and starry night sky, warm lantern light, ${visualStyle}`,
          archetype: 'mosque_spiritual',
        },
        {
          headline: 'Sabr Ki Khoobsurat Taqat',
          narration: `Jab insaan mushkil waqt mein sabr aur dua ka daman thamta hai, toh band darwaze bhi khud khulne lagte hain.`,
          visualPrompt: `Golden sunlight streaming through ornate geometric arches onto calm reflecting courtyard water, peaceful atmosphere, ${visualStyle}`,
          archetype: 'golden_mountains',
        },
        {
          headline: 'Har Nemat Par Shukar',
          narration: `Har nayi subah ek nayi umeed aur nayi rehmat lekar aati hai, bas dil se Alhamdulillah kahein.`,
          visualPrompt: `Serene desert dunes under dawn rose-gold sky with soft glowing mist and warm rays, ${visualStyle}`,
          archetype: 'ocean_sunset',
        },
        {
          headline: 'Roshni Phailayein',
          narration: `Allah hum sab ki zindagi mein sukoon, barkat aur aasani ata farmaye. Is paigham ko doston ke saath zaroor share karein.`,
          visualPrompt: `Luminous starry night sky over peaceful horizon with warm golden lanterns floating gently, ${visualStyle}`,
          archetype: 'cosmos',
        },
      ];
    } else {
      templates = [
        {
          headline: subject.slice(0, 34),
          narration: `Assalam o Alaikum dosto! Aaj ki is shandar video mein hum ${subject} ki dilchasp duniya ko kareeb se dekhenge.`,
          visualPrompt: `Cinematic wide establishing shot representing ${subject}, dramatic volumetric lighting, rich colors, ${visualStyle}, 8k`,
          archetype: baseArch,
        },
        {
          headline: 'Khaas Haqeeqat Aur Raaz',
          narration: `${subject} ke bare mein aisi bahut si anokhi baatein hain jo hamari soch aur mustaqbil dono ko naya rang deti hain.`,
          visualPrompt: `Detailed close atmospheric scene illustrating ${subject}, glowing bokeh highlights, depth of field, ${visualStyle}`,
          archetype: detectSceneArchetype(raw, 1),
        },
        {
          headline: 'Naya Daur Aur Badlaav',
          narration: `Aaj ke tezi se badalte waqt mein ${subject} har insaan ki zindagi ko behtar aur aasaan bana raha hai.`,
          visualPrompt: `Dynamic wide angle perspective of ${subject} with dramatic horizon light rays and motion energy, ${visualStyle}`,
          archetype: detectSceneArchetype(raw, 2),
        },
        {
          headline: 'Aage Ka Shandar Safar',
          narration: `Umeed hai aapko ${subject} par yeh video bahut pasand aayi hogi! Mazeed shandar videos ke liye channel subscribe karein.`,
          visualPrompt: `Grand finale panoramic view inspired by ${subject}, golden twilight glow and sparkling atmosphere, ${visualStyle}`,
          archetype: detectSceneArchetype(raw, 3),
        },
        {
          headline: 'Nayi Soch Ki Udaan',
          narration: `Har naya tajurba humein seekhne aur aage barhne ka behtareen mauqa deta hai.`,
          visualPrompt: `Luminous sky over serene mountains and water reflections inspired by ${subject}, ${visualStyle}`,
          archetype: 'golden_mountains',
        },
        {
          headline: 'Shukriya Dosto!',
          narration: `Apni raye comments mein zaroor batayein, milte hain agli kamaal video mein!`,
          visualPrompt: `Warm studio spotlight finale with subtle golden sparkles, ${visualStyle}`,
          archetype: 'luxury_spotlight',
        },
      ];
    }
  } else if (lang === 'ur') {
    templates = [
      {
        headline: subject.slice(0, 36),
        narration: `السلام علیکم دوستو! آج کی اس شاندار ویڈیو میں ہم ${subject} کے بارے میں انتہائی دلچسپ حقائق جانیں گے۔`,
        visualPrompt: `Cinematic atmospheric wide shot of ${subject}, dramatic golden hour rays, ${visualStyle}`,
        archetype: baseArch,
      },
      {
        headline: 'حیرت انگیز پہلو اور حقیقت',
        narration: `وقت کے ساتھ ساتھ یہ موضوع ہماری زندگی اور مستقبل میں ایک نیا انقلاب لے کر آ رہا ہے۔`,
        visualPrompt: `Rich detailed visual storytelling scene for ${subject}, glowing lights and depth, ${visualStyle}`,
        archetype: detectSceneArchetype(raw, 1),
      },
      {
        headline: 'کامیابی اور نیا سفر',
        narration: `جو لوگ نئی سوچ اور محنت کے ساتھ آگے بڑھتے ہیں، دنیا ان کے قدم چومتی ہے۔`,
        visualPrompt: `Epic mountain horizon above clouds with golden sunbeams, ${visualStyle}`,
        archetype: 'golden_mountains',
      },
      {
        headline: 'پسند آئے تو شیئر کریں',
        narration: `امید ہے آج کی یہ ویڈیو آپ کو بے حد پسند آئی ہوگی۔ مزید ویڈیوز کے لیے ہمارے ساتھ جڑے رہیے!`,
        visualPrompt: `Starry twilight panorama over serene glowing water horizon, ${visualStyle}`,
        archetype: 'cosmos',
      },
    ];
  } else if (lang === 'hi') {
    templates = [
      {
        headline: subject.slice(0, 36),
        narration: `नमस्ते दोस्तों! आज की इस शानदार वीडियो में हम ${subject} की अनोखी दुनिया के बारे में जानेंगे।`,
        visualPrompt: `Cinematic wide shot illustrating ${subject}, warm dramatic lighting, ${visualStyle}`,
        archetype: baseArch,
      },
      {
        headline: 'खास राज़ और नई सोच',
        narration: `${subject} से जुड़ी ऐसी कई बातें हैं जो हमारे आने वाले कल को पूरी तरह बदल रही हैं।`,
        visualPrompt: `Atmospheric detailed scene inspired by ${subject}, glowing particles, ${visualStyle}`,
        archetype: detectSceneArchetype(raw, 1),
      },
      {
        headline: 'मेहनत और कामयाबी की उड़ान',
        narration: `जब हौसला बुलंद हो और इरादा पक्का हो, तो हर बड़ी मंज़िल आसान बन जाती है।`,
        visualPrompt: `Golden sunrise over mountain peaks and clouds, ${visualStyle}`,
        archetype: 'golden_mountains',
      },
      {
        headline: 'लाइक और सब्सक्राइब करें!',
        narration: `अगर यह वीडियो आपको पसंद आई हो तो लाइक और शेयर ज़रूर करें। मिलते हैं अगली शानदार वीडियो में!`,
        visualPrompt: `Glowing twilight skyline and starry sky, ${visualStyle}`,
        archetype: 'cosmos',
      },
    ];
  } else {
    templates = [
      {
        headline: subject.slice(0, 36),
        narration: `Have you ever wondered how ${subject} is quietly reshaping everything around us? Let’s step inside this extraordinary story.`,
        visualPrompt: `Breathtaking cinematic wide shot of ${subject}, volumetric light rays, dramatic atmosphere, ${visualStyle}, 8k`,
        archetype: baseArch,
      },
      {
        headline: 'The Hidden Breakthrough',
        narration: `Beneath the surface, remarkable innovations around ${subject} are unlocking possibilities once thought completely impossible.`,
        visualPrompt: `Detailed atmospheric perspective illustrating ${subject}, glowing highlights, shallow depth of field, ${visualStyle}`,
        archetype: detectSceneArchetype(raw, 1),
      },
      {
        headline: 'Shaping Tomorrow’s World',
        narration: `Every single day, bold creators and thinkers are turning vision into reality, pushing human potential further than ever before.`,
        visualPrompt: `Epic horizon sunrise breaking over mountains and futuristic skyline, warm golden and cyan contrast, ${visualStyle}`,
        archetype: detectSceneArchetype(raw, 2),
      },
      {
        headline: 'Your Story Starts Now',
        narration: `The future belongs to those ready to create it today. Follow along and share this video to inspire someone next!`,
        visualPrompt: `Grand panoramic twilight finale under a luminous starry cosmos, cinematic lens glow, ${visualStyle}`,
        archetype: detectSceneArchetype(raw, 3),
      },
      {
        headline: 'Beyond Every Horizon',
        narration: `Each step forward opens a new chapter filled with discovery, courage, and limitless imagination.`,
        visualPrompt: `Serene glowing ocean sunset horizon with dramatic clouds, ${visualStyle}`,
        archetype: 'ocean_sunset',
      },
      {
        headline: 'Thanks For Watching',
        narration: `Drop your thoughts in the comments below and stay tuned for our next episode!`,
        visualPrompt: `Warm luxury studio spotlight stage with golden dust bokeh, ${visualStyle}`,
        archetype: 'luxury_spotlight',
      },
    ];
  }

  const scenes = [];
  for (let i = 0; i < count; i++) {
    const base = templates[i % templates.length];
    scenes.push({
      id: `scene_${i + 1}`,
      headline: base.headline,
      narration: base.narration,
      visualPrompt: base.visualPrompt,
      archetype: base.archetype,
      cameraMotion: CAMERA_MOTIONS[i % CAMERA_MOTIONS.length],
    });
  }

  return {
    title: subject,
    language: lang,
    tone,
    visualStyle,
    scenes,
  };
}

module.exports = { generateLocalStoryboard, detectSceneArchetype };
