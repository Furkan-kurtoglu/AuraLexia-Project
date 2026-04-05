if (typeof window.AuraLexiaFirebaseConfig === 'undefined') {
  window.AuraLexiaFirebaseConfig = {};
}

const STORAGE_KEY = 'auraLexiaSession';
const MOVE_TICK_CALIBRATION = 1e12;
const MOVE_TICK_NORMAL = 50;

const WEBGAZER_CDN_VERSION = '3.5.3';
const WEBGAZER_FACE_MESH_CDN_BASE = `https://cdn.jsdelivr.net/npm/webgazer@${WEBGAZER_CDN_VERSION}/dist/mediapipe/face_mesh`;

const ANALYZE_URL = 'https://auralexia-beg-m-biber.onrender.com/analyze';
const LAST_REPORT_STORAGE_KEY = 'auraLexiaLastReport';

let lastAnalyzeRequestPayload = null;
let lastAnalyzeBundle = null;

const READING_TEXT_POOL = [
  'Ali topu at. Ayşe ip atla. Kedi süt içti. Köpek havladı. Kuş uçtu. Balık yüzdü.',
  'Güneş doğudan doğar, batıdan batar. Yağmur bulutlardan süzülür; toprak susuz kalmaz. Her mevsim kendi rengini getirir.',
  'Matematik, evrenin dilidir. Küçük bir üçgen bile büyük yapıların temelini anlatır. Merak ettikçe öğrenmek kolaylaşır.',
  'Orman sessiz görünse de içinde binlerce ses vardır. Rüzgâr yapraklara dokunur, kuşlar yuva kurar. Doğa kendini yeniler.',
  'Dijital dünyada okumak, ekranda kelimeleri izlemek demektir. Gözümüz satır satır ilerler; bazen durur, bazen geri döner.',
];

const LAST_READING_TEXT_KEY = 'auraLexiaLastReadingText';

let currentReadingText = READING_TEXT_POOL[0];

const CALIBRATION_MARGIN = 12;
const CALIBRATION_MIN_DIST_PCT = 16;
const CALIBRATION_COUNT = 5;
const CALIBRATION_HINT =
  'Ekrandaki daireye gözünüzü sabitleyip tıklayın.';

let sessionCalibrationPoints = [];

function distanceSqPct(a, b) {
  const dx = a.pctX - b.pctX;
  const dy = a.pctY - b.pctY;
  return dx * dx + dy * dy;
}

function generateCalibrationPoints() {
  const m = CALIBRATION_MARGIN;
  const minD2 = CALIBRATION_MIN_DIST_PCT * CALIBRATION_MIN_DIST_PCT;
  const pts = [];
  for (let round = 0; round < 240 && pts.length < CALIBRATION_COUNT; round++) {
    const candidate = {
      pctX: m + Math.random() * (100 - 2 * m),
      pctY: m + Math.random() * (100 - 2 * m),
      hint: CALIBRATION_HINT,
    };
    if (pts.every((p) => distanceSqPct(p, candidate) >= minD2)) {
      pts.push(candidate);
    }
  }
  while (pts.length < CALIBRATION_COUNT) {
    const i = pts.length;
    const angle = (i / CALIBRATION_COUNT) * Math.PI * 2 + Math.random() * 0.4;
    const r = 22 + Math.random() * 18;
    pts.push({
      pctX: Math.min(100 - m, Math.max(m, 50 + Math.cos(angle) * r)),
      pctY: Math.min(100 - m, Math.max(m, 50 + Math.sin(angle) * r)),
      hint: CALIBRATION_HINT,
    });
  }
  return pts;
}

function pickReadingTextForSession() {
  const pool = READING_TEXT_POOL;
  if (!pool.length) {
    currentReadingText = '';
    return currentReadingText;
  }
  if (pool.length === 1) {
    currentReadingText = pool[0];
    return currentReadingText;
  }
  let last = null;
  try {
    last = sessionStorage.getItem(LAST_READING_TEXT_KEY);
  } catch {
    /* ignore */
  }
  let choice = pool[0];
  for (let i = 0; i < 24; i++) {
    choice = pool[Math.floor(Math.random() * pool.length)];
    if (choice !== last) break;
  }
  currentReadingText = choice;
  try {
    sessionStorage.setItem(LAST_READING_TEXT_KEY, choice);
  } catch {
    /* ignore */
  }
  return currentReadingText;
}

