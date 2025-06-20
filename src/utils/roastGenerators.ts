import { 
  moods, ages, genders, moodPhrases, agePhrases, genderPhrases, 
  partnerPersonasMale, partnerPersonasFemale, moodPhrases2 
} from '../data/roastData';
import { getUniqueRandomIndex, getPronouns, getSeasonalPhrase, randomPick } from './helpers';

// Session-level used sets for partner personas and mood phrases
const usedPartnerPersonasMale = new Set<number>();
const usedPartnerPersonasFemale = new Set<number>();

export const generateRoast = (mood: string, age: string, gender: string) => {
  const pronouns = getPronouns(gender);
  const seasonalPhrase = getSeasonalPhrase();
  
  // Get unique random indices
  const moodIdx = getUniqueRandomIndex(new Set(), moodPhrases[mood as keyof typeof moodPhrases]?.length || 1);
  const ageIdx = getUniqueRandomIndex(new Set(), agePhrases[age as keyof typeof agePhrases]?.length || 1);
  const genderIdx = getUniqueRandomIndex(new Set(), genderPhrases[gender as keyof typeof genderPhrases]?.length || 1);
  const mood2Idx = getUniqueRandomIndex(new Set(), moodPhrases2.length);
  
  // Get partner persona based on gender
  let partnerPersona: string;
  if (gender === 'male') {
    const personaIdx = getUniqueRandomIndex(usedPartnerPersonasMale, partnerPersonasMale.length);
    partnerPersona = partnerPersonasMale[personaIdx];
  } else {
    const personaIdx = getUniqueRandomIndex(usedPartnerPersonasFemale, partnerPersonasFemale.length);
    partnerPersona = partnerPersonasFemale[personaIdx];
  }
  
  // Build the roast
  const moodPhrase = moodPhrases[mood as keyof typeof moodPhrases]?.[moodIdx] || "You're absolutely amazing! ✨";
  const agePhrase = agePhrases[age as keyof typeof agePhrases]?.[ageIdx] || "You're timeless! 💫";
  const genderPhrase = genderPhrases[gender as keyof typeof genderPhrases]?.[genderIdx] || "You're perfect! 🌟";
  const mood2Phrase = moodPhrases2[mood2Idx];
  
  const roast = `${moodPhrase}\n\n${agePhrase}\n\n${genderPhrase}\n\n${mood2Phrase}\n\n${pronouns.subject} is ${partnerPersona}.\n\n${seasonalPhrase}`;
  
  return roast;
};

export const generateMoodAgeGenderRoast = (mood: string, age: string, gender: string) => {
  return generateRoast(mood, age, gender);
}; 