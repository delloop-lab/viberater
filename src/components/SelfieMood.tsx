import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import html2canvas from 'html2canvas';
import { generateRoast as generateLevelRoast } from "../roastPhrases";

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
    "grins like they just slipped into VIP without paying, marveling at how they sweet‑talked the bouncer into giving them the red‑velvet treatment while everyone else waits in line",
    "smiles like they've got the bartender on speed‑dial, already plotting out their next five drink orders before the first one even hits the table and feeling like a true nightlife overlord",
    "looks like they just scored front‑row seats to life's party, arms thrown high, music booming in their chest, and zero worries about bedtime or tomorrow's to‑do list",
    "that grin says 'I bribed Lady Luck with chocolate', proud of their sweet deal, ready to cash in favors with the universe and expecting jackpot‑style rewards any second now",
    "smiles like someone whispered 'happy hour's on me', already imagining endless rounds of discounted cocktails, plates of loaded fries, and the sweetest brag‑rights with friends",
    "grins like they just found an extra shot in their drink, feeling like a genius hacker who just cracked the code, and savoring the bonus kick in their evening festivities",
    "smiles like they remembered where they hid the good snacks, tip‑toeing to their secret cache, fantasies of chips and candy dancing in their head while they savor every crunchy bite",
    "that look says 'I convinced my boss email counts as exercise', absolutely certain they've redefined office fitness forever and deserve a gold medal—or at least a day off",
    "grins like they just unlocked cheat mode in adulthood, breezing past boring chores, and teleporting straight to weekend vibes with a smug sense of victory",
    "smiles like they pressed snooze on all their problems, tucking their worries under the mattress, savoring a few more minutes of blissful daydreaming before reality strikes"
  ],
  sad: [
    "pouts like someone stole their last slice of pizza, replaying the moment in slow motion and mourning the gooey cheese as if it were a lost childhood toy",
    "looks like they just got snoozed in a 'we need to talk' text, staring at their phone in disbelief, rehearsing apologies, and wondering what existential crisis they're about to face",
    "has the energy of a deflated party balloon at sunrise, sagging under the weight of unspoken disappointment and the sad realization that celebrations are over",
    "feels like they just showed up to a party of ghosts, calling out for friends that never arrived, and staring at empty plates with a sense of lonely bewilderment",
    "looks like they spilled coffee on their only clean shirt, staring at the brown stain in horror and debating whether laundry counts as a life skill they've failed to master",
    "sighs like they just realized 'reply‑all' was a mistake, hovering over the keyboard in horror, imagining corporate chaos unfolding because of their fat‑fingered email",
    "looks like their Wi‑Fi ghosted them mid‑scroll, phone in hand, buffering icon spinning like a cruel cosmic joke, and contemplating shouting at their router for its betrayal",
    "has the face of someone who lost a high‑stakes nap battle, waking up with drool on their pillow and the sinking dread that they've wasted precious snooze time",
    "looks like they just found out Fridays have meetings now, eyes widening in panic, mentally rearranging weekend plans to accommodate existential corporate obligations",
    "feels like someone canceled dessert at the last minute, heartbroken by the absence of sweet treats and questioning the very fairness of the universe's dessert distribution"
  ],
  angry: [
    "is fuming like someone nicked the good stapler, veins popping, ready to track the culprit through every cubicle until justice is served in the office jungle",
    "looks like they just got ghosted by autocorrect again, swinging between rage and despair as their carefully crafted sentence is mangled into meaningless gobbledygook",
    "has the rage of stepping on a rogue LEGO in the dark, hopping on one foot, cursing the architect of childhood torture devices, and plotting midnight revenge",
    "glowers like they discovered their pizza got eaten cold, envisioning the traitor who stole the hot slice and vowing to avenge their chilled pepperoni in due time",
    "looks like they'd argue with a vending machine and win, towering over the coin‑slurping fiend, ready to debate snack logic with the mechanical overlord itself",
    "snarls like someone just insulted their playlist taste, clutching their earbuds like a shield and daring anyone to question the sanctity of their personal soundtrack",
    "seethes like they paid for express delivery and got molasses, plotting a strongly worded complaint that will haunt the customer service rep in their dreams",
    "looks like they want to throttle their alarm clock, picturing it as a tiny tyrant that enjoys making them jump out of bed at ungodly hours for no good reason",
    "has the vibe of a spoiler‑ruined plot twist, arms crossed, eyes narrowed, ready to unleash a torrent of expletives on the next poor soul who ruins the ending again",
    "glares like they just got an \"URGENT\" email at 6 pm, burning with righteous indignation and mentally drafting a response that starts with 'With all due respect…'"
  ],
  fearful: [
    "freezes like they just saw their search history on billboards, heart pounding, embarrassed secrets broadcasting to the world in horrifying detail",
    "looks like they heard a ghost notification ping at 3 am, eyes wide, pulse racing, convinced the universe is conspiring to ruin their sleep one random ding at a time",
    "has the face of someone who forgot their antivirus ran out, imagining viral doom raining down on their files with malicious glee while they scramble for a license key",
    "panics like they pressed 'send' instead of 'save draft', watching their masterpiece email fly into the abyss with no chance of recall and stomach in knots",
    "looks like their browser crashed mid‑hot take, cursor poised over the 'post' button, now stranded in the digital void, heartbroken and tweetless",
    "shudders like they clicked 'install update' at the wrong time, brace‑positioned for the inevitable hour‑long reboot torture that follows every forced patch",
    "has the vibe of a cat cornered by a cucumber army, terrified by an unseen veggie ambush and questioning every life choice that led to this perilous moment",
    "looks like they just realized their password was 'password', horror dawning as they contemplate the digital vulnerabilities of every account they own",
    "trembles like they saw 'low battery' on 1 percent, frantically hunting for a charger like a desert survivor seeking an oasis of electrical salvation",
    "has the look of someone about to delete all their apps, overwhelming dread at the thought of digital detachment, ready to unplug from civilization entirely"
  ],
  disgusted: [
    "grimaces like they just sniffed last week's leftovers, nose wrinkling in disgust at the science experiment brewing in the back of the fridge",
    "looks like they found out pineapple on pizza is real, moral outrage etched on their face as they wrestle with the culinary injustice before them",
    "has the face of someone who stepped on mystery goo, soul‑crushing disappointment as they scrape off the sticky horror from their otherwise pristine shoe",
    "sniffs like their socks skipped laundry for a month, recoiling from the pungent stench of worn‑out cotton and vowing never to remove them again—unless absolutely forced",
    "cringes like they watched someone rehearse TikTok fails, embarrassed on behalf of humanity and questioning the collective decision to share such spectacles online",
    "looks like they taste‑tested a burnt toast finger, mouth revolting in protest at charcoal‑like breadcrumbs masquerading as breakfast",
    "rebels like they just refused the office 'free' donut, declaring independence from sugary tyranny and watching coworkers recoil in confused awe",
    "scoffs like their coffee got swapped for decaf, soul‑crushing betrayal as they sip the lifeless brew and mourn the lost promise of caffeine's sweet embrace",
    "has the vibe of a salad pretending to be dessert, heartbroken by a pile of sad greens trying to masquerade as chocolate cake",
    "wrinkles like they just smelled science‑lab socks, nostrils flaring, mind racing with visions of chemical warfare breaking out in their gym bag"
  ],
  surprised: [
    "blinks like they just found a fiver in an old coat, disbelief washing over them as they imagine the magical squirrel that stashed that forgotten fortune",
    "looks like someone whispered 'it's Friday already?' eyes widening in delight at the revelation that the weekend snuck up on them like a ninja",
    "has the expression of discovering coffee is life, jaw dropping in epiphany as they realize this brown elixir holds the secret to all productivity",
    "gasps like they realized their plants are still alive, shock and pride bursting forth as their green companions defy botanical odds under their care",
    "looks like they just got Rick‑rolled IRL, stunned into silence by an unexpected chorus of 'Never Gonna Give You Up' and scrambling for the exit",
    "freezes like they thought the meeting was optional, horror dawning as they realize their calendar lied and they're the only one unprepared in the conference room",
    "has the vibe of 'did I just adult correctly?' stunned by their own competence momentarily before fear of failure creeps back in",
    "stares like they unlocked a secret apartment level, chest swelling with pride as they discover hidden rooms in the mundane architecture of life",
    "widens eyes like they saw their bank app balance rise, disbelief and joy mingling as digits climb upward and debts cower in fear",
    "looks like their schedule finally RSVP'd 'fun', absolute astonishment that leisure made it onto their calendar amidst the chaos"
  ],
  neutral: [
    "stares like a loading bar stuck at 99 percent, a zen master of in‑between, neither here nor there, contemplating the void of unfinished tasks",
    "has the charisma of an empty chat window, waiting in silent expectation for someone, anyone, to break the ice and awaken its dormant pixels",
    "looks like they're buffering a witty comeback, thought wheels spinning quietly as they search the memory banks for the perfect zinger that never arrives",
    "shrugs like 'meh, I've seen worse memes', unimpressed by the world's best attempts at humor and ready to swipe left on every joke henceforth",
    "has the vibe of a cubicle plant doing its job, photosynthesizing in silence, content with minimal input and quietly judging every meeting that crosses its path",
    "looks like they just woke from a five‑year nap, groggy and disoriented, wondering how they ended up in this strange timeline with different coffee brands",
    "has the aura of a forgotten browser tab, lurking in the back of your mind, holding important secrets that you'll never actually revisit",
    "stares like they're waiting for life's next patch, poised on the brink of change yet unwilling to update because 'if it ain't broke, don't fix it,' right?",
    "looks like someone who excels at 'OK', achieving mediocrity in record time and basking in the glory of minimal effort for maximum chill",
    "has the energy of a mute button on life, present enough to exist but forever silenced when the world demands more than a nod"
  ]
};

