# Yanzy Intelligence (YI Chatbot)

Yanzy Intelligence adalah aplikasi chatbot AI modern dengan desain minimalis dan elegan gaya ChatGPT, dibangun menggunakan React, TypeScript, Tailwind CSS, dan Groq SDK.

## 🚀 Fitur Utama

- **Multi-Mode AI**:
  - **Chatbot Expert**: Menggunakan model **Compound** (OpenAI GPT-OSS 20B) dan **Quon Expert** (Qwen 3 32B) untuk riset dan pencarian cerdas.
  - **Vision Analysis**: Menggunakan model **Llama Image** untuk analisis gambar dan visual secara teknis.
  - **Super Coding Agent**: Menggunakan model **Kimi K2** yang dioptimalkan sebagai asisten koding dan arsitektur perangkat lunak senior.
- **Real-time Search**: Kemampuan pencarian browser real-time untuk jawaban yang selalu terupdate dan akurat.
- **Deep Reasoning**: Analisis mendalam untuk pertanyaan kompleks.
- **VS Code Style Code Blocks**: Output kode yang rapi dengan fitur salin (copy), unduh (download), dan pratinjau (preview) untuk HTML/SVG.
- **Isolated History**: Riwayat percakapan yang terpisah untuk setiap model dan halaman.
- **Responsive Design**: Tampilan yang optimal di semua perangkat (Desktop, Tablet, dan Mobile).
- **GitHub Ready**: Sistem penyimpanan data berbasis file JSON yang memudahkan sinkronisasi dengan repositori GitHub.

## 🛠️ Teknologi

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Backend**: Express (Node.js) sebagai jembatan API yang aman.
- **AI Engine**: Groq SDK (Whisper, Qwen, Llama, Kimi).
- **Mobile**: Persiapan integrasi Capacitor untuk Android/iOS.

## 📦 Instalasi

1. Clone repositori:
   ```bash
   git clone https://github.com/yanzyuyu/yi-chatbot.git
   cd yi-chatbot
   ```

2. Install dependensi:
   ```bash
   npm install
   ```

3. Konfigurasi Environment:
   Buat file `.env` di root folder dan tambahkan:
   ```env
   GROQ_API_KEY="your_groq_api_key"
   ```

4. Jalankan aplikasi (Dev mode):
   ```bash
   npm run dev
   ```

## 📱 Build APK (Android Studio)

Jika ingin membuat APK menggunakan Android Studio:
1. `npm run build`
2. `npx cap sync`
3. `npx cap open android`

---

Developed by [yanzyuyu](https://github.com/yanzyuyu)
