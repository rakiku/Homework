document.addEventListener('DOMContentLoaded', () => {
    // --- ★設定項目 ---
    const PASSWORD = '1234';
    const REWARDS = [ { points: 500,  name: 'お小遣い500円' }, { points: 1000,  name: 'お小遣い1000円' }, { points: 1500, name: 'お小遣い1500円' }, { points: 2000, name: 'お小遣い2000円' } ];

    // --- 要素取得 (変更なし) ---
    const screens = { timer: document.getElementById('timer-screen'), result: document.getElementById('result-screen'), stampBook: document.getElementById('stamp-book-screen'), history: document.getElementById('history-screen') };
    const timerTitle = document.getElementById('timer-title'), studyTimerDisplay = document.getElementById('study-timer-display'), breakTimerDisplay = document.getElementById('break-timer-display');
    const startButton = document.getElementById('start-button'), duringStudyButtons = document.getElementById('during-study-buttons'), duringBreakButtons = document.getElementById('during-break-buttons'), breakButton = document.getElementById('break-button'), resumeButton = document.getElementById('resume-button'), finishButton = document.getElementById('finish-button');
    const resultText = document.getElementById('result-text'), passwordInput = document.getElementById('password-input'), passwordSubmitButton = document.getElementById('password-submit-button'), confirmArea = document.getElementById('confirm-area'), goToStampBookButton = document.getElementById('go-to-stamp-book-button');
    const userNameInput = document.getElementById('user-name-input'), goalTimeInput = document.getElementById('goal-time-input'), currentMonthEl = document.getElementById('current-month'), totalTimeEl = document.getElementById('total-time'), goalProgressEl = document.getElementById('goal-progress'), rewardInfoEl = document.getElementById('reward-info'), stampCard = document.getElementById('stamp-card'), backToTimerButton = document.getElementById('back-to-timer-button');
    const historyButton = document.getElementById('history-button'), historyScreen = document.getElementById('history-screen'), monthSelector = document.getElementById('month-selector'), historyCard = document.getElementById('history-card'), historySummary = document.getElementById('history-summary'), historyBackButton = document.getElementById('history-back-button');
    const alarmSound = document.getElementById('alarm-sound');

    // --- 変数 (変更なし) ---
    let studySeconds = 0, breakSeconds = 0, studyTimer, breakTimer, studyData = [];
    let wakeLock = null; let timerState = 'stopped';
    const today = new Date(), year = today.getFullYear(), month = today.getMonth(), date = today.getDate() - 1;
    const storageKey = `studyData-${year}-${month}`;

    // --- 高度な機能 (変更なし) ---
    const requestWakeLock = async () => { if ('wakeLock' in navigator) try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) { console.error(err); } };
    const releaseWakeLock = async () => { if (wakeLock) { await wakeLock.release(); wakeLock = null; } };
    const saveTimerState = () => { if (timerState === 'stopped') { localStorage.removeItem('timerState'); return; } const state = { studySeconds, breakSeconds, timerState, lastSaved: Date.now() }; localStorage.setItem('timerState', JSON.stringify(state)); };

    // --- 基本関数 (変更なし) ---
    const showScreen = (screenName) => { Object.values(screens).forEach(s => s.style.display = 'none'); screens[screenName].style.display = 'block'; };
    const formatTime = (sec) => { const m = Math.floor(sec / 60).toString().padStart(2, '0'), s = (sec % 60).toString().padStart(2, '0'); return `${m}:${s}`; };

    // --- タイマー関数 (変更なし) ---
    const startStudyTimer = () => { clearInterval(studyTimer); timerState = 'studying'; studyTimer = setInterval(() => { studySeconds++; studyTimerDisplay.textContent = formatTime(studySeconds); saveTimerState(); }, 1000); };
    const startBreakAlarm = (minutes) => { clearInterval(breakTimer); timerState = 'break'; let remainingSeconds = minutes * 60; const updateDisplay = () => { breakTimerDisplay.textContent = formatTime(remainingSeconds); }; updateDisplay(); breakTimer = setInterval(() => { remainingSeconds--; updateDisplay(); if (remainingSeconds <= 0) { clearInterval(breakTimer); alarmSound.play(); alert(`${minutes}分の休憩が終わりました！`); duringBreakButtons.style.display = 'block'; breakTimerDisplay.style.display = 'none'; studyTimerDisplay.style.display = 'block'; timerTitle.textContent = "再開してね"; } }, 1000); };
    
    // --- データ処理関数 (変更なし) ---
    const loadData = () => { const daysInMonth = new Date(year, month + 1, 0).getDate(); studyData = JSON.parse(localStorage.getItem(storageKey)) || Array.from({ length: daysInMonth }, () => ({ minutes: 0 })); const settings = JSON.parse(localStorage.getItem('userSettings')) || {}; userNameInput.value = settings.name || ''; goalTimeInput.value = settings.goal || ''; };
    const saveData = () => { localStorage.setItem(storageKey, JSON.stringify(studyData)); localStorage.setItem('userSettings', JSON.stringify({ name: userNameInput.value, goal: goalTimeInput.value })); };
    const updateRewardDisplay = (totalMinutes) => { let nextReward = REWARDS.find(r => totalMinutes < r.points); if (nextReward) { rewardInfoEl.innerHTML = `次のご褒美: <strong>${nextReward.name}</strong><br>あと <strong>${nextReward.points - totalMinutes}</strong> ポイント！`; } else { rewardInfoEl.innerHTML = '<strong>すべての ごほうびを ゲットしたね！すごい！</strong>'; } };
    const updateTotal = (data, element) => { const totalMinutes = data.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0); element.textContent = totalMinutes; return totalMinutes; };
    const renderCalendar = (cardElement, data) => { cardElement.innerHTML = ''; data.forEach((d, index) => { const slot = document.createElement('div'); slot.classList.add('stamp-slot'); const icon = document.createElement('div'); icon.classList.add('stamp-icon'); icon.textContent = index + 1; if (d.minutes > 0) { icon.classList.add('stamped'); icon.textContent = ''; } const timeDisplay = document.createElement('div'); timeDisplay.classList.add('time-display'); timeDisplay.textContent = `${d.minutes || 0} 分`; slot.appendChild(icon); slot.appendChild(timeDisplay); cardElement.appendChild(slot); }); };
    const resetTimerState = () => { clearInterval(studyTimer); clearInterval(breakTimer); releaseWakeLock(); timerState = 'stopped'; localStorage.removeItem('timerState'); studySeconds = 0; breakSeconds = 0; studyTimerDisplay.textContent = '00:00'; breakTimerDisplay.textContent = '00:00'; startButton.style.display = 'block'; duringStudyButtons.style.display = 'none'; duringBreakButtons.style.display = 'none'; studyTimerDisplay.style.display = 'block'; breakTimerDisplay.style.display = 'none'; timerTitle.textContent = "しゅくだいタイマー"; passwordInput.value = ''; passwordInput.disabled = false; passwordInput.style.borderColor = '#ccc'; confirmArea.style.display = 'none'; passwordSubmitButton.style.display = 'inline-block'; };

    // --- イベントリスナー設定 ---
    startButton.addEventListener('click', () => { studySeconds = 0; breakSeconds = 0; startStudyTimer(); requestWakeLock(); startButton.style.display = 'none'; duringStudyButtons.style.display = 'block'; });
    breakButton.addEventListener('click', () => { const minutes = parseInt(prompt('何分休憩しますか？（半角数字）', '5'), 10); if (minutes && minutes > 0) { clearInterval(studyTimer); releaseWakeLock(); startBreakAlarm(minutes); duringStudyButtons.style.display = 'none'; duringBreakButtons.style.display = 'none'; studyTimerDisplay.style.display = 'none'; breakTimerDisplay.style.display = 'block'; timerTitle.textContent = "きゅうけい中..."; } });
    resumeButton.addEventListener('click', () => { requestWakeLock(); startStudyTimer(); duringBreakButtons.style.display = 'none'; duringStudyButtons.style.display = 'block'; breakTimerDisplay.style.display = 'none'; studyTimerDisplay.style.display = 'block'; timerTitle.textContent = "しゅくだいタイマー"; });
    
    // ▼▼▼ 変更点1：「終了する」ボタンの処理 ▼▼▼
    finishButton.addEventListener('click', () => {
        clearInterval(studyTimer);
        releaseWakeLock();
        timerState = 'stopped';
        localStorage.removeItem('timerState');

        const studyMinutes = Math.floor(studySeconds / 60);
        const breakMinutes = Math.floor(breakSeconds / 60);

        // ★★★ ここで自動的にデータを保存します ★★★
        if (studyMinutes > 0) {
            studyData[date].minutes = (studyData[date].minutes || 0) + studyMinutes;
            saveData();
        }
        
        resultText.innerHTML = `今日の勉強時間: <strong>${studyMinutes}分</strong><br>休憩時間: ${breakMinutes}分`;
        showScreen('result');
    });

    // ▼▼▼ 変更点2：パスワード確認ボタンの処理 ▼▼▼
    passwordSubmitButton.addEventListener('click', () => {
        // ★★★ パスワードチェックをなくし、どんな入力でも先に進めるようにします ★★★
        passwordInput.style.borderColor = 'green';
        confirmArea.style.display = 'block';
        passwordSubmitButton.style.display = 'none';
        passwordInput.disabled = true;
    });

    goToStampBookButton.addEventListener('click', () => { 
        // スタンプ帳表示の際に最新のデータを読み込み直す
        loadData();
        const totalM = updateTotal(studyData, totalTimeEl);
        updateRewardDisplay(totalM);
        renderCalendar(stampCard, studyData);
        showScreen('stampBook');
    });
    
    backToTimerButton.addEventListener('click', () => { resetTimerState(); showScreen('timer'); });
    userNameInput.addEventListener('change', saveData);
    goalTimeInput.addEventListener('change', () => { saveData(); const totalM = updateTotal(studyData, totalTimeEl); updateRewardDisplay(totalM); });
    
    // 履歴機能 (変更なし)
    historyButton.addEventListener('click', () => { const historyKeys = Object.keys(localStorage).filter(k => k.startsWith('studyData-')).sort().reverse(); if (historyKeys.length === 0) { alert('過去の記録はありません。'); return; } monthSelector.innerHTML = ''; historyKeys.forEach(key => { const [, y, m] = key.split('-'); const option = document.createElement('option'); option.value = key; option.textContent = `${y}年${parseInt(m, 10) + 1}月`; monthSelector.appendChild(option); }); monthSelector.dispatchEvent(new Event('change')); showScreen('history'); });
    monthSelector.addEventListener('change', () => { const selectedKey = monthSelector.value; const historyData = JSON.parse(localStorage.getItem(selectedKey)); renderCalendar(historyCard, historyData); const totalM = historyData.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0); historySummary.textContent = `合計勉強時間: ${totalM}分`; });
    historyBackButton.addEventListener('click', () => showScreen('stampBook'));
    
    // 全データリセット機能 (変更なし)
    const fullResetButton = document.getElementById('full-reset-button');
    if (fullResetButton) { fullResetButton.addEventListener('click', () => { const enteredPassword = prompt('全データをリセットするには、保護者のパスワードを入力してください。'); if (enteredPassword === null) { alert('リセットはキャンセルされました。'); return; } if (enteredPassword === PASSWORD) { const isConfirmed = confirm('パスワードが認証されました。\n\n本当にすべてのデータ（今までの月の記録、名前、目標）を削除しますか？\nこの操作は元に戻せません。'); if (isConfirmed) { localStorage.clear(); alert('すべてのデータをリセットしました。ページを再読み込みします。'); location.reload(); } else { alert('リセットはキャンセルされました。'); } } else { alert('パスワードが違います。リセットはキャンセルされました。'); } }); }

    // --- 初期化 ---
    const restoreTimer = () => { const savedState = JSON.parse(localStorage.getItem('timerState')); if (!savedState) return; const timePassed = Math.floor((Date.now() - savedState.lastSaved) / 1000); if (savedState.timerState === 'studying') { studySeconds = savedState.studySeconds + timePassed; breakSeconds = savedState.breakSeconds; studyTimerDisplay.textContent = formatTime(studySeconds); startButton.style.display = 'none'; duringStudyButtons.style.display = 'block'; startStudyTimer(); requestWakeLock(); } };
    loadData();
    restoreTimer();
    if (timerState === 'stopped') {
        const totalM = updateTotal(studyData, totalTimeEl);
        updateRewardDisplay(totalM);
        showScreen('timer');
    }
});