const views = {
  landing: document.getElementById('view-landing'),
  register: document.getElementById('view-register'),
};

const appRoot = document.getElementById('appRoot');
const stepIndicator = document.getElementById('stepIndicator');
const btnToRegister = document.getElementById('btnToRegister');
const btnBackToLanding = document.getElementById('btnBackToLanding');
const btnStartTest = document.getElementById('btnStartTest');
const studentForm = document.getElementById('studentForm');
const formError = document.getElementById('formError');
const btnNewSessionTracking = document.getElementById('btnNewSessionTracking');
const btnRecalibrate = document.getElementById('btnRecalibrate');
const mobileWarning = document.getElementById('mobileWarning');
const mobileWarningRegister = document.getElementById('mobileWarningRegister');
const mlLoadingOverlay = document.getElementById('mlLoadingOverlay');

const calibrationOverlay = document.getElementById('calibrationOverlay');
const calibrationInstruction = document.getElementById('calibrationInstruction');
const calibrationProgress = document.getElementById('calibrationProgress');
const calibrationTarget = document.getElementById('calibrationTarget');
const cameraError = document.getElementById('cameraError');

const readingOverlay = document.getElementById('readingOverlay');
const readingStepPassage = document.getElementById('readingStepPassage');
const readingStepPost = document.getElementById('readingStepPost');
const readingPassage = document.getElementById('readingPassage');
const btnReadingDone = document.getElementById('btnReadingDone');
const analyzeProgressBlock = document.getElementById('analyzeProgressBlock');
const analyzeSpinner = document.getElementById('analyzeSpinner');
const readingPostMessage = document.getElementById('readingPostMessage');
const analyzeResultCard = document.getElementById('analyzeResultCard');
const analyzeRiskBadge = document.getElementById('analyzeRiskBadge');
const analyzeSummaryText = document.getElementById('analyzeSummaryText');
const analyzeMetricsDl = document.getElementById('analyzeMetricsDl');
const analyzeError = document.getElementById('analyzeError');
const analyzeChartSvg = document.getElementById('analyzeChartSvg');
const analyzeRamText = document.getElementById('analyzeRamText');
const btnDownloadReport = document.getElementById('btnDownloadReport');
const firebaseSyncNote = document.getElementById('firebaseSyncNote');

let calibrationIndex = 0;
let webgazerRunning = false;

function isCoarseMobileDevice() {
  const ua = navigator.userAgent || '';
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }
  if (/iPad/i.test(ua)) {
    return true;
  }
  if (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)) {
    return true;
  }
  return false;
}

function applyMobileUiState() {
  const mobile = isCoarseMobileDevice();
  if (mobileWarning) {
    mobileWarning.hidden = !mobile;
  }
  if (mobileWarningRegister) {
    mobileWarningRegister.hidden = !mobile;
  }
  if (btnStartTest) {
    btnStartTest.disabled = mobile;
  }
}

function setMlLoading(visible) {
  mlLoadingOverlay.hidden = !visible;
}

function setStepLabel(text) {
  stepIndicator.textContent = text;
}

function showView(name) {
  Object.keys(views).forEach((key) => {
    const el = views[key];
    el.classList.remove('view--active');
    el.hidden = true;
  });
  const next = views[name];
  if (!next) return;
  next.hidden = false;
  next.classList.add('view--active');
}

