import { Video, Artist, CustomFieldDefinition, RatingFolder, RatingTemplateFolder, VideoArtistPivot, RoleWeight, GalleryNote, EntryTypeDefinition, GenericEntry } from '../types';

const STORAGE_KEYS = {
  VIDEOS: 'cinerate_videos_v1',
  ARTISTS: 'cinerate_artists_v1',
  FIELDS: 'cinerate_fields_v1',
  ARTIST_FIELDS: 'cinerate_artist_fields_v1',
  ENTRY_TYPES: 'cinerate_entry_types_v1',
  GENERIC_ENTRIES: 'cinerate_generic_entries_v1',
  RATING_TEMPLATES: 'cinerate_rating_templates_v1',
  VIDEO_VIEW_MODE: 'cinerate_video_view_mode_v1',
  ARTIST_VIEW_MODE: 'cinerate_artist_view_mode_v1',
  PIVOTS: 'cinerate_video_artist_pivots_v1',
  ROLE_WEIGHTS: 'cinerate_role_weights_v1',
  GALLERY_NOTES: 'cinerate_gallery_notes_v1',
};

// Calculate overall rating from multiple rating folders and items (0 - 100)
export function calculateOverallRating(
  folders?: RatingFolder[] | { ratingFolders?: RatingFolder[] } | null
): number {
  if (!folders) return 0;

  let targetList: RatingFolder[] = [];
  if (Array.isArray(folders)) {
    targetList = folders;
  } else if (typeof folders === 'object' && Array.isArray(folders.ratingFolders)) {
    targetList = folders.ratingFolders;
  } else {
    return 0;
  }

  if (targetList.length === 0) return 0;
  let totalScore = 0;
  let totalItems = 0;

  for (const folder of targetList) {
    if (folder && folder.items && Array.isArray(folder.items) && folder.items.length > 0) {
      for (const item of folder.items) {
        if (typeof item.score === 'number' && !isNaN(item.score)) {
          totalScore += Math.max(0, Math.min(100, item.score));
          totalItems += 1;
        }
      }
    }
  }

  if (totalItems === 0) return 0;
  return Math.round(totalScore / totalItems);
}

// Calculate artist overall rating aggregated from all linked videos (0 - 100)
// Sesuai Aturan Rumus Baku Baru (Poin 2):
// V = Nilai Video Utama
// S = Bobot Status Peran (%)
// P = Nilai Performa (0-100)
// Hasil Satu = (V * S) / 100
// Hasil Dua = (V * P) / 100
// Nilai Didapat Artis = (Hasil Satu + Hasil Dua) / 2 = (V * (S + P)) / 200
export function calculateArtistAggregatedRating(
  artistId: string,
  videos: Video[],
  roleWeights?: RoleWeight[],
  pivots?: VideoArtistPivot[]
): {
  rating: number | null;
  videoCount: number;
  totalPoints: number;
  videoOverallAverage: number | null;
  videoScores: {
    videoId: string;
    videoTitle: string;
    videoOverallRating: number;
    roleName: string;
    weight: number;
    performance: number;
    scoreObtained: number;
  }[];
} {
  const linkedVideos = videos.filter((v) => v.artistIds && v.artistIds.includes(artistId));
  if (linkedVideos.length === 0) {
    return {
      rating: null,
      videoCount: 0,
      totalPoints: 0,
      videoOverallAverage: null,
      videoScores: [],
    };
  }

  const weights = (roleWeights && roleWeights.length > 0) ? roleWeights : getStoredRoleWeights();
  const weightsMap = new Map<string, number>();
  weights.forEach((rw) => weightsMap.set(rw.roleName.toLowerCase().trim(), rw.weight));

  const effectivePivots = pivots || getStoredPivots();
  const pivotMap = new Map<string, VideoArtistPivot>();
  effectivePivots.forEach((p) => {
    if (p.artistId === artistId) {
      pivotMap.set(p.videoId, p);
    }
  });

  const videoScores = linkedVideos.map((vid) => {
    const roleName = (vid.artistRoles?.[artistId] || 'Artis Utama').trim();
    const roleKey = roleName.toLowerCase();

    const matchedRw = weights.find((rw) => rw.roleName.toLowerCase().trim() === roleKey);
    const existingPivot = pivotMap.get(vid.id);

    let weight = weightsMap.has(roleKey) ? weightsMap.get(roleKey)! : 100;
    if (existingPivot && matchedRw?.isLocked) {
      weight = existingPivot.bobot_saat_itu;
    }

    const videoOverallRating =
      typeof vid.overallRating === 'number' && !isNaN(vid.overallRating)
        ? vid.overallRating
        : 0;

    let performance = vid.artistPerformances?.[artistId];
    if (typeof performance !== 'number' || isNaN(performance)) {
      performance = existingPivot?.nilai_performa !== undefined ? existingPivot.nilai_performa : weight;
    }

    const rawScore = calculatePivotScore(videoOverallRating, weight, performance);

    return {
      videoId: vid.id,
      videoTitle: vid.title,
      videoOverallRating,
      roleName,
      weight,
      performance,
      scoreObtained: rawScore,
    };
  });

  const totalPoints = Math.round(videoScores.reduce((acc, vs) => acc + vs.scoreObtained, 0) * 10) / 10;
  const avg = videoScores.length > 0 ? totalPoints / videoScores.length : null;
  const rating = avg !== null ? Math.round(avg * 10) / 10 : null;

  const rawVideoSum = linkedVideos.reduce((acc, v) => acc + (v.overallRating || 0), 0);
  const videoOverallAverage =
    linkedVideos.length > 0 ? Math.round((rawVideoSum / linkedVideos.length) * 10) / 10 : null;

  return {
    rating,
    videoCount: videoScores.length,
    totalPoints,
    videoOverallAverage,
    videoScores,
  };
}

