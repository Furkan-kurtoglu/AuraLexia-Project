(function (global) {
  const MAX_GAZE_SAMPLES = 500;

  function getRawConfig() {
    return global.AuraLexiaFirebaseConfig;
  }

  function resolveFirebaseConfig() {
    const c = getRawConfig();
    if (!c || typeof c !== 'object') {
      return null;
    }
    const apiKey = String(c.apiKey ?? '').trim();
    const authDomain = String(c.authDomain ?? '').trim();
    const projectId = String(c.projectId ?? '').trim();
    const storageBucket = String(c.storageBucket ?? '').trim();
    const messagingSenderId = String(c.messagingSenderId ?? '').trim();
    const appId = String(c.appId ?? '').trim();
    if (
      !apiKey ||
      !authDomain ||
      !projectId ||
      !appId ||
      !messagingSenderId
    ) {
      return null;
    }
    return {
      apiKey,
      authDomain,
      projectId,
      storageBucket: storageBucket || `${projectId}.appspot.com`,
      messagingSenderId,
      appId,
    };
  }

  function isEnabled() {
    return resolveFirebaseConfig() !== null;
  }

  function mapFirebaseError(e) {
    const code = e?.code ?? '';
    const msg = String(e?.message ?? '');
    if (
      code === 'auth/configuration-not-found' ||
      /configuration-not-found/i.test(msg)
    ) {
      return (
        'Firebase yapılandırması bulunamadı. Firebase Console’da projeyi kontrol edin; ' +
        'Authentication → Sign-in method → Anonim’i etkinleştirin. ' +
        'API anahtarı kısıtlamalarında kimlik araç setine izin verildiğinden emin olun.'
      );
    }
    if (code === 'auth/operation-not-allowed') {
      return (
        'Anonim giriş kapalı. Firebase Console → Authentication → Sign-in method → Anonim’i açın.'
      );
    }
    return msg || 'Firebase hatası';
  }

  function thinBundleForFirestore(bundle) {
    const copy = JSON.parse(JSON.stringify(bundle));
    const samples = copy?.request?.gazeSamples;
    if (Array.isArray(samples) && samples.length > MAX_GAZE_SAMPLES) {
      const step = Math.ceil(samples.length / MAX_GAZE_SAMPLES);
      copy.request.gazeSamples = samples.filter((_, i) => i % step === 0);
      copy.request._gazeSamplesThinnedTo = copy.request.gazeSamples.length;
      copy.request._originalGazeSampleCount = samples.length;
    }
    return copy;
  }

  async function saveReport(bundle) {
    if (!isEnabled()) {
      return { ok: false, skipped: true };
    }
    const firebase = global.firebase;
    if (!firebase) {
      return { ok: false, error: 'Firebase SDK yüklenmedi' };
    }
    try {
      const resolved = resolveFirebaseConfig();
      if (!firebase.apps.length) {
        firebase.initializeApp(resolved);
      }
      const auth = firebase.auth();
      if (!auth.currentUser) {
        await auth.signInAnonymously();
      }
      const db = firebase.firestore();
      const report = thinBundleForFirestore(bundle);
      await db.collection('AuraLexiaReports').add({
        uid: auth.currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        report,
      });
      return { ok: true };
    } catch (e) {
      console.warn('[AuraLexia Firebase]', e);
      return { ok: false, error: mapFirebaseError(e) };
    }
  }

  global.AuraLexiaFirebaseSync = {
    isEnabled,
    saveReport,
  };
})(window);
