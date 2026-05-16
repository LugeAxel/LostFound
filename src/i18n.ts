import { ref, inject, provide, type Ref } from 'vue';

export type Locale = 'en' | 'id';

const I18N_KEY = Symbol('i18n');

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // === SideNav ===
    'nav.brand': 'QReturn',
    'nav.brand_sub': 'Digital Service',
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
    'dash.welcome_sub': 'Lost something on school? Our digital service helps you find your belongings.',
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
    'dash.scan_to_claim_desc': 'At the service desk? Scan the QR code to verify.',
    'dash.open_scanner': 'Open Scanner',
    'dash.recent_items': 'Recent Items',
    'dash.recent_items_sub': 'Newly reported items in the school ecosystem',
    'dash.no_items': 'No items reported yet.',
    'dash.see_all': 'See All',
    'dash.see_all_items': 'Browse all items',

    // === Search ===
    'search.title': 'Search Items',
    'search.subtitle': 'Browse all reported items across the school ecosystem',
    'search.input_placeholder': 'Search by name, description, or location...',
    'search.no_results': 'No items found matching your search.',
    'search.no_results_sub': 'Try adjusting your search terms or filters.',
    'search.result_count': 'Found',
    'search.results': 'results',
    'search.page': 'Page',
    'search.of': 'of',
    'search.prev': 'Previous',
    'search.next': 'Next',
    'search.all': 'All',
    'search.lost': 'Lost',
    'search.found': 'Found',
    'search.all_categories': 'All Categories',

    // === Scanner ===
    'scanner.title': 'Scan QR Code',
    'scanner.subtitle': "Scan the reporter's QR code to claim your item.",
    'scanner.starting_camera': 'Starting camera...',
    'scanner.error_permission': 'Camera permission denied. Please allow camera access or enter the code manually.',
    'scanner.error_not_found': 'No camera found. Please enter the QR code manually.',
    'scanner.error_unknown': 'Failed to start camera. Please try again or enter the code manually.',
    'scanner.retry': 'Retry',
    'scanner.torch_on': 'Torch On',
    'scanner.torch_off': 'Torch Off',
    'scanner.switch_camera': 'Switch Camera',
    'scanner.or_manual': 'or enter manually',
    'scanner.manual_label': 'Claim Code',
    'scanner.manual_placeholder': 'Paste or type claim code...',
    'scanner.manual_submit': 'Verify',
    'scanner.scan_success': 'Scan Successful!',
    'scanner.how_title': 'How to Use',
    'scanner.how_step1': 'Ask the reporter to show their QR code',
    'scanner.how_step2': 'Point your camera at the QR code on their phone or printed card',
    'scanner.how_step3': 'Wait for the automatic scan — it only takes a second',
    'scanner.how_step4': 'No camera? Enter the code manually from the profile',
    'scanner.or_image': 'or scan from image',
    'scanner.upload_qr': 'Upload QR code image',
    'scanner.decoding': 'Decoding QR...',

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

    'tutorial.smart_title': 'Smart Item Matching',
    'tutorial.smart_subtitle': 'Our advanced system helps find your item faster.',
    'tutorial.smart_step1_title': 'Report with Good Details',
    'tutorial.smart_step1_desc': 'Enter a descriptive name of the item — our system uses your title and description to find matches.',
    'tutorial.smart_step2_title': 'Smart Analysis',
    'tutorial.smart_step2_desc': 'Our system scans all found items matching your category, area, and keywords from your item\'s name and description.',
    'tutorial.smart_step3_title': 'Get Matches',
    'tutorial.smart_step3_desc': 'You\'ll receive a notification and see suggestions in "My Reports" — showing found items that match your lost item\'s name, description, and location.',

    'tutorial.tip_title': 'Quick Tips',
    'tutorial.tip1': 'Always check "My Reports" for claim notifications.',
    'tutorial.tip2': 'Use live GPS location when reporting for more accuracy.',
    'tutorial.tip3': 'Found items require a direct camera photo — screenshots won\'t work.',
    'tutorial.tip4': 'The QR code for each found item is in "My Reports" — share it at the service desk.',
    'tutorial.tip5': 'Use detailed names and descriptions for better matching results.',

    // === ItemCard ===
    'card.lost': 'LOST',
    'card.found': 'FOUND',
    'card.lost_item': 'Lost Item',
    'card.found_item': 'Found Item',
    'card.returned': 'RETURNED',
    'card.gps_verified': 'GPS Verified',
    'card.no_gps': 'No GPS',
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

    // === Developer ===
    'developer.back': 'Back',
    'developer.title': 'Our Developers',
    'developer.subtitle': 'Meet the dedicated team that built the QReturn platform for SMKN 2 Depok. We are passionate about making the school environment better.',
    'developer.dev1_name': 'Developer 1',
    'developer.dev1_role': 'Frontend Engineer',
    'developer.dev1_desc': 'Specializes in Vue.js and Tailwind CSS interfaces.',
    'developer.dev2_name': 'Ahmad Lutfi Al Muzakir',
    'developer.dev2_role': 'Backend Engineer',
    'developer.dev2_desc': 'Architects the Express.js and MongoDB database.',
    'developer.dev3_name': 'Developer 3',
    'developer.dev3_role': 'UI/UX Designer',
    'developer.dev3_desc': 'Creates the user flow and modern aesthetics.',
    'developer.dev4_name': 'Developer 4',
    'developer.dev4_role': 'QA & Testing',
    'developer.dev4_desc': 'Ensures everything works perfectly on all devices.',

    // === ItemDetail ===
    'detail.back': 'Back',
    'detail.no_description': 'No description provided.',
    'detail.category': 'Category',
    'detail.reported_at': 'Reported At',
    'detail.reported_by': 'Reported By',
    'detail.claimed_by': 'Claimed By',
    'detail.being_claimed_by': 'Being Claimed By',
    'detail.proof_of_return': 'Proof of Return',
    'detail.returned_by': 'Returned by',
    'detail.chat_with': 'Chat with',
    'detail.chat_placeholder': 'Type a message...',
    'detail.no_messages': 'No messages yet. Start the conversation!',
    'detail.finalize_ownership': 'Finalize Ownership',
    'detail.finalize_desc': 'Choose the correct owner for this item. This will permanently mark the item as returned to this student.',
    'detail.location_details': 'Location Details',
    'detail.last_seen': 'Last Seen:',
    'detail.found_at': 'Found at:',
    'detail.how_to_collect': 'How to collect?',
    'detail.how_to_collect_desc': 'If you are the owner of this item, please visit the location mentioned above or contact the school service with the claim QR code found in your profile.',
    'detail.claim_this_item': 'Claim This Item',
    'detail.in_progress_notice': 'This item is currently being claimed. The founder and claimer are communicating.',
    'detail.file_complaint': 'File a Complaint',
    'detail.complaint_prompt': 'Please describe why you are filing a complaint:',
    'detail.complaint_success': 'Complaint filed successfully',
    'detail.claimer_label': 'Claimer',
    'detail.complained_label': 'Complained:',
    'detail.confirm_owner': 'Confirm',
    'detail.complaint_already': 'You have filed a complaint for this item',
    'detail.assign_claimer': 'Assign Claimer',
    'detail.assign_claimer_desc': 'Choose who should claim this item. The selected student must meet you and scan the QR code to complete the claim.',
    'detail.original_claimer': 'Original Claimer',
    'detail.set_claimer': 'Set as Claimer',
    'detail.claimer_reassigned': 'Claimer reassigned successfully',
    'detail.meet_scan_notice': 'The claimer must meet you in person and scan the QR code to complete the claim.',
    'detail.complaint_modal_title': 'File a Complaint',
    'detail.complaint_modal_reason': 'Reason for complaint',
    'detail.complaint_modal_cancel': 'Cancel',
    'detail.complaint_modal_submit': 'Submit Complaint',
    'detail.complaint_modal_placeholder': 'Describe why you are filing a complaint...',

    // === Rating ===
    'rating.title': 'Rate This App',
    'rating.average': 'Average Rating',
    'rating.total_ratings': 'Total Ratings',
    'rating.your_rating': 'Your Rating',
    'rating.submit': 'Submit Rating',
    'rating.update': 'Update Rating',
    'rating.thank_you': 'Thank you for your feedback!',
    'rating.comment_placeholder': 'Share your thoughts (optional)...',
    'rating.no_ratings_yet': 'No ratings yet. Be the first!',
    'rating.recent_ratings': 'Recent Ratings',
    'rating.star': 'star',
    'rating.stars': 'stars',

    // === My Reports (suggestions) ===
    'myreports.suggestions_title': 'This Might Be Your Item',
    'myreports.suggestions_desc': 'Based on your report, we found items that might match yours.',
    'myreports.suggestions_match': 'Match',
    'myreports.suggestions_distance': 'distance',
    'myreports.suggestions_no_match': 'No matching items found yet.',
    'myreports.suggestions_check_back': 'Check back later or browse the search page.',

    // === Report (area_category) ===
    'report.area_category': 'Area Category',

    // === Statistics ===
    'stats.title': 'Statistics',
    'stats.subtitle': 'Insights and analytics for the Lost & Found ecosystem',
    'stats.lost_per_day': 'Items Reported Per Day',
    'stats.by_category': 'Items by Category',
    'stats.fun_facts': 'Fun Facts',
    'stats.most_common_location': 'Most Common Location',
    'stats.most_lost_category': 'Most Lost Category',
    'stats.busiest_day': 'Busiest Day for Reports',
    'stats.return_rate': 'Return Rate',
    'stats.avg_return_time': 'Avg. Time to Return',
    'stats.total_items': 'Total Items Reported',
    'stats.items_returned': 'Items Returned',
    'stats.days': 'days',
    'stats.items': 'items',
    'stats.lost': 'Lost',
    'stats.found': 'Found',
    'stats.returned': 'Returned',
    'stats.founded': 'Founded',
  },
  id: {
    // === SideNav ===
    'nav.brand': 'QReturn',
    'nav.brand_sub': 'Layanan Digital',
    'nav.dashboard': 'Beranda',
    'nav.my_reports': 'Laporanku',
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
    'dash.see_all': 'Lihat Semua',
    'dash.see_all_items': 'Jelajahi semua barang',

    // === Search (ID) ===
    'search.title': 'Cari Barang',
    'search.subtitle': 'Jelajahi semua barang yang dilaporkan di lingkungan sekolah',
    'search.input_placeholder': 'Cari berdasarkan nama, deskripsi, atau lokasi...',
    'search.no_results': 'Tidak ada barang yang cocok dengan pencarian Anda.',
    'search.no_results_sub': 'Coba ubah kata kunci atau filter pencarian.',
    'search.result_count': 'Ditemukan',
    'search.results': 'hasil',
    'search.page': 'Halaman',
    'search.of': 'dari',
    'search.prev': 'Sebelumnya',
    'search.next': 'Selanjutnya',
    'search.all': 'Semua',
    'search.lost': 'Hilang',
    'search.found': 'Ditemukan',
    'search.all_categories': 'Semua Kategori',

    // === Scanner ===
    'scanner.title': 'Scan QR Code',
    'scanner.subtitle': 'Scan QR code pelapor untuk mengklaim barangmu.',
    'scanner.starting_camera': 'Memulai kamera...',
    'scanner.error_permission': 'Izin kamera ditolak. Izinkan akses kamera atau masukkan kode secara manual.',
    'scanner.error_not_found': 'Kamera tidak ditemukan. Masukkan kode QR secara manual.',
    'scanner.error_unknown': 'Gagal memulai kamera. Coba lagi atau masukkan kode secara manual.',
    'scanner.retry': 'Coba Lagi',
    'scanner.torch_on': 'Nyalakan Lampu',
    'scanner.torch_off': 'Matikan Lampu',
    'scanner.switch_camera': 'Ganti Kamera',
    'scanner.or_manual': 'atau masukkan manual',
    'scanner.manual_label': 'Kode Klaim',
    'scanner.manual_placeholder': 'Tempel atau ketik kode klaim...',
    'scanner.manual_submit': 'Verifikasi',
    'scanner.scan_success': 'Scan Berhasil!',
    'scanner.how_title': 'Cara Penggunaan',
    'scanner.how_step1': 'Minta pelapor untuk menunjukkan kode QR mereka',
    'scanner.how_step2': 'Arahkan kamera ke kode QR di ponsel atau kartu mereka',
    'scanner.how_step3': 'Tunggu scan otomatis — hanya butuh sedetik',
    'scanner.how_step4': 'Tidak punya kamera? Masukkan kode manual dari profil pelapor',
    'scanner.or_image': 'atau scan dari gambar',
    'scanner.upload_qr': 'Unggah gambar QR code',
    'scanner.decoding': 'Mendekode QR...',

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

    'tutorial.smart_title': 'Pencocokan Cerdas',
    'tutorial.smart_subtitle': 'Sistem canggih kami membantu menemukan barangmu lebih cepat.',
    'tutorial.smart_step1_title': 'Laporkan dengan Detail Lengkap',
    'tutorial.smart_step1_desc': 'Masukkan nama deskriptif untuk barang tersebut — sistem kami menggunakan judul dan deskripsi untuk menemukan kecocokan.',
    'tutorial.smart_step2_title': 'Analisis Cerdas',
    'tutorial.smart_step2_desc': 'Sistem kami memindai semua barang temuan yang cocok dengan kategori, area, dan kata kunci dari nama dan deskripsi barangmu.',
    'tutorial.smart_step3_title': 'Dapatkan Kecocokan',
    'tutorial.smart_step3_desc': 'Kamu akan menerima notifikasi dan melihat saran di "Laporan Saya" — menampilkan barang temuan yang cocok dengan nama, deskripsi, dan lokasi barang hilangmu.',

    'tutorial.tip_title': 'Tips Singkat',
    'tutorial.tip1': 'Selalu cek "Laporan Saya" untuk notifikasi klaim.',
    'tutorial.tip2': 'Gunakan lokasi GPS saat melaporkan untuk akurasi lebih baik.',
    'tutorial.tip3': 'Barang temuan memerlukan foto langsung dari kamera — screenshot tidak berlaku.',
    'tutorial.tip4': 'QR code untuk setiap barang temuan ada di "Laporan Saya" — tunjukkan di meja piket.',
    'tutorial.tip5': 'Gunakan nama dan deskripsi yang detail untuk hasil pencocokan yang lebih baik.',

    // === ItemCard ===
    'card.lost': 'HILANG',
    'card.found': 'DITEMUKAN',
    'card.lost_item': 'Barang Hilang',
    'card.found_item': 'Barang Temuan',
    'card.returned': 'DIKEMBALIKAN',
    'card.gps_verified': 'GPS Terverifikasi',
    'card.no_gps': 'Tidak Ada GPS',
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

    // === Developer ===
    'developer.back': 'Kembali',
    'developer.title': 'Pengembang Kami',
    'developer.subtitle': 'Kenali tim yang berdedikasi membangun platform QReturn untuk SMKN 2 Depok. Kami bersemangat membuat lingkungan sekolah lebih baik.',
    'developer.dev1_name': 'Developer 1',
    'developer.dev1_role': 'Frontend Engineer',
    'developer.dev1_desc': 'Mengkhususkan diri dalam antarmuka Vue.js dan Tailwind CSS.',
    'developer.dev2_name': 'Ahmad Lutfi Al Muzakir',
    'developer.dev2_role': 'Backend Engineer',
    'developer.dev2_desc': 'Merancang database Express.js dan MongoDB.',
    'developer.dev3_name': 'Developer 3',
    'developer.dev3_role': 'UI/UX Designer',
    'developer.dev3_desc': 'Menciptakan alur pengguna dan estetika modern.',
    'developer.dev4_name': 'Developer 4',
    'developer.dev4_role': 'QA & Testing',
    'developer.dev4_desc': 'Memastikan semuanya berfungsi sempurna di semua perangkat.',

    // === ItemDetail (ID) ===
    'detail.back': 'Kembali',
    'detail.no_description': 'Tidak ada deskripsi.',
    'detail.category': 'Kategori',
    'detail.reported_at': 'Dilaporkan Pada',
    'detail.reported_by': 'Dilaporkan Oleh',
    'detail.claimed_by': 'Diklaim Oleh',
    'detail.being_claimed_by': 'Sedang Diklaim Oleh',
    'detail.proof_of_return': 'Bukti Pengembalian',
    'detail.returned_by': 'Dikembalikan oleh',
    'detail.chat_with': 'Chat dengan',
    'detail.chat_placeholder': 'Ketik pesan...',
    'detail.no_messages': 'Belum ada pesan. Mulai percakapan!',
    'detail.finalize_ownership': 'Finalisasi Kepemilikan',
    'detail.finalize_desc': 'Pilih pemilik yang benar untuk barang ini. Ini akan menandai barang secara permanen sebagai kembali ke siswa ini.',
    'detail.location_details': 'Detail Lokasi',
    'detail.last_seen': 'Terakhir Dilihat:',
    'detail.found_at': 'Ditemukan di:',
    'detail.how_to_collect': 'Bagaimana cara mengambil?',
    'detail.how_to_collect_desc': 'Jika Anda pemilik barang ini, silakan kunjungi lokasi yang disebutkan di atas atau hubungi piket sekolah dengan QR code klaim yang ada di profil Anda.',
    'detail.claim_this_item': 'Klaim Barang Ini',
    'detail.in_progress_notice': 'Barang ini sedang dalam proses klaim. Pelapor dan pengklaim sedang berkomunikasi.',
    'detail.file_complaint': 'Ajukan Komplain',
    'detail.complaint_prompt': 'Silakan jelaskan alasan Anda mengajukan komplain:',
    'detail.complaint_success': 'Komplain berhasil diajukan',
    'detail.claimer_label': 'Pengklaim',
    'detail.complained_label': 'Komplain:',
    'detail.confirm_owner': 'Konfirmasi',
    'detail.complaint_already': 'Anda sudah mengajukan komplain untuk barang ini',
    'detail.assign_claimer': 'Atur Pengklaim',
    'detail.assign_claimer_desc': 'Pilih siapa yang akan mengklaim barang ini. Siswa yang dipilih harus bertemu dan scan QR code untuk menyelesaikan klaim.',
    'detail.original_claimer': 'Pengklaim Asli',
    'detail.set_claimer': 'Tetapkan pengklaim',
    'detail.claimer_reassigned': 'Pengklaim berhasil diubah',
    'detail.meet_scan_notice': 'Pengklaim harus bertemu langsung dengan Anda dan scan QR code untuk menyelesaikan klaim.',
    'detail.complaint_modal_title': 'Ajukan Komplain',
    'detail.complaint_modal_reason': 'Alasan komplain',
    'detail.complaint_modal_cancel': 'Batal',
    'detail.complaint_modal_submit': 'Kirim Komplain',
    'detail.complaint_modal_placeholder': 'Jelaskan alasan Anda mengajukan komplain...',

    // === Rating ===
    'rating.title': 'Beri Nilai Aplikasi',
    'rating.average': 'Rata-rata Nilai',
    'rating.total_ratings': 'Total Penilaian',
    'rating.your_rating': 'Nilai Anda',
    'rating.submit': 'Kirim Nilai',
    'rating.update': 'Perbarui Nilai',
    'rating.thank_you': 'Terima kasih atas masukan Anda!',
    'rating.comment_placeholder': 'Bagikan pendapat Anda (opsional)...',
    'rating.no_ratings_yet': 'Belum ada penilaian. Jadilah yang pertama!',
    'rating.recent_ratings': 'Penilaian Terbaru',
    'rating.star': 'bintang',
    'rating.stars': 'bintang',

    // === My Reports (suggestions) ===
    'myreports.suggestions_title': 'Ini Mungkin Barangmu',
    'myreports.suggestions_desc': 'Berdasarkan laporanmu, kami menemukan barang yang mungkin cocok.',
    'myreports.suggestions_match': 'Cocok',
    'myreports.suggestions_distance': 'jarak',
    'myreports.suggestions_no_match': 'Belum ada barang yang cocok.',
    'myreports.suggestions_check_back': 'Cek lagi nanti atau jelajahi halaman pencarian.',

    // === Report (area_category) ===
    'report.area_category': 'Area Kategori',

    // === Statistics ===
    'stats.title': 'Statistik',
    'stats.subtitle': 'Wawasan dan analitik untuk ekosistem Lost & Found',
    'stats.lost_per_day': 'Barang Dilaporkan Per Hari',
    'stats.by_category': 'Barang per Kategori',
    'stats.fun_facts': 'Fakta Menarik',
    'stats.most_common_location': 'Lokasi Paling Umum',
    'stats.most_lost_category': 'Kategori Paling Hilang',
    'stats.busiest_day': 'Hari Tersibuk Laporan',
    'stats.return_rate': 'Tingkat Pengembalian',
    'stats.avg_return_time': 'Rata-rata Waktu Kembali',
    'stats.total_items': 'Total Barang Dilaporkan',
    'stats.items_returned': 'Barang Dikembalikan',
    'stats.days': 'hari',
    'stats.items': 'barang',
    'stats.lost': 'Hilang',
    'stats.found': 'Ditemukan',
    'stats.returned': 'Dikembalikan',
    'stats.founded': 'Ditemukan',
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