export const DEFAULT_FIELDS: CustomFieldDefinition[] = [
  {
    id: 'field_link',
    key: 'url',
    label: 'Link Video Multifungsi',
    description: 'URL video sumber (YouTube, Vimeo, web). Otomatis ekstrak judul, thumbnail, embed, dan domain.',
    type: 'link',
    order: 1,
    isSystem: true,
    required: true,
  },
  {
    id: 'field_title',
    key: 'title',
    label: 'Judul Video',
    description: 'Nama/judul entri video. Otomatis terisi dari metadata link namun dapat disunting manual.',
    type: 'text',
    order: 2,
    isSystem: true,
    required: true,
  },
  {
    id: 'field_notes',
    key: 'notes',
    label: 'Catatan & Analisis',
    description: 'Textarea catatan yang dapat dilipat/accordion untuk ulasan atau kritik mendalam.',
    type: 'notes',
    order: 3,
    isSystem: true,
  },
  {
    id: 'field_rating_folders',
    key: 'ratingFolders',
    label: 'Folder Number (Sistem Rating Bertingkat)',
    description: 'Struktur Folder dinamis berisi item-item penilaian skala 0-100 dengan kalkulasi Overall Rating real-time.',
    type: 'rating_folder',
    order: 4,
    isSystem: true,
    defaultFolderNames: ['Sinematografi & Visual', 'Akting & Penjiwaan', 'Naskah & Narasi', 'Audio & Musik'],
  },
  {
    id: 'field_artists',
    key: 'artistIds',
    label: 'Tautan Artis Terlibat',
    description: 'Relasi Many-to-Many ke profil artis. Nilai rating video otomatis memperbarui agregat rating artis.',
    type: 'artist_select',
    order: 5,
    isSystem: true,
  },
  {
    id: 'field_genre',
    key: 'genre',
    label: 'Genre Film & Video',
    description: 'Tag kategori multi-pilihan untuk filter cepat di Beranda dan pencarian di halaman Peringkat.',
    type: 'multi_choice',
    order: 6,
    options: ['Laga', 'Drama', 'Fiksi Ilmiah', 'Thriller', 'Komedi', 'Horor', 'Petualangan', 'Dokumenter', 'Animasi', 'Musikal'],
    optionDescriptions: {
      'Laga': 'Adegan pertarungan intens, ketangkasan fisik, dan aksi spektakuler.',
      'Drama': 'Konflik emosional dan dinamika hubungan antarmanusia.',
      'Fiksi Ilmiah': 'Eksplorasi konsep futuristik, teknologi, dan luar angkasa.',
      'Thriller': 'Ketegangan, misteri mencekam, dan intrik psikologis.',
      'Komedi': 'Humor, situasi lucu, dan dialog jenaka.',
      'Horor': 'Kengerian supranatural dan sensasi atmosferik mencekam.',
      'Petualangan': 'Ekspedisi menantang dan pencarian misi berisiko tinggi.',
      'Dokumenter': 'Fakta nyata, sejarah, isu sosial, atau fenomena alam.',
      'Animasi': 'Seni gerak grafis dengan daya imajinasi visual.',
      'Musikal': 'Integrasi musik, lagu, dan tarian sebagai penggerak cerita.',
    },
  },
  {
    id: 'field_status',
    key: 'status',
    label: 'Status Penayangan',
    description: 'Pilihan tunggal status rilis atau tontonan video untuk filter kustom di Peringkat.',
    type: 'single_choice',
    order: 7,
    options: ['Bioskop', 'Streaming', 'Produksi', 'Selesai', 'Favorit'],
    optionDescriptions: {
      'Bioskop': 'Dirilis di bioskop komersial layar lebar.',
      'Streaming': 'Tersedia di platform streaming resmi.',
      'Produksi': 'Dalam proses syuting atau pascaproduksi.',
      'Selesai': 'Selesai dievaluasi dan ditonton.',
      'Favorit': 'Masuk daftar tontonan prioritas tinggi.',
    },
  },
  {
    id: 'field_intensitas',
    key: 'intensity',
    label: 'Tingkat Intensitas',
    description: 'Kategori tingkat intensitas adegan pada karya video.',
    type: 'single_choice',
    order: 8,
    options: ['Intens', 'Ringan'],
    optionDescriptions: {
      'Intens': 'Adegan penuh tekanan, adu fisik, atau konflik berat.',
      'Ringan': 'Adegan santai, kasual, dan tanpa ketegangan fisik tinggi.',
    },
  },
  {
    id: 'field_country',
    key: 'country',
    label: 'Negara Asal Produksi',
    description: 'Pilihan tunggal negara asal produksi untuk segmentasi karya seni.',
    type: 'single_choice',
    order: 8,
    options: ['Indonesia', 'Korea Selatan', 'Jepang', 'Amerika Serikat', 'Inggris', 'Prancis', 'Jerman'],
    optionDescriptions: {
      'Indonesia': 'Produksi sineas dan industri kreatif perfilman Republik Indonesia.',
      'Korea Selatan': 'Produksi perfilman dan drama sinematik dari Korea Selatan.',
      'Jepang': 'Karya perfilman, sinema independen, dan adaptasi dari Jepang.',
      'Amerika Serikat': 'Produksi industri perfilman Hollywood dan studio Amerika Serikat.',
      'Inggris': 'Karya perfilman dan drama produksi industri sinema Britania Raya.',
      'Prancis': 'Sinema sinematik seni dan drama auteur dari Prancis.',
      'Jerman': 'Produksi perfilman ekspresif dan inovatif dari industri Jerman.',
    },
  },
];

export const DEFAULT_RATING_TEMPLATES: RatingTemplateFolder[] = [
  {
    id: 'tmpl_folder_1',
    name: 'Sinematografi & Visual',
    items: [
      {
        id: 'tmpl_item_1_1',
        name: 'Komposisi Kamera & Framing',
        description: 'Pengaturan sudut pandang, pergerakan kamera dinamis (panning/tracking), dan keharmonisan komposisi visual.',
        defaultScore: 85,
      },
      {
        id: 'tmpl_item_1_2',
        name: 'Pencahayaan & Color Grading',
        description: 'Tata cahaya dinamis, palet warna atmosferik, serta konsistensi tone visual sepanjang adegan.',
        defaultScore: 85,
      },
      {
        id: 'tmpl_item_1_3',
        name: 'Efek Visual & CGI / Praktis',
        description: 'Pemanfaatan efek visual praktis maupun CGI yang mulus dan mendukung keotentikan cerita.',
        defaultScore: 80,
      },
    ],
  },
  {
    id: 'tmpl_folder_2',
    name: 'Akting & Penjiwaan',
    items: [
      {
        id: 'tmpl_item_2_1',
        name: 'Penjiwaan Karakter Utama',
        description: 'Kedalaman ekspresi emosional, keaslian karakter, dan penghayatan psikologis tokoh utama.',
        defaultScore: 85,
      },
      {
        id: 'tmpl_item_2_2',
        name: 'Dinamika Interaksi Ensemble Cast',
        description: 'Chemistry, sinkronisasi aksi-reaksi antarpemeran, serta ritme dialog bersama.',
        defaultScore: 80,
      },
      {
        id: 'tmpl_item_2_3',
        name: 'Artikulasi Vokal & Bahasa Tubuh',
        description: 'Kejelasan intonasi suara, artikulasi vokal, dan gestur tubuh yang meyakinkan penonton.',
        defaultScore: 80,
      },
    ],
  },
  {
    id: 'tmpl_folder_3',
    name: 'Naskah & Narasi',
    items: [
      {
        id: 'tmpl_item_3_1',
        name: 'Alur Cerita & Pacing Narasi',
        description: 'Kelancaran struktur babak cerita, transisi antar adegan, dan ritme ketegangan narasi.',
        defaultScore: 80,
      },
      {
        id: 'tmpl_item_3_2',
        name: 'Kedalaman Dialog & Pesan Filosofis',
        description: 'Kekuatan dialog bermakna, subteks tersembunyi, dan relevansi pesan filosofis karya.',
        defaultScore: 80,
      },
    ],
  },
  {
    id: 'tmpl_folder_4',
    name: 'Audio & Musik',
    items: [
      {
        id: 'tmpl_item_4_1',
        name: 'Original Soundtrack & Scoring',
        description: 'Musik pengiring latar yang membangun nuansa adegan dan menguatkan resonansi emosi penonton.',
        defaultScore: 85,
      },
      {
        id: 'tmpl_item_4_2',
        name: 'Sound Design & Tata Suara',
        description: 'Kualitas foley art, ketajaman efek audio spasial, dan kejernihan percampuran suara lingkungan.',
        defaultScore: 85,
      },
    ],
  },
];

