import { MISSIONS } from './missions.js';
import {
  STORAGE_KEY,
  answerQuestion,
  calculateRank,
  createProgress,
  isMissionUnlocked,
  loadProgress,
  missionScore,
  saveProgress,
} from './game.js';

const app = document.querySelector('#app');
const announcer = document.querySelector('#announcer');
const resetButton = document.querySelector('#reset-button');

let progress = loadProgress();
let screen = progress ? 'map' : 'welcome';
let missionIndex = 0;
let questionIndex = 0;
let feedback = null;

resetButton.addEventListener('click', () => {
  if (!window.confirm('¿Quieres borrar todo el progreso de entrenamiento?')) return;
  localStorage.removeItem(STORAGE_KEY);
  progress = null;
  screen = 'welcome';
  render();
});

function icon(name, className = '') {
  const paths = {
    rocket: '<path d="M24 4c9 5 14 14 14 25l-8 8H18l-8-8C10 18 15 9 24 4Z"/><circle cx="24" cy="20" r="4"/><path d="m14 29-7 5v7l11-4m16-8 7 5v7l-11-4M20 38l4 7 4-7"/>',
    orbit: '<circle cx="24" cy="24" r="6"/><ellipse cx="24" cy="24" rx="20" ry="9" transform="rotate(-25 24 24)"/><circle cx="41" cy="13" r="3"/>',
    habitat: '<path d="M8 39V20l16-10 16 10v19H8Z"/><path d="M18 39V27h12v12M8 20h32M24 10V4"/><circle cx="24" cy="4" r="2"/>',
    eva: '<circle cx="24" cy="13" r="7"/><path d="M14 23h20l4 18H10l4-18Zm-1 4-7 8m29-8 7 8M18 41l-2 4m14-4 2 4"/>',
  };
  return `<svg class="${className}" viewBox="0 0 48 48" aria-hidden="true">${paths[name]}</svg>`;
}

function render() {
  if (screen === 'welcome') renderWelcome();
  else if (screen === 'map') renderMap();
  else if (screen === 'briefing') renderBriefing();
  else if (screen === 'question') renderQuestion();
  else if (screen === 'complete') renderComplete();
  window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}

function renderWelcome() {
  app.innerHTML = `
    <section class="welcome-shell">
      <div class="welcome-copy">
        <p class="kicker"><span></span> TRANSMISIÓN DE LA ACADEMIA</p>
        <h1>Tu misión<br><em>empieza aquí.</em></h1>
        <p class="lede">Entrena como astronauta. Aprende a despegar, vivir en órbita, cuidar una nave y resolver emergencias reales.</p>
        <form id="enroll-form" class="enroll-card">
          <label for="cadet-name">IDENTIFICACIÓN DEL CADETE</label>
          <div class="enroll-row">
            <input id="cadet-name" maxlength="24" autocomplete="nickname" placeholder="Escribe tu nombre" />
            <button class="primary-button" type="submit">COMENZAR <span>→</span></button>
          </div>
          <small>Tu progreso se guarda únicamente en este navegador.</small>
        </form>
        <ul class="mission-pills" aria-label="Contenido del entrenamiento">
          <li>4 misiones</li><li>12 decisiones</li><li>Insignias</li>
        </ul>
      </div>
      <div class="launch-bay" aria-label="Cohete preparado en la plataforma de lanzamiento">
        <div class="planet-disc"></div>
        <div class="orbit-line one"></div><div class="orbit-line two"></div>
        <div class="rocket-visual">
          <div class="rocket-nose"></div><div class="rocket-window"></div><div class="rocket-body"></div>
          <div class="rocket-fin left"></div><div class="rocket-fin right"></div><div class="rocket-flame"></div>
        </div>
        <span class="bay-label">PLATAFORMA 07 // LISTA</span>
      </div>
    </section>`;

  document.querySelector('#enroll-form').addEventListener('submit', (event) => {
    event.preventDefault();
    progress = createProgress(document.querySelector('#cadet-name').value);
    saveProgress(progress);
    screen = 'map';
    announcer.textContent = `Bienvenido, ${progress.name}. Tu entrenamiento está listo.`;
    render();
  });
}

function stats() {
  return `
    <div class="cadet-chip"><span>${progress.name.slice(0, 1).toUpperCase()}</span><div><small>CADETE</small><strong>${progress.name}</strong></div></div>
    <div class="score-chip"><small>PUNTOS</small><strong>${String(progress.score).padStart(4, '0')}</strong></div>
    <div class="rank-chip"><small>RANGO ACTUAL</small><strong>${calculateRank(progress.score)}</strong></div>`;
}