const generateDescription = (age: number, gender: string, expressions: FaceExpressions, mode: 'nice' | 'roast') => {
  const pronouns = getPronouns(gender);
  const mood = Object.entries(expressions).sort((a, b) => b[1] - a[1])[0][0] as keyof FaceExpressions;
  const roundedAge = Math.round(age);

  if (mode === 'roast') {
    // Use only the new generateRoast function for roasting
    return generateRoast();
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

const IMGUR_CLIENT_ID = '4d79652a3ed590f';

// --- New Multi-Structure Roast Generator ---
const openers = [
  "You've got the confidence of a reality TV star",
  "You carry that middle-lane energy",
  "You try so hard to be the life of the party",
  "Your charm is like a slow-loading webpage",
  "You have the luck of picking the slowest checkout line",
  "You walk in like you own the place, but forget your keys",
  // ... add hundreds more
];

const elaborations = [
  "but you end up paying twice for gum",
  "while ghosting social events with zero guilt",
  "and your ideas crash harder than dial-up",
  "leaving everyone wondering if you're a prank",
  "yet somehow you still manage to trip over thin air",
  "but you're the human equivalent of buffering",
  // ... add hundreds more
];

const punchlines = [
  "You've got the charisma of a dial tone but somehow manage to be even less interesting.",
  "If cluelessness was an Olympic sport, you'd bring home the gold, silver, and bronze.",
  "Your brain's on airplane mode and it forgot to turn back on.",
  "You're like a cloud — when you disappear, it's a beautiful day.",
  "Somehow, you manage to make silence feel awkward.",
  "You bring everyone down like a Monday morning hangover nobody asked for.",
  "Your charm is like decaf coffee — all the bitterness, none of the kick.",
  "You'd lose a staring contest with a goldfish.",
  "You're the human equivalent of a participation trophy.",
  "You have the social skills of a malfunctioning Roomba.",
  "Your wit is so slow, it could be measured in geological time.",
  "You'd be a threat to world peace if ignorance was a weapon.",
  "You have a face for radio and a voice for silent movies.",
  "Your energy is so low it makes a sloth look like a marathon runner.",
  "You make procrastination look like a full-time job.",
  "You're the reason \"meh\" was invented.",
  "Your idea of multitasking is switching between being boring and being irrelevant.",
  "You're the human version of a software update reminder — annoying and unavoidable.",
  "Your confidence is like a soap bubble — bright, shiny, and popping way too soon.",
  "You've got all the personality of a beige wall with worse jokes.",
  "You could put a room full of introverts to sleep faster than a lullaby.",
  "Your social presence is like dial-up internet in a fibre optic world.",
  "You have all the spark of a wet matchstick.",
  "Your sense of timing is as bad as your fashion sense.",
  "You're so forgettable, even Google couldn't find you.",
  "You bring as much excitement as a traffic jam on a rainy Tuesday.",
  "You're proof that evolution takes detours.",
  "Your logic is about as useful as a screen door on a submarine.",
  "You're the plot twist nobody saw coming but nobody wanted.",
  "You make \"awkward\" look like an art form.",
  "You have the subtlety of a sledgehammer.",
  "You're the kind of person who could trip over a cordless phone.",
  "Your personality is like a dial-up modem — outdated and frustrating.",
  "You'd get lost in your own backyard.",
  "You have the enthusiasm of a cat at bath time.",
  "You're the human embodiment of \"404 Not Found.\"",
  "Your social skills could use a software patch.",
  "You bring more awkwardness than a Zoom call with bad Wi-Fi.",
  "Your jokes are like expired milk — sour and best avoided.",
  "You're the reason silence was invented.",
  // ... existing punchlines ...
];

const taglines = [
  "Don't take it personal, just take notes.",
  "You asked for it, I delivered.",
  "Roast complete, mic dropped.",
  "Keep shining—just maybe somewhere else.",
  "All in good fun, but seriously.",
  "If you can't laugh at yourself, I will.",
  // ... add a good handful more
];

const structures = [
  (o: string, e: string, p: string) => `${o}, ${e}, ${p}`,
  (o: string, p: string) => `${o}. But seriously, ${p}`,
  (o: string, e: string) => `Ever notice how ${o.toLowerCase()}? ${e}`,
  (p: string) => `${p} — no arguments, just facts.`,
  (o: string, e: string, p: string, t: string) => `${o}, ${e}, and ${p}. ${t}`,
  (o: string, p: string, t: string) => `${o}. ${p} ${t}`,
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRoast() {
  const opener = randomPick(openers);
  const elaboration = randomPick(elaborations);
  const punchline = randomPick(punchlines);
  const tagline = randomPick(taglines);

  const structure = randomPick(structures);

  // Always call with four arguments; extra args are ignored by functions with fewer params
  return structure(opener, elaboration, punchline, tagline);
}

// --- Mood, Age, Gender Roast Arrays ---
const moods = [
  "You carry yourself with that classic middle-lane energy—unbothered, mildly observant, and ready to ghost a social event with zero guilt",
  "Your vibe screams 'I'm here for the snacks and the exit, nothing more'",
  "You radiate low-key chaos wrapped in a bubble of awkward charm",
  "That casual 'I just woke up like this' energy that somehow still manages to be less put together than it sounds",
  "Your mood is the human equivalent of buffering—always almost there but never quite",
  "You drift through conversations like a confused ghost trying to find the Wi-Fi password",
  "Your energy is that of a caffeinated sloth on a Monday morning",
  "You balance between 'I might join you' and 'nah, I'll pass' like a pro",
  "You've mastered the art of giving zero effs while pretending to care",
  "That 'accidentally showed up late and still want applause' kind of aura",
  "You move through life with the enthusiasm of a dial-up internet connection",
  "Your presence is like an unsent text—there but not quite making an impact",
  "You vibe like a half-charged phone in a sea of power banks",
  "That perfect mix of 'did I remember to wear pants?' and 'I don't really care'",
  "You exude the calm of a cat plotting world domination between naps",
  "Your mood swings like a pendulum powered by memes and snacks",
  "You're the human version of a 'loading' screen with no progress bar",
  "Your spirit animal is a yawning panda avoiding responsibilities",
  "You bring the chill of a slow cooker on a winter night",
  "Your energy is as unpredictable as autocorrect in a text from your boss",
  "You're like a playlist stuck on shuffle—occasionally great, mostly confusing",
  "That vibe when you're pretending to listen but actually planning dinner",
  "You float through social situations like a helium balloon with a slow leak",
  "Your mood is the perfect storm of 'I'm here' and 'I'm not really'",
  "You have the stamina of a toddler on a sugar crash",
  "That 'accidentally joined a meeting and now what?' energy",
  "Your emotional bandwidth is as limited as a slow internet café",
  "You bring the energy of a 3-day-old coffee cup—warm but forgotten",
  "Your mood is like a software update notification—annoying but necessary",
  "You walk the fine line between 'social butterfly' and 'hermit crab'",
  "You have the focus of a goldfish with a caffeine addiction",
  "Your vibe is the perfect blend of 'meh' and 'maybe later'",
  "You oscillate between 'let's do this' and 'nah, I need a nap'",
  "You radiate the subtle panic of forgetting where you parked your car",
  "Your presence is like a mystery flavor candy—confusing but intriguing",
  "You glide through the day like a ninja avoiding responsibility",
  "You bring the energy of a phone at 1% battery in a crowd",
  "Your mood is a cryptic riddle wrapped in a shrug",
  "You have the charisma of a broken vending machine—occasionally surprising"
];
const ages = [
  "like someone who peaked in high school but forgot to tell adulthood",
  "as if you've been time-traveling from the 90s with no Wi-Fi connection",
  "with the enthusiasm of a retiree trying VR for the first time",
  "like a vintage wine bottle that's actually just old grape juice",
  "as timeless as that one meme that never dies",
  "like a mixtape stuck on the 'skip' button",
  "carrying the wisdom of a fortune cookie written by a teenager",
  "like a classic movie everyone's seen but no one remembers",
  "with the energy of a dial-up modem in a broadband world",
  "like a flip phone in a smartphone era—charming but outdated",
  "with the grace of someone trying to use a rotary phone",
  "like a Polaroid stuck in a digital age",
  "carrying the spirit of a cancelled TV show's reboot",
  "with the patience of a sloth stuck in traffic",
  "like an old-school mixtape lost in a Spotify playlist",
  "with the confidence of someone still using Internet Explorer",
  "like a VHS tape rewinding in a streaming world",
  "carrying the nostalgia of dial tones and floppy disks",
  "like a library book overdue by decades",
  "with the curiosity of a cat stuck in a YouTube loop",
  "like a fashion trend that never quite made it",
  "with the charm of a retro arcade game missing a joystick",
  "like a classic novel collecting dust on a Kindle",
  "carrying the energy of a burnt-out neon sign",
  "like a postcard from the '90s that got lost in the mail",
  "with the enthusiasm of someone who just discovered coffee",
  "like a mixtape with one great song and several skips",
  "carrying the vibe of a discontinued snack brand",
  "like a telegram in a world of instant messaging",
  "with the style of socks and sandals on vacation",
  "like a CD player searching for a disc in 2025",
  "carrying the wisdom of a fortune cookie read backwards",
  "like a cassette tape tangled in a Walkman",
  "with the energy of a dial-up internet connection on a rainy day",
  "like a disco ball in a minimalist apartment",
  "carrying the vibe of a forgotten password hint",
  "like a floppy disk trying to save a selfie",
  "with the enthusiasm of a snail on roller skates",
  "like a pager waiting for a text message"
];
const genders = [
  "carrying the mystique of a reality TV star and the grace of a spilled latte",
  "with the confidence of a cat that knows it's about to knock something over",
  "like someone who learned charm from a YouTube tutorial on awkwardness",
  "radiating the energy of a toddler hyped on candy and bad decisions",
  "with the swagger of a sock that's lost its partner in the laundry",
  "carrying the aura of a drama queen who forgot the script",
  "with the elegance of a giraffe on roller skates",
  "like a caffeinated squirrel plotting world domination",
  "with the poise of a penguin trying ballroom dancing",
  "radiating the vibe of a Wi-Fi signal in a concrete bunker",
  "carrying the cool of a sunglasses-wearing potato",
  "with the charm of a hiccup during a silent moment",
  "like a disco diva lost at a knitting circle",
  "with the confidence of a raccoon in a trash can",
  "carrying the mystery of socks that disappear in the dryer",
  "with the flair of someone who puts ketchup on everything",
  "like a selfie enthusiast stuck on 'duck face' mode",
  "radiating the charm of a golden retriever on a sugar high",
  "carrying the spirit of a morning person on a Monday",
  "with the swagger of a boss who forgot the meeting",
  "like a mime stuck in an invisible box",
  "with the attitude of a squirrel who just found a nut",
  "carrying the vibe of a roller coaster with no seat belts",
  "with the poise of a cat knocking over a glass of water",
  "like a DJ who forgot to play the music",
  "radiating the energy of a toddler demanding snacks",
  "carrying the charm of a lost tourist with a map upside down",
  "with the confidence of someone who just found Wi-Fi",
  "like a dog chasing its own tail but looking fabulous",
  "carrying the grace of a dancer who forgot the routine",
  "with the swagger of a raccoon in a disco ball suit",
  "like a magician who accidentally revealed the trick",
  "radiating the charm of a karaoke star off-key but loving it",
  "carrying the mystery of a locked diary with a broken key",
  "with the energy of a puppy on espresso",
  "like a wizard who misplaced their wand",
  "carrying the vibe of a superhero who forgot their cape",
  "with the poise of a squirrel stealing your lunch",
  "like a poet who rhymes accidentally",
  "radiating the charm of a street performer in pajamas"
];

export function generateMoodAgeGenderRoast() {
  const mood = randomPick(moods);
  const age = randomPick(ages);
  const gender = randomPick(genders);
  // Combine with natural punctuation for flow
  return `${mood}, ${age}, ${gender}.`;
}

export default function SelfieMood() {
  // All hooks and related constants go here!
  const roastLevelEmojis: Record<string, string> = {
    L: '💖',
    G: '😊',
    P: '😜',
    A: '😏',
    X: '🔥',
    XXX: '💀',
    H: '😐',
  };
  const roastLevelLabels: Record<string, string> = {
    L: 'Love You',
    G: 'Gentle',
    P: 'Playful',
    A: 'Average',
    X: 'Extreme',
    XXX: 'XXX',
    H: 'Not So Like You',
  };
  const [lastRoastLevel, setLastRoastLevel] = useState<string>('');
  const [buttonBounce, setButtonBounce] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const [statement, setStatement] = useState<string>("I'm Ready!");
  const [imgLoaded, setImgLoaded] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const shareRef = useRef<HTMLDivElement | null>(null);
  const [shareWarning, setShareWarning] = useState<string>('');
  const [mode, setMode] = useState<'nice' | 'roast'>('nice');
  const [imgurUrl, setImgurUrl] = useState<string | null>(null);
  const [imgurLoading, setImgurLoading] = useState(false);
  const [imgurError, setImgurError] = useState('');
  const [roastLevel, setRoastLevel] = useState<'G' | 'P' | 'A' | 'X' | 'XXX'>('A');
  const [showRoastDropdown, setShowRoastDropdown] = useState(false);
  const [useHawkingVoice, setUseHawkingVoice] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const watermarkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setError('');
        setLoadingStatus('Loading face detection model...');
        await (faceapi.nets.tinyFaceDetector as any).loadFromUri('/models');
        setLoadingStatus('Loading age and gender model...');
        await (faceapi.nets.ageGenderNet as any).loadFromUri('/models');
        setLoadingStatus('Loading expression model...');
        await (faceapi.nets.faceExpressionNet as any).loadFromUri('/models');
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
      setStatement("I'm Ready!");
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
    const file = new File([blob], 'viberaters.jpg', { type: 'image/jpeg' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'VibeRaters', text: 'Check out my VibeRaters result!' });
    } else {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'viberaters.jpg';
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
    link.download = 'viberaters.jpg';
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

  // Automatically upload to Cloudinary when image, statement, and imgLoaded are ready
  useEffect(() => {
    // Only upload if statement is not a loading message and all are ready
    if (
      !imageUrl ||
      !statement ||
      !imgLoaded ||
      statement === 'Loading image...' ||
      statement === '' ||
      !shareRef.current
    ) return;
    setImgurError('');
    setImgurUrl(null);
    setImgurLoading(true);
    const autoUpload = async () => {
      const canvas = await html2canvas(shareRef.current!);
      if (canvas.width === 0 || canvas.height === 0) {
        setImgurError('Could not capture the image. Please make sure the selfie is visible and fully loaded.');
        setImgurLoading(false);
        return;
      }
      canvas.toBlob(async (blob) => {
        if (blob) {
          const formData = new FormData();
          formData.append('file', blob);
          formData.append('upload_preset', 'viberaters');
          try {
            const response = await fetch('https://api.cloudinary.com/v1_1/dovuirnzm/image/upload', {
              method: 'POST',
              body: formData
            });
            const data = await response.json();
            if (data.secure_url) {
              setImgurUrl(data.secure_url);
            } else {
              setImgurError('Cloudinary upload failed.');
            }
          } catch (e) {
            setImgurError('Cloudinary upload failed.');
          } finally {
            setImgurLoading(false);
          }
        } else {
          setImgurError('Failed to create image blob.');
          setImgurLoading(false);
        }
      }, 'image/jpeg');
    };
    autoUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, statement, imgLoaded]);

  useEffect(() => {
    if (imageUrl && imgLoaded && statement) {
      handleAnalyze();
    }
    // eslint-disable-next-line
  }, [mode]);

  // Handler for the new roast button
  const handleMoodAgeGenderRoast = () => {
    setStatement(generateMoodAgeGenderRoast());
  };

  // Function to speak the roast text
  const speakRoast = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any previous speech
      setIsAudioPlaying(true);
      // Add extra space after commas for more pause
      const processedText = text.replace(/,/g, ',  ');
      const utterance = new window.SpeechSynthesisUtterance(processedText);
      utterance.rate = 0.5;
      utterance.pitch = 1;
      
      utterance.onend = () => {
        setIsAudioPlaying(false);
      };
      
      utterance.onerror = () => {
        setIsAudioPlaying(false);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Update handleLevelRoast to only set the roast, not speak automatically
  const handleLevelRoast = (level: 'G' | 'P' | 'A' | 'X' | 'XXX' | 'L' | 'H') => {
    const roast = generateLevelRoast(level);
    setStatement(roast);
    setLastRoastLevel(level);
    setButtonBounce(level);
    setTimeout(() => setButtonBounce(''), 400);
  };

  // Add Surprise Me button handler
  const handleSurpriseMe = () => {
    const randomLevel = ['L', 'G', 'P', 'A', 'X', 'XXX', 'H'][Math.floor(Math.random() * 7)];
    handleLevelRoast(randomLevel as any);
  };

  // Add Copy Roast handler
  const handleCopyRoast = async () => {
    if (statement) {
      try {
        await navigator.clipboard.writeText(statement);
        alert('Roast copied to clipboard!');
      } catch {
        alert('Failed to copy roast.');
      }
    }
  };

  const hawkingComments = [
    "I have spent my life trying to understand the universe. Your selfie, however, remains a mystery beyond even my comprehension.",
    "The laws of physics suggest that no two objects can occupy the same space. Your selfie seems to be challenging this fundamental principle.",
    "Black holes are known for their intense gravitational pull, but your selfie's ability to attract attention might be even stronger.",
    "Time is relative, they say. Looking at your selfie, I'm not sure if we're in the past, present, or a parallel universe.",
    "The theory of relativity explains how space and time are connected. Your selfie seems to exist in a dimension all its own.",
    "Quantum mechanics suggests particles can be in multiple states at once. Your selfie appears to be simultaneously beautiful and bewildering.",
    "The Big Bang created our universe. Your selfie might have created a new one.",
    "Dark matter makes up 85% of the universe. Your selfie's charm might be the missing 15%.",
    "The speed of light is constant, but your selfie's ability to brighten a room is variable and quite impressive.",
    "Gravity is the weakest of the fundamental forces. Your selfie's gravitational pull, however, is remarkably strong.",
    "The uncertainty principle states we can't know both position and momentum. Your selfie's position on the coolness scale is equally uncertain.",
    "String theory suggests multiple dimensions. Your selfie seems to have discovered a new one: the dimension of style.",
    "The expansion of the universe is accelerating. So is my confusion when looking at your selfie.",
    "Neutrinos can pass through matter without interaction. Your selfie's ability to pass through social media without likes is equally mysterious.",
    "The multiverse theory suggests parallel universes. Your selfie might be from the most stylish one.",
    "Entropy always increases in a closed system. Your selfie's ability to decrease my understanding of photography is remarkable.",
    "The Higgs boson gives particles mass. Your selfie gives my brain mass confusion.",
    "Wormholes might connect distant parts of space. Your selfie connects distant parts of my sense of humor.",
    "The cosmic microwave background is the oldest light in the universe. Your selfie might be the newest form of art.",
    "Dark energy is causing the universe to expand. Your selfie is causing my eyebrows to raise.",
    "The anthropic principle suggests the universe is fine-tuned for life. Your selfie is fine-tuned for causing existential questions.",
    // Adding 20 more comments
    "The Schrödinger's cat thought experiment suggests a cat can be both alive and dead. Your selfie seems to be both perfect and imperfect simultaneously.",
    "The Heisenberg uncertainty principle states we can't measure position and velocity simultaneously. Your selfie's position on the coolness scale is equally uncertain.",
    "The theory of everything eludes physicists. Your selfie's ability to defy explanation might be the key to unlocking it.",
    "The cosmic inflation theory explains the universe's rapid expansion. Your selfie's ability to expand my confusion is equally rapid.",
    "The standard model of particle physics describes fundamental particles. Your selfie might be the first evidence of a new fundamental particle: the styleon.",
    "The holographic principle suggests our universe might be a projection. Your selfie seems to be projecting from a more stylish dimension.",
    "The quantum tunneling effect allows particles to pass through barriers. Your selfie's ability to pass through my understanding of photography is equally quantum.",
    "The Casimir effect demonstrates quantum vacuum fluctuations. Your selfie's effect on my brain is similarly fluctuating.",
    "The wave-particle duality shows light can behave as both wave and particle. Your selfie seems to exist in multiple states of coolness simultaneously.",
    "The quantum entanglement theory suggests particles can be connected across space. Your selfie seems to be entangled with my sense of humor.",
    "The cosmic censorship hypothesis protects us from naked singularities. Your selfie might be the first exception to this rule.",
    "The holographic universe theory suggests our 3D world is a projection. Your selfie seems to be projecting from a 4D realm of style.",
    "The quantum foam theory describes space-time at the smallest scales. Your selfie's ability to foam my brain is equally quantum.",
    "The anthropic principle suggests the universe is fine-tuned for life. Your selfie is fine-tuned for causing quantum confusion.",
    "The many-worlds interpretation suggests parallel universes. Your selfie might be from the universe where everyone is this stylish.",
    "The quantum decoherence theory explains why quantum effects aren't visible in daily life. Your selfie's ability to decohere my understanding is remarkable.",
    "The cosmic strings theory suggests defects in space-time. Your selfie might be the first evidence of a cosmic string of style.",
    "The quantum chromodynamics theory describes strong interactions. Your selfie's interaction with my sense of style is equally strong.",
    "The cosmic microwave background is the oldest light in the universe. Your selfie might be the newest form of quantum art.",
    "The dark matter problem puzzles physicists. Your selfie's ability to puzzle me might be related to dark matter's influence.",
    "The quantum gravity theory attempts to unify quantum mechanics and gravity. Your selfie might be the first evidence of quantum style gravity."
  ];

  const handleHawkingComment = () => {
    if (!statement) {
      setStatement("Please upload a selfie first!");
      return;
    }
    const randomComment = hawkingComments[Math.floor(Math.random() * hawkingComments.length)];
    setStatement(randomComment);
    speakRoast(randomComment);
  };

  // Function to show floating hearts animation
  const showFloatingHearts = () => {
    const watermarkPos = getWatermarkPosition();
    // Play multiple pop sounds in rapid succession (only if audio is enabled)
    if (audioEnabled) {
      for (let i = 0; i < 15; i++) {
        setTimeout(() => {
          try {
            const audio = new Audio('/audio/pop.wav');
            audio.volume = 0.3;
            audio.playbackRate = 0.8 + Math.random() * 0.4; // Randomize pitch slightly
            audio.play().catch(e => {});
          } catch (e) {}
        }, i * 50);
      }
    }
    for (let i = 0; i < 25; i++) {
      const heart = document.createElement('div');
      heart.classList.add('floating-heart');
      heart.innerHTML = '💗';
      heart.style.left = `${watermarkPos.x + Math.random() * 120 - 60}px`;
      heart.style.top = `${watermarkPos.y + Math.random() * 20 - 10}px`;
      heart.style.position = 'absolute';
      heart.style.width = '20px';
      heart.style.height = '20px';
      heart.style.fontSize = '20px';
      heart.style.animation = `floatUp 3s ease-out forwards`;
      heart.style.animationDelay = i === 0 ? '0s' : `${Math.random() * 0.6}s`;
      heart.style.pointerEvents = 'none';
      heart.style.opacity = '0.8';
      heart.style.zIndex = '1000';
      document.body.appendChild(heart);
      setTimeout(() => {
        if (heart.parentNode) {
          heart.parentNode.removeChild(heart);
        }
      }, 3000);
    }
  };

  // Function to get face center coordinates
  const getFaceCenter = () => {
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
    // Fallback to center of viewport
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };
  };

  // Function to get watermark position (bottom right of image)
  const getWatermarkPosition = () => {
    if (watermarkRef.current) {
      const rect = watermarkRef.current.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      return {
        x: rect.right - 50,
        y: rect.bottom - 30
      };
    }
    return {
      x: window.innerWidth - 100,
      y: window.innerHeight - 80
    };
  };

  // Function to enable audio (call this on first user interaction)
  const enableAudio = () => {
    setAudioEnabled(true);
    console.log('Audio enabled');
  };

  // Function to show floating daggers animation
  const showFloatingDaggers = (x: number, y: number) => {
    // Get watermark position for weapons to rain down on
    const watermarkPos = getWatermarkPosition();
    
    // Play multiple dagger sounds in rapid succession (only if audio is enabled)
    if (audioEnabled) {
      for (let i = 0; i < 12; i++) {
        setTimeout(() => {
          try {
            const audio = new Audio('/audio/knife.mp3'); // Using the new knife sound
            audio.volume = 0.3;
            audio.playbackRate = 1.0 + Math.random() * 0.4; // Slight pitch variation
            audio.play().catch(e => console.error('Knife sound failed:', e));
          } catch (e) {
            console.error('Knife audio creation failed:', e);
          }
        }, i * 80); // Play every 80ms for dagger effect
      }
    }

    // Array of different weapon emojis
    const weapons = ['🗡️', '🔪', '⚔️', '🗡️', '🔪', '⚔️', '🗡️', '🔪', '⚔️', '🗡️', '🔪', '⚔️'];

    for (let i = 0; i < 12; i++) {
      const dagger = document.createElement('div');
      dagger.classList.add('floating-dagger');
      
      // Mix of different weapon emojis
      const weapons = ['🗡️', '🔪', '⚔️', '🗡️', '🔪', '⚔️', '🗡️', '🔪', '⚔️', '🗡️', '🔪', '⚔️'];
      dagger.innerHTML = weapons[i];
      
      // Position weapons above the watermark to rain down
      dagger.style.left = `${watermarkPos.x + Math.random() * 120 - 60}px`;
      dagger.style.top = `${watermarkPos.y - 100}px`;
      dagger.style.position = 'absolute';
      dagger.style.width = '20px';
      dagger.style.height = '20px';
      dagger.style.fontSize = '20px';
      dagger.style.animation = `rainDownDagger 1.2s ease-out forwards`;
      dagger.style.animationDelay = i === 0 ? '0s' : `${Math.random() * 0.6}s`;
      dagger.style.pointerEvents = 'none';
      dagger.style.opacity = '0.9';
      dagger.style.zIndex = '1000';
      
      document.body.appendChild(dagger);

      setTimeout(() => {
        if (dagger.parentNode) {
          dagger.parentNode.removeChild(dagger);
        }
      }, 1200 + (parseFloat(dagger.style.animationDelay) * 1000 || 0));
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gradient-to-br from-pink-100 via-blue-100 to-teal-100">
      {/* Header - Fixed height */}
      <div className="h-[90px] shrink-0 p-2 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-transparent bg-clip-text drop-shadow-lg">
          VibeRaters
        </h1>
        <div className="mt-1 flex justify-center">
          <span className="text-base md:text-lg lg:text-xl font-medium text-blue-700/80 drop-shadow-sm px-4 py-1 rounded-xl">
            Pick a face, any face, we'll generate the vibe and give you the words.
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start p-2 w-full">
        <div className="w-full max-w-6xl">
          <div className="flex flex-col space-y-2 w-full">
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
                  className="block w-full px-4 py-2 text-center bg-blue-500 text-white font-semibold rounded-xl cursor-pointer hover:bg-blue-600 transition-all duration-300 shadow-md hover:shadow-xl border border-white/60 backdrop-blur-md"
                >
                  Pick a Face
                </label>
              </div>
            </div>

            {imageUrl && statement && (
              <div ref={shareRef} className="relative flex flex-col lg:flex-row w-full h-auto items-stretch justify-center mt-4 gap-0 lg:gap-4 bg-transparent">
                <div className="w-full lg:w-3/5 flex items-center justify-center min-w-0">
                  <div className="relative rounded-none overflow-hidden shadow-xl border-none bg-white/60 backdrop-blur-lg flex items-center justify-center w-full" style={{ height: 'min(50vh, 400px)' }}>
                    <div className="container h-full w-full flex items-center justify-center p-2">
                      {imageUrl && (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src={imageUrl}
                            alt="Selfie"
                            className="max-w-full max-h-full w-auto h-auto object-contain"
                            onLoad={() => {
                              setImgLoaded(true);
                              setStatement("I'm Ready!");
                              console.log('Image loaded successfully');
                            }}
                          />
                          {!imgLoaded && (
                            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/50">
                              <div className="text-white text-center">
                                <div className="text-lg font-semibold mb-2">I'm Ready.</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-4 right-4 pointer-events-none">
                      <div ref={watermarkRef} className="text-3xl font-bold text-gray-300 select-none">
                        VibeRaters
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-full lg:w-2/5 flex items-center justify-center min-w-0">
                  <div className="bg-white/70 backdrop-blur-lg rounded-none p-8 border-none shadow-xl w-full h-full flex items-center">
                    {statement === "I'm Ready!" ? (
                      <div className="w-full flex flex-col items-center justify-center">
                        <button
                          onClick={handleHawkingComment}
                          className="px-6 py-3 rounded-xl font-extrabold shadow-lg bg-white text-gray-800 text-lg hover:bg-gray-100 transition-all border border-gray-200 flex items-center gap-2"
                        >
                          {isAudioPlaying && (
                            <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.5 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.5l3.883-3.707zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                          Stephen Hawking says...
                        </button>
                      </div>
                    ) : (
                      <p className="text-blue-900 text-lg md:text-xl lg:text-2xl leading-relaxed font-medium drop-shadow-sm whitespace-pre-line w-full">{statement}</p>
                    )}
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
        <div className="w-full flex flex-col items-center mt-2 overflow-y-auto flex-shrink-0" style={{ maxHeight: 'calc(100vh - 120px - min(50vh, 400px) - 4rem)' }}>
          {/* Roast Level Buttons */}
          <div className="flex flex-col gap-4 my-2 justify-center items-center w-full max-w-full">
            {/* Tell them how you feel */}
            <div className="flex flex-col gap-3 items-center">
              <h3 className="text-xl md:text-2xl font-bold text-blue-900 drop-shadow-sm">
                Tell them how you feel
              </h3>
              <div className="flex flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => {
                    enableAudio(); // Enable audio on first interaction
                    handleLevelRoast('L');
                    const faceCenter = getFaceCenter();
                    showFloatingHearts();
                  }}
                  className={`px-4 py-2 rounded-xl font-extrabold shadow-lg bg-pink-500 text-white text-base md:text-lg hover:bg-pink-600 transition-all ${buttonBounce === 'L' ? 'animate-bounce-smooth' : ''}`}
                >
                  Love You 💖
                </button>
                <button
                  onClick={() => {
                    enableAudio(); // Enable audio on first interaction
                    handleLevelRoast('H');
                    const faceCenter = getFaceCenter();
                    showFloatingDaggers(faceCenter.x, faceCenter.y);
                  }}
                  className={`px-4 py-2 rounded-xl font-extrabold shadow-lg bg-gray-400 text-gray-900 text-base md:text-lg hover:bg-gray-500 transition-all ${buttonBounce === 'H' ? 'animate-bounce' : ''}`}
                >
                  Not So Like You 😐
                </button>
              </div>
            </div>
            
            {/* Roast them how you will */}
            <div className="flex flex-col gap-3 items-center">
              <h3 className="text-xl md:text-2xl font-bold text-blue-900 drop-shadow-sm">
                Roast them how you will
              </h3>
              <div className="flex flex-row flex-wrap gap-4 justify-center items-center">
                <button
                  onClick={handleLevelRoast.bind(null, 'G')}
                  className={`px-4 py-2 rounded-xl font-extrabold shadow-lg bg-green-500 text-white text-base md:text-lg hover:bg-green-600 transition-all ${buttonBounce === 'G' ? 'animate-bounce-smooth' : ''}`}
                >
                  Gentle
                </button>
                <button
                  onClick={handleLevelRoast.bind(null, 'P')}
                  className={`px-4 py-2 rounded-xl font-extrabold shadow-lg bg-yellow-400 text-gray-900 text-base md:text-lg hover:bg-yellow-500 transition-all ${buttonBounce === 'P' ? 'animate-bounce-smooth' : ''}`}
                >
                  Playful
                </button>
                <button
                  onClick={handleLevelRoast.bind(null, 'A')}
                  className={`px-4 py-2 rounded-xl font-extrabold shadow-lg bg-blue-500 text-white text-base md:text-lg hover:bg-blue-600 transition-all ${buttonBounce === 'A' ? 'animate-bounce-smooth' : ''}`}
                >
                  Average
                </button>
                <button
                  onClick={handleLevelRoast.bind(null, 'XXX')}
                  className={`px-4 py-2 rounded-xl font-extrabold shadow-lg bg-black text-white text-base md:text-lg hover:bg-gray-900 transition-all ${buttonBounce === 'XXX' ? 'animate-bounce' : ''}`}
                >
                  Extreme
                </button>
              </div>
            </div>
          </div>
          {/* Social Media Share Section */}
          <div className="w-full flex flex-col items-center mt-6">
            <h3 className="text-xl md:text-2xl font-bold text-blue-900 drop-shadow-sm mb-2">
              Share it with them
            </h3>
            <div className="flex flex-wrap gap-3 justify-center">
              {/* Twitter */}
              <button
                onClick={() => {
                  const text = encodeURIComponent('Check out my VibeRaters result!');
                  const url = encodeURIComponent(imgurUrl || window.location.origin);
                  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
                }}
                className="w-12 h-12 rounded-full bg-[#1DA1F2] text-white flex items-center justify-center shadow-lg hover:bg-[#0d8ddb] transition-all duration-200"
                aria-label="Share on Twitter"
                title="Share on Twitter"
                disabled={imgurLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.46 5.924c-.793.352-1.645.59-2.54.698a4.48 4.48 0 0 0 1.965-2.475 8.94 8.94 0 0 1-2.828 1.082A4.48 4.48 0 0 0 16.11 4c-2.48 0-4.49 2.014-4.49 4.5 0 .353.04.697.116 1.027C7.728 9.37 4.1 7.6 1.67 4.905a4.48 4.48 0 0 0-.61 2.264c0 1.563.796 2.944 2.01 3.755a4.48 4.48 0 0 1-2.034-.563v.057c0 2.184 1.553 4.006 3.617 4.422a4.48 4.48 0 0 1-2.027.077c.572 1.785 2.23 3.084 4.196 3.12A8.98 8.98 0 0 1 2 19.54a12.7 12.7 0 0 0 6.92 2.03c8.303 0 12.85-6.876 12.85-12.84 0-.196-.004-.392-.013-.586A9.18 9.18 0 0 0 24 4.59a8.98 8.98 0 0 1-2.54.698z"/></svg>
              </button>
              {/* Facebook */}
              <button
                onClick={() => {
                  const text = encodeURIComponent('Check out my VibeRaters result!');
                  const url = encodeURIComponent(imgurUrl || window.location.origin);
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
                }}
                className="w-12 h-12 rounded-full bg-[#1877F3] text-white flex items-center justify-center shadow-lg hover:bg-[#145db2] transition-all duration-200"
                aria-label="Share on Facebook"
                title="Share on Facebook"
                disabled={imgurLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0"/></svg>
              </button>
              {/* WhatsApp */}
              <button
                onClick={() => {
                  const text = encodeURIComponent('Check out my VibeRaters result! ' + (imgurUrl || window.location.origin));
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
                className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:bg-[#1da851] transition-all duration-200"
                aria-label="Share on WhatsApp"
                title="Share on WhatsApp"
                disabled={imgurLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.571-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.077 4.363.709.306 1.262.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.617h-.001a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374A9.86 9.86 0 0 1 0 11.513C0 5.156 5.149 0 11.495 0c2.729 0 5.296 1.065 7.223 2.998a10.13 10.13 0 0 1 2.985 7.217c-.003 6.346-5.152 11.484-11.497 11.484m8.413-19.897A11.815 11.815 0 0 0 11.495 0C5.148 0 0 5.156 0 11.513c0 2.026.523 4.008 1.523 5.748L.017 24l6.305-1.654a11.876 11.876 0 0 0 5.178 1.241h.005c6.347 0 11.495-5.138 11.498-11.484a11.82 11.82 0 0 0-3.48-8.413"/></svg>
              </button>
              {/* Instagram */}
              <button
                onClick={() => {
                  alert('Instagram does not support direct web sharing. Please download your image and upload it manually to Instagram.');
                  window.open('https://www.instagram.com/', '_blank');
                }}
                className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-lg hover:from-yellow-500 hover:to-purple-700 transition-all duration-200"
                aria-label="Share on Instagram"
                title="Share on Instagram"
                disabled={imgurLoading}
              >
                <svg width="20" height="20" viewBox="0 0 448 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9 114.9-51.3 114.9-114.9S287.7 141 224.1 141zm0 186c-39.5 0-71.5-32-71.5-71.5s32-71.5 71.5-71.5 71.5 32 71.5 71.5-32 71.5-71.5 71.5zm146.4-194.3c0 14.9-12 26.9-26.9 26.9s-26.9-12-26.9-26.9 12-26.9 26.9-26.9 26.9 12 26.9 26.9zm76.1 27.2c-1.7-35.3-9.9-66.7-36.2-92.1C385.6 9.9 354.2 1.7 318.9 0 281.7-1.7 166.3-1.7 129.1 0 93.8 1.7 62.4 9.9 37.1 35.2 9.9 62.4 1.7 93.8 0 129.1c-1.7 37.2-1.7 152.6 0 189.8 1.7 35.3 9.9 66.7 36.2 92.1 27.2 27.2 58.6 35.4 93.9 37.1 37.2 1.7 152.6 1.7 189.8 0 35.3-1.7 66.7-9.9 92.1-36.2 27.2-27.2 35.4-58.6 37.1-93.9 1.7-37.2 1.7-152.6 0-189.8zM398.8 388c-7.8 19.6-22.9 34.7-42.5 42.5-29.4 11.7-99.2 9-132.3 9s-102.9 2.6-132.3-9c-19.6-7.8-34.7-22.9-42.5-42.5-11.7-29.4-9-99.2-9-132.3s-2.6-102.9 9-132.3c7.8-19.6 22.9-34.7 42.5-42.5 29.4-11.7 99.2-9 132.3-9s102.9-2.6 132.3 9c19.6 7.8 34.7 22.9 42.5 42.5 11.7 29.4 9 99.2 9 132.3s2.6 102.9-9 132.3z"/></svg>
              </button>
              {/* TikTok */}
              <button
                onClick={() => {
                  alert('TikTok does not support direct web sharing. Please download your image and upload it manually to TikTok.');
                  window.open('https://www.tiktok.com/upload', '_blank');
                }}
                className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-lg hover:bg-gray-900 transition-all duration-200"
                aria-label="Share on TikTok"
                title="Share on TikTok"
                disabled={imgurLoading}
              >
                <svg width="20" height="20" viewBox="0 0 448 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M448,209.9v125.1c0,70.7-57.3,128-128,128H128C57.3,463,0,405.7,0,335V209.9C0,139.2,57.3,81.9,128,81.9h192c70.7,0,128,57.3,128,128ZM224,352a80,80,0,1,0-80-80A80,80,0,0,0,224,352Zm0-128a48,48,0,1,1-48,48A48,48,0,0,1,224,224Z"/></svg>
              </button>
            </div>
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