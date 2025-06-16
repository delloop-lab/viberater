import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import html2canvas from 'html2canvas';

interface FaceExpressions {
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
  neutral: number;
}

const shuffleArray = (array: string[]) => {
  // Fisher-Yates shuffle
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Session-level used sets for partner personas and mood phrases
const usedPartnerPersonasMale = new Set<number>();
const usedPartnerPersonasFemale = new Set<number>();
const usedMoodIndices: { [key in keyof FaceExpressions]: Set<number> } = {
  happy: new Set(),
  sad: new Set(),
  angry: new Set(),
  fearful: new Set(),
  disgusted: new Set(),
  surprised: new Set(),
  neutral: new Set(),
};

const getUniqueRandomIndex = (usedSet: Set<number>, max: number) => {
  if (usedSet.size >= max) usedSet.clear();
  let idx = Math.floor(Math.random() * max);
  while (usedSet.has(idx)) {
    idx = Math.floor(Math.random() * max);
  }
  usedSet.add(idx);
  return idx;
};

// Helper for correct pronouns
const getPronouns = (gender: string) => {
  if (gender === 'male') {
    return { subject: 'He', object: 'him', possessive: 'his' };
  } else {
    return { subject: 'She', object: 'her', possessive: 'her' };
  }
};

// Helper for seasonal/holiday phrases
const getSeasonalPhrase = () => {
  const now = new Date();
  const month = now.getMonth();
  const date = now.getDate();
  const year = now.getFullYear();
  // Christmas: Dec 20-26
  if (month === 11 && date >= 20 && date <= 26) return "Wishing you a joyful Christmas season!";
  // New Year: Dec 27-Jan 3
  if ((month === 11 && date >= 27) || (month === 0 && date <= 3)) return `Happy New Year ${year + (month === 11 ? 1 : 0)}!`;
  // Easter (approx, varies by year, here: March/April 20-25)
  if ((month === 2 || month === 3) && date >= 20 && date <= 25) return "Happy Easter!";
  // Valentine's Day: Feb 14
  if (month === 1 && date === 14) return "Happy Valentine's Day!";
  // Father's Day (3rd Sunday in June)
  if (month === 5) {
    const d = new Date(year, 5, 1);
    let sundayCount = 0;
    for (let i = 1; i <= 30; i++) {
      d.setDate(i);
      if (d.getDay() === 0) sundayCount++;
      if (sundayCount === 3) {
        if (date === i) return "Happy Father's Day!";
        break;
      }
    }
  }
  // Mother's Day (2nd Sunday in May)
  if (month === 4) {
    const d = new Date(year, 4, 1);
    let sundayCount = 0;
    for (let i = 1; i <= 31; i++) {
      d.setDate(i);
      if (d.getDay() === 0) sundayCount++;
      if (sundayCount === 2) {
        if (date === i) return "Happy Mother's Day!";
        break;
      }
    }
  }
  // Halloween: Oct 31
  if (month === 9 && date === 31) return "Happy Halloween!";
  // Independence Day (US): July 4
  if (month === 6 && date === 4) return "Happy Independence Day!";
  // Add more as needed
  return '';
};

const friendTypes = [
  "creative dreamers", "loyal companions", "adventurous spirits", "deep thinkers", "free souls", "optimists", "quiet listeners", "bold leaders", "gentle healers", "curious minds", "fun seekers", "old souls", "visionaries", "mischief makers", "book lovers", "music fans", "nature lovers", "foodies", "sports fans", "artists", "inventors", "storytellers", "explorers", "philosophers", "jokers", "romantics", "builders", "helpers", "trendsetters", "peacekeepers", "dancers", "singers", "travelers", "animal lovers", "gardeners", "movie buffs", "techies", "gamers", "collectors", "fashionistas", "chefs", "poets", "writers", "painters", "sculptors", "photographers", "bloggers", "vloggers", "yogis", "meditators", "runners", "cyclists", "swimmers", "climbers", "campers", "fishermen", "skaters", "surfers", "skiers", "snowboarders", "pilots", "sailors", "astronomers", "historians", "scientists", "engineers", "mathematicians", "doctors", "nurses", "therapists", "counselors", "teachers", "professors", "students", "mentors", "coaches", "trainers", "volunteers", "activists", "organizers", "planners", "hosts", "guests", "neighbors", "colleagues", "bosses", "employees", "entrepreneurs", "investors", "designers", "developers", "producers", "directors", "actors", "comedians", "magicians", "illusionists", "cartoonists", "animators", "editors", "publishers", "critics", "reviewers", "curators", "guides"
];
const loves = [
  "gardening", "movies", "hiking", "jazz music", "baking", "painting", "reading", "writing", "dancing", "singing", "traveling", "photography", "cycling", "swimming", "yoga", "meditation", "cooking", "fishing", "camping", "surfing", "skiing", "snowboarding", "climbing", "running", "skating", "sailing", "birdwatching", "collecting stamps", "collecting coins", "playing chess", "playing cards", "solving puzzles", "playing video games", "watching documentaries", "attending concerts", "going to museums", "visiting art galleries", "exploring new cities", "trying new foods", "learning languages", "volunteering", "helping others", "organizing events", "hosting parties", "decorating", "fashion", "shopping", "blogging", "vlogging", "podcasting", "making crafts", "knitting", "sewing", "woodworking", "pottery", "sculpting", "drawing", "cartooning", "comedy", "magic tricks", "theater", "acting", "directing", "producing", "editing", "publishing", "reviewing", "critiquing", "curating", "guiding tours", "mentoring", "coaching", "training", "teaching", "studying", "researching", "inventing", "designing", "developing", "engineering", "building", "fixing things", "restoring antiques", "antique shopping", "thrifting", "gardening", "landscaping", "interior design", "architecture", "astronomy", "astrology", "history", "science", "math", "philosophy", "psychology", "sociology", "politics", "economics", "business", "investing"
];
const calledYou = [
  "rebel", "fighter", "visionary", "maverick", "dreamer", "thinker", "joker", "romantic", "leader", "helper", "builder", "explorer", "philosopher", "artist", "musician", "poet", "writer", "inventor", "organizer", "planner", "host", "guest", "neighbor", "colleague", "boss", "employee", "entrepreneur", "investor", "designer", "developer", "producer", "director", "actor", "comedian", "magician", "illusionist", "cartoonist", "animator", "editor", "publisher", "critic", "reviewer", "curator", "guide", "mentor", "coach", "trainer", "volunteer", "activist", "organizer", "peacekeeper", "trendsetter", "fashionista", "chef", "foodie", "gardener", "movie buff", "book lover", "music fan", "nature lover", "sports fan", "animal lover", "traveler", "yogi", "meditator", "runner", "cyclist", "swimmer", "climber", "camper", "fisherman", "skater", "surfer", "skier", "snowboarder", "pilot", "sailor", "astronomer", "historian", "scientist", "engineer", "mathematician", "doctor", "nurse", "therapist", "counselor", "teacher", "professor", "student", "planner", "organizer", "host", "guest", "neighbor", "colleague", "boss", "employee"
];
const bornOn = [
  "stormy day", "blue moon", "sunny morning", "misty dawn", "rainy afternoon", "starry night", "windy evening", "crisp autumn day", "snowy night", "foggy morning", "golden sunset", "chilly winter day", "breezy spring morning", "hot summer afternoon", "cool fall evening", "frosty night", "thunderous day", "peaceful dawn", "colorful sunrise", "quiet dusk", "sparkling twilight", "rainbow day", "eclipse night", "harvest moon", "solstice morning", "equinox evening", "meteor shower night", "aurora-lit night", "sun-drenched day", "moonlit evening", "cloudless sky", "drizzly afternoon", "hazy morning", "humid day", "icy night", "balmy evening", "sun-kissed morning", "dew-covered dawn", "blooming spring day", "leafy autumn afternoon", "festive holiday", "firework night", "gentle breeze day", "stormy sunset", "sunrise after rain", "first snow day", "last leaf fall", "crisp new year", "midnight hour", "early morning light", "late summer night", "harvest festival", "spring equinox", "summer solstice", "autumn equinox", "winter solstice", "full moon", "new moon", "waning crescent", "waxing gibbous", "supermoon", "blood moon", "lunar eclipse", "solar eclipse", "shooting star night", "comet sighting", "starlit sky", "cloudburst day", "gentle rain", "sunbeam morning", "frosty window day", "warm hearth night", "picnic day", "beach day", "mountain morning", "valley dusk", "riverbank afternoon", "forest walk day", "desert sunrise", "ocean breeze evening", "city lights night", "country road morning", "island sunset", "harbor dawn", "garden bloom day", "orchard harvest", "vineyard dusk", "meadow morning", "prairie wind day", "canyon echo night", "lake reflection evening", "hilltop sunrise", "clifftop sunset", "lighthouse night", "carnival day", "circus night", "storybook morning", "legendary dusk"
];
const schoolNames = [
  "troublemaker", "cool kid", "one of the rat pack", "misfit", "bookworm", "class clown", "teacher's pet", "star athlete", "quiet observer", "science whiz", "mathlete", "debate champ", "artsy type", "band geek", "choir star", "drama queen", "drama king", "hall monitor", "lunchroom legend", "rebel", "rule breaker", "overachiever", "underachiever", "late bloomer", "early riser", "night owl", "daydreamer", "go-getter", "slacker", "fashion icon", "trendsetter", "gossip", "secret keeper", "advice giver", "peacemaker", "instigator", "organizer", "planner", "party starter", "wallflower", "social butterfly", "loner", "group leader", "sidekick", "best friend", "frenemy", "rival", "mentor", "protege", "new kid", "old timer", "transfer student", "exchange student", "sports captain", "cheerleader", "mascot", "techie", "gamer", "comic collector", "skater", "biker", "car enthusiast", "environmentalist", "animal lover", "gardener", "chef", "baker", "poet", "writer", "journalist", "photographer", "videographer", "blogger", "vlogger", "podcaster", "public speaker", "volunteer", "activist", "fundraiser", "club president", "club member", "committee chair", "treasurer", "secretary", "historian", "yearbook editor", "prom king", "prom queen", "homecoming king", "homecoming queen", "valedictorian", "salutatorian", "honor roll student", "detention regular", "library dweller", "cafeteria favorite", "bus buddy", "carpooler", "bike commuter", "walker", "runner", "sprinter", "jumper", "thrower", "swimmer", "diver", "lifeguard"
];

const carriesPhrases = [
  "carries a sense of wonder", "radiates quiet confidence", "embodies joyful energy", "carries a spark of curiosity", "radiates warmth and kindness", "embodies a playful spirit", "carries a gentle wisdom", "radiates creative energy", "embodies a peaceful calm", "carries a vibrant optimism", "radiates thoughtful insight", "embodies a bold vision", "carries a hopeful outlook", "radiates a sense of adventure", "embodies a nurturing presence", "carries a contagious enthusiasm", "radiates a calm assurance", "embodies a resilient heart", "carries a lighthearted joy", "radiates a magnetic charm", "embodies a generous soul", "carries a quiet strength", "radiates a loving nature", "embodies a determined will", "carries a playful mischief", "radiates a gentle humor", "embodies a passionate drive", "carries a poetic grace", "radiates a thoughtful calm", "embodies a spirited energy", "carries a sense of mystery", "radiates a classic elegance", "embodies a modern edge", "carries a timeless style", "radiates a youthful exuberance", "embodies a wise perspective", "carries a soulful depth", "radiates a cheerful glow", "embodies a fearless heart", "carries a creative spark", "radiates a peaceful aura", "embodies a loyal spirit", "carries a sense of belonging", "radiates a friendly openness", "embodies a curious mind", "carries a sense of purpose", "radiates a gentle resilience", "embodies a thoughtful presence", "carries a radiant smile", "radiates a sense of fun", "embodies a loving heart"
];

const generateDescription = (age: number, gender: string, expressions: FaceExpressions) => {
  const pronouns = getPronouns(gender);
  const mood = Object.entries(expressions).sort((a, b) => b[1] - a[1])[0][0] as keyof FaceExpressions;
  const moodIntensity = expressions[mood];
  const ageGroup = age < 25 ? 'young' : age < 40 ? 'young adult' : age < 60 ? 'mature' : 'wise';
  
  const moodDescriptions: { [key in keyof FaceExpressions]: string[] } = {
    happy: [
      "radiates positive energy",
      "has a contagious smile",
      "brings sunshine to the room",
      "looks genuinely joyful",
      "is beaming with happiness",
      "has a twinkle in their eye",
      "is glowing with delight",
      "spreads joy wherever they go",
      "has a heartwarming grin",
      "is the life of the party",
      "exudes cheerful vibes",
      "is in high spirits",
      "has a playful sparkle",
      "is full of laughter",
      "is a ray of sunshine",
      "has a jubilant expression",
      "is radiating warmth",
      "is in a celebratory mood",
      "is clearly enjoying the moment",
      "has a blissful aura",
      "is smiling from within",
      "is in a state of pure joy",
      "is delightfully upbeat",
      "is positively glowing",
      "has a spring in their step",
      "is the embodiment of cheerfulness",
      "has a lighthearted spirit",
      "is a beacon of happiness",
      "is always ready to celebrate",
      "has a sparkling personality",
      "is a source of inspiration",
      "is a joy to be around",
      "has a magnetic smile",
      "is a bundle of joy",
      "is a fountain of positivity",
      "is a delight to everyone",
      "is a happiness magnet",
      "is a cheerful companion",
      "is a bringer of good vibes",
      "is a laughter enthusiast",
      "is a mood lifter",
      "is a joy spreader",
      "is a happiness ambassador",
      "is a positivity powerhouse",
      "is a smile generator",
      "is a sunshine soul",
      "is a happiness spark",
      "is a joy igniter",
      "is a cheerful soul",
      "is a radiant friend",
      "is a happiness catalyst",
      "is a joy creator",
      "is a positive force",
      "is a cheerful leader",
      "is a happiness influencer",
      "is a joy architect",
      "is a radiant being",
      "is a cheerful motivator",
      "is a happiness seeker",
      "is a joy explorer",
      "is a radiant presence",
      "is a cheerful visionary"
    ],
    sad: [
      "seems to be having a thoughtful moment",
      "has a contemplative expression",
      "looks like they could use a hug",
      "has a gentle, melancholic aura",
      "is lost in deep thought",
      "has a wistful gaze",
      "is quietly reflective",
      "shows a touch of sorrow",
      "has a pensive look",
      "is feeling blue",
      "is in a somber mood",
      "has a soft sadness",
      "is experiencing a tender moment",
      "is quietly introspective",
      "has a downcast glance",
      "is feeling sentimental",
      "is in a moment of vulnerability",
      "is showing gentle emotion",
      "is in a subdued state",
      "is feeling a bit low",
      "is quietly yearning",
      "is in a mellow mood",
      "is feeling nostalgic",
      "is in a gentle lull",
      "is in a reflective state",
      "is quietly pondering",
      "is in a moment of longing",
      "is feeling a gentle ache",
      "is in a state of reminiscence",
      "is quietly mourning",
      "is in a moment of solitude",
      "is feeling a quiet ache",
      "is in a state of pensiveness",
      "is quietly grieving",
      "is in a moment of silence",
      "is feeling a gentle loss",
      "is in a state of yearning",
      "is quietly lamenting",
      "is in a moment of quietude",
      "is feeling a gentle sorrow",
      "is in a state of reflection",
      "is quietly brooding",
      "is in a moment of sadness",
      "is feeling a gentle melancholy",
      "is in a state of wistfulness",
      "is quietly sighing",
      "is in a moment of regret",
      "is feeling a gentle disappointment",
      "is in a state of longing",
      "is quietly hoping",
      "is in a moment of patience",
      "is feeling a gentle yearning",
      "is in a state of acceptance",
      "is quietly enduring",
      "is in a moment of waiting",
      "is feeling a gentle patience",
      "is in a state of hope",
      "is quietly wishing",
      "is in a moment of anticipation",
      "is feeling a gentle anticipation"
    ],
    angry: [
      "shows strong determination",
      "has an intense, focused look",
      "displays powerful emotions",
      "seems passionate about something",
      "is fiercely motivated",
      "has a fiery gaze",
      "is brimming with resolve",
      "is not to be trifled with",
      "is channeling their energy",
      "is standing their ground",
      "is full of conviction",
      "is ready to take action",
      "is showing boldness",
      "is in a defiant mood",
      "is fiercely expressive",
      "is unyielding",
      "is showing a strong will",
      "is in a combative spirit",
      "is not backing down",
      "is in a stormy mood",
      "is radiating intensity",
      "is showing a forceful presence",
      "is in a passionate state",
      "is exuding strength",
      "is a force to be reckoned with",
      "is a powerhouse of emotion",
      "is a determined spirit",
      "is a bold challenger",
      "is a fierce competitor",
      "is a passionate advocate",
      "is a strong-willed individual",
      "is a relentless pursuer",
      "is a fiery leader",
      "is a courageous fighter",
      "is a spirited debater",
      "is a tenacious achiever",
      "is a bold visionary",
      "is a fearless trailblazer",
      "is a passionate creator",
      "is a determined innovator",
      "is a strong-minded thinker",
      "is a relentless doer",
      "is a fiery motivator",
      "is a courageous inspirer",
      "is a spirited influencer",
      "is a tenacious builder",
      "is a bold explorer",
      "is a fearless dreamer",
      "is a passionate seeker",
      "is a determined solver",
      "is a strong-hearted friend",
      "is a relentless supporter",
      "is a fiery protector",
      "is a courageous defender",
      "is a spirited challenger",
      "is a tenacious survivor",
      "is a bold risk-taker",
      "is a fearless leader",
      "is a passionate driver",
      "is a determined winner"
    ],
    fearful: [
      "looks a bit surprised",
      "seems to be in a moment of wonder",
      "has an alert expression",
      "shows cautious awareness",
      "is slightly apprehensive",
      "is on edge",
      "is in a state of anticipation",
      "is feeling uncertain",
      "is showing a hint of worry",
      "is in a moment of suspense",
      "is feeling a bit tense",
      "is in a watchful state",
      "is showing nervous energy",
      "is in a guarded mood",
      "is feeling a bit anxious",
      "is in a state of alertness",
      "is showing a wary glance",
      "is in a moment of hesitation",
      "is feeling a bit startled",
      "is in a cautious frame of mind",
      "is in a tentative mood",
      "is showing a flicker of fear",
      "is in a vigilant state",
      "is feeling a bit uneasy",
      "is a cautious observer",
      "is a watchful guardian",
      "is a careful planner",
      "is a thoughtful protector",
      "is a vigilant thinker",
      "is a wary traveler",
      "is a tentative explorer",
      "is a careful dreamer",
      "is a cautious friend",
      "is a watchful companion",
      "is a careful listener",
      "is a thoughtful advisor",
      "is a vigilant supporter",
      "is a wary innovator",
      "is a tentative creator",
      "is a careful builder",
      "is a cautious leader",
      "is a watchful motivator",
      "is a careful inspirer",
      "is a thoughtful challenger",
      "is a vigilant survivor",
      "is a wary risk-taker",
      "is a tentative achiever",
      "is a careful winner",
      "is a cautious solver",
      "is a watchful dreamer",
      "is a careful seeker",
      "is a thoughtful doer",
      "is a vigilant friend",
      "is a wary supporter",
      "is a tentative builder",
      "is a careful protector",
      "is a cautious defender"
    ],
    disgusted: [
      "has a skeptical expression",
      "shows discerning judgment",
      "looks like they've seen something interesting",
      "has a critical eye",
      "is unimpressed",
      "is showing a hint of distaste",
      "is in a judgmental mood",
      "is feeling a bit put off",
      "is showing a look of disapproval",
      "is in a picky mood",
      "is not easily pleased",
      "is showing a scrupulous glance",
      "is in a selective state",
      "is feeling a bit grossed out",
      "is in a discriminating mood",
      "is showing a look of aversion",
      "is in a fastidious frame of mind",
      "is feeling a bit repulsed",
      "is in a critical state",
      "is showing a look of skepticism",
      "is in a scrutinizing mood",
      "is feeling a bit dismissive",
      "is in a rejecting state",
      "is showing a look of distaste",
      "is a discerning critic",
      "is a selective thinker",
      "is a picky chooser",
      "is a fastidious friend",
      "is a critical observer",
      "is a scrupulous judge",
      "is a discriminating advisor",
      "is a selective supporter",
      "is a picky innovator",
      "is a fastidious creator",
      "is a critical builder",
      "is a scrupulous leader",
      "is a discriminating motivator",
      "is a selective inspirer",
      "is a picky challenger",
      "is a fastidious survivor",
      "is a critical risk-taker",
      "is a scrupulous achiever",
      "is a discriminating winner",
      "is a selective solver",
      "is a picky dreamer",
      "is a fastidious seeker",
      "is a critical doer",
      "is a scrupulous friend",
      "is a discriminating supporter",
      "is a selective builder",
      "is a picky protector",
      "is a fastidious defender"
    ],
    surprised: [
      "looks pleasantly surprised",
      "has an expression of wonder",
      "seems to be in a moment of discovery",
      "shows delightful astonishment",
      "is wide-eyed with amazement",
      "is in awe of something",
      "is caught off guard",
      "is in a state of marvel",
      "is showing a look of revelation",
      "is in a moment of realization",
      "is feeling a rush of excitement",
      "is in a state of disbelief",
      "is showing a look of shock",
      "is in a moment of surprise",
      "is feeling a jolt of wonder",
      "is in a state of fascination",
      "is showing a look of amazement",
      "is in a moment of awe",
      "is feeling a spark of curiosity",
      "is in a state of intrigue",
      "is showing a look of astonishment",
      "is in a moment of delight",
      "is feeling a burst of surprise",
      "is in a state of glee",
      "is a marveling observer",
      "is a curious explorer",
      "is a fascinated thinker",
      "is a surprised dreamer",
      "is a delighted friend",
      "is a shocked companion",
      "is a wondering innovator",
      "is a amazed creator",
      "is a marveling builder",
      "is a curious leader",
      "is a fascinated motivator",
      "is a surprised inspirer",
      "is a delighted challenger",
      "is a shocked survivor",
      "is a wondering risk-taker",
      "is a amazed achiever",
      "is a marveling winner",
      "is a curious solver",
      "is a fascinated dreamer",
      "is a surprised seeker",
      "is a delighted doer",
      "is a shocked friend",
      "is a wondering supporter",
      "is a amazed builder",
      "is a marveling protector",
      "is a curious defender"
    ],
    neutral: [
      "has a calm, composed presence",
      "shows quiet confidence",
      "has a peaceful demeanor",
      "displays natural elegance",
      "is in a balanced state",
      "is feeling centered",
      "is showing poise",
      "is in a tranquil mood",
      "is feeling at ease",
      "is in a serene state",
      "is showing a relaxed attitude",
      "is in a composed frame of mind",
      "is feeling steady",
      "is in a harmonious mood",
      "is showing a placid expression",
      "is in a restful state",
      "is feeling unruffled",
      "is in a peaceful frame of mind",
      "is showing a gentle presence",
      "is in a mellow mood",
      "is feeling content",
      "is in a state of equanimity",
      "is showing a neutral expression",
      "is in a composed state",
      "is feeling balanced",
      "is a calm observer",
      "is a composed thinker",
      "is a peaceful dreamer",
      "is a tranquil friend",
      "is a steady companion",
      "is a harmonious innovator",
      "is a placid creator",
      "is a restful builder",
      "is a unruffled leader",
      "is a peaceful motivator",
      "is a gentle inspirer",
      "is a mellow challenger",
      "is a content survivor",
      "is a equanimous risk-taker",
      "is a neutral achiever",
      "is a composed winner",
      "is a balanced solver",
      "is a calm dreamer",
      "is a composed seeker",
      "is a peaceful doer",
      "is a tranquil friend",
      "is a steady supporter",
      "is a harmonious builder",
      "is a placid protector",
      "is a restful defender"
    ]
  };

  // Shuffle and pick 2-3 unique, unused phrases for the mood
  const moodList = moodDescriptions[mood];
  const numPhrases = 2 + Math.floor(Math.random() * 2); // 2 or 3
  const chosenPhrases: string[] = [];
  for (let i = 0; i < numPhrases; i++) {
    const idx = getUniqueRandomIndex(usedMoodIndices[mood], moodList.length);
    chosenPhrases.push(moodList[idx]);
  }

  // Join phrases naturally
  let moodPhrase = '';
  if (chosenPhrases.length === 2) {
    moodPhrase = `${pronouns.subject} ${chosenPhrases[0]} and ${chosenPhrases[1]}`;
  } else if (chosenPhrases.length === 3) {
    moodPhrase = `${pronouns.subject} ${chosenPhrases[0]}, ${chosenPhrases[1]}, and ${chosenPhrases[2]}`;
  } else {
    moodPhrase = `${pronouns.subject} ${chosenPhrases[0]}`;
  }

  const ageDescriptions = {
    young: "youthful spirit",
    "young adult": "vibrant energy",
    mature: "distinguished presence",
    wise: "timeless wisdom"
  };

  // Back story templates
  const origins = [
    "a bustling city on the coast",
    "a quiet mountain village",
    "a vibrant artistic community",
    "a small town with big dreams",
    "a tech hub in a major metropolis",
    "a peaceful countryside estate",
    "a lively university campus",
    "a creative studio downtown",
    "a family of travelers",
    "a community of innovators",
    "a multicultural neighborhood",
    "a historic district",
    "a scenic lakeside town",
    "a dynamic urban center",
    "a close-knit rural community",
    "a city known for its music scene",
    "a region famous for its cuisine",
    "a place where tradition meets modernity",
    "a town surrounded by nature",
    "a city that never sleeps"
  ];
  const ambitions = [
    "to make a positive impact on the world",
    "to create something truly unique",
    "to inspire others through their actions",
    "to travel and experience new cultures",
    "to master their craft",
    "to build meaningful connections",
    "to achieve personal growth",
    "to bring joy to those around them",
    "to lead by example",
    "to explore the unknown",
    "to turn dreams into reality",
    "to help others succeed",
    "to leave a lasting legacy",
    "to innovate and push boundaries",
    "to find balance and harmony",
    "to share their story with the world",
    "to make every moment count",
    "to learn and evolve",
    "to bring people together",
    "to live life to the fullest"
  ];
  const favours = [
    "creative pursuits and new ideas",
    "quiet moments of reflection",
    "adventure and spontaneity",
    "deep conversations",
    "helping others",
    "exploring the outdoors",
    "music and the arts",
    "technology and innovation",
    "spending time with loved ones",
    "learning and discovery",
    "expressing themselves",
    "trying new foods",
    "staying active",
    "reading and storytelling",
    "building things from scratch",
    "solving puzzles",
    "making people laugh",
    "capturing memories",
    "finding beauty in the everyday",
    "embracing change"
  ];

  // Randomly select one from each
  const origin = origins[Math.floor(Math.random() * origins.length)];
  const ambition = ambitions[Math.floor(Math.random() * ambitions.length)];
  const favour = favours[Math.floor(Math.random() * favours.length)];

  // Partner personas (100 unique for each gender, no numbers)
  const partnerPersonasMale = [
    "free-spirited artist who loves midnight adventures",
    "thoughtful scientist with a passion for jazz and philosophy",
    "world-traveling chef who collects rare spices",
    "gentle poet who finds beauty in the everyday",
    "ambitious entrepreneur with a heart of gold",
    "adventurous photographer who chases sunsets",
    "kind-hearted teacher who inspires everyone",
    "mysterious novelist with a love for old libraries",
    "playful musician who writes love songs",
    "dedicated doctor who volunteers abroad",
    "charming architect who dreams in blueprints",
    "witty comedian who always brings laughter",
    "passionate activist who stands for justice",
    "quiet philosopher who ponders the stars",
    "energetic athlete who loves a challenge",
    "creative designer with a flair for color",
    "curious historian who brings the past to life",
    "compassionate veterinarian who rescues animals",
    "brilliant engineer who builds the future",
    "soulful dancer who moves with grace",
    "loyal firefighter with a brave spirit",
    "gentle gardener who grows rare flowers",
    "visionary filmmaker who tells powerful stories",
    "resourceful pilot who loves the clouds",
    "dedicated coach who motivates greatness",
    "inventive scientist who dreams big",
    "humble craftsman who works with his hands",
    "cheerful barista who knows every customer's name",
    "wise mentor who gives the best advice",
    "playful magician who loves surprises",
    "caring nurse who brings comfort",
    "fearless explorer who seeks the unknown",
    "chill surfer who lives for the waves",
    "meticulous tailor who creates timeless fashion",
    "friendly librarian who loves mysteries",
    "optimistic farmer who loves the land",
    "dedicated park ranger who protects nature",
    "inventive game developer with wild ideas",
    "thoughtful therapist who listens deeply",
    "passionate chef who creates culinary art",
    "gentle yoga instructor who radiates calm",
    "fun-loving DJ who lives for the beat",
    "brave mountain climber who seeks new heights",
    "curious astronomer who maps the stars",
    "generous philanthropist who gives back",
    "quirky inventor who loves gadgets",
    "sincere journalist who tells real stories",
    "adventurous sailor who loves the sea",
    "dedicated scientist who solves mysteries",
    "imaginative animator who brings dreams to life",
    // 50 more creative personas:
    "jazz-loving botanist with a green thumb",
    "mountain guide with a gentle laugh",
    "urban beekeeper who makes wild honey",
    "street artist who paints city walls",
    "vintage car restorer with a love for history",
    "craft beer brewer with a taste for adventure",
    "wildlife photographer who travels the world",
    "salsa dancer who brings energy to every room",
    "comic book writer with a vivid imagination",
    "glassblower who creates shimmering art",
    "marathon runner with endless stamina",
    "puzzle master who loves a challenge",
    "folk singer with a soulful voice",
    "robotics engineer who dreams of the future",
    "urban gardener who grows rooftop jungles",
    "muralist who colors the city",
    "kite surfer who rides the wind",
    "opera singer with a powerful presence",
    "potter who shapes beauty from clay",
    "calligrapher with elegant handwriting",
    "mountain biker who conquers trails",
    "sushi chef with precise skills",
    "antique collector with a story for every piece",
    "parkour athlete who leaps over obstacles",
    "cinematographer who captures magic on film",
    "stand-up paddleboarder who loves the water",
    "urban explorer who finds hidden gems",
    "craft chocolate maker with a sweet touch",
    "digital nomad who works from anywhere",
    "improv actor who lives in the moment",
    "swing dancer with infectious joy",
    "birdwatcher with a keen eye",
    "tattoo artist with a creative soul",
    "rock climber who scales new heights",
    "fashion stylist with a bold vision",
    "street food vendor with global flavors",
    "bonsai cultivator with patience",
    "spoken word poet with a message",
    "surfboard shaper who crafts the perfect ride",
    "urban cyclist who zips through the city",
    "guitar maker with a love for music",
    "hot air balloon pilot with a sense of wonder",
    "mosaic artist who pieces together beauty",
    "sailing instructor who loves the open sea",
    "ice sculptor with a cool touch",
    "park designer who creates green spaces",
    "vinyl record collector with a classic taste",
    "drone pilot who sees the world from above",
    "escape room designer with a clever mind"
  ];
  const partnerPersonasFemale = [
    "free-spirited artist who loves midnight adventures",
    "thoughtful scientist with a passion for jazz and philosophy",
    "world-traveling chef who collects rare spices",
    "gentle poet who finds beauty in the everyday",
    "ambitious entrepreneur with a heart of gold",
    "adventurous photographer who chases sunsets",
    "kind-hearted teacher who inspires everyone",
    "mysterious novelist with a love for old libraries",
    "playful musician who writes love songs",
    "dedicated doctor who volunteers abroad",
    "charming architect who dreams in blueprints",
    "witty comedian who always brings laughter",
    "passionate activist who stands for justice",
    "quiet philosopher who ponders the stars",
    "energetic athlete who loves a challenge",
    "creative designer with a flair for color",
    "curious historian who brings the past to life",
    "compassionate veterinarian who rescues animals",
    "brilliant engineer who builds the future",
    "soulful dancer who moves with grace",
    "loyal firefighter with a brave spirit",
    "gentle gardener who grows rare flowers",
    "visionary filmmaker who tells powerful stories",
    "resourceful pilot who loves the clouds",
    "dedicated coach who motivates greatness",
    "inventive scientist who dreams big",
    "humble craftswoman who works with her hands",
    "cheerful barista who knows every customer's name",
    "wise mentor who gives the best advice",
    "playful magician who loves surprises",
    "caring nurse who brings comfort",
    "fearless explorer who seeks the unknown",
    "chill surfer who lives for the waves",
    "meticulous tailor who creates timeless fashion",
    "friendly librarian who loves mysteries",
    "optimistic farmer who loves the land",
    "dedicated park ranger who protects nature",
    "inventive game developer with wild ideas",
    "thoughtful therapist who listens deeply",
    "passionate chef who creates culinary art",
    "gentle yoga instructor who radiates calm",
    "fun-loving DJ who lives for the beat",
    "brave mountain climber who seeks new heights",
    "curious astronomer who maps the stars",
    "generous philanthropist who gives back",
    "quirky inventor who loves gadgets",
    "sincere journalist who tells real stories",
    "adventurous sailor who loves the sea",
    "dedicated scientist who solves mysteries",
    "imaginative animator who brings dreams to life",
    // 50 more creative personas:
    "jazz-loving botanist with a green thumb",
    "mountain guide with a gentle laugh",
    "urban beekeeper who makes wild honey",
    "street artist who paints city walls",
    "vintage car restorer with a love for history",
    "craft beer brewer with a taste for adventure",
    "wildlife photographer who travels the world",
    "salsa dancer who brings energy to every room",
    "comic book writer with a vivid imagination",
    "glassblower who creates shimmering art",
    "marathon runner with endless stamina",
    "puzzle master who loves a challenge",
    "folk singer with a soulful voice",
    "robotics engineer who dreams of the future",
    "urban gardener who grows rooftop jungles",
    "muralist who colors the city",
    "kite surfer who rides the wind",
    "opera singer with a powerful presence",
    "potter who shapes beauty from clay",
    "calligrapher with elegant handwriting",
    "mountain biker who conquers trails",
    "sushi chef with precise skills",
    "antique collector with a story for every piece",
    "parkour athlete who leaps over obstacles",
    "cinematographer who captures magic on film",
    "stand-up paddleboarder who loves the water",
    "urban explorer who finds hidden gems",
    "craft chocolate maker with a sweet touch",
    "digital nomad who works from anywhere",
    "improv actor who lives in the moment",
    "swing dancer with infectious joy",
    "birdwatcher with a keen eye",
    "tattoo artist with a creative soul",
    "rock climber who scales new heights",
    "fashion stylist with a bold vision",
    "street food vendor with global flavors",
    "bonsai cultivator with patience",
    "spoken word poet with a message",
    "surfboard shaper who crafts the perfect ride",
    "urban cyclist who zips through the city",
    "guitar maker with a love for music",
    "hot air balloon pilot with a sense of wonder",
    "mosaic artist who pieces together beauty",
    "sailing instructor who loves the open sea",
    "ice sculptor with a cool touch",
    "park designer who creates green spaces",
    "vinyl record collector with a classic taste",
    "drone pilot who sees the world from above",
    "escape room designer with a clever mind"
  ];
  // Pick a unique, unused partner persona for this session
  let partnerIdx;
  let partnerList;
  let possessivePronoun;
  if (gender === 'male') {
    partnerList = partnerPersonasFemale;
    possessivePronoun = 'His';
    partnerIdx = getUniqueRandomIndex(usedPartnerPersonasMale, partnerList.length);
  } else {
    partnerList = partnerPersonasMale;
    possessivePronoun = 'Her';
    partnerIdx = getUniqueRandomIndex(usedPartnerPersonasFemale, partnerList.length);
  }
  const partnerPersona = partnerList[partnerIdx];

  // Compose the full description with correct grammar and pronouns, in paragraphs
  const combinedPersonality = `${pronouns.subject} attracts ${friendTypes[Math.floor(Math.random() * friendTypes.length)]}, loves ${loves[Math.floor(Math.random() * loves.length)]}, is often called a ${calledYou[Math.floor(Math.random() * calledYou.length)]}, and was born on a ${bornOn[Math.floor(Math.random() * bornOn.length)]}. At school, ${pronouns.subject.toLowerCase()} was called a ${schoolNames[Math.floor(Math.random() * schoolNames.length)]}.`;

  const paragraphs = [
    `${moodPhrase}, and ${carriesPhrases[Math.floor(Math.random() * carriesPhrases.length)]}.`,
    `${pronouns.subject} also appears to be around ${Math.round(age)} years old.`,
    `${pronouns.subject} seems to come from ${origin}, with ambitions to ${ambition.replace('their', pronouns.possessive)}.`,
    `${pronouns.subject} appears to favour ${favour}.`,
    `${possessivePronoun} perfect partner is a ${partnerPersona}.`,
    combinedPersonality
  ];
  const seasonalPhrase = getSeasonalPhrase();
  if (seasonalPhrase) paragraphs.push(seasonalPhrase);
  return paragraphs.join('\n\n');
};

export default function SelfieMood() {
  const imgRef = useRef<HTMLImageElement>(null);
  const [statement, setStatement] = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const [shareWarning, setShareWarning] = useState('');

  useEffect(() => {
    const loadModels = async () => {
      try {
        setError('');
        setLoadingStatus('Loading face detection model...');
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        setLoadingStatus('Loading age and gender model...');
        await faceapi.nets.ageGenderNet.loadFromUri('/models');
        setLoadingStatus('Loading expression model...');
        await faceapi.nets.faceExpressionNet.loadFromUri('/models');
        setLoadingStatus('');
        setModelsLoaded(true);
        console.log('All models loaded successfully');
      } catch (err) {
        console.error('Error loading models:', err);
        setError('Failed to load face detection models. Please make sure the models are in the public/models directory.');
        setLoadingStatus('');
      }
    };
    loadModels();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImgLoaded(false);
      setStatement('Loading image...');
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImageUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!modelsLoaded) {
      console.log('Models not loaded yet');
      setStatement('Models are still loading...');
      return;
    }

    if (!imgRef.current) {
      console.log('No image reference found');
      return;
    }

    if (!imgRef.current.complete) {
      console.log('Image not fully loaded yet');
      return;
    }

    setIsAnalyzing(true);
    setStatement('Analyzing...');
    try {
      console.log('Starting face detection...');
      console.log('Image dimensions:', imgRef.current.width, 'x', imgRef.current.height);
      
      const detection = await faceapi
        .detectSingleFace(imgRef.current, new faceapi.TinyFaceDetectorOptions())
        .withAgeAndGender()
        .withFaceExpressions();

      console.log('Detection result:', detection);

      if (!detection) {
        console.log('No face detected in image');
        setStatement('No face detected. Please try a different image or angle.');
        return;
      }

      const { age, gender, expressions } = detection;
      console.log('Age:', age);
      console.log('Gender:', gender);
      console.log('Expressions:', expressions);
      
      setStatement(generateDescription(age, gender, expressions));
    } catch (err) {
      console.error('Error analyzing face:', err);
      setStatement('Error analyzing face. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleShare = async () => {
    setShareWarning('');
    if (!shareRef.current) return;
    const canvas = await html2canvas(shareRef.current);
    if (canvas.width === 0 || canvas.height === 0) {
      setShareWarning('Could not capture the image. Please make sure the selfie is visible and fully loaded.');
      return;
    }
    const dataUrl = canvas.toDataURL('image/jpeg');
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'viberater.jpg', { type: 'image/jpeg' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'VibeRater', text: 'Check out my VibeRater result!' });
    } else {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'viberater.jpg';
      link.click();
    }
  };

  const handleDownload = async () => {
    setShareWarning('');
    if (!shareRef.current) return;
    const canvas = await html2canvas(shareRef.current);
    if (canvas.width === 0 || canvas.height === 0) {
      setShareWarning('Could not capture the image. Please make sure the selfie is visible and fully loaded.');
      return;
    }
    const dataUrl = canvas.toDataURL('image/jpeg');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'viberater.jpg';
    link.click();
  };

  const handleCopy = async () => {
    setShareWarning('');
    if (!shareRef.current) return;
    const canvas = await html2canvas(shareRef.current);
    if (canvas.width === 0 || canvas.height === 0) {
      setShareWarning('Could not capture the image. Please make sure the selfie is visible and fully loaded.');
      return;
    }
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([
          new window.ClipboardItem({ 'image/jpeg': blob })
        ]);
        alert('Image copied to clipboard!');
      } catch (e) {
        alert('Copying images to clipboard is not supported in your browser. Please use Download instead.');
      }
    }, 'image/jpeg');
  };

  const handleFacebookShare = async () => {
    alert('To share on Facebook: 1) Download the image, 2) Go to Facebook, 3) Create a post and upload the image. Facebook does not allow direct image sharing from web apps.');
    window.open('https://www.facebook.com/', '_blank');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-pink-100 via-blue-100 to-teal-100">
      <div className="flex-none p-4 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-transparent bg-clip-text drop-shadow-lg">
          VibeRater
        </h1>
        <div className="mt-2 flex justify-center">
          <span className="text-base md:text-lg lg:text-xl font-medium text-blue-700/80 drop-shadow-sm px-4 py-2 rounded-xl">
            Upload a selfie to learn what others think of you.
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start p-4 lg:p-12 w-full">
        <div className="w-full max-w-6xl">
          <div className="flex flex-col space-y-8 w-full">
            <div className="flex-none">
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="block w-full px-8 py-5 text-center bg-gradient-to-r from-pink-300 to-blue-300 text-blue-900 font-semibold rounded-2xl cursor-pointer hover:from-pink-400 hover:to-blue-400 transition-all duration-300 shadow-md hover:shadow-xl border border-white/60 backdrop-blur-md"
                >
                  Choose a Selfie
                </label>
              </div>
            </div>

            {imageUrl && statement && (
              <div ref={shareRef} className="flex flex-col lg:flex-row w-full h-auto items-stretch justify-center mt-8 gap-0 lg:gap-8">
                <div className="w-full lg:w-1/2 flex items-center justify-center min-w-0">
                  <div className="relative rounded-none overflow-hidden shadow-xl border-none bg-white/60 backdrop-blur-lg flex items-center justify-center w-full h-full">
                    <img
                      ref={imgRef}
                      src={imageUrl}
                      alt="Selfie"
                      crossOrigin="anonymous"
                      className="w-full h-full object-contain transition-all duration-500 bg-white/80 max-h-[60vh]"
                      onLoad={() => {
                        setImgLoaded(true);
                        setTimeout(() => {
                          handleAnalyze();
                        }, 100);
                      }}
                    />
                  </div>
                </div>
                <div className="w-full lg:w-1/2 flex items-center justify-center min-w-0">
                  <div className="bg-white/70 backdrop-blur-lg rounded-none p-8 border-none shadow-xl w-full h-full flex items-center">
                    <p className="text-blue-900 text-lg md:text-xl lg:text-2xl leading-relaxed font-medium drop-shadow-sm whitespace-pre-line w-full">{statement}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col space-y-8 h-full">
        {loadingStatus && (
          <div className="bg-blue-200/60 border border-blue-300 text-blue-800 px-4 py-3 rounded-xl shadow-sm">
            {loadingStatus}
          </div>
        )}
        
        {error && (
          <div className="bg-red-200/60 border border-red-300 text-red-800 px-4 py-3 rounded-xl shadow-sm">
            {error}
          </div>
        )}
      </div>

      {imageUrl && statement && imgLoaded && (
        <div className="w-full flex justify-center mt-4">
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={handleShare} className="px-6 py-3 bg-gradient-to-r from-pink-400 to-blue-400 text-white rounded-xl font-bold shadow-lg hover:from-pink-500 hover:to-blue-500 transition-all">
              Share as JPG
            </button>
            <button onClick={handleDownload} className="px-6 py-3 bg-gradient-to-r from-green-400 to-blue-400 text-white rounded-xl font-bold shadow-lg hover:from-green-500 hover:to-blue-500 transition-all">
              Download JPG
            </button>
            <button onClick={handleCopy} className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-pink-400 text-white rounded-xl font-bold shadow-lg hover:from-yellow-500 hover:to-pink-500 transition-all">
              Copy JPG to Clipboard
            </button>
            <button onClick={handleFacebookShare} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-xl font-bold shadow-lg hover:from-blue-700 hover:to-blue-500 transition-all">
              Share on Facebook
            </button>
          </div>
        </div>
      )}
      {shareWarning && (
        <div className="mt-2 text-red-600 font-semibold">{shareWarning}</div>
      )}
      <footer className="w-full text-center py-4 text-blue-900/60 text-sm font-medium select-none">
        Copyright (c) Lou Schillaci
      </footer>
    </div>
  );
} 