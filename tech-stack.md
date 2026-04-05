# AuraLexia — Teknoloji yığını (`tech-stack.md`)

> **Ne içermeli?** Kullanılan araçlar; her biri için kısa gerekçe; backend / veri katmanı ayrı ayrı; mümkünse güvenlik veya dağıtım notu.

---

## Mimari özeti

```
[ Tarayıcı: HTML/CSS/JS + WebGazer ]  --POST /analyze-->  [ FastAPI ]
        |                                                    |
        +---- (opsiyonel) Firebase Auth + Firestore -------+
```

---

## Bileşenler ve seçim gerekçeleri

### Frontend — HTML, CSS, vanilla JavaScript

| Kriter | Gerekçe |
|--------|---------|
| Hız | Derleme yok; statik dosya ile Netlify/GitHub Pages uyumu |
| Entegrasyon | WebGazer script olarak doğrudan yüklenir |
| Sürdürülebilirlik | Küçük ekip için düşük karmaşıklık; PRD MVP ile uyumlu |

### Yapay zekâ / görü — WebGazer.js

| Kriter | Gerekçe |
|--------|---------|
| Donanım | Ek cihaz gerektirmez (webcam) |
| Maliyet | Açık kaynak; araştırma prototipi için uygun |
| Veri | Bakış örnekleri → sapma ve zaman serisi üretimine girdi |

**Not:** Sonuçlar ortam koşullarına duyarlıdır; ürün mesajında “tarama” vurgusu korunur.

### Backend — FastAPI (Python)

| Kriter | Gerekçe |
|--------|---------|
| API | Pydantic şemaları, otomatik OpenAPI, CORS kontrolü |
| Gelecek | NumPy / sklearn / özel model enjekte etmeye uygun |
| Konum | `features/backend/` |

### Veri tabanı / bulut — Firebase (Firestore + Auth)

| Kriter | Gerekçe |
|--------|---------|
| Operasyon | Sunucusuz rapor saklama; MVP için düşük bakım |
| Kimlik | Anonim oturum ile sadeleştirilmiş akış |
| Güvenlik | `firestore.rules` ile yazma kısıtı; istemci sırları `.gitignore` ile korunmalı |
| Konum | Güvenli varsayılan: `firebase-config.defaults.js`; gizli yerel: `firebase-config.local.js` (`.gitignore`); şablon: `firebase-config.example.js` |

---

## Özet tablo

| Katman | Teknoloji | Rol | Neden seçildi |
|--------|-----------|-----|----------------|
| UI | HTML/CSS/JS | Pitch, form, okuma, sonuç kartı | Basit dağıtım, WebGazer uyumu |
| Göz takibi | WebGazer.js | Bakış tahmini | Donanımsız prototip |
| API | FastAPI | `/analyze` | Tip güvenli JSON, Python ekosistemi |
| Opsiyonel DB | Firestore | Rapor arşivi | Ölçeklenebilir bulut, anonim auth |

---

## Dağıtım notları

- Frontend: Netlify / statik hosting; `features/frontend` kök olarak yayınlanır.
- Backend: ayrı barındırma (Railway, Render, VM) veya yerel demo; CORS origin’leri güncellenmelidir.