function renderMap() {
  const finished = progress.completed.length === MISSIONS.length;
  app.innerHTML = `
    <section class="trainer-shell">
      <div class="trainer-top">${stats()}</div>
      <div class="map-heading">
        <div><p class="kicker"><span></span> RUTA DE ENTRENAMIENTO</p><h1>${finished ? '¡Programa completado!' : 'Selecciona tu próxima misión'}</h1></div>
        <div class="overall"><span>${progress.completed.length}/${MISSIONS.length}</span><small>MISIONES SUPERADAS</small></div>
      </div>
      <div class="mission-route">
        ${MISSIONS.map((mission, index) => missionCard(mission, index)).join('')}
      </div>
      <aside class="academy-note">
        <strong>CONSEJO DE LA INSTRUCTORA LUNA</strong>
        <p>No memorices solamente la respuesta: lee la explicación y piensa por qué protege a la tripulación.</p>
      </aside>
    </section>`;

  document.querySelectorAll('[data-mission]').forEach((button) => {
    button.addEventListener('click', () => {
      missionIndex = Number(button.dataset.mission);
      questionIndex = 0;
      feedback = null;
      screen = 'briefing';
      render();
    });
  });
}

function missionCard(mission, index) {
  const unlocked = isMissionUnlocked(index, progress);
  const complete = progress.completed.includes(mission.id);
  const correct = missionScore(progress, mission.id);
  return `
    <article class="mission-card ${unlocked ? '' : 'locked'} ${complete ? 'complete' : ''}" style="--accent:${mission.color}">
      <div class="mission-number">${mission.number}</div>
      <div class="mission-icon">${icon(mission.icon)}</div>
      <p>${mission.eyebrow}</p><h2>${mission.title}</h2><span class="skill">${mission.skill}</span>
      ${unlocked
        ? `<button data-mission="${index}" type="button">${complete ? `REPETIR · ${correct}/3` : 'INICIAR MISIÓN'} <span>→</span></button>`
        : '<div class="lock-label">◈ COMPLETA LA MISIÓN ANTERIOR</div>'}
      ${complete ? '<div class="complete-stamp">✓ SUPERADA</div>' : ''}
    </article>`;
}

function renderBriefing() {
  const mission = MISSIONS[missionIndex];
  app.innerHTML = `
    <section class="briefing-shell" style="--accent:${mission.color}">
      <button class="text-button back-map" type="button">← VOLVER AL MAPA</button>
      <div class="briefing-grid">
        <div class="briefing-visual"><span>${mission.number}</span>${icon(mission.icon, 'large-icon')}<i></i></div>
        <div class="briefing-copy">
          <p class="kicker"><span></span> INFORME DE MISIÓN ${mission.number}</p>
          <h1>${mission.title}</h1><p>${mission.briefing}</p>
          <dl><div><dt>OBJETIVO</dt><dd>${mission.skill}</dd></div><div><dt>DURACIÓN</dt><dd>3 decisiones</dd></div><div><dt>RECOMPENSA</dt><dd>Insignia + puntos</dd></div></dl>
          <button class="primary-button begin-mission" type="button">ACEPTAR MISIÓN <span>→</span></button>
        </div>
      </div>
    </section>`;
  document.querySelector('.back-map').addEventListener('click', () => { screen = 'map'; render(); });
  document.querySelector('.begin-mission').addEventListener('click', () => { screen = 'question'; render(); });
}

function renderQuestion() {
  const mission = MISSIONS[missionIndex];
  const question = mission.questions[questionIndex];
  const key = `${mission.id}:${questionIndex}`;
  const stored = progress.answers[key];
  if (stored && !feedback) feedback = { correct: stored.correct, points: 0, selected: stored.option };
  const step = questionIndex + 1;
  app.innerHTML = `
    <section class="simulation-shell" style="--accent:${mission.color}">
      <aside class="sim-rail">
        <div class="sim-mission-icon">${icon(mission.icon)}</div><small>MISIÓN ${mission.number}</small><strong>${mission.short}</strong>
        <ol>${mission.questions.map((_, i) => `<li class="${i === questionIndex ? 'active' : ''} ${i < questionIndex || progress.answers[`${mission.id}:${i}`] ? 'done' : ''}"><span>${i + 1}</span></li>`).join('')}</ol>
        <button class="text-button quit-mission" type="button">SALIR</button>
      </aside>
      <div class="scenario">
        <div class="scenario-head"><span>ESCENARIO ${step}/3</span><span>RACHA ×${progress.streak}</span></div>
        <div class="scenario-window">${sceneFor(mission.id, step)}<div class="telemetry">SIM // ${mission.id.toUpperCase()}-${step} &nbsp; ◉ EN VIVO</div></div>
        <div class="question-copy"><p class="fact-tag">DATO DE MISIÓN</p><p class="fact">${question.fact}</p><h1>${question.prompt}</h1></div>
        <div class="answers">
          ${question.options.map((option, index) => answerButton(option, index, question.correct)).join('')}
        </div>
        ${feedback ? feedbackBlock(question) : ''}
      </div>
      <aside class="mission-data">${stats()}<div class="data-card"><small>HABILIDAD</small><strong>${mission.skill}</strong></div><div class="data-card"><small>PUNTOS POSIBLES</small><strong>100 + RACHA</strong></div></aside>
    </section>`;

  document.querySelector('.quit-mission').addEventListener('click', () => { feedback = null; screen = 'map'; render(); });
  document.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => chooseAnswer(Number(button.dataset.answer))));
  document.querySelector('.next-button')?.addEventListener('click', nextQuestion);
}

