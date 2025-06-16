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

// Scaffold roast phrase sets (to be filled in later)
const roastMoodDescriptions: { [key in keyof FaceExpressions]: string[] } = {
  happy: [
    "smiles like they just got away with something dumb",
    "that smile says 'I just ate the last slice and blamed the dog'",
    "grins like they just remembered a joke from 2009",
    "smiles like their phone is on 1% and they don't care",
    "that smile could break a camera lens",
    "smiles like they just got a participation trophy",
    "looks like they laugh at their own jokes (and nobody else does)",
    "smiles like they just got out of a speeding ticket",
    "that grin says 'I have no idea what's going on'",
    "smiles like they just found out it's Friday, but it's Monday",
    "You look like your mum still cuts your sandwiches and your hair.",
    "You've got main character energy... if the movie flopped.",
    "Your selfie just lowered my screen resolution.",
    "You look like you've got strong opinions on stuff you don't understand.",
    "You look like the human version of a buffering symbol.",
    "Even AI can't fix that lighting — or that face.",
    "You look like your parents paid for your personality.",
    "This pic screams, 'I peaked in Year 9.'",
    "You've got 'used to be cool, still tells people about it' energy.",
    "Your face says influencer, your bank account says intern."
  ],
  sad: [
    "looks like they just lost their last brain cell",
    "has the same energy as a forgotten umbrella",
    "looks like their favorite show got cancelled again",
    "has the face of someone who just realized the ice cream fell off the cone",
    "looks like they just got left on read by their own mom",
    "has the vibe of a Monday morning alarm",
    "looks like they just got a text from their ex",
    "has the energy of a phone with 2% battery",
    "looks like they just realized they sent a risky text to the wrong person",
    "has the aura of a lost sock",
    "That's not a resting face — that's a cry for help.",
    "Your vibe screams 'group project freeloader.'",
    "You seem like the kind of person who talks over the movie.",
    "You look like the type who brags about their Spotify Wrapped.",
    "That outfit's so confused, it might need therapy.",
    "Your fashion sense called. It's stuck in 2008.",
    "You've got strong LinkedIn-but-not-employed energy.",
    "You look like you'd argue with a barista about almond milk.",
    "Your confidence is impressive, considering the evidence.",
    "You look like you Google your own name too often."
  ],
  angry: [
    "is mad, but nobody cares",
    "looks like they argue with Siri",
    "has the face of someone who lost at Mario Kart",
    "looks like they yell at self-checkout machines",
    "has the energy of a WiFi signal dropping at 99% download",
    "looks like they just stepped on a Lego",
    "has the rage of someone who missed happy hour",
    "looks like they just found out their favorite snack is discontinued",
    "has the fury of a printer jam",
    "looks like they just got called into a meeting that could've been an email",
    "You look like you smell like ambition and disappointment.",
    "This face screams 'reply-all' email energy.",
    "You look like a personality quiz gone wrong.",
    "Did you style that hair with a leaf blower?",
    "You've got the emotional range of a cardboard cut-out.",
    "This pic gave my camera trust issues.",
    "You look like you give TED Talks to your mirror.",
    "This face says 'I've got 3 podcasts and no job.'",
    "You look like you ghosted someone and they're better off.",
    "That selfie should come with a disclaimer."
  ],
  fearful: [
    "is scared of their own reflection",
    "looks like they just heard a noise in a horror movie",
    "has the face of someone who forgot their password for the 10th time",
    "looks like they just saw their search history on the big screen",
    "has the vibe of someone who just realized they replied-all",
    "looks like they just saw their boss at the club",
    "has the energy of a cat near a cucumber",
    "looks like they just remembered they left the stove on",
    "has the look of someone who just saw their old cringey Facebook posts",
    "looks like they just got tagged in an unflattering photo",
    "You look like a motivational quote with commitment issues.",
    "Your energy is pure 'I play devil's advocate for fun.'",
    "You're the reason group chats go silent.",
    "Your face says 'alpha,' your aura says 'needs approval.'",
    "That shirt's working harder than you ever have.",
    "You look like you bench press your own insecurities.",
    "You've got strong 'still lives at home' energy.",
    "Your personality is like decaf — there but pointless.",
    "You look like you send gym selfies with zero progress.",
    "You look like someone who says 'let's circle back' in real life."
  ],
  disgusted: [
    "looks like they smelled their own feet",
    "has the face of someone who just tasted spoiled milk",
    "looks like they just saw socks with sandals",
    "has the vibe of someone who just found a hair in their food",
    "looks like they just watched a TikTok dance fail",
    "has the energy of someone who just saw pineapple on pizza",
    "looks like they just found out their favorite celebrity is cancelled",
    "has the face of someone who just saw a public bathroom",
    "looks like they just realized their coffee is decaf",
    "has the look of someone who just saw a mullet comeback",
    "You look like you peaked during lockdown.",
    "You look like you print out memes to show people.",
    "You've got big 'talks about crypto at parties' vibes.",
    "You're serving beige energy with a side of meh.",
    "You look like your idea of flirting is LinkedIn endorsements.",
    "Your photo gave me secondhand embarrassment.",
    "You look like you narrate your life like it's a documentary no one asked for.",
    "You've got the enthusiasm of a tax return.",
    "You're not the vibe, you're the warning.",
    "Even your shadow looks like it wants to leave."
  ],
  surprised: [
    "is surprised they made it this far",
    "looks like they just found out water is wet",
    "has the face of someone who just got Rickrolled",
    "looks like they just saw their bank balance after a night out",
    "has the energy of someone who just realized it's Monday",
    "looks like they just got a text from their crush (wrong number)",
    "has the look of someone who just saw a dog walk itself",
    "looks like they just found out their favorite show has 10 more seasons",
    "has the face of someone who just saw a ghost (or their ex)",
    "looks like they just realized they left their phone at home"
  ],
  neutral: [
    "has the personality of a potato",
    "looks like they're buffering in real life",
    "has the energy of a Windows 95 screensaver",
    "looks like they just woke up from a nap and forgot what year it is",
    "has the vibe of a loading bar stuck at 99%",
    "looks like they just realized they're in the wrong Zoom meeting",
    "has the face of someone who just got asked 'what's up?' and blanked",
    "looks like they just got caught daydreaming in a job interview",
    "has the aura of a forgotten password hint",
    "looks like they're waiting for a punchline that never comes"
  ]
};

