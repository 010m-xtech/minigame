// ─── グローバル変数 ───
let rawQuizData = []; // jsonからロードしたデータ
let selectedEra = '1990年代';
let isTimerEnabled = true;

let currentQuizList = [];
let currentQuestionIdx = 0;
let correctCount = 0;
let totalTime = 120; // 12問 × 10秒 = 120秒
let gameInterval = null;
let questionResults = [];
let shockTimeout = null;

// 定義された3つのジャンル名
const GENRES = [
  "エモい！平成・令和スイーツ＆フード",
  "青春のプレイリスト！懐かしのメガヒットソング",
  "あの頃夢中になった！マンガ・アニメ・ゲーム"
];

// 初期ロード処理
document.addEventListener('DOMContentLoaded', () => {
  buildClockDial();
  loadJsonData();
});

// JSONデータのロード
async function loadJsonData() {
  try {
    const res = await fetch('./data/questions.json');
    if (!res.ok) throw new Error('Failed to fetch json');
    rawQuizData = await res.json();
    console.log(`全 ${rawQuizData.length} 問ロード完了`);
  } catch (err) {
    console.error(err);
    alert('クイズデータ(data/questions.json)の読み込みに失敗しました。');
  }
}

// 時計ランプの生成
function buildClockDial() {
  const dial = document.getElementById('dial');
  dial.innerHTML = `
    <div class="clock-center">
      <div class="time-display" id="timer-text">120</div>
      <div class="score-display" id="correct-text">正解: 0/12</div>
    </div>
  `;

  for (let i = 1; i <= 12; i++) {
    const lamp = document.createElement('div');
    lamp.className = 'num-lamp';
    lamp.id = `lamp-${i}`;
    lamp.innerText = i;
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const radius = 110;
    const x = 140 + radius * Math.cos(angle);
    const y = 140 + radius * Math.sin(angle);
    lamp.style.left = `${x}px`;
    lamp.style.top = `${y}px`;
    dial.appendChild(lamp);
  }
}