export const SAMPLE_ARTISTS: Artist[] = [
  {
    id: 'art_1',
    name: 'Reza Rahadian',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1000&auto=format&fit=crop&q=80',
    bio: 'Aktor kenamaan Indonesia peraih beragam Piala Citra, dikenal dengan fleksibilitas peran intens dan kedalaman karakter yang luar biasa.',
    links: [
      { id: 'l1', label: 'Wikipedia', url: 'https://id.wikipedia.org/wiki/Reza_Rahadian' },
      { id: 'l2', label: 'IMDb', url: 'https://www.imdb.com' }
    ],
    embedImages: [
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=600&auto=format&fit=crop&q=80'
    ],
    textFields: {
      'Peran Utama': 'Aktor / Sutradara',
      'Penghargaan': 'Piala Citra 4x Aktor Terbaik',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'art_2',
    name: 'Christopher Nolan',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1000&auto=format&fit=crop&q=80',
    bio: 'Sutradara dan produser berkebangsaan Inggris-Amerika yang terkenal dengan struktur naratif non-linier dan sinematografi praktis IMAX.',
    links: [
      { id: 'l3', label: 'Official Site', url: 'https://www.warnerbros.com' },
      { id: 'l4', label: 'IMDb Profile', url: 'https://www.imdb.com' }
    ],
    embedImages: [
      'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=600&auto=format&fit=crop&q=80',
    ],
    textFields: {
      'Peran Utama': 'Sutradara / Penulis Naskah',
      'Gaya Khas': 'Sinematografi Praktis 70mm IMAX',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'art_3',
    name: 'Cillian Murphy',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&auto=format&fit=crop&q=80',
    bio: 'Aktor Irlandia pemenang Academy Award dengan ekspresi mata yang tajam dan kekuatan akting psikologis yang tenang namun memukau.',
    links: [
      { id: 'l5', label: 'IMDb', url: 'https://www.imdb.com' }
    ],
    embedImages: [
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80',
    ],
    textFields: {
      'Peran Utama': 'Aktor Pemeran Utama',
      'Asal': 'Irlandia',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'art_4',
    name: 'Chelsea Islan',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1000&auto=format&fit=crop&q=80',
    bio: 'Aktris berbakat Indonesia dengan dedikasi tinggi pada seni teater dan film layar lebar nasional berkarakter kuat.',
    links: [
      { id: 'l6', label: 'Instagram', url: 'https://instagram.com' }
    ],
    embedImages: [],
    textFields: {
      'Peran Utama': 'Aktris',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'art_5',
    name: 'Bong Joon-ho',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1000&auto=format&fit=crop&q=80',
    bio: 'Sutradara visioner asal Korea Selatan peraih Palme d’Or dan Oscar untuk mahakarya Parasite dan Snowpiercer.',
    links: [
      { id: 'l7', label: 'IMDb', url: 'https://www.imdb.com' }
    ],
    embedImages: [],
    textFields: {
      'Peran Utama': 'Sutradara & Penulis',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const SAMPLE_VIDEOS: Video[] = [
  {
    id: 'vid_1',
    title: 'Oppenheimer – Official Final Trailer (4K IMAX)',
    url: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
    metadata: {
      title: 'Oppenheimer – Official Final Trailer (4K IMAX)',
      thumbnailUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&auto=format&fit=crop&q=80',
      embedUrl: 'https://www.youtube-nocookie.com/embed/uYPbbksJxIg',
      domain: 'youtube.com',
      author: 'Universal Pictures',
    },
    notes: 'Karya sinematik luar biasa dengan scoring Ludwig Göransson yang menegangkan dan tempo narasi yang menghipnotis.',
    ratingFolders: [
      {
        id: 'f1',
        name: 'Sinematografi & Visual',
        items: [
          { id: 'i1', name: 'Komposisi Kamera IMAX', score: 96 },
          { id: 'i2', name: 'Color Grading B&W / Color', score: 94 },
          { id: 'i3', name: 'Efek Praktis Ledakan', score: 92 },
        ],
      },
      {
        id: 'f2',
        name: 'Akting & Penjiwaan',
        items: [
          { id: 'i4', name: 'Penjiwaan Cillian Murphy', score: 98 },
          { id: 'i5', name: 'Dinamika Ensemble Cast', score: 95 },
        ],
      },
      {
        id: 'f3',
        name: 'Naskah & Narasi',
        items: [
          { id: 'i6', name: 'Pacing Narasi Non-Linier', score: 90 },
          { id: 'i7', name: 'Ketegangan Politik & Etika', score: 93 },
        ],
      },
      {
        id: 'f4',
        name: 'Audio & Musik',
        items: [
          { id: 'i8', name: 'Original Score Ludwig Göransson', score: 99 },
          { id: 'i9', name: 'Sound Design Ledakan Trinity', score: 97 },
        ],
      },
    ],
    overallRating: 95,
    artistIds: ['art_2', 'art_3'],
    artistRoles: {
      art_2: 'Sutradara',
      art_3: 'Artis Utama',
    },
    singleChoices: {
      field_status: 'Tersedia Streaming',
      field_country: 'Amerika Serikat',
    },
    multiChoices: {
      field_genre: ['Drama', 'Thriller'],
    },
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vid_2',
    title: 'Habibie & Ainun – Teaser Cuplikan Peran Intens',
    url: 'https://www.youtube.com/watch?v=9Zf4GZkF-Jc',
    metadata: {
      title: 'Habibie & Ainun – Teaser Cuplikan Peran Intens',
      thumbnailUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80',
      embedUrl: 'https://www.youtube-nocookie.com/embed/9Zf4GZkF-Jc',
      domain: 'youtube.com',
      author: 'MD Pictures',
    },
    notes: 'Reza Rahadian menunjukkan kemampuan transformasi vokal, gestur tubuh, dan artikulasi yang luar biasa akurat.',
    ratingFolders: [
      {
        id: 'f5',
        name: 'Sinematografi & Visual',
        items: [
          { id: 'i10', name: 'Tata Artistik Era 70an', score: 86 },
          { id: 'i11', name: 'Pencahayaan Hangat', score: 84 },
        ],
      },
      {
        id: 'f6',
        name: 'Akting & Penjiwaan',
        items: [
          { id: 'i12', name: 'Mimik & Transformasi Suara', score: 96 },
          { id: 'i13', name: 'Chemistry Romansa Ainun', score: 91 },
        ],
      },
      {
        id: 'f7',
        name: 'Naskah & Narasi',
        items: [
          { id: 'i14', name: 'Penghantaran Emosional', score: 88 },
        ],
      },
      {
        id: 'f8',
        name: 'Audio & Musik',
        items: [
          { id: 'i15', name: 'Soundtrack & Nada Nostalgia', score: 90 },
        ],
      },
    ],
    overallRating: 89,
    artistIds: ['art_1'],
    artistRoles: {
      art_1: 'Artis Utama',
    },
    singleChoices: {
      field_status: 'Selesai Ditonton',
      field_country: 'Indonesia',
    },
    multiChoices: {
      field_genre: ['Drama'],
    },
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vid_3',
    title: 'Parasite – The Architecture of Tension Breakdown',
    url: 'https://www.youtube.com/watch?v=5xH0hhJAMUU',
    metadata: {
      title: 'Parasite – The Architecture of Tension Breakdown',
      thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
      embedUrl: 'https://www.youtube-nocookie.com/embed/5xH0hhJAMUU',
      domain: 'youtube.com',
      author: 'NEON',
    },
    notes: 'Koreografi kamera dalam rumah minimalis dan metafora ruang vertikal (tangga ke bawah) yang jenius.',
    ratingFolders: [
      {
        id: 'f9',
        name: 'Sinematografi & Visual',
        items: [
          { id: 'i16', name: 'Tata Kamera Geometris', score: 97 },
          { id: 'i17', name: 'Desain Set & Simbolisme Ruang', score: 98 },
        ],
      },
      {
        id: 'f10',
        name: 'Naskah & Narasi',
        items: [
          { id: 'i18', name: 'Kritik Sosial Berbalut Thriller', score: 98 },
          { id: 'i19', name: 'Transisi Genre Mulus', score: 95 },
        ],
      },
    ],
    overallRating: 97,
    artistIds: ['art_5'],
    artistRoles: {
      art_5: 'Sutradara',
    },
    singleChoices: {
      field_status: 'Tersedia Streaming',
      field_country: 'Korea Selatan',
    },
    multiChoices: {
      field_genre: ['Thriller', 'Drama', 'Komedi'],
    },
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vid_4',
    title: 'Interstellar – Docking Scene (No Time For Caution)',
    url: 'https://www.youtube.com/watch?v=GhlU3ikw8sA',
    metadata: {
      title: 'Interstellar – Docking Scene (No Time For Caution)',
      thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
      embedUrl: 'https://www.youtube-nocookie.com/embed/GhlU3ikw8sA',
      domain: 'youtube.com',
      author: 'Paramount Pictures',
    },
    notes: 'Adegan docking paling menegangkan dalam sejarah fiksi ilmiah dengan musik organ Hans Zimmer.',
    ratingFolders: [
      {
        id: 'f11',
        name: 'Sinematografi & Visual',
        items: [
          { id: 'i20', name: 'Rotasi Kamera Endurance', score: 99 },
          { id: 'i21', name: 'VFX & Akurasi Fisika', score: 96 },
        ],
      },
      {
        id: 'f12',
        name: 'Audio & Musik',
        items: [
          { id: 'i22', name: 'Hans Zimmer Pipe Organ', score: 100 },
          { id: 'i23', name: 'Audio Hampa Udara Luar Angkasa', score: 98 },
        ],
      },
    ],
    overallRating: 98,
    artistIds: ['art_2'],
    artistRoles: {
      art_2: 'Sutradara',
    },
    singleChoices: {
      field_status: 'Tersedia Streaming',
      field_country: 'Amerika Serikat',
    },
    multiChoices: {
      field_genre: ['Sci-Fi', 'Petualangan'],
    },
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vid_5',
    title: 'Rudy Habibie – Monolog Mimpi Pesawat Indonesia',
    url: 'https://www.youtube.com/watch?v=kYJ7-sample',
    metadata: {
      title: 'Rudy Habibie – Monolog Mimpi Pesawat Indonesia',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80',
      domain: 'youtube.com',
    },
    notes: 'Kolaborasi akting apik antara Reza Rahadian dan Chelsea Islan di Aachen, Jerman.',
    ratingFolders: [
      {
        id: 'f13',
        name: 'Akting & Penjiwaan',
        items: [
          { id: 'i24', name: 'Monolog Oratoris Reza', score: 92 },
          { id: 'i25', name: 'Keanggunan Karakter Chelsea', score: 88 },
        ],
      },
      {
        id: 'f14',
        name: 'Sinematografi & Visual',
        items: [
          { id: 'i26', name: 'Lokasi Syuting Eropa', score: 87 },
        ],
      },
    ],
    overallRating: 89,
    artistIds: ['art_1', 'art_4'],
    artistRoles: {
      art_1: 'Artis Utama',
      art_4: 'Aktor',
    },
    singleChoices: {
      field_status: 'Selesai Ditonton',
      field_country: 'Indonesia',
    },
    multiChoices: {
      field_genre: ['Drama'],
    },
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const DEFAULT_ROLE_WEIGHTS: RoleWeight[] = [
  { id: 'rw_artis_utama', roleName: 'Artis Utama', weight: 100, isLocked: false },
  { id: 'rw_sutradara', roleName: 'Sutradara', weight: 100, isLocked: false },
  { id: 'rw_aktor', roleName: 'Aktor', weight: 70, isLocked: false },
  { id: 'rw_cameo', roleName: 'Cameo', weight: 30, isLocked: false },
];

export const SAMPLE_PIVOTS: VideoArtistPivot[] = [
  {
    videoId: 'vid_1',
    artistId: 'art_2',
    createdAt: new Date().toISOString(),
    nilai_didapat: 95,
    status_peran_saat_itu: 'Sutradara',
    bobot_saat_itu: 100,
    nilai_performa: 100,
  },
  {
    videoId: 'vid_1',
    artistId: 'art_3',
    createdAt: new Date().toISOString(),
    nilai_didapat: 95,
    status_peran_saat_itu: 'Artis Utama',
    bobot_saat_itu: 100,
    nilai_performa: 100,
  },
  {
    videoId: 'vid_2',
    artistId: 'art_1',
    createdAt: new Date().toISOString(),
    nilai_didapat: 89,
    status_peran_saat_itu: 'Artis Utama',
    bobot_saat_itu: 100,
    nilai_performa: 100,
  },
  {
    videoId: 'vid_3',
    artistId: 'art_5',
    createdAt: new Date().toISOString(),
    nilai_didapat: 97,
    status_peran_saat_itu: 'Sutradara',
    bobot_saat_itu: 100,
    nilai_performa: 100,
  },
  {
    videoId: 'vid_4',
    artistId: 'art_2',
    createdAt: new Date().toISOString(),
    nilai_didapat: 98,
    status_peran_saat_itu: 'Sutradara',
    bobot_saat_itu: 100,
    nilai_performa: 100,
  },
  {
    videoId: 'vid_5',
    artistId: 'art_1',
    createdAt: new Date().toISOString(),
    nilai_didapat: 89,
    status_peran_saat_itu: 'Artis Utama',
    bobot_saat_itu: 100,
    nilai_performa: 100,
  },
  {
    videoId: 'vid_5',
    artistId: 'art_4',
    createdAt: new Date().toISOString(),
    nilai_didapat: 62.3,
    status_peran_saat_itu: 'Aktor',
    bobot_saat_itu: 70,
    nilai_performa: 70,
  },
];

// Helper to broadcast changes
const listeners: Array<() => void> = [];
export function subscribeStorage(callback: () => void) {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}
function notify() {
  listeners.forEach((fn) => {
    try { fn(); } catch (e) { console.error(e); }
  });
}

// STORAGE API
export function getStoredVideos(): Video[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VIDEOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(SAMPLE_VIDEOS));
      return SAMPLE_VIDEOS;
    }
    return JSON.parse(raw);
  } catch {
    return SAMPLE_VIDEOS;
  }
}

export function saveVideos(videos: Video[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
    // Otomatis perbarui snapshot pivot sesuai bobot peran terkini
    const weights = getStoredRoleWeights();
    const existingPivots = getStoredPivots();
    const { updatedPivots } = recalculateAllVideoPivots(videos, weights, existingPivots);
    localStorage.setItem(STORAGE_KEYS.PIVOTS, JSON.stringify(updatedPivots));
    notify();
  } catch (err) {
    console.error('Gagal menyimpan video ke localStorage:', err);
  }
}

export function getStoredArtists(): Artist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARTISTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ARTISTS, JSON.stringify(SAMPLE_ARTISTS));
      return SAMPLE_ARTISTS;
    }
    return JSON.parse(raw);
  } catch {
    return SAMPLE_ARTISTS;
  }
}

export function saveArtists(artists: Artist[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ARTISTS, JSON.stringify(artists));
    notify();
  } catch (err) {
    console.error('Gagal menyimpan artis ke localStorage:', err);
  }
}

export function getStoredFields(): CustomFieldDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FIELDS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.FIELDS, JSON.stringify(DEFAULT_FIELDS));
      return DEFAULT_FIELDS;
    }
    const parsed: CustomFieldDefinition[] = JSON.parse(raw);
    return parsed.sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_FIELDS;
  }
}