function saveSession(payload) {
  const prev = readSession() ?? {};
  const session = {
    ...prev,
    ...payload,
    startedAt: payload.startedAt ?? prev.startedAt ?? new Date().toISOString(),
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = !message;
}

function showCameraError(message) {
  cameraError.textContent = message;
  cameraError.hidden = !message;
}

function hideCameraError() {
  showCameraError('');
}

function setAppHidden(hidden) {
  appRoot.classList.toggle('is-hidden', hidden);
}

function showCalibrationUi(visible) {
  calibrationOverlay.hidden = !visible;
}

function resetAnalyzeUiForNewReading() {
  if (!analyzeProgressBlock) return;
  analyzeProgressBlock.hidden = false;
  if (analyzeSpinner) analyzeSpinner.hidden = true;
  if (readingPostMessage) {
    readingPostMessage.textContent = 'Veriler Analiz Ediliyor...';
  }
  if (analyzeResultCard) analyzeResultCard.hidden = true;
  if (analyzeError) {
    analyzeError.hidden = true;
    analyzeError.textContent = '';
  }
  if (analyzeRiskBadge) {
    analyzeRiskBadge.textContent = '';
    analyzeRiskBadge.className = 'analyze-result-card__badge';
  }
  if (analyzeSummaryText) analyzeSummaryText.textContent = '';
  if (analyzeRamText) analyzeRamText.textContent = '';
  if (analyzeMetricsDl) analyzeMetricsDl.replaceChildren();
  if (analyzeChartSvg) analyzeChartSvg.replaceChildren();
  if (btnRecalibrate) btnRecalibrate.disabled = false;
  if (btnNewSessionTracking) btnNewSessionTracking.disabled = false;
  if (readingStepPost) readingStepPost.setAttribute('aria-busy', 'false');
  if (readingOverlay) {
    readingOverlay.classList.remove('reading-overlay--result-only');
  }
  if (firebaseSyncNote) {
    firebaseSyncNote.hidden = true;
    firebaseSyncNote.textContent = '';
    firebaseSyncNote.className = 'analyze-firebase-note';
  }
  lastAnalyzeBundle = null;
}

function hideReadingOverlay() {
  readingOverlay.hidden = true;
  readingStepPassage.hidden = false;
  readingStepPost.hidden = true;
  resetAnalyzeUiForNewReading();
}

function showReadingPassageStep() {
  readingOverlay.hidden = false;
  readingStepPassage.hidden = false;
  readingStepPost.hidden = true;
  resetAnalyzeUiForNewReading();
  const text = pickReadingTextForSession();
  if (readingPassage) {
    readingPassage.textContent = text;
  }
  btnReadingDone.disabled = false;
}

function showReadingPostStep() {
  readingStepPassage.hidden = true;
  readingStepPost.hidden = false;
  resetAnalyzeUiForNewReading();
}

function setAnalyzeLoading(active) {
  if (analyzeSpinner) analyzeSpinner.hidden = !active;
  if (readingPostMessage && active) {
    readingPostMessage.textContent = 'Veriler Analiz Ediliyor...';
  }
  if (btnRecalibrate) btnRecalibrate.disabled = active;
  if (btnNewSessionTracking) btnNewSessionTracking.disabled = active;
  if (readingStepPost) {
    readingStepPost.setAttribute('aria-busy', active ? 'true' : 'false');
  }
}

function riskBadgeClass(label) {
  if (typeof label !== 'string') return 'is-mid';
  if (label.includes('Düşük')) return 'is-low';
  return 'is-mid';
}

function renderDispersionChart(svgEl, series) {
  if (!svgEl) return;
  if (!series?.time_ms?.length) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', '160');
    t.setAttribute('y', '64');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('fill', '#9aa8bc');
    t.setAttribute('font-size', '11');
    t.textContent = 'Grafik için veri yok';
    svgEl.replaceChildren(t);
    return;
  }
  const tx = series.time_ms;
  const dy = series.dispersion_px;
  const maxT = Math.max(...tx, 1);
  const maxY = Math.max(...dy, 1e-6);
  const W = 320;
  const H = 120;
  const P = 12;
  let d = '';
  tx.forEach((tms, i) => {
    const x = P + (tms / maxT) * (W - 2 * P);
    const y = H - P - (dy[i] / maxY) * (H - 2 * P);
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
  });
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#5b9cff');
  path.setAttribute('stroke-width', '2.2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('d', d.trim());
  svgEl.replaceChildren(path);
}

function renderAnalyzeMetrics(dl, metrics) {
  if (!dl || !metrics) return;
  dl.replaceChildren();
  const rows = [
    ['Okuma süresi', `${(Number(metrics.duration_ms) / 1000).toFixed(1)} s`],
    ['Örnek sayısı', String(metrics.sample_count ?? '—')],
    ['Ortalama sapma', `${metrics.mean_dispersion_px ?? '—'} px`],
    ['Duraksama benzeri', String(metrics.fixation_like_events ?? '—')],
    ['Geri dönüş', String(metrics.regression_events ?? '—')],
  ];
  rows.forEach(([dtText, ddText]) => {
    const dt = document.createElement('dt');
    dt.textContent = dtText;
    const dd = document.createElement('dd');
    dd.textContent = ddText;
    dl.append(dt, dd);
  });
}

function renderAnalyzeSuccess(data) {
  if (analyzeProgressBlock) analyzeProgressBlock.hidden = true;
  if (readingOverlay) {
    readingOverlay.classList.add('reading-overlay--result-only');
  }
  if (analyzeResultCard) analyzeResultCard.hidden = false;
  if (analyzeRiskBadge) {
    analyzeRiskBadge.textContent = data.risk_label ?? '';
    analyzeRiskBadge.className = `analyze-result-card__badge ${riskBadgeClass(data.risk_label)}`;
  }
  if (analyzeSummaryText) {
    analyzeSummaryText.textContent = data.summary_text ?? '';
  }
  renderDispersionChart(analyzeChartSvg, data.chart_series);
  if (analyzeRamText) {
    analyzeRamText.textContent = data.ram_guidance ?? '';
  }
  renderAnalyzeMetrics(analyzeMetricsDl, data.metrics);
  const bundle = {
    request: lastAnalyzeRequestPayload,
    response: data,
    savedAt: new Date().toISOString(),
  };
  lastAnalyzeBundle = bundle;
  try {
    sessionStorage.setItem(LAST_REPORT_STORAGE_KEY, JSON.stringify(bundle));
  } catch {
    /* ignore quota */
  }
  const sync = window.AuraLexiaFirebaseSync;
  if (sync?.saveReport) {
    sync.saveReport(bundle).then(showFirebaseBundleStatus);
  } else {
    showFirebaseBundleStatus({ skipped: true });
  }
}

function showFirebaseBundleStatus(result) {
  if (!firebaseSyncNote) return;
  firebaseSyncNote.hidden = false;
  if (result?.skipped) {
    firebaseSyncNote.textContent =
      'Bulut kaydı kapalı. Firebase için js/firebase-config.example.js şablonunu kopyalayıp js/firebase-config.local.js oluşturun ve doldurun.';
    firebaseSyncNote.className =
      'analyze-firebase-note analyze-firebase-note--muted';
    return;
  }
  if (result?.ok) {
    firebaseSyncNote.textContent =
      'Rapor Firestore’a kaydedildi (anonim oturum).';
    firebaseSyncNote.className =
      'analyze-firebase-note analyze-firebase-note--ok';
    return;
  }
  firebaseSyncNote.textContent = `Buluta kayıt başarısız: ${result?.error ?? 'bilinmeyen hata'}`;
  firebaseSyncNote.className =
    'analyze-firebase-note analyze-firebase-note--err';
}

function renderAnalyzeFailure(err) {
  if (readingOverlay) {
    readingOverlay.classList.remove('reading-overlay--result-only');
  }
  if (analyzeProgressBlock) analyzeProgressBlock.hidden = false;
  if (analyzeSpinner) analyzeSpinner.hidden = true;
  if (readingPostMessage) {
    readingPostMessage.textContent = 'Analiz tamamlanamadı';
  }
  if (analyzeResultCard) analyzeResultCard.hidden = true;
  if (analyzeError) {
    analyzeError.hidden = false;
    analyzeError.textContent =
      err instanceof Error
        ? `${err.message}. Sunucunun çalıştığından emin olun: uvicorn main:app --reload --port 8000`
        : 'Bağlantı hatası.';
  }
  if (btnRecalibrate) btnRecalibrate.disabled = false;
  if (btnNewSessionTracking) btnNewSessionTracking.disabled = false;
  if (readingStepPost) readingStepPost.setAttribute('aria-busy', 'false');
}

function downloadAnalyzeReport() {
  const bundle =
    lastAnalyzeBundle ??
    (() => {
      try {
        const raw = sessionStorage.getItem(LAST_REPORT_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();
  if (!bundle) return;
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AuraLexia-rapor-${Date.now()}.json`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildGazeExportPayload(samples) {
  const session = readSession();
  return {
    exportedAt: new Date().toISOString(),
    session: {
      studentName: session?.studentName ?? null,
      gradeOrAge: session?.gradeOrAge ?? null,
      startedAt: session?.startedAt ?? null,
    },
    readingText: currentReadingText,
    sampleIntervalMsHint: 100,
    gazeSamples: samples,
  };
}

function placeCalibrationTarget(index) {
  const pt = sessionCalibrationPoints[index];
  if (!pt) return;
  calibrationTarget.style.left = `${pt.pctX}%`;
  calibrationTarget.style.top = `${pt.pctY}%`;
}

function updateCalibrationCopy() {
  const pt = sessionCalibrationPoints[calibrationIndex];
  const total = sessionCalibrationPoints.length;
  calibrationInstruction.textContent = pt
    ? pt.hint
    : 'Kalibrasyon tamamlanıyor…';
  calibrationProgress.textContent = pt
    ? `Nokta ${calibrationIndex + 1} / ${total}`
    : '';
}

function noopGazeListener() {
  webgazer.setGazeListener(() => {});
}

function applyRecordingGazeListener() {
  webgazer.setGazeListener((data) => {
    window.AuraLexiaGaze?.pushFromWebGazer(data);
  });
}

async function purgeWebgazerStoredEyeData() {
  if (typeof webgazer === 'undefined') {
    return;
  }
  try {
    await webgazer.clearData();
  } catch {
    /* ignore */
  }
}

async function stopWebgazer() {
  if (typeof webgazer === 'undefined' || !webgazerRunning) {
    webgazerRunning = false;
    return;
  }
  try {
    webgazer.pause();
    webgazer.end();
  } catch {
    /* ignore */
  }
  webgazerRunning = false;
}

async function ensureAnonymousVisitorHasNoStaleWebgazerData() {
  if (readSession()) {
    return;
  }
  await purgeWebgazerStoredEyeData();
}

function applyWebgazerFaceMeshCdnPath() {
  if (!webgazer?.params) {
    return;
  }
  webgazer.params.faceMeshSolutionPath = WEBGAZER_FACE_MESH_CDN_BASE;
}

async function startWebgazerCamera() {
  hideCameraError();
  if (typeof webgazer === 'undefined') {
    showCameraError(
      'WebGazer yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyin.',
    );
    throw new Error('no-webgazer');
  }
  if (!webgazer.detectCompatibility()) {
    showCameraError(
      'Bu tarayıcı kamera ile göz takibini desteklemiyor. Güncel Chrome veya Edge deneyin.',
    );
    throw new Error('incompatible');
  }
  applyWebgazerFaceMeshCdnPath();
  await webgazer.clearData();
  webgazer.saveDataAcrossSessions(false);
  webgazer.applyKalmanFilter(true);
  webgazer.showVideoPreview(false);
  noopGazeListener();
  webgazer.params.moveTickSize = MOVE_TICK_CALIBRATION;
  webgazer.showPredictionPoints(false);
  try {
    await webgazer.begin(() => {
      showCameraError(
        'Kamera açılamadı. İzin verilmesi gerekir. Yerel test için http://127.0.0.1 kullanın (HTTPS veya localhost).',
      );
    });
  } catch (err) {
    if (!cameraError.textContent) {
      showCameraError(
        'Kamera hatası: izin verilmedi veya cihaz kullanımda olabilir.',
      );
    }
    throw err;
  }
  webgazerRunning = true;
}

function finishCalibration() {
  webgazer.removeMouseEventListeners();
  webgazer.params.moveTickSize = MOVE_TICK_NORMAL;
  const session = readSession();
  saveSession({
    ...session,
    calibrationDone: true,
  });
  showCalibrationUi(false);
  setAppHidden(true);
  webgazer.showPredictionPoints(false);
  window.AuraLexiaGaze?.reset();
  applyRecordingGazeListener();
  setStepLabel('Okuma');
  showReadingPassageStep();
}

async function runCalibrationFlow() {
  if (isCoarseMobileDevice()) {
    setMlLoading(false);
    setAppHidden(false);
    showCalibrationUi(false);
    hideReadingOverlay();
    showView('register');
    showFormError(
      'Kamera kalibrasyonu mobilde desteklenmez. Lütfen bilgisayarınızdan devam edin.',
    );
    return;
  }
  hideReadingOverlay();
  window.AuraLexiaGaze?.reset();
  hideCameraError();
  sessionCalibrationPoints = generateCalibrationPoints();
  calibrationIndex = 0;
  setAppHidden(true);
  showCalibrationUi(false);
  setMlLoading(true);
  updateCalibrationCopy();
  setStepLabel('Kalibrasyon');

  try {
    await startWebgazerCamera();
  } catch {
    setMlLoading(false);
    setAppHidden(false);
    return;
  }

  setMlLoading(false);
  showCalibrationUi(true);
  requestAnimationFrame(() => {
    placeCalibrationTarget(calibrationIndex);
    calibrationTarget.focus();
  });
}

function onCalibrationTargetClick() {
  if (typeof webgazer === 'undefined' || !webgazerRunning) return;
  calibrationIndex += 1;
  if (calibrationIndex >= sessionCalibrationPoints.length) {
    finishCalibration();
    return;
  }
  updateCalibrationCopy();
  requestAnimationFrame(() => placeCalibrationTarget(calibrationIndex));
}

async function onReadingDoneClick() {
  if (typeof webgazer !== 'undefined' && webgazerRunning) {
    try {
      webgazer.pause();
    } catch {
      /* ignore */
    }
  }
  btnReadingDone.disabled = true;
  const samples = window.AuraLexiaGaze?.getSamples() ?? [];
  const payload = buildGazeExportPayload(samples);
  lastAnalyzeRequestPayload = payload;
  console.log(JSON.stringify(payload, null, 2));
  setStepLabel('Analiz hazırlığı');
  showReadingPostStep();
  setAnalyzeLoading(true);
  try {
    const res = await fetch(ANALYZE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Sunucu ${res.status}`);
    }
    const data = await res.json();
    setAnalyzeLoading(false);
    renderAnalyzeSuccess(data);
    setStepLabel('Sonuç hazır');
  } catch (e) {
    setAnalyzeLoading(false);
    renderAnalyzeFailure(e);
    setStepLabel('Analiz hatası');
  }
}

btnToRegister.addEventListener('click', () => {
  setStepLabel('Öğrenci kaydı');
  showView('register');
  applyMobileUiState();
  showFormError('');
  const prev = readSession();
  const nameInput = document.getElementById('studentName');
  const gradeInput = document.getElementById('gradeOrAge');
  if (nameInput && prev?.studentName) nameInput.value = prev.studentName;
  if (gradeInput && prev?.gradeOrAge) gradeInput.value = prev.gradeOrAge;
  nameInput?.focus();
});

btnBackToLanding.addEventListener('click', () => {
  setStepLabel('Karşılama');
  showView('landing');
  showFormError('');
});

function resetLocalSession() {
  sessionStorage.removeItem(STORAGE_KEY);
  studentForm.reset();
  showFormError('');
}

btnNewSessionTracking?.addEventListener('click', async () => {
  hideReadingOverlay();
  await stopWebgazer();
  await purgeWebgazerStoredEyeData();
  window.AuraLexiaGaze?.reset();
  resetLocalSession();
  setAppHidden(false);
  setStepLabel('Karşılama');
  showView('landing');
});

btnRecalibrate?.addEventListener('click', async () => {
  if (isCoarseMobileDevice()) {
    return;
  }
  hideReadingOverlay();
  const session = readSession();
  saveSession({ ...session, calibrationDone: false });
  await stopWebgazer();
  await purgeWebgazerStoredEyeData();
  window.AuraLexiaGaze?.reset();
  await runCalibrationFlow();
});

calibrationTarget.addEventListener('click', onCalibrationTargetClick);
btnReadingDone?.addEventListener('click', () => {
  onReadingDoneClick();
});

btnDownloadReport?.addEventListener('click', () => {
  downloadAnalyzeReport();
});

studentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isCoarseMobileDevice()) {
    return;
  }
  showFormError('');
  const nameInput = document.getElementById('studentName');
  const gradeInput = document.getElementById('gradeOrAge');
  const studentName = nameInput.value.trim();
  const gradeOrAge = gradeInput.value.trim();
  if (!studentName || !gradeOrAge) {
    showFormError('Lütfen tüm alanları doldurun.');
    return;
  }
  await purgeWebgazerStoredEyeData();
  saveSession({
    studentName,
    gradeOrAge,
    calibrationDone: false,
    startedAt: new Date().toISOString(),
  });
  await runCalibrationFlow();
});

async function boot() {
  applyMobileUiState();
  hideReadingOverlay();
  await ensureAnonymousVisitorHasNoStaleWebgazerData();
  const existing = readSession();
  if (existing?.studentName && isCoarseMobileDevice()) {
    saveSession({ ...existing, calibrationDone: false });
    setStepLabel('Mobil cihaz');
    showView('register');
    showFormError(
      'Kayıt bulundu; devam için lütfen uygulamayı bilgisayarınızdan açın.',
    );
    return;
  }
  setStepLabel('Karşılama');
  showView('landing');
}

boot();
