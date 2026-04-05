# AuraLexia — Kullanıcı akışı (`user-flow.md`)

> **Ne içermeli?** Başlangıçtan bitişe adımlar; her adımda kullanıcı ne yapar, sistem ne üretir; hata ve çıkış yolları kısaca.

---

## Ön koşullar

- Masaüstü veya dizüstü bilgisayar; güncel Chromium tarayıcı.
- Kamera izni; HTTPS veya `localhost` / `127.0.0.1` üzerinden sunum.
- Analiz için yerelde veya erişilebilir URL’de çalışan **FastAPI** backend (istemci `ANALYZE_URL` ile bağlanır).

---

## Akış özeti

**Giriş → Pitch deck tanıtım → Öğrenci kaydı → Kalibrasyon → Okuma → AI analizi → Raporlama** (+ isteğe bağlı bulut kayıt / JSON indir).

---

## Adım adım

| # | Adım | Kullanıcı eylemi | Sistem çıktısı |
|---|------|------------------|----------------|
| 1 | **Giriş** | Uygulamayı HTTP ile açar | Shell + üst bilgi çubuğu |
| 2 | **Pitch deck** | Landing’i kaydırır; problem / çözüm / nasıl çalışır okur | Güven ve bağlam |
| 3 | **CTA** | **Hemen Deneyimle** | Öğrenci bilgileri formu |
| 4 | **Kayıt** | Ad, sınıf/yaş girer; **Kayıt ol ve kalibre et** | `sessionStorage` oturumu |
| 5 | **Kalibrasyon** | ML yüklemesi sonrası 5 rastgele daireye tıklar | WebGazer hizalı göz modeli |
| 6 | **Okuma** | Metni okur; **Okumayı Bitirdim** | `gazeSamples` + seçilen metin |
| 7 | **AI analiz** | Bekler (yükleniyor durumu) | `POST /analyze` yanıtı |
| 8 | **Rapor** | Kart üzerinde özet, grafik, RAM, metrikler | İsteğe bağlı Firestore + JSON indir |

---

## Çıkış ve döngüler

- **Kalibrasyonu tekrarla:** Aynı oturum bağlamıyla yeniden kalibrasyon (yeni rastgele noktalar).
- **Yeni oturum:** Oturum sıfırlanır; landing’e dönüş; yeni metin ve kalibrasyon dağılımı.
- **Mobil:** Uyarı gösterilir; kalibrasyon akışı engellenir veya kayıt ekranına yönlendirilir.

---

## Veri ve gizlilik (MVP notu)

- Oturum alanları tarayıcı `sessionStorage` içinde tutulur.
- Firebase açıksa rapor anonim kimlikle koleksiyona yazılabilir; yapılandırma yoksa yazım atlanır.
