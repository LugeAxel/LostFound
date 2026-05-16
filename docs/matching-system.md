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
   │  Category Match    +30                      │
   │  Area Match        +20                      │
   │  Text Relevance    0-100+                   │
   │  GPS Bonus         +25/+15/+5               │
   └──────────────────────┬──────────────────────┘
                          │
                          ▼
            ┌─────────────────────┐
            │  Top 5 Matches      │
            │  (score descending) │
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
| Category match | `+30` | `foundItem.category === lostItem.category` |
| Area match | `+20` | `foundItem.area_category === lostItem.area_category` |
| Full phrase match (name) | `+30` | Lost item name appears in found item name/description |
| Full phrase match (desc) | `+15` | Lost item description appears in found item text |
| Keyword in found name | `+15` / keyword | Each keyword from lost item found in found item name |
| Keyword in found desc | `+5` / keyword | Each keyword from lost item found in found item description |
| GPS < 100m | `+25` | Haversine distance < 100 meters |
| GPS 100-500m | `+15` | Haversine distance 100-500 meters |
| GPS 500-1000m | `+5` | Haversine distance 500-1000 meters |

**Minimum score for notification:** `>= 30`

## 3-Pass Query Strategy

### Pass 1: High Confidence
```
SELECT * FROM items
WHERE type = 'found'
  AND status = 'Available'
  AND category = '<lostItem.category>'
  AND area_category = '<lostItem.area_category>'
  AND id != '<lostItem.id>'
LIMIT 50
```
Menangkap barang dengan kategori dan area yang sama persis.

### Pass 2: Medium Confidence
```
SELECT * FROM items
WHERE type = 'found'
  AND status = 'Available'
  AND category = '<lostItem.category>'
  AND id != '<lostItem.id>'
LIMIT 30
```
Menangkap barang dengan kategori sama tapi area berbeda.

### Pass 3: Text-Based (Fallback)
```
SELECT * FROM items
WHERE type = 'found'
  AND status = 'Available'
  AND category != '<lostItem.category>'
  AND id != '<lostItem.id>'
  AND (
    name ILIKE '%dompet%' OR description ILIKE '%dompet%' OR
    name ILIKE '%hitam%' OR description ILIKE '%hitam%' OR
    name ILIKE '%eiger%' OR description ILIKE '%eiger%'
  )
LIMIT 20
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

Ketika barang hilang dilaporkan, sistem langsung menjalankan matching dan membuat notifikasi jika skor terbaik >= 30.

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
| `category` | VARCHAR(50) | Kategori barang (Electronics, Daily Use, dll) — bobot +30 |
| `area_category` | VARCHAR(50) | Kategori area (Ruang Teori, Lab, dll) — bobot +20 |
| `coordinates_lat` | NUMERIC | Latitude GPS — untuk perhitungan jarak Haversine |
| `coordinates_lng` | NUMERIC | Longitude GPS — untuk perhitungan jarak Haversine |

## Example Flow

1. **User A** melapor kehilangan: _"Dompet Hitam Eiger"_, kategori Daily Use, area Ruang Teori, GPS (-6.1234, 106.5678)
2. **Sistem query Pass 1**: Cari barang temuan dengan Daily Use + Ruang Teori
3. **Sistem query Pass 2**: Cari barang temuan dengan Daily Use (area lain)
4. **Sistem query Pass 3**: Cari barang temuan dengan keyword "dompet", "hitam", "eiger" di kategori lain
5. **Scoring**: Ditemukan "Dompet Eiger" di Lab (Daily Use, area Lab) → Category +30, keyword dompet +15, keyword eiger +15, GPS 120m → +15 = **Total 75**
6. **Notifikasi**: User A mendapat notifikasi "This might be your item: Dompet Eiger" + lihat di My Reports
