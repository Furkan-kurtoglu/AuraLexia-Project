# Geliştirme ajanları — AuraLexia

Bu dosya, AuraLexia’nın Cursor (ve benzeri) **AI ajanlarıyla** nasıl iteratif geliştirildiğini ve hangi **prompt kalıplarının** işe yaradığını özetler. Ekip içi hizalama ve teslim rehberi gereksinimleri için referanstır.

## İşbirliği modeli

- **Agent modu:** Çok adımlı refaktör, dosya çaprazı değişiklik ve terminal komutları için tam ajan döngüsü kullanıldı.
- **Bağlam:** Proje kuralları `.cursor/rules` altında (React/TS genel, güvenlik, ürün dili) tutuldu; böylece UI ve API değişiklikleri tutarlı kaldı.
- **Doğrulama:** Her sprint sonrası manuel akış (landing → kayıt → kalibrasyon → okuma → analiz) ve gerektiğinde `uvicorn` + yerel HTTP sunucusu ile duman testi.

## Kullanılan temel prompt temaları

| Tema | Örnek yönlendirme (özet) |
|------|---------------------------|
| **WebGazer / kalibrasyon** | MediaPipe yolu CDN, `clearData`, `saveDataAcrossSessions(false)`, mobil uyarı, gaze buffer `{x,y,t}` formatı. |
| **FastAPI analiz** | `POST /analyze`, CORS (localhost, Live Server portları), mock → metrik + `chart_series` + `ram_guidance`. |
| **Firebase** | `defaults` + isteğe bağlı `firebase-config.local.js`, anonim auth, Firestore `AuraLexiaReports`, büyük `gazeSamples` seyreltme, `configuration-not-found` hata eşlemesi. |
| **UI / layout** | Analiz kartı taşması, `overflow-y: auto` yalnız kartta, `reading-overlay--result-only`, flex ile buton hizası. |
| **Ürün / pitch** | Kaydırılabilir landing, problem–çözüm–nasıl çalışır, dinamik kalibrasyon ve okuma metni havuzu. |
| **Repo teslimi** | `features/` altında frontend/backend, kök dokümantasyon, `assets/` ve görsel zorunluluğu. |

## İyi uygulamalar

- İstekleri **tek seferde** değil, **test edilebilir dilimler** halinde vermek (ör. önce API, sonra istemci).
- Dosya yolu ve **mevcut isimlere** sadık kalmayı promptta açık yazmak.
- Güvenlik: Firebase web anahtarları yalnızca `firebase-config.local.js` içinde (`.gitignore`); repoda yalnızca boş `firebase-config.defaults.js` ve şablon `firebase-config.example.js`.

## Sorumluluk sınırı

AI önerileri **kod ve dokümantasyon taslağı** üretir; klinik iddialar, erişilebilirlik iddiaları ve üretim dağıtımı için insan gözden geçirmesi zorunludur.