const generateDescription = (age: number, gender: string, expressions: FaceExpressions, mode: 'nice' | 'roast') => {
  const pronouns = getPronouns(gender);
  const mood = Object.entries(expressions).sort((a, b) => b[1] - a[1])[0][0] as keyof FaceExpressions;
  const roundedAge = Math.round(age);

  if (mode === 'roast') {
    const roastStories: { [key in keyof FaceExpressions]: string[] } = {
      happy: [
        `${pronouns.subject} laughs at ${pronouns.possessive} own jokes so hard, even the goldfish looks concerned. At the family BBQ, ${pronouns.subject} retells the same story for the third time, and somehow, the punchline gets worse. By dessert, everyone's just smiling politely, hoping ${pronouns.subject}'ll switch to charades instead.`,
        `${pronouns.subject}'s the type who posts inspirational quotes, then trips over ${pronouns.possessive} own shoelaces at brunch. ${pronouns.possessive} friends watch as ${pronouns.subject} tries to play it cool, but the syrup stain on ${pronouns.possessive} shirt tells a different story. By the end, ${pronouns.subject}'s laughing the loudest—at ${pronouns.object}.`,
        `At the gym, ${pronouns.subject} flexes in the mirror, but the only thing growing is ${pronouns.possessive} playlist of motivational speeches. ${pronouns.subject} grins at ${pronouns.possessive} reflection, then drops ${pronouns.possessive} water bottle with a clang that echoes across the room. Everyone pretends not to notice, but the janitor gives ${pronouns.object} a thumbs up.`,
        `${pronouns.subject}'s got the confidence of a reality TV star and the luck of someone who always picks the slowest checkout line. At the store, ${pronouns.subject} tries to charm the cashier, but ends up paying twice for gum. ${pronouns.subject} leaves, waving like ${pronouns.subject}'s won an award.`,
        `${pronouns.subject} calls ${pronouns.object}self a foodie, but ${pronouns.possessive} idea of gourmet is instant noodles with extra cheese. At dinner parties, ${pronouns.subject} critiques the appetizers, then asks if anyone has ketchup. By dessert, ${pronouns.subject}'s Instagramming a half-eaten cupcake with the caption #blessed.`
      ],
      sad: [
        `${pronouns.subject}'s the one who brings ${pronouns.possessive} own tissues to a comedy show, just in case. At the movies, ${pronouns.subject} tears up during the previews, and by the end, ${pronouns.subject}'s offering life advice to strangers in the lobby. The popcorn girl gives ${pronouns.object} a free refill out of pity.`,
        `${pronouns.subject} posts cryptic quotes on social media, then spends the afternoon refreshing for likes. At the coffee shop, ${pronouns.subject} sighs dramatically, hoping someone will ask what's wrong. The barista just offers ${pronouns.object} a loyalty card instead.`,
        `${pronouns.subject}'s still salty about losing a board game three years ago. At game night, ${pronouns.subject} insists on reading the rules aloud, then loses anyway. ${pronouns.subject} blames the dice, the lighting, and the existential unfairness of life. Everyone else just laughs.`,
        `${pronouns.possessive} coffee order takes longer to explain than it does to drink. At the counter, ${pronouns.subject} lists ${pronouns.possessive} preferences, substitutions, and temperature requirements. The barista nods, then hands ${pronouns.object} a regular black coffee. ${pronouns.subject} drinks it, defeated but dignified.`,
        `${pronouns.subject}'s the one who's 'just five minutes away' but somehow takes 45. At the party, ${pronouns.subject} arrives as everyone's leaving, then wonders why the chips are gone. ${pronouns.subject} takes a selfie with the empty bowl, captioning it 'missed connections.'`
      ],
      angry: [
        `${pronouns.subject}'s the one who yells at self-checkout machines, convinced they're plotting against ${pronouns.object}. At the store, ${pronouns.subject} slams the 'help' button, then apologizes to the attendant for ${pronouns.possessive} 'passion.' The receipt prints out, judging ${pronouns.object} silently.`,
        `${pronouns.subject} calls ${pronouns.object}self a 'boss babe,' but ${pronouns.possessive} resume says 'professional napper.' At meetings, ${pronouns.subject} interrupts with 'just one more thing,' then forgets what it was. ${pronouns.possessive} coworkers take bets on how long ${pronouns.subject}'ll last before lunch.`,
        `${pronouns.subject} tries to flex on Instagram, but ${pronouns.possessive} followers are mostly bots. At the gym, ${pronouns.subject} takes mirror selfies, then leaves after one set. The staff waves goodbye, already forgetting ${pronouns.possessive} name.`,
        `${pronouns.subject}'s got a PhD in overthinking and a minor in self-doubt. At brunch, ${pronouns.subject} debates the menu for twenty minutes, then orders toast. ${pronouns.possessive} friends order for ${pronouns.object} next time.`,
        `${pronouns.subject} thinks sarcasm is a personality trait, not a defense mechanism. At parties, ${pronouns.subject} delivers zingers that land like lead balloons. ${pronouns.subject} laughs anyway, convinced ${pronouns.subject}'s the funniest one in the room.`
      ],
      fearful: [
        `${pronouns.subject}'s the one who still calls ${pronouns.possessive} mom to ask if ${pronouns.subject} should wear shorts. At the park, ${pronouns.subject} checks the weather app every five minutes, then brings an umbrella just in case. The sun shines anyway, mocking ${pronouns.possessive} caution.`,
        `${pronouns.subject} has a 'resting confused face' perfected to art. At the museum, ${pronouns.subject} stares at abstract paintings, nodding like ${pronouns.subject} understands. ${pronouns.possessive} friends just take photos for the group chat.`,
        `${pronouns.possessive} cooking smells like regret and burnt toast. At dinner, ${pronouns.subject} serves up a 'surprise' dish that even the dog refuses. ${pronouns.subject} laughs it off, but orders pizza anyway.`,
        `${pronouns.subject} tries to 'keep it real,' but all you get is 'keep it awkward.' At parties, ${pronouns.subject} starts stories ${pronouns.subject} can't finish, then changes the subject. ${pronouns.possessive} friends fill in the blanks.`,
        `${pronouns.subject} uses 'YOLO' to justify being late… again. At work, ${pronouns.subject} blames traffic, the weather, and Mercury in retrograde. ${pronouns.possessive} boss just sighs, marking ${pronouns.object} absent.`
      ],
      disgusted: [
        `${pronouns.subject}'s got an ego the size of a planet, but no clue how to orbit a conversation. At parties, ${pronouns.subject} dominates the punch bowl, then wonders why nobody's listening. The host just turns up the music.`,
        `${pronouns.subject} thinks 'sarcasm' means 'being nice.' At brunch, ${pronouns.subject} compliments the chef, then gags at the eggs. ${pronouns.possessive} friends just roll their eyes.`,
        `${pronouns.possessive} idea of flirting is awkwardly talking about the weather. At the bar, ${pronouns.subject} asks about humidity, then wonders why ${pronouns.possessive} date leaves. The bartender just laughs.`,
        `${pronouns.subject}'s a professional over-sharer in group chats no one asked to join. At dinner, ${pronouns.subject} recounts ${pronouns.possessive} latest dream in excruciating detail. The waiter brings the check early.`,
        `${pronouns.subject} thinks 'chill' means ignoring everyone forever. At the party, ${pronouns.subject} sits in the corner, scrolling through memes. ${pronouns.possessive} friends send ${pronouns.object} texts from across the room.`
      ],
      surprised: [
        `${pronouns.subject}'s the one who brings a confetti cannon to a surprise party, then sets it off before anyone arrives. At the big reveal, ${pronouns.subject}'s more startled than the guest of honor. The photos are priceless.`,
        `${pronouns.subject}'s the type who gasps at plot twists in cartoons. At movie night, ${pronouns.subject} narrates every scene, then jumps at ${pronouns.possessive} own shadow. ${pronouns.possessive} friends bring popcorn for the show.`,
        `${pronouns.subject} finds out ${pronouns.possessive} favorite band is reuniting, then faints in the ticket line. At the concert, ${pronouns.subject} sings every word, off-key but enthusiastic. The crowd cheers anyway.`,
        `${pronouns.subject} opens a gift, then thanks the wrong person. At birthdays, ${pronouns.subject}'s more surprised by the cake than the presents. ${pronouns.possessive} friends just laugh and light another candle.`,
        `${pronouns.subject}'s the only one who claps when the plane lands. On vacation, ${pronouns.subject} marvels at hotel keycards like they're magic. The staff gives ${pronouns.object} a tour, just for fun.`
      ],
      neutral: [
        `${pronouns.subject}'s the one who blends into every group photo, but somehow always stands out. At the office, ${pronouns.subject}'s the king of casual Fridays, rocking socks with sandals like it's a statement. The HR memo is just for ${pronouns.object}.`,
        `${pronouns.subject}'s the queen of small talk, but ${pronouns.possessive} favorite topic is the weather. At the bus stop, ${pronouns.subject} predicts rain with the confidence of a meteorologist. The driver just nods, umbrella in hand.`,
        `${pronouns.subject}'s the type who brings a book to a party, then reads in the kitchen. At midnight, ${pronouns.subject}'s still on chapter one, but everyone knows ${pronouns.possessive} name. The host offers ${pronouns.object} a bookmark.`,
        `${pronouns.subject}'s the master of polite laughter, but ${pronouns.possessive} real talent is dodging group photos. At weddings, ${pronouns.subject}'s always 'in the restroom' during the bouquet toss. The photographer gives up.`,
        `${pronouns.subject}'s the one who remembers everyone's birthday, but forgets ${pronouns.possessive} own. At the office, ${pronouns.subject} organizes the cake, then acts surprised when it's for ${pronouns.object}. The team sings off-key, just for fun.`
      ]
    };
    const stories = roastStories[mood];
    return stories[Math.floor(Math.random() * stories.length)];
  } else {
    const niceStories: { [key in keyof FaceExpressions]: string[] } = {
      happy: [
        `${pronouns.subject} lights up the room with ${pronouns.possessive} infectious laugh, making even the grumpiest barista crack a smile. At the café, ${pronouns.subject} shares stories that turn strangers into friends, and by closing time, everyone's planning the next meetup.`,
        `${pronouns.subject}'s the kind of person who finds joy in the little things—like the perfect cup of coffee or a stranger's smile. At the park, ${pronouns.subject} spreads positivity like confetti, and somehow, the day feels brighter for everyone who crosses ${pronouns.possessive} path.`,
        `${pronouns.subject} has a way of turning ordinary moments into memories. At the beach, ${pronouns.subject} builds sandcastles with kids, shares sunscreen with strangers, and by sunset, everyone's gathered around, sharing stories like old friends.`,
        `${pronouns.subject}'s enthusiasm is contagious, like a ray of sunshine on a cloudy day. At the farmers market, ${pronouns.subject} chats with vendors, samples everything, and leaves with more than just groceries—${pronouns.subject} leaves with new friends.`,
        `${pronouns.subject} brings warmth to every room ${pronouns.subject} enters, like a cozy fireplace on a winter night. At the party, ${pronouns.subject} makes everyone feel welcome, and by the end, strangers are exchanging numbers, promising to meet again.`
      ],
      sad: [
        `${pronouns.subject} has a quiet strength that speaks volumes. At the library, ${pronouns.subject} finds solace in books, and somehow, the stories seem to understand exactly what ${pronouns.subject} needs. The librarian saves ${pronouns.object} favorite spot.`,
        `${pronouns.subject}'s the kind of person who feels deeply, and that's what makes ${pronouns.object} special. At the park, ${pronouns.subject} shares a bench with strangers, and somehow, they end up sharing stories that heal them both.`,
        `${pronouns.subject} has a way of turning pain into poetry. At the café, ${pronouns.subject} writes in ${pronouns.possessive} journal, and the barista brings an extra cookie, sensing ${pronouns.possessive} need for comfort.`,
        `${pronouns.subject}'s vulnerability is ${pronouns.possessive} superpower. At the support group, ${pronouns.subject} shares ${pronouns.possessive} story, and others find courage in ${pronouns.possessive} words. The room feels lighter after ${pronouns.subject} speaks.`,
        `${pronouns.subject} has a heart that feels everything deeply, and that's what makes ${pronouns.object} beautiful. At the beach, ${pronouns.subject} watches the waves, and somehow, the ocean seems to understand ${pronouns.possessive} sadness.`
      ],
      angry: [
        `${pronouns.subject} channels ${pronouns.possessive} passion into positive change. At the community meeting, ${pronouns.subject} speaks up for what's right, and others find their voice too. The room buzzes with newfound energy.`,
        `${pronouns.subject}'s fire burns bright, but it's the light that guides others. At the protest, ${pronouns.subject} leads with conviction, and the crowd follows, inspired by ${pronouns.possessive} courage.`,
        `${pronouns.subject} turns frustration into fuel for growth. At the gym, ${pronouns.subject} pushes harder, and others match ${pronouns.possessive} intensity. The trainer nods, impressed by ${pronouns.possessive} determination.`,
        `${pronouns.subject} uses ${pronouns.possessive} voice to make a difference. At the town hall, ${pronouns.subject} demands accountability, and the officials listen. The community stands a little taller.`,
        `${pronouns.subject}'s passion is a force for good. At the workshop, ${pronouns.subject} channels ${pronouns.possessive} energy into creating change, and others join in, inspired by ${pronouns.possessive} drive.`
      ],
      fearful: [
        `${pronouns.subject} faces ${pronouns.possessive} fears with quiet courage. At the high ropes course, ${pronouns.subject} takes the first step, and others follow, finding strength in ${pronouns.possessive} example.`,
        `${pronouns.subject}'s vulnerability is ${pronouns.possessive} strength. At the therapy session, ${pronouns.subject} shares ${pronouns.possessive} story, and others find comfort in knowing they're not alone.`,
        `${pronouns.subject} turns anxiety into art. At the studio, ${pronouns.subject} creates beauty from ${pronouns.possessive} fears, and others find inspiration in ${pronouns.possessive} courage.`,
        `${pronouns.subject} uses ${pronouns.possessive} voice to help others. At the support group, ${pronouns.subject} speaks up, and others find the words they've been searching for.`,
        `${pronouns.subject}'s journey inspires others. At the workshop, ${pronouns.subject} shares ${pronouns.possessive} story, and the room fills with hope.`
      ],
      disgusted: [
        `${pronouns.subject} stands up for what's right. At the meeting, ${pronouns.subject} calls out injustice, and others find their voice too. The room changes for the better.`,
        `${pronouns.subject}'s integrity is unwavering. At the office, ${pronouns.subject} refuses to compromise ${pronouns.possessive} values, and others follow ${pronouns.possessive} lead.`,
        `${pronouns.subject} uses ${pronouns.possessive} voice to make a difference. At the town hall, ${pronouns.subject} demands change, and the community listens.`,
        `${pronouns.subject}'s passion drives positive change. At the protest, ${pronouns.subject} leads with conviction, and others join in, inspired by ${pronouns.possessive} courage.`,
        `${pronouns.subject} turns frustration into fuel for growth. At the workshop, ${pronouns.subject} channels ${pronouns.possessive} energy into creating change, and others find their purpose too.`
      ],
      surprised: [
        `${pronouns.subject}'s wonder is contagious. At the museum, ${pronouns.subject} discovers beauty in unexpected places, and others see the world through new eyes.`,
        `${pronouns.subject} finds joy in the little things. At the park, ${pronouns.subject} marvels at a butterfly, and others stop to appreciate the moment too.`,
        `${pronouns.subject}'s enthusiasm brightens the day. At the café, ${pronouns.subject} tries a new flavor, and the whole room smiles at ${pronouns.possessive} delight.`,
        `${pronouns.subject} brings magic to ordinary moments. At the concert, ${pronouns.subject} dances like nobody's watching, and others join in, forgetting their inhibitions.`,
        `${pronouns.subject}'s curiosity leads to adventure. At the farmers market, ${pronouns.subject} tries everything, and vendors share their stories, charmed by ${pronouns.possessive} interest.`
      ],
      neutral: [
        `${pronouns.subject} brings calm to chaos. At the office, ${pronouns.subject} handles crises with grace, and others find their center too.`,
        `${pronouns.subject}'s presence is grounding. At the party, ${pronouns.subject} makes everyone feel welcome, and the room feels more relaxed.`,
        `${pronouns.subject} finds beauty in balance. At the yoga studio, ${pronouns.subject} moves with intention, and others follow ${pronouns.possessive} lead.`,
        `${pronouns.subject}'s wisdom comes from stillness. At the park, ${pronouns.subject} watches the world go by, and others find peace in ${pronouns.possessive} company.`,
        `${pronouns.subject} brings harmony to any situation. At the family dinner, ${pronouns.subject} bridges gaps with gentle words, and everyone feels heard.`
      ]
    };
    const stories = niceStories[mood];
    return stories[Math.floor(Math.random() * stories.length)];
  }
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
  const [mode, setMode] = useState<'nice' | 'roast'>('nice');

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
      
      setStatement(generateDescription(age, gender, expressions, mode));
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

  useEffect(() => {
    if (imageUrl && imgLoaded && statement) {
      handleAnalyze();
    }
    // eslint-disable-next-line
  }, [mode]);

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

      {/* Roast Mode Toggle */}
      <div className="flex justify-center my-4">
        <button
          onClick={() => setMode(mode === 'nice' ? 'roast' : 'nice')}
          className="px-6 py-2 rounded-xl font-bold shadow-lg bg-gradient-to-r from-pink-400 to-yellow-400 text-white hover:from-pink-500 hover:to-yellow-500 transition-all"
        >
          {mode === 'nice' ? 'Switch to Roast Mode' : 'Switch to Nice Mode'}
        </button>
      </div>
    </div>
  );
} 