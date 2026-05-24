# Smart Item Matching System

Sistem pencocokan cerdas untuk menemukan barang hilang berdasarkan barang temuan yang dilaporkan.

## Architecture Overview

```
Lost Item Report
       │
       ▼
   ┌─────────────────────────────────────────────┐
   │          3-Pass Query Engine                │
   │                                             │
   │  Pass 1: Category + Area Category           │
   │  Pass 2: Category Only                      │
   │  Pass 3: Text Keyword (ILike) All Categories │
   └──────────────────────┬──────────────────────┘
                          │
                          ▼
    ┌─────────────────────────────────────────────┐
    │        Combined Scoring Engine              │
    │                                             │
    │  Exact Name Match     +80                   │
    │  All Words Match      +50                   │
    │  Phrase Match         +30                   │
    │  Keyword (name)       +15 / non-basic       │
    │  Keyword (desc)       +5  / non-basic       │
    │  Basic Keyword (name) +3                    │
    │  Basic Keyword (desc) +1                    │
    │  Category Match       +14 (conditional)     │
    │  Area Match           +14 (conditional)     │
    │  GPS < 100m           +10                   │
    │  GPS 100–500m         +5                    │
    │  GPS 500–1000m        +1                    │
    └──────────────────────┬──────────────────────┘
                           │
                           ▼
             ┌─────────────────────┐
             │  Top 5 Matches      │
             │  (score ≥ 40)       │
             └──────────┬──────────┘
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
      Notification          MyReports Inline
     ("This might be       (suggestion cards
      your item: ...")      with score & distance)
```

## Scoring Formula

Setiap barang temuan diberi skor berdasarkan kriteria berikut:

| Faktor | Bobot | Kondisi |
|--------|-------|---------|
| Exact name match | `+80` | `lostItem.name.trim().toLowerCase() === foundItem.name.trim().toLowerCase()` |
| All name words match | `+50` | Every meaningful word (≥ 2 chars, excluding stop words) in lost name appears in found name |
| Full phrase match | `+30` | Lost item name appears in found item name/description |
| Keyword in found name (non-basic) | `+15` / keyword | Each non-generic keyword from lost item found in found name |
| Keyword in found desc (non-basic) | `+5` / keyword | Each non-generic keyword in found description |
| Basic keyword in name | `+3` / keyword | Generic terms (colors, materials, sizes, common items) in found name |
| Basic keyword in desc | `+1` / keyword | Generic terms in found description |
| Category match | `+14` | `foundItem.category === lostItem.category` (only if textScore > 0) |
| Area match | `+14` | `foundItem.area_category === lostItem.area_category` (only if textScore > 0) |
| GPS < 100m | `+10` | Haversine distance < 100 meters |
| GPS 100–500m | `+5` | Haversine distance 100–500 meters |
| GPS 500–1000m | `+1` | Haversine distance 500–1000 meters |

### Basic Criteria (generic terms scored lower)

Words like colors (`hitam`, `putih`, `merah`…), materials (`kain`, `plastik`, `kulit`…), sizes (`kecil`, `besar`…), and common items (`tas`, `buku`, `botol`…) get **+3/+1** instead of +15/+5 because they are too generic to indicate a strong match.

**Minimum score for notification:** `>= 40`

## 3-Pass Query Strategy

Semua pass memfilter `status IN ('Available', 'On Progress', 'Returned')`, mengecualikan item yang dilaporkan oleh pengguna yang sama (`.neq('reporter', sourceItem.reporter)`), dan hasilnya di-deduplikasi.

### Pass 1: High Confidence
```
SELECT * FROM items
WHERE type = 'found'
  AND status IN ('Available', 'On Progress', 'Returned')
  AND category = '<lostItem.category>'
  AND area_category = '<lostItem.area_category>'
  AND id != '<lostItem.id>'
  AND reporter != '<sourceItem.reporter>'
LIMIT 30
```
Menangkap barang dengan kategori dan area yang sama persis.

### Pass 2: Medium Confidence
```
SELECT * FROM items
WHERE type = 'found'
  AND status IN ('Available', 'On Progress', 'Returned')
  AND category = '<lostItem.category>'
  AND id != '<lostItem.id>'
  AND reporter != '<sourceItem.reporter>'
LIMIT 20
```
Menangkap barang dengan kategori sama tapi area berbeda.

