// ==UserScript==
// @name         GeoFS Flight Timer
// @namespace    https://github.com/GeoFS-hub/GeoFS-Timer
// @version      Beta v0.5
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @description  Persistent GeoFS flight timer with live language switch, collapsible UI, hint adjusted, and larger current label.
// @author       31124呀 and GeoFS Explorer
// @match        http://*/geofs.php*
// @match        https://*/geofs.php*
// @updateURL    https://raw.githubusercontent.com/GeoFS-hub/GeoFS-Timer/47f26bbaac0a8d126baff6d16d0b1123dcf3aa4b/user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'geofs_flight_timer_sessions_multi';
    const LANG_KEY = 'geofs_flight_timer_language';

    const languages = {
        en: { title: 'GeoFS Flight Timer', start: 'Start', stop: 'Stop', clear: 'Clear', current: 'Current:', total: 'Total:', running: 'Running', noActive: 'No active timer.', confirmNew: 'Previous timer not stopped. Stop it and start new?', confirmClear: 'Clear all records?', uiHidden: 'UI Hidden', uiShown: 'UI Shown' },
        zh_cn: { title: 'GeoFS 航班计时器', start: '开始', stop: '结束', clear: '清空', current: '当前计时:', total: '总时长:', running: '运行中', noActive: '没有正在进行的计时', confirmNew: '上次记录未结束，是否结束上次并开始新记录？', confirmClear: '确定清空所有记录？', uiHidden: 'UI界面已隐藏', uiShown: 'UI界面已显示' },
        zh_tw: { title: 'GeoFS 航班計時器', start: '開始', stop: '結束', clear: '清空', current: '當前計時:', total: '總時長:', running: '進行中', noActive: '沒有正在進行的計時', confirmNew: '上次記錄未結束，是否結束上次並開始新記錄？', confirmClear: '確定清空所有記錄？', uiHidden: 'UI介面已隱藏', uiShown: 'UI介面已顯示' },
        fr: { title: 'Chronomètre GeoFS', start: 'Démarrer', stop: 'Arrêter', clear: 'Effacer', current: 'En cours :', total: 'Total :', running: 'En cours', noActive: 'Aucun chronomètre actif', confirmNew: 'Le dernier chronomètre est en cours. Le terminer et en démarrer un nouveau ?', confirmClear: 'Effacer tous les enregistrements ?', uiHidden: 'UI Caché', uiShown: 'UI Affiché' },
        ar: { title: 'مؤقت رحلات GeoFS', start: 'ابدأ', stop: 'أوقف', clear: 'مسح', current: 'الحالي:', total: 'الإجمالي:', running: 'قيد التشغيل', noActive: 'لا يوجد مؤقت نشط', confirmNew: 'المؤقت السابق لم يتوقف. هل تريد إيقافه وبدء واحد جديد؟', confirmClear: 'هل تريد مسح جميع السجلات؟', uiHidden: 'واجهة مخفية', uiShown: 'واجهة ظاهرة' },
        es: { title: 'Temporizador de vuelo GeoFS', start: 'Iniciar', stop: 'Detener', clear: 'Borrar', current: 'Actual:', total: 'Total:', running: 'En curso', noActive: 'No hay temporizador activo', confirmNew: 'El temporizador anterior no se ha detenido. ¿Detenerlo y empezar uno nuevo?', confirmClear: '¿Borrar todos los registros?', uiHidden: 'UI Oculta', uiShown: 'UI Mostrada' }
    };

    let lang = localStorage.getItem(LANG_KEY) || 'en';
    const t = key => (languages[lang] && languages[lang][key]) || languages['en'][key];

    function loadSessions() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
    function saveSessions(sessions) { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); }
    function addSession(start) { const s = loadSessions(); s.push({ start, end: null }); saveSessions(s); }
    function updateLastSession(update) { const s = loadSessions(); if (!s.length) return; Object.assign(s[s.length - 1], update); saveSessions(s); }

    function isoNow() { return new Date().toISOString(); }
    function msBetween(a, b) { return new Date(b) - new Date(a); }
    function formatDuration(ms) { const sec = Math.floor(ms / 1000); const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60; return `${h}h ${m}m ${s}s`; }

    function calcTotal() { return loadSessions().reduce((sum, x) => sum + (x.start ? msBetween(x.start, x.end || isoNow()) : 0), 0); }

    const panel = document.createElement('div');
    Object.assign(panel.style, { position: 'fixed', top: '80px', right: '20px', background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '10px', borderRadius: '8px', fontFamily: 'sans-serif', fontSize: '14px', zIndex: 999999, transition: 'all 0.3s' });

    panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;font-weight:bold;margin-bottom:5px">
            <span id="titleText">${t('title')}</span>
            <select id="langSelect" style="font-size:12px;background:#222;color:#fff;border:none;border-radius:4px;">
                <option value="en">English</option>
                <option value="zh_cn">简体中文</option>
                <option value="zh_tw">繁體中文</option>
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
                <option value="es">Español</option>
            </select>
        </div>
        <div style="margin-bottom:8px">
            <button id="timerStart">${t('start')}</button>
            <button id="timerStop">${t('stop')}</button>
            <button id="timerClear">${t('clear')}</button>
        </div>
        <div id="currentLabel" style="font-size:16px; font-weight:bold;">${t('current')} <span id="timerNow">—</span></div>
        <div id="totalLabel">${t('total')} <span id="timerTotal">—</span></div>
        <ul id="timerList" style="margin-top:8px;max-height:150px;overflow:auto;padding-left:18px"></ul>
    `;

    document.body.appendChild(panel);

    const langSelect = panel.querySelector('#langSelect');
    const titleText = panel.querySelector('#titleText');
    const btnStart = panel.querySelector('#timerStart');
    const btnStop = panel.querySelector('#timerStop');
    const btnClear = panel.querySelector('#timerClear');
    const spanNow = panel.querySelector('#timerNow');
    const spanTotal = panel.querySelector('#timerTotal');
    const list = panel.querySelector('#timerList');
    const currentLabel = panel.querySelector('#currentLabel');
    const totalLabel = panel.querySelector('#totalLabel');

    langSelect.value = lang;
    langSelect.addEventListener('change', e => { lang = e.target.value; localStorage.setItem(LANG_KEY, lang); updateLanguage(); });

    function updateLanguage() {
        titleText.textContent = t('title');
        btnStart.textContent = t('start');
        btnStop.textContent = t('stop');
        btnClear.textContent = t('clear');
        currentLabel.childNodes[0].textContent = t('current') + ' ';
        totalLabel.childNodes[0].textContent = t('total') + ' ';
        render();
    }

    function showHint(text) {
        let hint = document.createElement('div');
        Object.assign(hint.style, {position:'fixed',right:'120px',bottom:'60px',background:'rgba(0,0,0,0.8)',color:'#fff',padding:'5px 10px',borderRadius:'6px',fontSize:'12px',opacity:'0',transition:'opacity 0.3s'});
        hint.textContent = text;
        document.body.appendChild(hint);
        requestAnimationFrame(() => { hint.style.opacity = '1'; });
        setTimeout(() => { hint.style.opacity = '0'; setTimeout(() => hint.remove(), 300); }, 1000);
    }

    let collapsed = false;
    const smallLabel = document.createElement('div');
    Object.assign(smallLabel.style, {position:'fixed',right:'20px',bottom:'20px',background:'rgba(0,0,0,0.75)',color:'#fff',padding:'5px 10px',borderRadius:'6px',cursor:'pointer',display:'none',zIndex:999999,fontSize:'12px'});
    document.body.appendChild(smallLabel);
    smallLabel.onclick = () => toggleCollapse();

    function toggleCollapse() {
        collapsed = !collapsed;
        if (collapsed) {
            panel.style.display = 'none';
            smallLabel.textContent = t('title');
            smallLabel.style.display = 'block';
            showHint(t('uiHidden'));
        } else {
            panel.style.display = 'block';
            smallLabel.style.display = 'none';
            showHint(t('uiShown'));
        }
    }

    document.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'w') toggleCollapse(); });

    function render() {
        const sessions = loadSessions();
        list.innerHTML = '';
        sessions.slice().reverse().forEach(s => {
            const li = document.createElement('li');
            const d = s.end ? formatDuration(msBetween(s.start, s.end)) : formatDuration(msBetween(s.start, isoNow()));
            li.textContent = `${s.start} → ${s.end || t('running')} (${d})`;
            list.appendChild(li);
        });
        updateNow();
        spanTotal.textContent = formatDuration(calcTotal());
    }

    let timer = null;
    function updateNow() {
        const s = loadSessions();
        const last = s[s.length - 1];
        if (last && !last.end) {
            spanNow.textContent = formatDuration(msBetween(last.start, isoNow()));
            if (!timer) timer = setInterval(updateNow, 1000);
        } else {
            spanNow.textContent = '—';
            if (timer) { clearInterval(timer); timer = null; }
        }
    }

    btnStart.onclick = () => { const s = loadSessions(); if (s.length && !s[s.length - 1].end) { if(!confirm(t('confirmNew'))) return; updateLastSession({end:isoNow()}); } addSession(isoNow()); render(); };
    btnStop.onclick = () => { const s = loadSessions(); if(!s.length||s[s.length-1].end){alert(t('noActive')); return;} updateLastSession({end:isoNow()}); render(); };
    btnClear.onclick = () => { if(confirm(t('confirmClear'))){ saveSessions([]); render(); } };

    render();
    console.log('GeoFS Flight Timer (Collapsible + Live Lang + Hints + Bigger Current) loaded');
})();
