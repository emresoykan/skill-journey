export type Analysis = { skill: string; xp: number; reason: string };

const rules = [
  { skill: 'Communication', words: ['talk', 'spoke', 'explain', 'present', 'listen', 'message', 'konuş', 'anlat', 'sunum', 'dinle'], reason: 'You made an idea clearer or connected with someone.' },
  { skill: 'Problem Solving', words: ['solve', 'fix', 'debug', 'issue', 'problem', 'tricky', 'çöz', 'hata', 'sorun'], reason: 'You worked through a challenge and found a way forward.' },
  { skill: 'Collaboration', words: ['team', 'help', 'together', 'support', 'friend', 'colleague', 'ekip', 'yardım', 'birlikte', 'arkadaş'], reason: 'You helped someone or moved forward together.' },
  { skill: 'Learning', words: ['learn', 'study', 'read', 'practice', 'course', 'new', 'öğren', 'çalış', 'oku', 'pratik', 'yeni'], reason: 'You invested time in understanding or practicing something.' },
  { skill: 'Creativity', words: ['create', 'write', 'design', 'idea', 'draw', 'make', 'yarat', 'tasar', 'fikir', 'çiz', 'yaz'], reason: 'You turned an idea into something tangible.' },
  { skill: 'Resilience', words: ['hard', 'difficult', 'failed', 'again', 'try', 'challenge', 'zor', 'tekrar', 'dened', 'başarısız'], reason: 'You kept going through something difficult.' },
] as const;

export async function analyzeExperience(description: string): Promise<Analysis> {
  // Deterministic local preview. Replace this function when a real service is ready.
  await new Promise(resolve => setTimeout(resolve, 450));
  const text = description.toLocaleLowerCase();
  const ranked = rules.map((rule, index) => ({ rule, index, score: rule.words.filter(word => text.includes(word)).length })).sort((a, b) => b.score - a.score || a.index - b.index);
  const match = ranked[0];
  const wordCount = description.trim().split(/\s+/).length;
  return {
    skill: match.score > 0 ? match.rule.skill : 'Self Awareness',
    xp: Math.min(50, 15 + Math.min(20, wordCount) + (match.score > 0 ? 5 : 0)),
    reason: match.score > 0 ? match.rule.reason : 'Taking time to reflect helps you notice your own growth.',
  };
}
