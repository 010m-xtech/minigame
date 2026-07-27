// グローバル変数
let allQuestions = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let timer = null;
let timeLeft = 10;

// 設定値
let selectedMode = '1p';
let selectedDecade = '1990年代';
let selectedGenre = 'エモい！平成・令和スイーツ＆フード';

// DOM要素の取得
const screens = {
  home: document.getElementById('home-screen'),
  quiz: document.getElementById('quiz-screen'),
  result: document.getElementById('result-screen')
};

// 初期化：JSONファイルのロード
document.addEventListener('DOMContentLoaded', () => {
  fetchQuizData();
  setupEventListeners();
});

// JSONデータの取得
async function fetchQuizData() {
  try {
    const response = await fetch('./data/questions.json');
    if (!response.ok) throw new Error('データ読み込み失敗');
    allQuestions = await response.json();
    console.log(`全 ${allQuestions.length} 問のロード完了`);
  } catch (error) {
    alert("クイズデータの読み込みに失敗しました。data/questions.json の配置を確認してください。");
    console.error(error);
  }
}

// イベントリスナー設定
function setupEventListeners() {
  // モード切替
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      selectedMode = e.target.dataset.mode;
    });
  });

  // 年代切替
  document.querySelectorAll('.decade-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.decade-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      selectedDecade = e.target.dataset.decade;
    });
  });

  // ジャンル切替
  document.querySelectorAll('.genre-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      selectedGenre = e.target.dataset.genre;
    });
  });

  // スタートボタン
  document.getElementById('start-btn').addEventListener('click', startQuiz);

  // リスタートボタン
  document.getElementById('restart-btn').addEventListener('click', () => {
    showScreen('home');
  });
}

// 画面切替関数
function showScreen(screenName) {
  Object.keys(screens).forEach(key => {
    screens[key].classList.remove('active');
  });
  screens[screenName].classList.add('active');
}

// 配列のシャッフル（Fisher-Yates）
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ゲーム開始処理
function startQuiz() {
  // 選択条件に合う問題をフィルタリング
  const filtered = allQuestions.filter(q => 
    q.decade === selectedDecade && q.genre === selectedGenre
  );

  if (filtered.length === 0) {
    alert("該当する問題が見つかりませんでした。");
    return;
  }

  // ランダムにシャッフルして5問抽出
  currentQuestions = shuffle(filtered).slice(0, 5);
  currentQuestionIndex = 0;
  score = 0;

  // バッジ更新
  document.getElementById('current-decade-badge').textContent = selectedDecade;

  showScreen('quiz');
  showQuestion();
}

// 1問ごとの表示とタイマー開始
function showQuestion() {
  clearInterval(timer);
  const qData = currentQuestions[currentQuestionIndex];

  // 進捗表示
  document.getElementById('progress-text').textContent = `第 ${currentQuestionIndex + 1} / ${currentQuestions.length} 問`;
  document.getElementById('question-text').textContent = qData.question;

  // 選択肢の配置（選択肢もランダムシャッフル）
  const optionsContainer = document.getElementById('options-container');
  optionsContainer.innerHTML = '';

  const shuffledOptions = shuffle(qData.options);

  shuffledOptions.forEach(optText => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = optText;
    btn.addEventListener('click', () => checkAnswer(optText, qData.answer, btn));
    optionsContainer.appendChild(btn);
  });

  // 5秒タイマー設定
  timeLeft = 10;
  document.getElementById('timer-display').textContent = timeLeft;

  timer = setInterval(() => {
    timeLeft--;
    document.getElementById('timer-display').textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(timer);
      // 時間切れ処理
      handleTimeOut(qData.answer);
    }
  }, 1000);
}

// 回答チェック処理
function checkAnswer(selected, correct, clickedBtn) {
  clearInterval(timer);

  const allOptionBtns = document.querySelectorAll('.option-btn');
  allOptionBtns.forEach(btn => btn.disabled = true);

  if (selected === correct) {
    score++;
    clickedBtn.classList.add('correct');
  } else {
    clickedBtn.classList.add('wrong');
    // 正解のボタンを緑色にして表示
    allOptionBtns.forEach(btn => {
      if (btn.textContent === correct) btn.classList.add('correct');
    });
  }

  setTimeout(nextQuestion, 1200);
}

// 時間切れ処理
function handleTimeOut(correct) {
  const allOptionBtns = document.querySelectorAll('.option-btn');
  allOptionBtns.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correct) btn.classList.add('correct');
  });

  setTimeout(nextQuestion, 1200);
}

// 次の問または結果画面へ
function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < currentQuestions.length) {
    showQuestion();
  } else {
    showResult();
  }
}

// 結果画面表示
function showResult() {
  document.getElementById('final-score').textContent = score;
  document.getElementById('total-questions').textContent = currentQuestions.length;

  const commentEl = document.getElementById('result-comment');
  if (score === 5) {
    commentEl.textContent = "パーフェクト！素晴らしい記憶力です！";
  } else if (score >= 3) {
    commentEl.textContent = "お見事！かなりのアニキ・アネゴ級です。";
  } else {
    commentEl.textContent = "惜しい！もう一度挑戦してみましょう。";
  }

  showScreen('result');
}