### Pass 3: Text-Based (Fallback)
```
SELECT * FROM items
WHERE type = 'found'
  AND status IN ('Available', 'On Progress', 'Returned')
  AND category != '<lostItem.category>'
  AND id != '<lostItem.id>'
  AND reporter != '<sourceItem.reporter>'
  AND (
    name ILIKE '%dompet%' OR description ILIKE '%dompet%' OR
    name ILIKE '%hitam%' OR description ILIKE '%hitam%' OR
    name ILIKE '%eiger%' OR description ILIKE '%eiger%'
  )
LIMIT 10
```
Menangkap barang yang mungkin salah kategori tapi namanya cocok.

## Keyword Extraction

```javascript
extractKeywords(name, description)
  ↓
"Dompet Hitam Eiger — warna hitam biasa dipakai sehari-hari"
  ↓
['dompet', 'hitam', 'eiger', 'warna', 'biasa', 'dipakai', 'sehari']
// Stop words yang difilter: dan, di, ke, dari, yang, ini, itu, dsb.
// Kata < 3 karakter juga difilter
```

### Stop Words List

**Indonesia:** dan, di, ke, dari, yang, ini, itu, saya, aku, ada, tidak, bisa, barang, warna

**English:** the, a, an, in, of, to, is, for, on, and, or, with

## API Endpoints

### `GET /api/items/matches/:id`

Mengembalikan 5 barang temuan teratas yang cocok dengan barang hilang.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Dompet Eiger Hitam",
    "location": "Lab 3",
    "category": "Daily Use",
    "area_category": "Laboratorium",
    "description": "Dompet eiger warna hitam ditemukan di lab",
    "image_url": "https://...",
    "coordinates_lat": -6.1234,
    "coordinates_lng": 106.5678,
    "reporter": { "id": "uuid", "nama": "Budi", "nisn": "12345" },
    "score": 95,
    "distance_meters": 50
  }
]
```

### POST `/api/items` (auto-matching on create)

Ketika barang hilang **atau ditemukan** dilaporkan, sistem langsung menjalankan matching secara bidirectional dan membuat notifikasi jika skor terbaik >= 40.

## Notification

Tipe notifikasi baru: `'suggestion'`

```sql
INSERT INTO notifications (user_id, type, item_id, text) VALUES
('reporter-uuid', 'suggestion', 'found-item-uuid',
 'This might be your item: Dompet Eiger Hitam');
```

Muncul di:
- **TopNav bell dropdown** — icon lightbulb amber
- **MyReports page** — kartu saran dengan gambar, lokasi, jarak

## Database

Kolom yang digunakan pada tabel `items`:

| Kolom | Tipe | Fungsi |
|-------|------|--------|
| `name` | VARCHAR(200) | Nama barang — digunakan untuk keyword extraction & phrase match |
| `description` | VARCHAR(500) | Deskripsi barang — digunakan untuk keyword extraction |
| `category` | VARCHAR(50) | Kategori barang (Electronics, Daily Use, dll) — bobot +14 (conditional) |
| `area_category` | VARCHAR(50) | Kategori area (Ruang Teori, Lab, dll) — bobot +14 (conditional) |
| `coordinates_lat` | NUMERIC | Latitude GPS — untuk perhitungan jarak Haversine |
| `coordinates_lng` | NUMERIC | Longitude GPS — untuk perhitungan jarak Haversine |

## Example Flow

1. **User A** melapor kehilangan: _"Dompet Hitam Eiger"_, kategori Daily Use, area Ruang Teori, GPS (-6.1234, 106.5678)
2. **Sistem query Pass 1**: Cari barang temuan dengan Daily Use + Ruang Teori
3. **Sistem query Pass 2**: Cari barang temuan dengan Daily Use (area lain)
4. **Sistem query Pass 3**: Cari barang temuan dengan keyword "dompet", "hitam", "eiger" di kategori lain
5. **Scoring**: Ditemukan "Dompet Eiger" di Lab (Daily Use, area Lab) → category +14, keyword "dompet" (common item → basic) +3, keyword "eiger" (non-basic) +15, GPS 120m → +5 = **Total 37** — di bawah threshold 40, tidak jadi notifikasi
6. **Notifikasi**: Hanya match dengan skor **>= 40** yang mendapat notifikasi "This might be your item" + lihat di My Reports
