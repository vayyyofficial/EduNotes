import { Book } from '../types/textbook';

const NOW = new Date().toISOString();

export const INITIAL_BOOKS: Book[] = [
  {
    id: 'book-sejarah',
    name: 'Sejarah',
    slug: 'sejarah',
    description:
      'Buku pelajaran digital mengenai pengantar ilmu sejarah, masa praaksara, hingga perkembangan peradaban Nusantara.',
    icon: 'Landmark',
    color: '#FACC15',
    updatedAt: NOW,
    references: [],
    chapters: [
      {
        id: 'ch-sej-1',
        number: 1,
        title: 'Pengantar Ilmu Sejarah',
        description: 'Konsep dasar sejarah, dimensi waktu, dan jenis-jenis sumber sejarah.',
        subchapters: [
          {
            id: 'sub-sej-1-1',
            code: '1.1',
            title: 'Pengertian Sejarah',
            description: 'Memahami arti sejarah secara etimologis serta peran manusia, ruang, dan waktu.',
            tags: ['pengantar sejarah', 'etimologi', 'konsep dasar'],
            updatedAt: NOW,
            versions: [
              {
                id: 'ver-sej-1-1-1',
                versionNumber: 1,
                title: 'Pengertian Sejarah',
                changeSummary: 'Materi awal buku Sejarah',
                sourceMode: 'manual',
                createdAt: NOW,
                content: [],
              },
            ],
            content: [
              {
                id: 'b-sej-1',
                type: 'paragraph',
                text: 'Sejarah adalah ilmu yang mempelajari peristiwa masa lalu manusia secara sistematis berdasarkan bukti dan sumber yang dapat diverifikasi. Dalam bahasa Arab, kata sejarah berasal dari **syajaratun** yang berarti pohon atau silsilah.',
              },
              {
                id: 'b-sej-2',
                type: 'heading',
                text: 'Tiga Unsur Utama Sejarah',
              },
              {
                id: 'b-sej-3',
                type: 'numbered_list',
                items: [
                  '**Manusia**: Pelaku sekaligus subjek utama dalam setiap peristiwa sejarah.',
                  '**Ruang**: Tempat terjadinya peristiwa sejarah yang memberi batas geografis.',
                  '**Waktu**: Dimensi kronologis yang membedakan masa lalu, masa kini, dan masa depan.',
                ],
              },
              {
                id: 'b-sej-4',
                type: 'definition',
                term: 'Historiografi',
                text: 'Tahap penulisan sejarah berdasarkan hasil penelitian, kritik sumber, dan interpretasi sejarawan.',
              },
              {
                id: 'b-sej-5',
                type: 'takeaway',
                title: 'Ringkasan Penting',
                items: [
                  'Sejarah selalu bertumpu pada tiga unsur: manusia, ruang, dan waktu.',
                  'Peristiwa sejarah bersifat unik (einmalig) dan tidak terulang persis sama.',
                ],
              },
            ],
          },
          {
            id: 'sub-sej-1-2',
            code: '1.2',
            title: 'Konsep Waktu dalam Sejarah',
            description: 'Perbedaan cara berpikir diakronik (kronologis) dan sinkronik.',
            tags: ['diakronik', 'sinkronik', 'kronologi'],
            updatedAt: NOW,
            versions: [],
            content: [
              {
                id: 'b-sej-12-1',
                type: 'paragraph',
                text: 'Dalam mempelajari peristiwa masa lalu, sejarawan menggunakan dua pendekatan utama terhadap waktu dan ruang, yaitu berpikir **diakronik** dan **sinkronik**.',
              },
              {
                id: 'b-sej-12-2',
                type: 'table',
                headers: ['Aspek', 'Diakronik', 'Sinkronik'],
                rows: [
                  ['Fokus utama', 'Memanjang dalam waktu', 'Melebar dalam ruang'],
                  ['Sifat kajian', 'Kronologis dan berurutan', 'Mendalam pada satu periode'],
                  ['Contoh', 'Kronologi Perang Diponegoro 1825–1830', 'Kondisi ekonomi Jakarta tahun 1998'],
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'ch-sej-2',
        number: 2,
        title: 'Masa Praaksara',
        description: 'Kehidupan manusia sebelum mengenal tulisan serta pembagian zaman arkeologis.',
        subchapters: [
          {
            id: 'sub-sej-2-1',
            code: '2.1',
            title: 'Pembagian Zaman Batu',
            description: 'Perkembangan kebudayaan Paleolitikum, Mesolitikum, dan Neolitikum.',
            tags: ['praaksara', 'zaman batu', 'arkeologi'],
            updatedAt: NOW,
            versions: [],
            content: [
              {
                id: 'b-sej-21-1',
                type: 'paragraph',
                text: 'Masa praaksara adalah periode kehidupan manusia sebelum mengenal tulisan. Berdasarkan hasil kebudayaan batunya, zaman batu dibagi menjadi beberapa tahap perkembangan.',
              },
              {
                id: 'b-sej-21-2',
                type: 'bullet_list',
                items: [
                  '**Paleolitikum (Zaman Batu Tua)**: Alat batu masih kasar, manusia hidup berpindah-pindah (*nomaden*) dan berburu.',
                  '**Mesolitikum (Zaman Batu Tengah)**: Mulai tinggal semi-menetap di gua (*abris sous roche*).',
                  '**Neolitikum (Zaman Batu Muda)**: Alat batu sudah diasah halus, manusia mulai bercocok tanam dan menetap.',
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'book-matematika',
    name: 'Matematika',
    slug: 'matematika',
    description:
      'Buku catatan terstruktur mencakup Aljabar, Sistem Persamaan Linear, Fungsi, dan Statistika Dasar.',
    icon: 'Calculator',
    color: '#FDE047',
    updatedAt: NOW,
    references: [],
    chapters: [
      {
        id: 'ch-mat-1',
        number: 1,
        title: 'Sistem Persamaan Linear',
        description: 'Penyelesaian SPLDV dengan metode substitusi, eliminasi, dan grafik.',
        subchapters: [
          {
            id: 'sub-mat-1-1',
            code: '1.1',
            title: 'Bentuk Umum SPLDV',
            description: 'Mengenal variabel, koefisien, konstanta, dan bentuk umum persamaan linear dua variabel.',
            tags: ['spldv', 'aljabar', 'persamaan linear'],
            updatedAt: NOW,
            versions: [],
            content: [
              {
                id: 'b-mat-1',
                type: 'paragraph',
                text: 'Sistem Persamaan Linear Dua Variabel (SPLDV) terdiri atas dua persamaan linear yang masing-masing memiliki dua variabel berpangkat satu, umumnya ditulis sebagai **ax + by = c**.',
              },
              {
                id: 'b-mat-2',
                type: 'note',
                title: 'Catatan Penting',
                text: 'Pastikan kedua persamaan menggunakan variabel yang sama sebelum melakukan metode eliminasi atau substitusi.',
              },
              {
                id: 'b-mat-3',
                type: 'numbered_list',
                items: [
                  'Metode **Substitusi**: Menyatakan satu variabel dalam variabel lain lalu memasukkannya ke persamaan kedua.',
                  'Metode **Eliminasi**: Menyamakan koefisien salah satu variabel untuk menghilangkannya.',
                  'Metode **Campuran**: Menggabungkan eliminasi dan substitusi untuk hasil lebih cepat.',
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'book-informatika',
    name: 'Informatika',
    slug: 'informatika',
    description:
      'Buku pelajaran digital tentang Berpikir Komputasional, Algoritma, Struktur Data, dan Jaringan Komputer.',
    icon: 'Code2',
    color: '#FACC15',
    updatedAt: NOW,
    references: [],
    chapters: [
      {
        id: 'ch-inf-1',
        number: 1,
        title: 'Berpikir Komputasional',
        description: 'Empat pilar utama pemecahan masalah secara sistematis dan terstruktur.',
        subchapters: [
          {
            id: 'sub-inf-1-1',
            code: '1.1',
            title: 'Empat Pilar Berpikir Komputasional',
            description: 'Dekomposisi, pengenalan pola, abstraksi, dan perancangan algoritma.',
            tags: ['komputasional', 'algoritma', 'dekomposisi'],
            updatedAt: NOW,
            versions: [],
            content: [
              {
                id: 'b-inf-1',
                type: 'paragraph',
                text: 'Berpikir komputasional adalah pendekatan pemecahan masalah yang membagi persoalan kompleks menjadi langkah-langkah logis yang dapat dijalankan manusia maupun komputer.',
              },
              {
                id: 'b-inf-2',
                type: 'bullet_list',
                items: [
                  '**Dekomposisi**: Memecah masalah besar menjadi submasalah yang lebih kecil.',
                  '**Pengenalan Pola**: Mencari kesamaan atau tren dari data dan masalah sebelumnya.',
                  '**Abstraksi**: Menyaring informasi penting dan mengabaikan detail yang tidak relevan.',
                  '**Algoritma**: Menyusun langkah-langkah penyelesaian secara runtut dan jelas.',
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'book-bahasa-indonesia',
    name: 'Bahasa Indonesia',
    slug: 'bahasa-indonesia',
    description:
      'Buku materi teks laporan hasil observasi, teks eksposisi, kaidah kebahasaan, dan struktur paragraf efektif.',
    icon: 'Languages',
    color: '#FDE047',
    updatedAt: NOW,
    references: [],
    chapters: [
      {
        id: 'ch-bin-1',
        number: 1,
        title: 'Teks Laporan Hasil Observasi',
        description: 'Struktur, ciri kebahasaan, dan cara menyusun laporan pengamatan objektif.',
        subchapters: [
          {
            id: 'sub-bin-1-1',
            code: '1.1',
            title: 'Struktur Teks LHO',
            description: 'Pernyataan umum, deskripsi bagian, dan deskripsi manfaat.',
            tags: ['teks lho', 'observasi', 'struktur teks'],
            updatedAt: NOW,
            versions: [],
            content: [
              {
                id: 'b-bin-1',
                type: 'paragraph',
                text: 'Teks Laporan Hasil Observasi (LHO) menyajikan informasi faktual mengenai suatu objek berdasarkan pengamatan langsung secara objektif.',
              },
              {
                id: 'b-bin-2',
                type: 'numbered_list',
                items: [
                  '**Pernyataan Umum / Klasifikasi**: Berisi definisi dan pengelompokan objek secara umum.',
                  '**Deskripsi Bagian**: Menjelaskan rincian ciri, bagian, atau perilaku objek.',
                  '**Deskripsi Manfaat**: Memaparkan kegunaan atau fungsi objek dalam kehidupan.',
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];
