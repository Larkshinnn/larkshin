# LarkShinnn

Profil online LarkShinnn dalam bentuk gugusan pulau melayang 3D di wilayah Ronova (Death's Domain): PPC malder di Punishing: Gray Raven, editor AMV, dan developer.
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

- Drag untuk memutar pandangan · klik pulau: wisp terbang ke sana dan membuka bagiannya · A/D atau panah kiri/kanan: putar · W/S, scroll, `+` `-`: zoom · tombol World: kembali ke tampilan semua pulau
- 1–8: langsung ke bagian · E: buka bagian di pulau tempat wisp berada · Esc: tutup panel
- Kalau WebGL atau CDN tidak tersedia, dunianya tidak tampil, tapi tombol dock dan 1–8 tetap membuka setiap bagian.
- Deep link: `/#map` (langsung ke dunia, lewati layar pembuka), `/#profile`, `/#runs`, `/#team`, `/#ledger`, `/#amv`, `/#dev`, `/#teyvat`, `/#contact`

## Data live

Diambil di browser setiap halaman dibuka. Kalau request gagal, situs memakai snapshot di `main.js`.

- **Huaxu** (`https://api.huaxu.app/servers/ap/players/26438993`): nama, CL, guild, signature, avatar, frame, nameplate/badge yang sedang dipasang, character rating, jumlah frame, dan rank tim favorit. Detail senjata/power diambil per karakter saat panel Fav Team dibuka. Kalau tidak ada nameplate yang dipasang, badge disembunyikan.
- **GitHub** (`api.github.com/users/Larkshinnn/repos`): daftar repo di panel Developer.
- **Best Runs** (PPC Ultimate, Warzone Hero, Warzone Legend): `runs-data.js` berisi snapshot semua minggu saat kamu masuk top 100. Saat panel dibuka, browser mengecek ulang minggu terbaru (sampai 6 minggu setelah snapshot) dan menggabungkannya. Untuk memperbarui snapshot lengkap: `python tools/update_runs.py` (memindai semua minggu, beberapa menit).
- **Genshin** (Enka) masih snapshot statis di `ROSTER` (`main.js`).

## Struktur

- `world3d.js` + `assets/3d/`: dunia 3D. Gugusan pulau melayang bertingkat (satu pulau per bagian, dihubungkan jembatan rantai ke Requiem Square) dibuat di Blender lewat script: `"C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b --factory-startup -P tools/build_world.py`. Hasilnya `world.glb` (dikompres Draco), `world.glb.js` (salinan base64 supaya jalan juga dari `file://`), dan `world.blend` untuk diedit. three.js 0.170 dimuat dari jsDelivr lewat import map di `index.html`.
- `main.js`: `POIS` (bagian situs, satu pulau per bagian; posisi pulaunya di `tools/build_world.py`), `FRAMES` dan `SQUADS` (tim favorit), `ROSTER` (Genshin).
- `assets/ronova/`: art resmi Ronova (layar pembuka, latar panel). `assets/ronova/vector/` (motif: lambang, ornamen, mata, sayap, bulu, bingkai tempat) dan `assets/ronova/ui/` (komponen: bingkai panel & kartu, tombol, pemisah, mahkota, permata, tombol tutup) serta `assets/ronova/title/` (layar pembuka: huruf nama hari bergaya patah `glyph-*.svg`, tanda di bawahnya, halo mata) dibuat di VectorCraft lewat `python tools/ronova_assets.py` (bisa sebagian: `python tools/ronova_assets.py "title-*" "glyph-*"`) (`.vectorcraft` bisa diedit di aplikasinya). Bingkai panel di-slice 72 px, kartu 40 px, tombol 0 36 px (CSS `border-image`).
- `assets/pgr/`: portrait, avatar, frame, badge fallback · `assets/rank/`: ikon rank (PGR wiki) · `assets/img/`: aset Genshin.

Punishing: Gray Raven © Kuro Games. Genshin Impact © HoYoverse. Situs fan-made, tidak berafiliasi.
