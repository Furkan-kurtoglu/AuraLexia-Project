# AuraLexia — Geliştirme Görev Listesi

Bu dosya `prd.md` üzerinden türetilmiştir. **Sprint sırası kullanıcı akışıyla aynıdır:** önce karşılama ve öğrenci kaydı, sonra kamera/kalibrasyon, ardından okuma ve sunucu analizi; en sonda yükleme ekranı, sonuç dashboard’u ve opsiyonel Firebase.

Kullanıcı akışı özeti: Landing → Öğrenci kaydı (**Teste Başla**) → Kamera izni → Kalibrasyon → Okuma → **Veriler Analiz Ediliyor...** → Dashboard (risk + **RAM** yönlendirmesi). Kalibrasyon → okuma → API zincirini bozmayın.

---

## Faz 0 — Proje iskeleti

- [x] **0.1** Klasör yapısını oluştur: `features/frontend/`, `features/backend/`; kökte `.gitignore`, `README.md`, `idea.md`, `user-flow.md`, `tech-stack.md`, `prd.md`, `tasks.md`; `assets/`, `agents/` (bkz. `agents/development-agents.md`).
- [x] **0.2** Frontend’i statik sunucu veya `file://` dışında mümkünse yerel HTTP ile aç (WebGazer/kamera için gerekebilir).
- [x] **0.3** Backend için Python sanal ortam ve `requirements.txt` (FastAPI, uvicorn, scikit-learn, pydantic vb.) hazırla.

---

## Sprint 1 — Karşılama ve öğrenci kaydı (PRD adım 1–2)

- [x] **1.1** PRD **Adım 1**: Sade **Landing** — uygulamanın amacını anlatan metin; sonraki ekrana geçiş.
- [x] **1.2** PRD **Adım 2**: Öğrenci adı + sınıf/yaş formu ve **Teste Başla**; oturum verisini sonraki adımlara (kamera → kalibrasyon) taşı.

---

## Sprint 2 — Kamera izni ve kalibrasyon (PRD adım 3–4)

- [x] **2.1** **Teste Başla** sonrası kameraya erişim iste (`getUserMedia` / WebGazer başlatma); reddedilirse net mesaj (PRD adım 3).
- [x] **2.2** `WebGazer.js` kütüphanesini projeye dahil et (CDN veya yerel paket).
- [x] **2.3** Ekranda **5 köşede sırayla** beliren noktalara bakıp tıklama ile kalibrasyon akışını kodla.
- [x] **2.4** Gözün baktığı yeri gösteren **kırmızı imleç/nokta** ile sistemin çalıştığını doğrula (debug görünümü).

---

## Sprint 3 — Okuma görevi, veri toplama ve analiz API’si (PRD adım 5 + sunucu)

- [x] **3.1** Kalibrasyon bitince noktaları kaldır; **yaşa uygun kısa** okuma metni (sesli/sessiz okuma).
- [x] **3.2** Okuma sırasında **~100 ms** aralıklarla göz X/Y koordinatlarını biriktir; zaman damgası ekleyin.
- [x] **3.3** Okuma bitince veriyi **JSON** olarak konsola yazdırıp API gövdesine uygun hale getirin.
- [x] **3.4** Python + **FastAPI** sunucu; sağlık endpoint’i (`/health`).
- [x] **3.5** Koordinat/time-series **JSON** kabul eden `POST` endpoint; Pydantic şema doğrulaması.
- [x] **3.6** **Duraksama (fixation)** ve **geri dönüş (regression)** sayılarını hesaplayın; sonucu JSON döndürün.
- [x] **3.7** Risk skoru: Scikit-learn **MVP modeli** veya eğitim verisi yoksa metrik + eşik (stub).
- [x] **3.8** Frontend ↔ backend **CORS** ve hata yönetimi.

---

## Sprint 4 — Analiz ekranı, sonuç dashboard’u ve kullanıcı verisi (PRD adım 6–7)

- [x] **4.1** *(Opsiyonel / sonraki aşama — PRD Tech Stack)* **Firebase**: öğrenci sonuçlarını kayıt, gerekirse üyelik; MVP’de atlanabilir.
- [x] **4.2** PRD **Adım 6**: **"Veriler Analiz Ediliyor..."** yükleme/animasyon; API tamamlanana kadar göster (Sprint 3 API’sine bağla).
- [x] **4.3** PRD **Adım 7**: **Dashboard** — **risk durumu** + **uzman (RAM) yönlendirmesi**; anlaşılır **grafik**; backend yanıtı (isteğe bağlı odak/heatmap).
- [x] **4.4** Oturum sonuçlarını kalıcı saklama: **4.1** (Firebase) kullanılıyorsa orada; aksi halde MVP export veya yerel strateji.

---

## Çapraz kalite (MVP sonrası kolayca eklenebilir)

- [ ] Temel erişilebilirlik: klavye ile kalibrasyon alternatifi veya net yönergeler.
- [ ] Gizlilik: kamera görüntüsünün sunucuya gitmediği; yalnızca koordinat/özet.
- [ ] Hata senaryoları: kamera reddi, kalibrasyon iptali, API zaman aşımı.

---

## PRD akış eşlemesi (referans)

| Adım | İçerik | Görevler (özet) |
|------|--------|------------------|
| 1 | Landing | 1.1 |
| 2 | Öğrenci kaydı — Teste Başla | 1.2 |
| 3 | Kamera izni | Sprint 2: 2.1 |
| 4 | Kalibrasyon (5 köşe, sırayla) | 2.2–2.4 |
| 5 | Okuma görevi (sesli/sessiz) | 3.1–3.3 |
| 6 | Veriler analiz ediliyor | 3.4–3.8 (API), 4.2 (yükleme UI) |
| 7 | Sonuç — risk + RAM, grafik | 4.3–4.4 |

*İsteğe bağlı:* Veli/öğretmen üyeliği (**4.1**), akışa istenilen noktada eklenebilir; MVP’de anonim oturum da mümkün.
