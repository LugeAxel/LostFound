import { ref, inject, provide, type Ref } from 'vue';

export type Locale = 'en' | 'id';

const I18N_KEY = Symbol('i18n');

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // === SideNav ===
    'nav.brand': 'Lost & Found',
    'nav.brand_sub': 'Digital Concierge',
    'nav.dashboard': 'Dashboard',
    'nav.my_reports': 'My Reports',
    'nav.report': 'Report',
    'nav.search': 'Search',
    'nav.statistics': 'Statistics',
    'nav.report_found': 'Report Found Item',
    'nav.logout': 'Logout',

    // === TopNav ===
    'topnav.search_placeholder': 'Search for items...',
    'topnav.notifications': 'Notifications',
    'topnav.new': 'New',
    'topnav.no_notifications': 'No notifications yet.',
    'topnav.student': 'Student',

    // === Dashboard ===
    'dash.welcome': 'Welcome back,',
    'dash.welcome_sub': 'Lost something on campus? Our digital concierge helps you find your belongings.',
    'dash.view_my_items': 'View My Items',
    'dash.how_it_works': 'How it works',
    'dash.currently_lost': 'Currently Lost',
    'dash.found_today': 'Found Today',
    'dash.returned_all_time': 'Returned All-time',
    'dash.items': 'Items',
    'dash.quick_actions': 'Quick Actions',
    'dash.report_lost': 'Report Lost',
    'dash.report_lost_desc': 'Misplaced something? Let the community know.',
    'dash.start_report': 'Start Report',
    'dash.report_found': 'Report Found',
    'dash.report_found_desc': 'Found someone\'s property? Log the details here.',
    'dash.log_item': 'Log Item',
    'dash.scan_to_claim': 'Scan to Claim',
    'dash.scan_to_claim_desc': 'At the concierge desk? Scan the QR code to verify.',
    'dash.open_scanner': 'Open Scanner',
    'dash.recent_items': 'Recent Items',
    'dash.recent_items_sub': 'Newly reported items in the school ecosystem',
    'dash.no_items': 'No items reported yet.',

    // === Tutorial ===
    'tutorial.title': 'How It Works',
    'tutorial.subtitle': 'A step-by-step guide to using the Lost & Found system at SMKN 2 Depok.',
    'tutorial.back': 'Back to Dashboard',

    'tutorial.claim_title': 'How to Claim Your Item',
    'tutorial.claim_subtitle': 'Follow these steps when you find your lost item listed on the platform.',

    'tutorial.claim_step1_title': 'Browse Items on Dashboard',
    'tutorial.claim_step1_desc': 'Go to the Dashboard and look through the "Recent Items" section. You can browse all reported found items to see if yours is listed.',

    'tutorial.claim_step2_title': 'Open Item Details',
    'tutorial.claim_step2_desc': 'Click on the item card to open its detail page. Here you can see the full description, photo, location, and who reported it.',

    'tutorial.claim_step3_title': 'Contact the Reporter',
    'tutorial.claim_step3_desc': 'Use the built-in chat to message the reporter. Arrange a time and place to meet and verify the item in person.',

    'tutorial.claim_step4_title': 'Meet & Scan the QR Code',
    'tutorial.claim_step4_desc': 'When you meet the reporter, open the Scanner page and scan the item\'s QR code. This starts the verification process.',

    'tutorial.claim_step5_title': 'Take a Verification Photo',
    'tutorial.claim_step5_desc': 'Take a photo of you with the item as proof of handover. Add any notes about the claim if needed.',

    'tutorial.claim_step6_title': 'Claim Complete!',
    'tutorial.claim_step6_desc': 'Submit the claim and the item is marked as "Returned". Both you and the reporter will get a confirmation notification.',

    'tutorial.report_title': 'How to Report Found / Lost Items',
    'tutorial.report_subtitle': 'Help the community by reporting items you found, or let others know what you\'ve lost.',

    'tutorial.report_step1_title': 'Go to the Report Page',
    'tutorial.report_step1_desc': 'Click "Report Lost" or "Report Found" on the Dashboard quick actions, or use the sidebar\'s "Report" menu. This opens the report form.',

    'tutorial.report_step2_title': 'Choose Report Type',
    'tutorial.report_step2_desc': 'Select "Found" if you found someone\'s item, or "Lost" if you\'ve lost yours. The form adjusts based on your choice.',

    'tutorial.report_step3_title': 'Take a Photo',
    'tutorial.report_step3_desc': 'For found items, use your camera to take a direct photo (required). For lost items, you can optionally upload an image.',

    'tutorial.report_step4_title': 'Fill in the Details',
    'tutorial.report_step4_desc': 'Enter the item name, location where it was found/lost, select a category, and add a description with identifying features.',

    'tutorial.report_step5_title': 'Submit Your Report',
    'tutorial.report_step5_desc': 'Hit "Submit Report" and you\'re done! A QR code is automatically generated for found items. Check "My Reports" to manage your submissions.',

    'tutorial.tip_title': 'Quick Tips',
    'tutorial.tip1': 'Always check "My Reports" for claim notifications.',
    'tutorial.tip2': 'Use live GPS location when reporting for more accuracy.',
    'tutorial.tip3': 'Found items require a direct camera photo — screenshots won\'t work.',
    'tutorial.tip4': 'The QR code for each found item is in "My Reports" — share it at the concierge desk.',

    // === ItemCard ===
    'card.lost': 'LOST',
    'card.found': 'FOUND',
    'card.lost_item': 'Lost Item',
    'card.found_item': 'Found Item',
    'card.returned': 'RETURNED',
    'card.gps_verified': 'GPS Verified',
    'card.claimed_by': 'Claimed by:',
    'card.just_now': 'Just now',
    'card.hours_ago': 'hours ago',
    'card.days_ago': 'days ago',
    'card.status.Available': 'Available',
    'card.status.On Progress': 'On Progress',
    'card.status.Returned': 'Returned',
    'card.category.Electronics': 'Electronics',
    'card.category.Daily Use': 'Daily Use',
    'card.category.Clothing': 'Clothing',
    'card.category.Books/Stationery': 'Books/Stationery',
    'card.category.Others': 'Others',
    'marquee.retention_policy': 'Retention Policy: Unclaimed items deleted after 10 days. Returned items deleted after 2 days.',
  },
  id: {
    // === SideNav ===
    'nav.brand': 'Lost & Found',
    'nav.brand_sub': 'Layanan Digital',
    'nav.dashboard': 'Beranda',
    'nav.my_reports': 'Laporan Saya',
    'nav.report': 'Lapor',
    'nav.search': 'Pencarian',
    'nav.statistics': 'Statistik',
    'nav.report_found': 'Laporkan Temuan',
    'nav.logout': 'Keluar',

    // === TopNav ===
    'topnav.search_placeholder': 'Cari barang...',
    'topnav.notifications': 'Notifikasi',
    'topnav.new': 'Baru',
    'topnav.no_notifications': 'Belum ada notifikasi.',
    'topnav.student': 'Siswa',

    // === Dashboard ===
    'dash.welcome': 'Selamat datang,',
    'dash.welcome_sub': 'Kehilangan barang di sekolah? Sistem kami membantu kamu menemukannya.',
    'dash.view_my_items': 'Lihat Barang Saya',
    'dash.how_it_works': 'Cara kerja',
    'dash.currently_lost': 'Sedang Hilang',
    'dash.found_today': 'Ditemukan Hari Ini',
    'dash.returned_all_time': 'Total Dikembalikan',
    'dash.items': 'Barang',
    'dash.quick_actions': 'Aksi Cepat',
    'dash.report_lost': 'Lapor Hilang',
    'dash.report_lost_desc': 'Kehilangan sesuatu? Beritahu komunitas sekolah.',
    'dash.start_report': 'Mulai Lapor',
    'dash.report_found': 'Lapor Temuan',
    'dash.report_found_desc': 'Menemukan barang orang lain? Catat detailnya di sini.',
    'dash.log_item': 'Catat Barang',
    'dash.scan_to_claim': 'Scan untuk Klaim',
    'dash.scan_to_claim_desc': 'Di meja piket? Scan QR code untuk verifikasi.',
    'dash.open_scanner': 'Buka Scanner',
    'dash.recent_items': 'Barang Terbaru',
    'dash.recent_items_sub': 'Barang yang baru dilaporkan di lingkungan sekolah',
    'dash.no_items': 'Belum ada barang yang dilaporkan.',

    // === Tutorial ===
    'tutorial.title': 'Cara Kerja',
    'tutorial.subtitle': 'Panduan langkah demi langkah menggunakan sistem Lost & Found SMKN 2 Depok.',
    'tutorial.back': 'Kembali ke Beranda',

    'tutorial.claim_title': 'Cara Mengklaim Barangmu',
    'tutorial.claim_subtitle': 'Ikuti langkah-langkah ini ketika kamu menemukan barangmu yang hilang di platform.',

    'tutorial.claim_step1_title': 'Cari Barang di Beranda',
    'tutorial.claim_step1_desc': 'Buka Beranda dan lihat bagian "Barang Terbaru". Kamu bisa menelusuri semua barang temuan yang dilaporkan.',

    'tutorial.claim_step2_title': 'Buka Detail Barang',
    'tutorial.claim_step2_desc': 'Klik kartu barang untuk membuka halaman detailnya. Di sini kamu bisa melihat deskripsi lengkap, foto, lokasi, dan siapa yang melaporkan.',

    'tutorial.claim_step3_title': 'Hubungi Pelapor',
    'tutorial.claim_step3_desc': 'Gunakan fitur chat bawaan untuk mengirim pesan ke pelapor. Atur waktu dan tempat untuk bertemu dan verifikasi barang secara langsung.',

    'tutorial.claim_step4_title': 'Bertemu & Scan QR Code',
    'tutorial.claim_step4_desc': 'Saat bertemu pelapor, buka halaman Scanner dan scan QR code barang tersebut. Ini memulai proses verifikasi.',

    'tutorial.claim_step5_title': 'Ambil Foto Verifikasi',
    'tutorial.claim_step5_desc': 'Ambil foto kamu bersama barang tersebut sebagai bukti serah terima. Tambahkan catatan tentang klaim jika diperlukan.',

    'tutorial.claim_step6_title': 'Klaim Selesai!',
    'tutorial.claim_step6_desc': 'Kirim klaim dan barang akan ditandai sebagai "Dikembalikan". Kamu dan pelapor akan mendapatkan notifikasi konfirmasi.',

    'tutorial.report_title': 'Cara Melaporkan Barang Temuan / Hilang',
    'tutorial.report_subtitle': 'Bantu komunitas sekolah dengan melaporkan barang yang kamu temukan, atau beritahu yang lain tentang barang yang hilang.',

    'tutorial.report_step1_title': 'Buka Halaman Lapor',
    'tutorial.report_step1_desc': 'Klik "Lapor Hilang" atau "Lapor Temuan" di aksi cepat Beranda, atau gunakan menu "Lapor" di sidebar. Ini membuka form pelaporan.',

    'tutorial.report_step2_title': 'Pilih Jenis Laporan',
    'tutorial.report_step2_desc': 'Pilih "Temuan" jika kamu menemukan barang orang lain, atau "Hilang" jika kamu kehilangan barang. Form akan menyesuaikan dengan pilihanmu.',

    'tutorial.report_step3_title': 'Ambil Foto',
    'tutorial.report_step3_desc': 'Untuk barang temuan, gunakan kamera untuk mengambil foto langsung (wajib). Untuk barang hilang, kamu bisa mengunggah gambar secara opsional.',

    'tutorial.report_step4_title': 'Isi Detail Barang',
    'tutorial.report_step4_desc': 'Masukkan nama barang, lokasi ditemukan/hilang, pilih kategori, dan tambahkan deskripsi dengan ciri-ciri khusus.',

    'tutorial.report_step5_title': 'Kirim Laporan',
    'tutorial.report_step5_desc': 'Tekan "Kirim Laporan" dan selesai! QR code otomatis dibuat untuk barang temuan. Cek "Laporan Saya" untuk mengelola laporanmu.',

    'tutorial.tip_title': 'Tips Singkat',
    'tutorial.tip1': 'Selalu cek "Laporan Saya" untuk notifikasi klaim.',
    'tutorial.tip2': 'Gunakan lokasi GPS saat melaporkan untuk akurasi lebih baik.',
    'tutorial.tip3': 'Barang temuan memerlukan foto langsung dari kamera — screenshot tidak berlaku.',
    'tutorial.tip4': 'QR code untuk setiap barang temuan ada di "Laporan Saya" — tunjukkan di meja piket.',

    // === ItemCard ===
    'card.lost': 'HILANG',
    'card.found': 'DITEMUKAN',
    'card.lost_item': 'Barang Hilang',
    'card.found_item': 'Barang Temuan',
    'card.returned': 'DIKEMBALIKAN',
    'card.gps_verified': 'GPS Terverifikasi',
    'card.claimed_by': 'Diklaim oleh:',
    'card.just_now': 'Baru saja',
    'card.hours_ago': 'jam lalu',
    'card.days_ago': 'hari lalu',
    'card.status.Available': 'Tersedia',
    'card.status.On Progress': 'Dalam Proses',
    'card.status.Returned': 'Dikembalikan',
    'card.category.Electronics': 'Elektronik',
    'card.category.Daily Use': 'Kebutuhan Harian',
    'card.category.Clothing': 'Pakaian',
    'card.category.Books/Stationery': 'Buku/Alat Tulis',
    'card.category.Others': 'Lainnya',
    'marquee.retention_policy': 'Kebijakan Retensi: Barang tidak diklaim dihapus setelah 10 hari. Barang kembali dihapus setelah 2 hari.',
  }
};

export interface I18nContext {
  locale: Ref<Locale>;
  t: (key: string) => string;
  toggleLocale: () => void;
}

export function createI18n(): I18nContext {
  const saved = localStorage.getItem('locale') as Locale | null;
  const locale = ref<Locale>(saved === 'id' ? 'id' : 'en');

  const t = (key: string): string => {
    return translations[locale.value][key] || key;
  };

  const toggleLocale = () => {
    locale.value = locale.value === 'en' ? 'id' : 'en';
    localStorage.setItem('locale', locale.value);
  };

  return { locale, t, toggleLocale };
}

export function provideI18n(ctx: I18nContext) {
  provide(I18N_KEY, ctx);
}

export function useI18n(): I18nContext {
  const ctx = inject<I18nContext>(I18N_KEY);
  if (!ctx) {
    throw new Error('useI18n() called without provideI18n(). Make sure to call provideI18n() in a parent component.');
  }
  return ctx;
}
