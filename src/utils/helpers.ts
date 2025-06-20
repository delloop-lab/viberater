// Session-level used sets for partner personas and mood phrases
const usedPartnerPersonasMale = new Set<number>();
const usedPartnerPersonasFemale = new Set<number>();

export const shuffleArray = (array: string[]) => {
  // Fisher-Yates shuffle
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const getUniqueRandomIndex = (usedSet: Set<number>, max: number) => {
  if (usedSet.size >= max) usedSet.clear();
  let idx = Math.floor(Math.random() * max);
  while (usedSet.has(idx)) {
    idx = Math.floor(Math.random() * max);
  }
  usedSet.add(idx);
  return idx;
};

// Helper for correct pronouns
export const getPronouns = (gender: string) => {
  if (gender === 'male') {
    return { subject: 'He', object: 'him', possessive: 'his' };
  } else {
    return { subject: 'She', object: 'her', possessive: 'her' };
  }
};

// Helper for seasonal/holiday phrases
export const getSeasonalPhrase = () => {
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

export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
} 