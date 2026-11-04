import test from 'node:test';
import assert from 'node:assert/strict';
import { answerQuestion, calculateRank, createProgress, isMissionUnlocked, missionScore } from '../src/game.js';

test('creates a safe default cadet name', () => {
  assert.equal(createProgress('   ').name, 'Cadete');
  assert.equal(createProgress(' Luna ').name, 'Luna');
});

test('correct answers award points and build a streak', () => {
  const first = answerQuestion(createProgress(), 0, 0, 1);
  const second = answerQuestion(first.progress, 0, 1, 2);
  assert.equal(first.points, 100);
  assert.equal(second.points, 120);
  assert.equal(second.progress.streak, 2);
});

test('wrong answers reset the streak and cannot be scored twice', () => {
  const first = answerQuestion(createProgress(), 0, 0, 1);
  const wrong = answerQuestion(first.progress, 0, 1, 0);
  const duplicate = answerQuestion(wrong.progress, 0, 1, 2);
  assert.equal(wrong.progress.streak, 0);
  assert.equal(duplicate.points, 0);
});

test('missions unlock in order', () => {
  const progress = createProgress();
  assert.equal(isMissionUnlocked(0, progress), true);
  assert.equal(isMissionUnlocked(1, progress), false);
  progress.completed.push('launch');
  assert.equal(isMissionUnlocked(1, progress), true);
});

test('mission completion and rank calculations are deterministic', () => {
  let progress = createProgress();
  progress = answerQuestion(progress, 0, 0, 1).progress;
  progress = answerQuestion(progress, 0, 1, 2).progress;
  progress = answerQuestion(progress, 0, 2, 1).progress;
  assert.equal(progress.completed.includes('launch'), true);
  assert.equal(missionScore(progress, 'launch'), 3);
  assert.equal(calculateRank(1500), 'Comandante junior');
});
