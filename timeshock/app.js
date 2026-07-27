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
let userAnswers = [];
let shockTimeout = null;
let isMovieSkipped = false; // ムービースキップ済みフラグ

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
  setupMovieEvents();
});

// 🎬 動画（movie.mp4）の制御処理
function setupMovieEvents() {
  const video = document.getElementById('intro-video');
  if (!video) {
    skipMovie();
    return;
  }

  video.loop = false;

  // 動画再生終了時
  video.onended = () => {
    skipMovie();
  };

  // エラー時
  video.onerror = () => {
    console.warn("movie.mp4の読み込みエラーのためスキップします。");
    skipMovie();
  };

  // 画面タップでスキップ
  const movieOverlay = document.getElementById('movie-overlay');
  if (movieOverlay) {
    movieOverlay.addEventListener('click', () => {
      skipMovie();
    });
  }

  video.play().catch(err => {
    console.log("自動再生ブロック。タップでスキップ可能。");
  });
}

// ⏩ 動画スキップ＆画面切り替え処理
function skipMovie() {
  if (isMovieSkipped) return;
  isMovieSkipped = true;

  const video = document.getElementById('intro-video');
  if (video) {
    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch (e) {
      console.log(e);
    }
  }

  // 1. ムービー画面を完全に消去
  const movieOverlay = document.getElementById('movie-overlay');
  if (movieOverlay) {
    movieOverlay.classList.add('hidden');
    movieOverlay.style.display = 'none';
  }

  // 2. トップ画面を表示（※縦向きの場合はCSSの@mediaにより自動的に「横向きメッセージ」が上にかぶさります）
  const startOverlay = document.getElementById('start-overlay');
  if (startOverlay) {
    startOverlay.classList.remove('hidden');
    startOverlay.style.display = 'flex';
  }
}

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
  
  // 各種オーバーレイを非表示に
  document.getElementById('result-overlay').classList.add('hidden');
  document.getElementById('review-overlay').classList.add('hidden');
  
  const movieOverlay = document.getElementById('movie-overlay');
  if (movieOverlay) movieOverlay.style.display = 'none';

  const startOverlay = document.getElementById('start-overlay');
  startOverlay.classList.remove('hidden');
  startOverlay.style.display = 'flex';
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
  document.getElementById('start-overlay').style.display = 'none';
  document.getElementById('result-overlay').classList.add('hidden');
  document.getElementById('review-overlay').classList.add('hidden');

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
  userAnswers = Array(12).fill("時間切れ");

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

  // タイマー設定
  if (gameInterval) clearInterval(gameInterval);
  if (isTimerEnabled) {
    gameInterval = setInterval(() => {
      totalTime--;
      document.getElementById('timer-text').innerText = totalTime;

      if (totalTime % 10 === 0) {
        if (questionResults[currentQuestionIdx] === 0) {
          userAnswers[currentQuestionIdx] = "時間切れ";
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

  userAnswers[currentQuestionIdx] = selectedText;
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

  const resultOverlay = document.getElementById('result-overlay');
  resultOverlay.classList.remove('hidden');
  resultOverlay.style.display = 'flex';
}

// 📜 正解と解説の一覧画面を表示
function showReview() {
  if (shockTimeout) clearTimeout(shockTimeout);
  stopShockEffects();

  document.getElementById('result-overlay').classList.add('hidden');
  document.getElementById('result-overlay').style.display = 'none';

  const reviewListEl = document.getElementById('review-list');
  reviewListEl.innerHTML = '';

  currentQuizList.forEach((q, index) => {
    const isCorrect = (questionResults[index] === 1);
    const userAnsText = userAnswers[index] || "未回答";

    const item = document.createElement('div');
    item.className = `review-item ${isCorrect ? 'is-correct' : 'is-wrong'}`;

    item.innerHTML = `
      <div class="review-header">
        <span>第 ${index + 1} 問</span>
        <span>${isCorrect ? '⭕ 正解' : '❌ 不正解'}</span>
      </div>
      <div class="review-q">Q. ${q.question}</div>
      <div class="review-ans">⭕ 正解: ${q.answer}</div>
      <div class="review-user-ans">あなたの回答: ${userAnsText}</div>
      <div class="review-exp">💡 解説: ${q.explanation || '解説はありません。'}</div>
    `;

    reviewListEl.appendChild(item);
  });

  const reviewOverlay = document.getElementById('review-overlay');
  reviewOverlay.classList.remove('hidden');
  reviewOverlay.style.display = 'flex';
}
