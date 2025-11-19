document.addEventListener('DOMContentLoaded', () => {
    // --- ★設定項目 ---
    // 保護者の方が確認するパスワードです。自由に変更してください。
    const PASSWORD = '1234';
    // ご褒美リストです。ポイント(合計勉強分)が低い順に並べてください。
    const REWARDS = [
        { points: 500,  name: 'お小遣い500円' },
        { points: 1000,  name: 'お小遣い1000円' },
        { points: 1500, name: 'お小遣い1500円' },
        { points: 2000, name: 'お小遣い2000円' }
    ];

    // --- 要素取得 ---
    const screens = { timer: document.getElementById('timer-screen'), result: document.getElementById('result-screen'), stampBook: document.getElementById('stamp-book-screen') };
    const timerTitle = document.getElementById('timer-title'), studyTimerDisplay = document.getElementById('study-timer-display'), breakTimerDisplay = document.getElementById('break-timer-display');
    const startButton = document.getElementById('start-button'), duringStudyButtons = document.getElementById('during-study-buttons'), duringBreakButtons = document.getElementById('during-break-buttons'), breakButton = document.getElementById('break-button'), resumeButton = document.getElementById('resume-button'), finishButton = document.getElementById('finish-button');
    const resultText = document.getElementById('result-text'), passwordInput = document.getElementById('password-input'), passwordSubmitButton = document.getElementById('password-submit-button'), confirmArea = document.getElementById('confirm-area'), goToStampBookButton = document.getElementById('go-to-stamp-book-button');
    const userNameInput = document.getElementById('user-name-input'), goalTimeInput = document.getElementById('goal-time-input'), currentMonthEl = document.getElementById('current-month'), totalTimeEl = document.getElementById('total-time'), goalProgressEl = document.getElementById('goal-progress'), rewardInfoEl = document.getElementById('reward-info'), stampCard = document.getElementById('stamp-card'), backToTimerButton = document.getElementById('back-to-timer-button');

    // --- 変数 ---
    let studySeconds = 0, breakSeconds = 0, studyTimer, breakTimer, studyData = [];
    let wakeLock = null; // スクリーンロック防止用
    let timerState = 'stopped'; // タイマーの状態管理 ('stopped', 'studying', 'break')
    const today = new Date(), year = today.getFullYear(), month = today.getMonth(), date = today.getDate() - 1;
    const storageKey = `studyData-${year}-${month}`;

    // --- 高度な機能（画面スリープ防止） ---
    const requestWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
            } catch (err) { console.error(`${err.name}, ${err.message}`); }
        }
    };
    const releaseWakeLock = async () => {
        if (wakeLock !== null) {
            await wakeLock.release();
            wakeLock = null;
        }
    };

    // --- 高度な機能（画面の表示/非表示の検知） ---
    const handleVisibilityChange = () => {
        if (timerState === 'stopped') return;
        if (document.visibilityState === 'hidden') {
            clearInterval(studyTimer); clearInterval(breakTimer);
            if (timerState !== 'stopped') timerTitle.textContent = "一時停止中...";
        } else if (document.visibilityState === 'visible') {
            if (timerState === 'studying') {
                startStudyTimer(); timerTitle.textContent = "しゅくだいタイマー"; requestWakeLock();
            } else if (timerState === 'break') {
                startBreakTimer(); timerTitle.textContent = "きゅうけい中...";
            }
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // --- 基本関数 ---
    const showScreen = (screenName) => { Object.values(screens).forEach(s => s.style.display = 'none'); screens[screenName].style.display = 'block'; };
    const formatTime = (sec) => { const m = Math.floor(sec / 60).toString().padStart(2, '0'), s = (sec % 60).toString().padStart(2, '0'); return `${m}:${s}`; };
    
    // --- タイマー関数 ---
    const startStudyTimer = () => { clearInterval(studyTimer); timerState = 'studying'; studyTimer = setInterval(() => { studySeconds++; studyTimerDisplay.textContent = formatTime(studySeconds); }, 1000); };
    const startBreakTimer = () => { clearInterval(breakTimer); timerState = 'break'; breakTimer = setInterval(() => { breakSeconds++; breakTimerDisplay.textContent = formatTime(breakSeconds); }, 1000); };
    
    // --- データ処理関数 ---
    const loadData = () => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        studyData = JSON.parse(localStorage.getItem(storageKey)) || Array.from({ length: daysInMonth }, () => ({ minutes: 0 }));
        const settings = JSON.parse(localStorage.getItem('userSettings')) || {};
        userNameInput.value = settings.name || ''; goalTimeInput.value = settings.goal || '';
    };
    const saveData = () => {
        localStorage.setItem(storageKey, JSON.stringify(studyData));
        localStorage.setItem('userSettings', JSON.stringify({ name: userNameInput.value, goal: goalTimeInput.value }));
    };
    const updateRewardDisplay = (totalMinutes) => {
        let nextReward = REWARDS.find(r => totalMinutes < r.points);
        if (nextReward) { rewardInfoEl.innerHTML = `次のご褒美: <strong>${nextReward.name}</strong><br>あと <strong>${nextReward.points - totalMinutes}</strong> ポイント！`; }
        else { rewardInfoEl.innerHTML = '<strong>すべての ごほうびを ゲットしたね！すごい！</strong>'; }
    };
    const updateTotal = () => {
        const totalMinutes = studyData.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
        totalTimeEl.textContent = totalMinutes;
        const goal = Number(goalTimeInput.value);
        if (goal > 0) { const progress = Math.min(Math.floor((totalMinutes / goal) * 100), 100); goalProgressEl.textContent = `${progress}% 達成！`; }
        else { goalProgressEl.textContent = '--%'; }
        updateRewardDisplay(totalMinutes);
    };
    const renderStampBook = () => {
        currentMonthEl.textContent = `${month + 1}月`; stampCard.innerHTML = '';
        studyData.forEach((data, index) => {
            const slot = document.createElement('div'); slot.classList.add('stamp-slot');
            const icon = document.createElement('div'); icon.classList.add('stamp-icon'); icon.textContent = index + 1;
            if (data.minutes > 0) { icon.classList.add('stamped'); icon.textContent = ''; }
            const timeDisplay = document.createElement('div'); timeDisplay.classList.add('time-display'); timeDisplay.textContent = `${data.minutes || 0} 分`;
            slot.appendChild(icon); slot.appendChild(timeDisplay); stampCard.appendChild(slot);
        });
        updateTotal();
    };
    const resetTimerState = () => {
        clearInterval(studyTimer); clearInterval(breakTimer); releaseWakeLock(); timerState = 'stopped';
        studySeconds = 0; breakSeconds = 0;
        studyTimerDisplay.textContent = '00:00'; breakTimerDisplay.textContent = '00:00';
        startButton.style.display = 'block'; duringStudyButtons.style.display = 'none'; duringBreakButtons.style.display = 'none';
        studyTimerDisplay.style.display = 'block'; breakTimerDisplay.style.display = 'none'; timerTitle.textContent = "しゅくだいタイマー";
        passwordInput.value = ''; passwordInput.disabled = false; passwordInput.style.borderColor = '#ccc';
        confirmArea.style.display = 'none'; passwordSubmitButton.style.display = 'inline-block';
    };

    // --- イベントリスナー設定 ---
    startButton.addEventListener('click', () => { studySeconds = 0; breakSeconds = 0; startStudyTimer(); requestWakeLock(); startButton.style.display = 'none'; duringStudyButtons.style.display = 'block'; });
    breakButton.addEventListener('click', () => { clearInterval(studyTimer); releaseWakeLock(); startBreakTimer(); duringStudyButtons.style.display = 'none'; duringBreakButtons.style.display = 'block'; studyTimerDisplay.style.display = 'none'; breakTimerDisplay.style.display = 'block'; timerTitle.textContent = "きゅうけい中..."; });
    resumeButton.addEventListener('click', () => { clearInterval(breakTimer); requestWakeLock(); startStudyTimer(); duringBreakButtons.style.display = 'none'; duringStudyButtons.style.display = 'block'; breakTimerDisplay.style.display = 'none'; studyTimerDisplay.style.display = 'block'; timerTitle.textContent = "しゅくだいタイマー"; });
    finishButton.addEventListener('click', () => { clearInterval(studyTimer); releaseWakeLock(); timerState = 'stopped'; const sm = Math.floor(studySeconds / 60); const bm = Math.floor(breakSeconds / 60); resultText.innerHTML = `今日の勉強時間: <strong>${sm}分</strong><br>休憩時間: ${bm}分`; showScreen('result'); });
    passwordSubmitButton.addEventListener('click', () => {
        if (passwordInput.value === PASSWORD) {
            passwordInput.style.borderColor = 'green';
            const studyMinutes = Math.floor(studySeconds / 60);
            studyData[date].minutes = (studyData[date].minutes || 0) + studyMinutes;
            saveData();
            confirmArea.style.display = 'block'; passwordSubmitButton.style.display = 'none'; passwordInput.disabled = true;
        } else { passwordInput.style.borderColor = 'red'; alert('パスワードがちがうよ！'); }
    });
    goToStampBookButton.addEventListener('click', () => { renderStampBook(); showScreen('stampBook'); });
    backToTimerButton.addEventListener('click', () => { resetTimerState(); showScreen('timer'); });
    userNameInput.addEventListener('change', saveData);
    goalTimeInput.addEventListener('change', () => { saveData(); updateTotal(); });

    // --- 全データリセット機能 ---
    const fullResetButton = document.getElementById('full-reset-button');
    if (fullResetButton) {
        fullResetButton.addEventListener('click', () => {
            const enteredPassword = prompt('全データをリセットするには、保護者のパスワードを入力してください。');
            if (enteredPassword === null) {
                alert('リセットはキャンセルされました。');
                return;
            }
            if (enteredPassword === PASSWORD) {
                const isConfirmed = confirm('パスワードが認証されました。\n\n本当にすべてのデータ（今までの月の記録、名前、目標）を削除しますか？\nこの操作は元に戻せません。');
                if (isConfirmed) {
                    localStorage.clear();
                    alert('すべてのデータをリセットしました。ページを再読み込みします。');
                    location.reload();
                } else {
                    alert('リセットはキャンセルされました。');
                }
            } else {
                alert('パスワードが違います。リセットはキャンセルされました。');
            }
        });
    }

    // --- 初期化 ---
    loadData();
    showScreen('timer');
});