export function saveFields(fields: CustomFieldDefinition[]) {
  try {
    const oldFields = getStoredFields();
    localStorage.setItem(STORAGE_KEYS.FIELDS, JSON.stringify(fields));

    // Sinkronisasi/Update reaktif otomatis pada data entri video yang tersimpan
    // apabila nama judul field atau opsi itemnya diubah oleh pengguna.
    const videos = getStoredVideos();
    let isVideoUpdated = false;

    const updatedVideos = videos.map((v) => {
      let videoChanged = false;
      const newSingleChoices = { ...(v.singleChoices || {}) };
      const newMultiChoices = { ...(v.multiChoices || {}) };

      oldFields.forEach((oldField) => {
        const newField = fields.find((f) => f.id === oldField.id);
        if (!newField) return;

        // Map nama item opsi lama -> nama item opsi baru
        if (
          (oldField.type === 'single_choice' || oldField.type === 'multi_choice') &&
          oldField.options &&
          newField.options
        ) {
          const optionMap = new Map<string, string>();
          oldField.options.forEach((oldOpt, idx) => {
            if (newField.options![idx] && oldOpt !== newField.options![idx]) {
              optionMap.set(oldOpt, newField.options![idx]);
            }
          });

          if (optionMap.size > 0) {
            // Update single choices
            const currentSingle = newSingleChoices[oldField.id];
            if (currentSingle && optionMap.has(currentSingle)) {
              newSingleChoices[oldField.id] = optionMap.get(currentSingle)!;
              videoChanged = true;
            }

            // Update multi choices
            const currentMulti = newMultiChoices[oldField.id];
            if (Array.isArray(currentMulti)) {
              const updatedMulti = currentMulti.map((opt) =>
                optionMap.has(opt) ? optionMap.get(opt)! : opt
              );
              if (JSON.stringify(updatedMulti) !== JSON.stringify(currentMulti)) {
                newMultiChoices[oldField.id] = updatedMulti;
                videoChanged = true;
              }
            }
          }
        }
      });

      if (videoChanged) {
        isVideoUpdated = true;
        return {
          ...v,
          singleChoices: newSingleChoices,
          multiChoices: newMultiChoices,
          updatedAt: new Date().toISOString(),
        };
      }
      return v;
    });

    if (isVideoUpdated) {
      localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(updatedVideos));
    }

    notify();
  } catch (err) {
    console.error('Gagal menyimpan definisi field:', err);
  }
}

