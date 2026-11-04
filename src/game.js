import { MISSIONS } from './missions.js';

export const STORAGE_KEY = 'jamt.progress.v1';

export function createProgress(name = 'Cadete') {
  return {
    name: name.trim().slice(0, 24) || 'Cadete',
    score: 0,
    streak: 0,
    bestStreak: 0,
    completed: [],
    answers: {},
  };
}

export function calculateRank(score) {
  if (score >= 1400) return 'Comandante junior';
  if (score >= 900) return 'Especialista de misión';
  if (score >= 450) return 'Cadete orbital';
  return 'Aspirante espacial';
}

export function isMissionUnlocked(index, progress) {
  return index === 0 || progress.completed.includes(MISSIONS[index - 1].id);
}

export function answerQuestion(progress, missionIndex, questionIndex, optionIndex) {
  const mission = MISSIONS[missionIndex];
  const question = mission?.questions[questionIndex];
  if (!question) throw new Error('Pregunta inexistente');
  const key = `${mission.id}:${questionIndex}`;
  if (Object.hasOwn(progress.answers, key)) return { progress, correct: progress.answers[key].correct, points: 0 };

  const correct = optionIndex === question.correct;
  const streak = correct ? progress.streak + 1 : 0;
  const points = correct ? 100 + Math.min(100, (streak - 1) * 20) : 0;
  const answers = { ...progress.answers, [key]: { option: optionIndex, correct } };
  const completed = [...progress.completed];
  const missionDone = mission.questions.every((_, index) => Object.hasOwn(answers, `${mission.id}:${index}`));
  if (missionDone && !completed.includes(mission.id)) completed.push(mission.id);

  return {
    correct,
    points,
    progress: {
      ...progress,
      score: progress.score + points,
      streak,
      bestStreak: Math.max(progress.bestStreak, streak),
      answers,
      completed,
    },
  };
}

export function missionScore(progress, missionId) {
  return Object.entries(progress.answers)
    .filter(([key]) => key.startsWith(`${missionId}:`))
    .reduce((total, [, answer]) => total + (answer.correct ? 1 : 0), 0);
}

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    return saved && typeof saved.score === 'number' ? saved : null;
  } catch {
    return null;
  }
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // The trainer remains playable when storage is unavailable.
  }
}