function answerButton(option, index, correctIndex) {
  let state = '';
  if (feedback) state = index === correctIndex ? 'correct' : index === feedback.selected ? 'wrong' : 'muted';
  return `<button class="answer ${state}" data-answer="${index}" type="button" ${feedback ? 'disabled' : ''}><span>${String.fromCharCode(65 + index)}</span>${option}</button>`;
}

function chooseAnswer(optionIndex) {
  const result = answerQuestion(progress, missionIndex, questionIndex, optionIndex);
  progress = result.progress;
  feedback = { correct: result.correct, points: result.points, selected: optionIndex };
  saveProgress(progress);
  announcer.textContent = result.correct ? `Respuesta correcta. Ganaste ${result.points} puntos.` : 'Respuesta incorrecta. Revisa la explicación.';
  render();
  document.querySelector('.feedback')?.focus();
}

function feedbackBlock(question) {
  return `<div class="feedback ${feedback.correct ? 'success' : 'retry'}" tabindex="-1">
    <div class="feedback-symbol">${feedback.correct ? '✓' : '!'}</div><div><small>${feedback.correct ? `CORRECTO · +${feedback.points} PUNTOS` : 'APRENDE Y CONTINÚA'}</small><p>${question.explanation}</p></div>
    <button class="next-button" type="button">${questionIndex === 2 ? 'FINALIZAR' : 'SIGUIENTE'} →</button>
  </div>`;
}

function nextQuestion() {
  feedback = null;
  if (questionIndex < 2) { questionIndex += 1; render(); }
  else { screen = 'complete'; render(); }
}

function renderComplete() {
  const mission = MISSIONS[missionIndex];
  const correct = missionScore(progress, mission.id);
  app.innerHTML = `
    <section class="complete-shell" style="--accent:${mission.color}">
      <div class="badge-burst"><i></i><div>${icon(mission.icon)}<span>INSIGNIA ${mission.number}</span></div></div>
      <p class="kicker"><span></span> MISIÓN COMPLETADA</p><h1>${mission.title}</h1>
      <p>Has demostrado criterio de astronauta. Cada decisión segura acerca a toda la tripulación a casa.</p>
      <div class="result-strip"><div><strong>${correct}/3</strong><small>RESPUESTAS CORRECTAS</small></div><div><strong>${progress.score}</strong><small>PUNTOS TOTALES</small></div><div><strong>${progress.bestStreak}</strong><small>MEJOR RACHA</small></div></div>
      <button class="primary-button return-map" type="button">CONTINUAR ENTRENAMIENTO <span>→</span></button>
    </section>`;
  document.querySelector('.return-map').addEventListener('click', () => { screen = 'map'; render(); });
}

function sceneFor(id, step) {
  const labels = {
    launch: ['CLIMA EN PLATAFORMA', 'SECUENCIA GO / NO-GO', 'ASCENSO NOMINAL'],
    orbit: ['MICROGRAVEDAD', 'AJUSTE DE TRAYECTORIA', 'PÉRDIDA DE SEÑAL'],
    habitat: ['CALIDAD DEL AIRE', 'CICLO DEL AGUA', 'ALERTA DE HUMO'],
    eva: ['REVISIÓN DE ESCLUSA', 'PRESIÓN DEL TRAJE', 'HERRAMIENTA SUELTA'],
  };
  return `<div class="scene-art ${id}"><div class="scene-planet"></div><div class="scene-craft">${icon(id === 'launch' ? 'rocket' : id === 'orbit' ? 'orbit' : id === 'habitat' ? 'habitat' : 'eva')}</div><div class="scene-grid"></div><strong>${labels[id][step - 1]}</strong></div>`;
}

render();