// RATING TEMPLATES API (Managed via Pengaturan)
export function getStoredRatingTemplates(): RatingTemplateFolder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RATING_TEMPLATES);
    if (!raw) {
      localStorage.setItem(
        STORAGE_KEYS.RATING_TEMPLATES,
        JSON.stringify(DEFAULT_RATING_TEMPLATES)
      );
      return DEFAULT_RATING_TEMPLATES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_RATING_TEMPLATES;
  }
}

export function saveRatingTemplates(templates: RatingTemplateFolder[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.RATING_TEMPLATES, JSON.stringify(templates));
    notify();
  } catch (err) {
    console.error('Gagal menyimpan master template penilaian:', err);
  }
}

// VIDEO FEED VIEW MODE ('grid' | 'list')
export function getVideoViewMode(): 'grid' | 'list' {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VIDEO_VIEW_MODE);
    if (raw === 'grid' || raw === 'list') return raw;
    if (raw === 'card') return 'grid';
    return 'list'; // Default list
  } catch {
    return 'list';
  }
}

export function saveVideoViewMode(mode: 'grid' | 'list') {
  try {
    localStorage.setItem(STORAGE_KEYS.VIDEO_VIEW_MODE, mode);
  } catch (err) {
    console.error('Gagal menyimpan preferensi tampilan video:', err);
  }
}

// ARTIST VIEW MODE ('grid' | 'list')
export function getArtistViewMode(): 'grid' | 'list' {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARTIST_VIEW_MODE);
    if (raw === 'grid' || raw === 'list') return raw;
    return 'list'; // Default list
  } catch {
    return 'list';
  }
}

export function saveArtistViewMode(mode: 'grid' | 'list') {
  try {
    localStorage.setItem(STORAGE_KEYS.ARTIST_VIEW_MODE, mode);
  } catch (err) {
    console.error('Gagal menyimpan preferensi tampilan artis:', err);
  }
}

export function resetAllDataToDefault() {
  localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(SAMPLE_VIDEOS));
  localStorage.setItem(STORAGE_KEYS.ARTISTS, JSON.stringify(SAMPLE_ARTISTS));
  localStorage.setItem(STORAGE_KEYS.FIELDS, JSON.stringify(DEFAULT_FIELDS));
  localStorage.setItem(STORAGE_KEYS.RATING_TEMPLATES, JSON.stringify(DEFAULT_RATING_TEMPLATES));
  localStorage.setItem(STORAGE_KEYS.PIVOTS, JSON.stringify(SAMPLE_PIVOTS));
  localStorage.setItem(STORAGE_KEYS.ROLE_WEIGHTS, JSON.stringify(DEFAULT_ROLE_WEIGHTS));
  notify();
}

// ROLE WEIGHTS API (Pengaturan Bobot Status Peran)
export function getStoredRoleWeights(): RoleWeight[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ROLE_WEIGHTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ROLE_WEIGHTS, JSON.stringify(DEFAULT_ROLE_WEIGHTS));
      return DEFAULT_ROLE_WEIGHTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ROLE_WEIGHTS;
  }
}

export function saveRoleWeights(weights: RoleWeight[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ROLE_WEIGHTS, JSON.stringify(weights));
    // Otomatis perbarui snapshot pivot dengan bobot status peran terbaru
    const videos = getStoredVideos();
    const existingPivots = getStoredPivots();
    const { updatedPivots } = recalculateAllVideoPivots(videos, weights, existingPivots);
    localStorage.setItem(STORAGE_KEYS.PIVOTS, JSON.stringify(updatedPivots));
    notify();
  } catch (err) {
    console.error('Gagal menyimpan bobot status peran:', err);
  }
}

/**
 * Otomatis sinkronisasi opsi status peran berdasarkan semua teks Status Peran di entri video:
 * - Mempertahankan bobot peran yang sudah tersimpan atau ditambahkan pengguna
 * - Menambahkan status peran baru yang terdeteksi di entri video
 * - Mempertahankan nilai bobot dan status kunci (isLocked)
 */