// 設定：年代選択
function selectEra(era, btn) {
  selectedEra = era;
  const parent = btn.parentElement;
  parent.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// 設定：タイマー有無選択
function selectTimerMode(enabled, btn) {
  isTimerEnabled = enabled;
  const parent = btn.parentElement;
  parent.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ホーム画面を表示
function showHome() {
  if (shockTimeout) clearTimeout(shockTimeout);
  stopShockEffects();
  document.getElementById('result-overlay').classList.add('hidden');
  document.getElementById('start-overlay').classList.remove('hidden');
}

// 配列シャッフル関数 (Fisher-Yates)
function shuffleArray(arr) {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ゲーム開始
function startGame() {
  if (rawQuizData.length === 0) {
    alert("クイズデータを読み込んでいます。少々お待ちください。");
    return;
  }

  if (shockTimeout) clearTimeout(shockTimeout);
  stopShockEffects();

  document.getElementById('start-overlay').classList.add('hidden');
  document.getElementById('result-overlay').classList.add('hidden');

  // 選択された年代でフィルタリング
  const eraQuestions = rawQuizData.filter(q => q.decade === selectedEra);

  // 3つのジャンルからそれぞれ4問ずつ抽出してシャッフル
  let selected12 = [];
  GENRES.forEach(genre => {
    const genreFiltered = eraQuestions.filter(q => q.genre === genre);
    const picked4 = shuffleArray(genreFiltered).slice(0, 4);
    selected12 = selected12.concat(picked4);
  });

  // 全12問をシャッフル
  currentQuizList = shuffleArray(selected12);

  if (currentQuizList.length < 12) {
    alert("問題数が足りません。jsonデータを確認してください。");
    return;
  }

  currentQuestionIdx = 0;
  correctCount = 0;
  totalTime = 120; // 12問 × 10秒 = 120秒
  questionResults = Array(12).fill(0);

  document.getElementById('era-badge').innerText = `🎯 【${selectedEra}】 10問正解をめざせ！`;
  document.getElementById('correct-text').innerText = "正解: 0/12";

  if (isTimerEnabled) {
    document.getElementById('timer-text').innerText = totalTime;
  } else {
    document.getElementById('timer-text').innerText = "∞";
  }

  for (let i = 1; i <= 12; i++) {
    document.getElementById(`lamp-${i}`).className = 'num-lamp';
  }

  showQuestion();

  // タイマー設定（1秒ごとに減算、10秒ごとに問題切り替え）
  if (gameInterval) clearInterval(gameInterval);
  if (isTimerEnabled) {
    gameInterval = setInterval(() => {
      totalTime--;
      document.getElementById('timer-text').innerText = totalTime;

      // 10秒ごとのタイミングで未解答なら時間切れ（不正解）として次へ
      if (totalTime % 10 === 0) {
        if (questionResults[currentQuestionIdx] === 0) {
          recordResult(false);
          goToNext();
        }
      }

      if (totalTime <= 0) endGame();
    }, 1000);
  }
}

// 問題表示
function showQuestion() {
  if (currentQuestionIdx >= 12) {
    endGame();
    return;
  }

  const currentQuiz = currentQuizList[currentQuestionIdx];
  document.getElementById('quiz-question').innerText = currentQuiz.question;

  // 選択肢のシャッフル
  const shuffledOptions = shuffleArray(currentQuiz.options);

  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`btn${i}`);
    btn.innerText = shuffledOptions[i];
    btn.disabled = false;
    btn.onclick = () => selectAnswerText(shuffledOptions[i], currentQuiz.answer);
  }

  const currentLamp = document.getElementById(`lamp-${currentQuestionIdx + 1}`);
  if (currentLamp) currentLamp.classList.add('current');
}

// 解答チェック
function selectAnswerText(selectedText, correctText) {
  for (let i = 0; i < 4; i++) {
    document.getElementById(`btn${i}`).disabled = true;
  }

  const isCorrect = (selectedText === correctText);
  if (isCorrect) correctCount++;

  recordResult(isCorrect);

  setTimeout(() => {
    goToNext();
  }, 200);
}

// 記録処理
function recordResult(isCorrect) {
  questionResults[currentQuestionIdx] = isCorrect ? 1 : -1;
  document.getElementById('correct-text').innerText = `正解: ${correctCount}/12`;

  const currentLamp = document.getElementById(`lamp-${currentQuestionIdx + 1}`);
  if (currentLamp) {
    currentLamp.className = isCorrect ? 'num-lamp correct' : 'num-lamp wrong';
  }
}

// 次の問へ移動
function goToNext() {
  currentQuestionIdx++;
  if (currentQuestionIdx < 12) {
    if (isTimerEnabled) {
      totalTime = 120 - (currentQuestionIdx * 10);
      document.getElementById('timer-text').innerText = totalTime;
    }
    showQuestion();
  } else {
    endGame();
  }
}

// 特殊演出停止
function stopShockEffects() {
  document.getElementById('main-body').className = '';
  document.getElementById('flash-layer').style.display = 'none';
  document.getElementById('crack-layer').style.display = 'none';
}

// ゲーム終了処理
function endGame() {
  if (gameInterval) clearInterval(gameInterval);

  const body = document.getElementById('main-body');
  const resTitle = document.getElementById('result-title');
  const resDesc = document.getElementById('result-desc');

  // 時間制限あり＆3問以下のときのみTIME SHOCKペナルティ演出
  if (isTimerEnabled && correctCount <= 3) {
    resTitle.innerText = "💥 TIME SHOCK!!";
    resTitle.style.color = "#ff3333";
    resDesc.innerText = `正解数はわずか ${correctCount} 問！\n恐怖の回転ペナルティ発生！`;

    body.className = 'time-shock-shake-active';
    document.getElementById('flash-layer').style.display = 'block';
    document.getElementById('crack-layer').style.display = 'block';

    shockTimeout = setTimeout(() => {
      stopShockEffects();
      resTitle.innerText = "💀 CHALLENGE FAILED";
      resTitle.style.color = "#ff8888";
      resDesc.innerText = `ペナルティ終了。\n正解数は ${correctCount} 問でした。\n次は10問正解を目指しましょう！`;
    }, 3000);

  } else if (correctCount >= 10) {
    resTitle.innerText = "👑👑 CLEAR 👑👑";
    resTitle.style.color = "#ffc107";
    resDesc.innerText = `見事目標達成！ ${correctCount} 問正解！\n素晴らしいクイズ王です！`;
  } else {
    resTitle.innerText = "✨ CHALLENGE END";
    resTitle.style.color = "#4caf50";
    resDesc.innerText = `12問中、 ${correctCount} 問正解しました！\nあと一歩で目標の10問でしたね。`;
  }

  document.getElementById('result-overlay').classList.remove('hidden');
}
