# AuraLexia — Ürün fikri (`idea.md`)

> **Ne içermeli?** Tek cümlelik vizyon; net problem tanımı; hedef kullanıcı veya persona; çözümün farkı; yapay zekânın sınırları dahil rolü.

---

## Vizyon (tek cümle)

AuraLexia, okuma sırasında göz hareketlerini güvenli biçimde ölçerek **erken risk sinyali** ve **rehberlik özeti** sunan, tarayıcıda çalışan bir erişilebilirlik / öğrenme teknolojisi prototipidir.

---

## Problem

| Boyut | Açıklama |
|--------|-----------|
| **Zaman** | Disleksi ve okuma güçlüğü çoğu zaman geç evrelerde veya formal testlerle ortaya çıkar; müdahale penceresi daralır. |
| **Maliyet ve erişim** | Nöropsikolojik / detaylı okuma değerlendirmeleri her aile ve okul için aynı ölçekte mümkün değil. |
| **Gözle görülür veri eksikliği** | “Kim zorlanıyor?” sorusu notlarla kalır; **okuma anındaki bakış düzeni** (sapma, duraksama, geri dönüş benzeri örüntüler) sınıfta standart biçimde toplanmaz. |

---

## Hedef kullanıcı

| Persona | İhtiyaç | AuraLexia’nın karşılığı |
|---------|---------|-------------------------|
| **Öğretmen / rehber öğretmen** | Hızlı tarama, veli görüşmesine somut girdi | Tek oturumda ölçüm + özet metin ve grafik |
| **Ebeveyn** | Klinik öncesi veya okul sürecine destek | Düşük sürtünmeli ev / masaüstü deneyimi, JSON dışa aktarım |

**Konumlandırma:** Tanı koymaz; **tarama ve bilgilendirme** sunar. Klinik karar uzmana aittir.

---

## Çözüm ve değer önerisi

- Standartlaştırılmış **kalibrasyon + okuma** akışı.
- Sunucu tarafında **metrikler, risk etiketi (MVP), RAM yönlendirme metni** ve isteğe bağlı **Firestore** kaydı.
- Tekrarlanabilirlik: rastgele kalibrasyon noktaları ve metin havuzu ile **ezberi azaltma**.

---

## Yapay zekâ ve verinin rolü

| Katman | Rol |
|--------|-----|
| **WebGazer.js** | Web kamerasından bakış tahmini; zaman damgalı örnekleme. |
| **Sunucu analizi** | Ham örneklerden özet metrikler, metin özeti, grafik serisi (ileride model genişletilebilir). |
| **Firestore (opsiyonel)** | Anonim rapor saklama; PII minimizasyonu hedefi. |

**Sınırlar:** Aydınlatma, kamera kalitesi ve kullanıcı işbirliği sonuçları etkiler; ürün **tıbbi cihaz veya teşhis aracı** olarak pazarlanmamalıdır.
