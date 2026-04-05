# Proje Planı ve Görev Kırılımları (AuraLexia)

## 1. Kullanıcı Akışı (User Flow)

Kullanıcı uygulamayı açtığında baştan sona şu adımları yaşar:

1. **Karşılama Ekranı (Landing):** Öğretmen veya veli siteye girer. Uygulamanın ne işe yaradığını anlatan sade bir ekranla karşılaşır.
2. **Öğrenci Kaydı:** Testi yapacak çocuğun adını ve sınıfını/yaşını girerek **"Teste Başla"** butonuna basar.
3. **Kamera İzni:** Tarayıcı üstten bir uyarı çıkarır ve kameraya erişim izni ister. Kullanıcı **"İzin Ver"**e tıklar.
4. **Kalibrasyon (Odaklama) Aşaması:** Çocuğun bilgisayarın karşısına geçmesi istenir. Ekranda 5 farklı köşede sırayla beliren noktalara bakıp tıklaması istenir. Bu adım, yapay zekanın çocuğun gözlerini tanımasını sağlar (*WebGazer.js bu aşamada gözleri ekrana eşler*).
5. **Okuma Görevi:** Ekranda çocuğun yaşına uygun kısa bir okuma metni belirir. Çocuk metni **sesli veya sessiz** okurken, sistem göz hareketlerini (nerede duraksadı, nereye geri döndü) arka planda kaydeder.
6. **Analiz (Yükleniyor):** Okuma bittiğinde **"Veriler Analiz Ediliyor..."** ekranı çıkar.
7. **Sonuç Raporu (Dashboard):** Öğretmen/Veli ekrana geri döner. Çocuğun okuma sırasındaki **risk durumu** ve **uzman (RAM) yönlendirmesi** tavsiyesi anlaşılır bir grafikle ekranda gösterilir.

---

## 2. Teknoloji Seçimi (Tech Stack)

Başlangıç seviyesinde olduğumuz için karmaşık yapılardan (React, Vue vb.) kaçınıp, en temel ve sağlam teknolojilerle ilerliyoruz:

*   **Frontend (Önyüz): HTML, CSS ve Vanilla JavaScript**
    *   **Neden?** Kurulum gerektirmez, doğrudan tarayıcıda çalışır. Başlangıç seviyesi için en anlaşılır olanıdır ve Cursor AI bu üçlüyle kusursuz kod yazar.
*   **Göz Takibi (Core Tech): WebGazer.js**
    *   **Neden?** Göz takibi için donanıma (kamera cihazına) ihtiyaç duymadan, sadece standart bir web kamerası ve JavaScript ile tarayıcı üzerinden çalışır. Projenin "sıfır maliyet" vizyonunu sağlar.
*   **Backend & Veri İşleme: Python (FastAPI)**
    *   **Neden?** Gözden alınan koordinat verilerini matematiksel olarak işlemek ve bir "Risk Skoru" çıkarmak için Python en güçlü dildir. FastAPI ise Python ile saniyeler içinde sunucu kurmamızı sağlar.
*   **Veritabanı (Opsiyonel/Sonraki Aşama): Firebase**
    *   **Neden?** Öğrenci sonuçlarını kaydetmek ve üyelik sistemi kurmak gerekirse, sunucu yönetimi gerektirmeyen en basit tak-çalıştır veritabanıdır.

---

## 3. Görevlere Bölme (Geliştirme Fazları)

Sprint sırası, `tasks.md` ile aynı şekilde **kullanıcı akışına** göredir (önce ekran 1–2, sonra kamera/kalibrasyon, okuma ve API, en son yükleme ve dashboard).

### Sprint 1: Karşılama ve Öğrenci Kaydı

*   **Görev 1.1:** Karşılama (Landing) ekranı; uygulamanın amacını anlatan sade metin ve ilerleme.
*   **Görev 1.2:** Öğrenci adı, sınıf/yaş formu ve **Teste Başla**; oturum bilgisini sonraki adımlara taşıma.

### Sprint 2: Kamera İzni ve Kalibrasyon

*   **Görev 2.1:** Test sonrası kameraya erişim izni (`getUserMedia` / WebGazer); hata mesajları.
*   **Görev 2.2:** `WebGazer.js` entegrasyonu.
*   **Görev 2.3:** 5 noktalı kalibrasyon (köşelerde sırayla bakıp tıklama).
*   **Görev 2.4:** Göz baktığı yeri gösteren imleç/nokta ile doğrulama.

### Sprint 3: Okuma, Veri Toplama ve Backend Analizi

*   **Görev 3.1:** Kalibrasyon sonrası yaşa uygun okuma metni ekranı.
*   **Görev 3.2:** Okuma sırasında örnekleme ile X/Y (ve zaman damgası) kaydı.
*   **Görev 3.3:** Oturum verisini JSON ve API isteğine uygun biçimde hazırlama.
*   **Görev 3.4:** Python + FastAPI sunucu (ör. sağlık kontrolü).
*   **Görev 3.5:** Koordinat JSON kabul eden analiz endpoint’i.
*   **Görev 3.6:** Duraksama (fixation) ve geri dönüş (regression) hesaplama; risk/özet yanıtı.
*   **Görev 3.7:** *(İleri)* Scikit-learn veya kural tabanlı risk skoru (MVP’de stub kabul edilebilir).
*   **Görev 3.8:** CORS ve istemci–sunucu hata yönetimi.

### Sprint 4: Yükleme Ekranı, Sonuç ve Opsiyonel Veri Saklama

*   **Görev 4.1:** *(Opsiyonel)* Firebase ile sonuç kaydı ve üyelik.
*   **Görev 4.2:** **Veriler Analiz Ediliyor...** yükleme durumu; API tamamlanana kadar gösterim.
*   **Görev 4.3:** Sonuç dashboard’u: risk, RAM yönlendirmesi, grafik (Python yanıtına bağlı).
*   **Görev 4.4:** Sonuçların kalıcı saklanması stratejisi (Firebase veya MVP alternatifi).
