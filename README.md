# LarkShinnn

Profil online LarkShinnn dalam bentuk peta Snezhnaya yang bisa dijelajahi: PPC malder di Punishing: Gray Raven, editor AMV, dan developer.
Tema visual dari Ronova (Shade of Death). Static HTML/CSS/JS murni, tanpa build step.

## Jalankan lokal

Double-click `index.html`, atau:

```bash
python -m http.server 5178
# buka http://127.0.0.1:5178
```

## Deploy ke Vercel

Import folder/repo ini, Framework Preset **Other**, tanpa build command, output directory `.` (root). Atau `npx vercel --prod`.

## Kontrol

- WASD / panah: jalan · klik peta: jalan ke titik itu · E: masuk ke tempat terdekat
- 1–8: langsung ke bagian · Esc: tutup panel · scroll / `+` `-`: zoom
- Deep link: `/#profile`, `/#runs`, `/#team`, `/#ledger`, `/#amv`, `/#dev`, `/#teyvat`, `/#contact`

## Data live

Diambil di browser setiap halaman dibuka. Kalau request gagal, situs memakai snapshot di `main.js`.

- **Huaxu** (`https://api.huaxu.app/servers/ap/players/26438993`): nama, CL, guild, signature, avatar, frame, nameplate/badge yang sedang dipasang, character rating, jumlah frame, dan rank tim favorit. Detail senjata/power diambil per karakter saat panel Fav Team dibuka. Kalau tidak ada nameplate yang dipasang, badge disembunyikan.
- **GitHub** (`api.github.com/users/Larkshinnn/repos`): daftar repo di panel Developer.
- **Best Runs** (PPC Ultimate, Warzone Hero, Warzone Legend): `runs-data.js` berisi snapshot semua minggu saat kamu masuk top 100. Saat panel dibuka, browser mengecek ulang minggu terbaru (sampai 6 minggu setelah snapshot) dan menggabungkannya. Untuk memperbarui snapshot lengkap: `python tools/update_runs.py` (memindai semua minggu, beberapa menit).
- **Genshin** (Enka) masih snapshot statis di `ROSTER` (`main.js`).

## Struktur

- `map-data.js`: garis pantai, batas kabut, kontur, dan garis laut Snezhnaya dalam bentuk path vektor, hasil trace dari peta in-game.
- `main.js`: `POIS` (posisi tempat di peta, satuan peta lebar 1000), `FRAMES` dan `SQUADS` (tim favorit), `ROSTER` (Genshin).
- `assets/pgr/`: portrait, avatar, frame, badge fallback · `assets/rank/`: ikon rank (PGR wiki) · `assets/img/`: aset Genshin.

Punishing: Gray Raven © Kuro Games. Genshin Impact © HoYoverse. Situs fan-made, tidak berafiliasi.