export function syncRoleWeightsWithVideos(videos: Video[], currentWeights?: RoleWeight[]): RoleWeight[] {
  const weights = (currentWeights && currentWeights.length > 0) ? currentWeights : getStoredRoleWeights();
  const updated: RoleWeight[] = [];
  const existingMap = new Map<string, RoleWeight>();

  // Mulai dengan bobot peran yang sudah ada/dikonfigurasi
  weights.forEach((w) => {
    const key = w.roleName.toLowerCase().trim();
    if (!existingMap.has(key)) {
      existingMap.set(key, w);
      updated.push(w);
    }
  });

  // Tambahkan status peran baru dari entri video yang belum terdaftar
  videos.forEach((v) => {
    if (v.artistRoles) {
      Object.values(v.artistRoles).forEach((r) => {
        const roleName = r?.trim();
        if (!roleName) return;
        const key = roleName.toLowerCase();
        if (!existingMap.has(key)) {
          let defaultW = 100;
          if (key.includes('cameo')) defaultW = 30;
          else if (key.includes('pendukung') || key.includes('pembantu')) defaultW = 70;
          else if (key === 'aktor' || key === 'aktris') defaultW = 70;

          const newRw: RoleWeight = {
            id: `rw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            roleName,
            weight: defaultW,
            isLocked: false,
          };
          existingMap.set(key, newRw);
          updated.push(newRw);
        }
      });
    }
  });

  return updated;
}

// PIVOT TABLE API (Snapshot Relasi Video-Artis)
export function getStoredPivots(): VideoArtistPivot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PIVOTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PIVOTS, JSON.stringify(SAMPLE_PIVOTS));
      return SAMPLE_PIVOTS;
    }
    return JSON.parse(raw);
  } catch {
    return SAMPLE_PIVOTS;
  }
}

export function savePivots(pivots: VideoArtistPivot[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.PIVOTS, JSON.stringify(pivots));
    notify();
  } catch (err) {
    console.error('Gagal menyimpan pivot video-artis:', err);
  }
}

/**
 * Hitung nilai yang didapat dengan RUMUS BAKU:
 * V = videoOverallRating
 * S = weightPercent (Bobot Status Peran %)
 * P = performancePercent (Nilai Performa %)
 * Hasil Satu = (V * S) / 100
 * Hasil Dua = (V * P) / 100
 * Nilai Didapat Artis = (Hasil Satu + Hasil Dua) / 2 = (V * (S + P)) / 200
 */
export function calculatePivotScore(videoOverallRating: number, weightPercent: number, performancePercent: number): number {
  const S = typeof weightPercent === 'number' ? weightPercent : 100;
  const P = typeof performancePercent === 'number' ? performancePercent : S;
  const V = typeof videoOverallRating === 'number' ? videoOverallRating : 0;
  const raw = (V * (S + P)) / 200;
  return Math.round(raw * 10) / 10;
}

/**
 * Auto-recalculation untuk satu video:
 * Dipanggil saat video disimpan, diubah nilainya, status perannya diubah, atau link artis diubah.
 */
export function recalculateVideoPivots(
  video: Video,
  roleWeights: RoleWeight[],
  existingPivots: VideoArtistPivot[]
): VideoArtistPivot[] {
  const otherPivots = existingPivots.filter((p) => p.videoId !== video.id);

  const newVideoPivots: VideoArtistPivot[] = (video.artistIds || []).map((artistId) => {
    const roleText = (video.artistRoles?.[artistId] || 'Artis Utama').trim();
    
    const matchedRole = roleWeights.find(
      (rw) => rw.roleName.toLowerCase().trim() === roleText.toLowerCase()
    );
    const weight = matchedRole ? matchedRole.weight : 100;

    let performance = video.artistPerformances?.[artistId];
    if (typeof performance !== 'number' || isNaN(performance)) {
      performance = weight;
    }

    const score = calculatePivotScore(video.overallRating || 0, weight, performance);

    return {
      videoId: video.id,
      artistId,
      createdAt: new Date().toISOString(),
      nilai_didapat: score,
      status_peran_saat_itu: roleText,
      bobot_saat_itu: weight,
      nilai_performa: performance,
    };
  });

  return [...otherPivots, ...newVideoPivots];
}

/**
 * Recalculate ALL video pivots (Dipanggil saat tombol "Hitung Ulang Semua Nilai Video" di Pengaturan ditekan)
 * Melewati status peran yang sedang terkunci (isLocked = true).
 */
export function recalculateAllVideoPivots(
  videos: Video[],
  roleWeights: RoleWeight[],
  existingPivots: VideoArtistPivot[]
): { updatedPivots: VideoArtistPivot[]; recalculatedCount: number; skippedLockedCount: number } {
  const currentWeightMap = new Map<string, number>();

  roleWeights.forEach((rw) => {
    const key = rw.roleName.toLowerCase().trim();
    currentWeightMap.set(key, rw.weight);
  });

  let recalculatedCount = 0;
  let skippedLockedCount = 0;

  const newPivots: VideoArtistPivot[] = [];

  videos.forEach((video) => {
    const artistIds = video.artistIds || [];
    artistIds.forEach((artistId) => {
      const roleText = (video.artistRoles?.[artistId] || 'Artis Utama').trim();
      const roleKey = roleText.toLowerCase();

      const oldPivot = existingPivots.find(
        (p) => p.videoId === video.id && p.artistId === artistId
      );

      const weight = currentWeightMap.has(roleKey) ? currentWeightMap.get(roleKey)! : (oldPivot?.bobot_saat_itu ?? 100);

      let performance = video.artistPerformances?.[artistId];
      if (typeof performance !== 'number' || isNaN(performance)) {
        performance = oldPivot?.nilai_performa !== undefined ? oldPivot.nilai_performa : weight;
      }

      const score = calculatePivotScore(video.overallRating || 0, weight, performance);

      newPivots.push({
        videoId: video.id,
        artistId,
        createdAt: oldPivot?.createdAt || new Date().toISOString(),
        nilai_didapat: score,
        status_peran_saat_itu: roleText,
        bobot_saat_itu: weight,
        nilai_performa: performance,
      });
      recalculatedCount++;
    });
  });

  return { updatedPivots: newPivots, recalculatedCount, skippedLockedCount };
}

/**
 * Penjumlahan (SUM) dari seluruh field nilai_didapat di tabel pivot untuk artis tersebut.
 */
export function getArtistPivotSum(artistId: string, pivots: VideoArtistPivot[]): number {
  const artistPivots = pivots.filter((p) => p.artistId === artistId);
  if (artistPivots.length === 0) return 0;
  const total = artistPivots.reduce((sum, p) => sum + (p.nilai_didapat || 0), 0);
  return Math.round(total * 10) / 10;
}

/**
 * Hitung posisi peringkat artis dalam suatu tag/kategori spesifik
 * berdasarkan rating rata-rata dari video-video bertag tersebut,
 * dengan penanganan fallback otomatis ke data penyimpanan.
 */
export function getArtistTagRank(
  artistId: string,
  fieldId: string,
  optionValue: string,
  artists?: Artist[],
  videos?: Video[],
  pivots?: VideoArtistPivot[]
): number | null {
  const detail = getArtistTagRankDetail(artistId, fieldId, optionValue, artists, videos, pivots);
  return detail ? detail.rank : null;
}

export function getArtistTagRankDetail(
  artistId: string,
  fieldId: string,
  optionValue: string,
  artists?: Artist[],
  videos?: Video[],
  pivots?: VideoArtistPivot[]
): { rank: number; total: number } | null {
  const effectiveVideos = (videos && videos.length > 0) ? videos : getStoredVideos();
  const effectiveArtists = (artists && artists.length > 0) ? artists : getStoredArtists();
  const effectivePivots = (pivots && pivots.length > 0) ? pivots : getStoredPivots();

  // Temukan semua video yang memiliki tag ini
  const matchingVideos = effectiveVideos.filter((v) => {
    if (v.singleChoices?.[fieldId] === optionValue) return true;
    if (v.multiChoices?.[fieldId]?.includes(optionValue)) return true;
    return false;
  });

  if (matchingVideos.length === 0) return null;
  const matchingVideoIds = new Set(matchingVideos.map((v) => v.id));

  // Temukan semua artis unik yang terlibat dalam video-video ini
  const participatingArtistIds = new Set<string>();
  matchingVideos.forEach((v) => {
    (v.artistIds || []).forEach((id) => participatingArtistIds.add(id));
  });

  // Jika artis yang dicari tidak ada dalam video bertag ini, return null
  if (!participatingArtistIds.has(artistId)) return null;

  // Hitung agregasi skor untuk setiap artis yang memiliki video di tag ini
  const artistScores: { id: string; avgRating: number; count: number; pivotSum: number }[] = [];
  const effectiveWeights = getStoredRoleWeights();

  participatingArtistIds.forEach((artId) => {
    const artVideos = matchingVideos.filter((v) => v.artistIds?.includes(artId));
    const { rating, totalPoints } = calculateArtistAggregatedRating(
      artId,
      artVideos,
      effectiveWeights,
      effectivePivots
    );

    artistScores.push({
      id: artId,
      avgRating: rating ?? 0,
      count: artVideos.length,
      pivotSum: totalPoints,
    });
  });

  if (artistScores.length === 0) return null;

  // Urutkan dari rating rata-rata tertinggi, jumlah video terbanyak, lalu total pivot poin
  artistScores.sort((a, b) => {
    if (b.avgRating !== a.avgRating) {
      return b.avgRating - a.avgRating;
    }
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return b.pivotSum - a.pivotSum;
  });

  const foundIndex = artistScores.findIndex((a) => a.id === artistId);
  if (foundIndex === -1) return null;

  return {
    rank: foundIndex + 1,
    total: artistScores.length,
  };
}

// ==========================================
// MANAJEMEN DATA & CADANGAN TERPISAH
// ==========================================

// 1. Cadangan Entri Database (Videos, Artists, Pivots)
export function exportDatabaseEntriesJson(): string {
  const data = {
    backupType: 'database_entries',
    version: '1.2',
    exportDate: new Date().toISOString(),
    description: 'Cadangan Entri Database: Video, Artis, dan Snapshot Relasi Pivot',
    videos: getStoredVideos(),
    artists: getStoredArtists(),
    pivots: getStoredPivots(),
  };
  return JSON.stringify(data, null, 2);
}

export function importDatabaseEntriesJson(jsonString: string): {
  success: boolean;
  message: string;
  counts?: { videos: number; artists: number; pivots: number };
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Format berkas JSON tidak valid.' };
    }

    const hasVideos = Array.isArray(parsed.videos);
    const hasArtists = Array.isArray(parsed.artists);

    if (!hasVideos && !hasArtists) {
      return {
        success: false,
        message: 'Berkas tidak mengandung data video maupun artis yang valid.',
      };
    }

    let videosCount = 0;
    let artistsCount = 0;
    let pivotsCount = 0;

    if (hasVideos) {
      localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(parsed.videos));
      videosCount = parsed.videos.length;
    }
    if (hasArtists) {
      localStorage.setItem(STORAGE_KEYS.ARTISTS, JSON.stringify(parsed.artists));
      artistsCount = parsed.artists.length;
    }
    if (Array.isArray(parsed.pivots)) {
      localStorage.setItem(STORAGE_KEYS.PIVOTS, JSON.stringify(parsed.pivots));
      pivotsCount = parsed.pivots.length;
    } else if (hasVideos) {
      // Otomatis regenerasi snapshot pivot jika belum ada di file cadangan
      const weights = getStoredRoleWeights();
      const { updatedPivots } = recalculateAllVideoPivots(parsed.videos, weights, []);
      localStorage.setItem(STORAGE_KEYS.PIVOTS, JSON.stringify(updatedPivots));
      pivotsCount = updatedPivots.length;
    }

    notify();
    return {
      success: true,
      message: `Berhasil memulihkan ${videosCount} video, ${artistsCount} artis, dan ${pivotsCount} data relasi!`,
      counts: { videos: videosCount, artists: artistsCount, pivots: pivotsCount },
    };
  } catch (err) {
    return { success: false, message: 'Gagal memproses berkas: format data tidak valid.' };
  }
}

// 2. Cadangan Kustomisasi Aturan (Fields, Rating Templates, Role Weights)
export function exportCustomizationRulesJson(): string {
  const data = {
    backupType: 'customization_rules',
    version: '1.2',
    exportDate: new Date().toISOString(),
    description: 'Cadangan Kustomisasi Aturan: Field Kustom, Template Rating, dan Bobot Peran',
    fields: getStoredFields(),
    ratingTemplates: getStoredRatingTemplates(),
    roleWeights: getStoredRoleWeights(),
  };
  return JSON.stringify(data, null, 2);
}

export function importCustomizationRulesJson(jsonString: string): {
  success: boolean;
  message: string;
  counts?: { fields: number; folders: number; roles: number };
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Format berkas JSON tidak valid.' };
    }

    const hasFields = Array.isArray(parsed.fields);
    const hasRatingTemplates = Array.isArray(parsed.ratingTemplates);
    const hasRoleWeights = Array.isArray(parsed.roleWeights);

    if (!hasFields && !hasRatingTemplates && !hasRoleWeights) {
      return {
        success: false,
        message: 'Berkas tidak mengandung konfigurasi aturan (field, template rating, atau bobot peran).',
      };
    }

    let fieldsCount = 0;
    let foldersCount = 0;
    let rolesCount = 0;

    if (hasFields) {
      localStorage.setItem(STORAGE_KEYS.FIELDS, JSON.stringify(parsed.fields));
      fieldsCount = parsed.fields.length;
    }
    if (hasRatingTemplates) {
      localStorage.setItem(STORAGE_KEYS.RATING_TEMPLATES, JSON.stringify(parsed.ratingTemplates));
      foldersCount = parsed.ratingTemplates.length;
    }
    if (hasRoleWeights) {
      localStorage.setItem(STORAGE_KEYS.ROLE_WEIGHTS, JSON.stringify(parsed.roleWeights));
      rolesCount = parsed.roleWeights.length;
    }

    notify();
    return {
      success: true,
      message: `Berhasil memulihkan aturan: ${fieldsCount} field, ${foldersCount} folder template rating, dan ${rolesCount} bobot peran!`,
      counts: { fields: fieldsCount, folders: foldersCount, roles: rolesCount },
    };
  } catch (err) {
    return { success: false, message: 'Gagal memproses berkas: format data tidak valid.' };
  }
}

// 3. Cadangan Lengkap Keseluruhan
export function exportAllDataJson(): string {
  const data = {
    backupType: 'full_backup',
    version: '1.2',
    exportDate: new Date().toISOString(),
    videos: getStoredVideos(),
    artists: getStoredArtists(),
    fields: getStoredFields(),
    ratingTemplates: getStoredRatingTemplates(),
    roleWeights: getStoredRoleWeights(),
    pivots: getStoredPivots(),
  };
  return JSON.stringify(data, null, 2);
}

export function importDataJson(jsonString: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Format berkas JSON tidak valid.' };
    }

    let hasAny = false;
    if (parsed.videos && Array.isArray(parsed.videos)) {
      localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(parsed.videos));
      hasAny = true;
    }
    if (parsed.artists && Array.isArray(parsed.artists)) {
      localStorage.setItem(STORAGE_KEYS.ARTISTS, JSON.stringify(parsed.artists));
      hasAny = true;
    }
    if (parsed.fields && Array.isArray(parsed.fields)) {
      localStorage.setItem(STORAGE_KEYS.FIELDS, JSON.stringify(parsed.fields));
      hasAny = true;
    }
    if (parsed.ratingTemplates && Array.isArray(parsed.ratingTemplates)) {
      localStorage.setItem(STORAGE_KEYS.RATING_TEMPLATES, JSON.stringify(parsed.ratingTemplates));
      hasAny = true;
    }
    if (parsed.roleWeights && Array.isArray(parsed.roleWeights)) {
      localStorage.setItem(STORAGE_KEYS.ROLE_WEIGHTS, JSON.stringify(parsed.roleWeights));
      hasAny = true;
    }
    if (parsed.pivots && Array.isArray(parsed.pivots)) {
      localStorage.setItem(STORAGE_KEYS.PIVOTS, JSON.stringify(parsed.pivots));
      hasAny = true;
    }

    if (!hasAny) {
      return { success: false, message: 'Berkas JSON tidak memiliki struktur data cadangan yang dikenali.' };
    }

    notify();
    return { success: true, message: 'Semua data dan aturan cadangan berhasil dipulihkan!' };
  } catch (e) {
    console.error('Gagal import JSON:', e);
    return { success: false, message: 'Format berkas cadangan rusak atau tidak valid.' };
  }
}

/**
 * Riwayat status peran DINAMIS (Bukan Hardcoded):
 * - BERTAMBAH apabila ada entri video baru yang menggunakan status peran baru.
 * - TERHAPUS secara otomatis apabila sudah tidak ada satupun entri video di seluruh sistem yang menggunakan status peran tersebut.
 */
export function getDynamicRoleHistory(videos?: Video[]): string[] {
  const targetVideos = videos || getStoredVideos();
  const roleSet = new Set<string>();

  targetVideos.forEach((v) => {
    if (v.artistRoles) {
      Object.values(v.artistRoles).forEach((role) => {
        const trimmed = role?.trim();
        if (trimmed) {
          roleSet.add(trimmed);
        }
      });
    }
  });

  return Array.from(roleSet);
}

// GALLERY NOTES STORAGE API
export const SAMPLE_GALLERY_NOTES: GalleryNote[] = [
  {
    id: 'note_1',
    title: 'Catatan Karakterisasi & Akting Reza Rahadian',
    blocks: [
      { id: 'b1', type: 'heading', content: 'Analisis Transformasi Karakter' },
      { id: 'b2', type: 'text', content: 'Reza Rahadian menunjukkan pendalaman vokal dan artikulasi yang luar biasa dalam peran biopic.', bold: true },
      { id: 'b3', type: 'bullet_list', content: 'Transformasi suara dan gestur fisik' },
      { id: 'b4', type: 'bullet_list', content: 'Kontrol emosi pada adegan monolog dramatis' },
    ],
    linkedArtistIds: ['art_1'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getStoredGalleryNotes(): GalleryNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GALLERY_NOTES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.GALLERY_NOTES, JSON.stringify(SAMPLE_GALLERY_NOTES));
      return SAMPLE_GALLERY_NOTES;
    }
    return JSON.parse(raw);
  } catch {
    return SAMPLE_GALLERY_NOTES;
  }
}

export function saveGalleryNotes(notes: GalleryNote[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.GALLERY_NOTES, JSON.stringify(notes));
    notify();
  } catch (err) {
    console.error('Gagal menyimpan catatan gallery:', err);
  }
}

// ARTIST CUSTOM FIELDS API ("Struktur & Urutan Field Artis")
export const DEFAULT_ARTIST_FIELDS: CustomFieldDefinition[] = [
  {
    id: 'art_field_notes',
    key: 'galleryNoteIds',
    label: 'Field Galeri Catatan',
    description: 'Menghubungkan entri artis ke halaman Catatan Gallery yang baru dibuat.',
    type: 'gallery_notes',
    order: 1,
    isSystem: true, // TIDAK BISA dihapus
  },
  {
    id: 'art_field_birth',
    key: 'birthMonthYear',
    label: 'Field Bulan-Tahun Lahir',
    description: 'Mengatur tanggal/bulan-tahun lahir untuk kalkulasi Umur otomatis.',
    type: 'month_year',
    order: 2,
    isSystem: true, // TIDAK BISA dihapus
  },
  {
    id: 'art_field_button',
    key: 'links',
    label: 'Field Tombol Link / Media Sosial',
    description: 'Tombol tautan portofolio, IMDb, Wikipedia, atau media sosial artis.',
    type: 'button_link',
    order: 3,
    isSystem: false, // Bisa dihapus / ditambah
  },
  {
    id: 'art_field_peran_utama',
    key: 'Peran Utama',
    label: 'Peran / Profesi Utama',
    description: 'Status peran utama artis (Aktor, Sutradara, dll.) dengan dukungan Dynamic Filtering.',
    type: 'custom_text',
    order: 4,
    isSystem: false,
  },
];

export function getStoredArtistFields(): CustomFieldDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARTIST_FIELDS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ARTIST_FIELDS, JSON.stringify(DEFAULT_ARTIST_FIELDS));
      return DEFAULT_ARTIST_FIELDS;
    }
    const parsed: CustomFieldDefinition[] = JSON.parse(raw);
    return parsed.sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_ARTIST_FIELDS;
  }
}

export function saveArtistFields(fields: CustomFieldDefinition[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ARTIST_FIELDS, JSON.stringify(fields));
    notify();
  } catch (err) {
    console.error('Gagal menyimpan definisi field artis:', err);
  }
}

// CUSTOM ENTRY TYPES API (Poin 3)
export function getStoredEntryTypes(): EntryTypeDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ENTRY_TYPES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveEntryTypes(entryTypes: EntryTypeDefinition[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ENTRY_TYPES, JSON.stringify(entryTypes));
    notify();
  } catch (err) {
    console.error('Gagal menyimpan jenis entri kustom:', err);
  }
}

// GENERIC ENTRIES API
export function getStoredGenericEntries(): GenericEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GENERIC_ENTRIES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveGenericEntries(entries: GenericEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.GENERIC_ENTRIES, JSON.stringify(entries));
    notify();
  } catch (err) {
    console.error('Gagal menyimpan entri kustom:', err);
  }
}

/**
 * Normalisasi Lookup Tag/Options Reference (Poin 1):
 * Jika opsi disimpan dalam bentuk ID atau name, resolver ini mengambil nama/label
 * terbaru dari schema Master Field sehingga rename di pengaturan otomatis ter-reflect reaktif.
 */
export function resolveOptionLabel(fieldDef: CustomFieldDefinition | undefined, optionValueOrId: string): string {
  if (!fieldDef || !optionValueOrId) return optionValueOrId || '';

  // 1. Cek di optionItems (master normalized array)
  if (fieldDef.optionItems && fieldDef.optionItems.length > 0) {
    const matched = fieldDef.optionItems.find(
      (item) => item.id === optionValueOrId || item.name.toLowerCase() === optionValueOrId.toLowerCase()
    );
    if (matched) return matched.name;
  }

  // 2. Fallback ke legacy options
  if (fieldDef.options && fieldDef.options.length > 0) {
    const matchedLegacy = fieldDef.options.find(
      (opt) => opt.toLowerCase() === optionValueOrId.toLowerCase()
    );
    if (matchedLegacy) return matchedLegacy;
  }

  return optionValueOrId;
}

// Aliases for convenience
export const loadVideos = getStoredVideos;
export const loadArtists = getStoredArtists;
export const loadCustomFields = getStoredFields;
export const saveCustomFields = saveFields;
export const loadRatingTemplates = getStoredRatingTemplates;
export const saveCustomRatingTemplates = saveRatingTemplates;
export const loadVideoViewMode = getVideoViewMode;
export const saveStoredVideoViewMode = saveVideoViewMode;
