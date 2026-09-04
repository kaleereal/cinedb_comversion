export type TabType = 'home' | 'artists' | 'rank_videos' | 'rank_artists' | 'gallery_notes' | 'settings';

export interface RatingItem {
  id: string;
  name: string;
  description?: string;
  score: number; // 0 - 100
}

export interface RatingFolder {
  id: string;
  name: string;
  items: RatingItem[];
}

export interface RatingTemplateItem {
  id: string;
  name: string;
  description?: string;
  defaultScore?: number;
}

export interface RatingTemplateFolder {
  id: string;
  name: string;
  items: RatingTemplateItem[];
}

export interface VideoMetadata {
  title?: string;
  thumbnailUrl?: string;
  embedUrl?: string;
  embedHtml?: string;
  domain?: string;
  duration?: string;
  author?: string;
}

export interface Video {
  id: string;
  title: string;
  url: string;
  metadata?: VideoMetadata;
  fallbackThumbnailUrl?: string; // Fallback manual thumbnail URL (Poin 5)
  notes?: string;
  ratingFolders: RatingFolder[];
  overallRating: number; // Computed 0 - 100
  artistIds: string[]; // Many-to-Many references
  artistRoles?: Record<string, string>; // artistId -> status_peran (e.g. "Artis Utama", "Aktor")
  artistPerformances?: Record<string, number>; // artistId -> Nilai Performa (P) 0 - 100
  releaseDate?: string; // Tanggal rilis video (YYYY-MM-DD)
  singleChoices: Record<string, string>; // fieldId -> selectedOptionId or optionName
  multiChoices: Record<string, string[]>; // fieldId -> selectedOptionIds[] or optionNames[]
  customFields?: Record<string, string>; // for arbitrary custom text fields
  createdAt: string;
  updatedAt: string;
}

export interface ArtistLink {
  id: string;
  label: string;
  url: string;
}

export interface Artist {
  id: string;
  name: string;
  avatarUrl: string;
  coverUrl?: string;
  bio?: string;
  birthMonthYear?: string; // e.g. "1990-05" for calculating age
  galleryNoteIds?: string[]; // Relasi ke Catatan Gallery
  links?: ArtistLink[];
  embedImages?: string[]; // URLs or base64 images
  textFields?: Record<string, string>;
  numberFields?: Record<string, number>; // Field number kustom untuk artis
  customFields?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  // Note: artists do NOT have a manual rating. Overall rating is calculated dynamically from linked videos.
}

export interface VideoArtistPivot {
  videoId: string;
  artistId: string;
  createdAt: string;
  nilai_didapat: number; // calculated float: (V * (S + P)) / 200
  status_peran_saat_itu: string; // role title e.g. "Artis Utama"
  bobot_saat_itu: number; // percentage S e.g. 100 or 70
  nilai_performa?: number; // percentage P (0-100) from slider
}

export interface RoleWeight {
  id: string;
  roleName: string;
  weight: number; // 0 to 100
  isLocked: boolean; // if true, weight is locked and protected from edits or batch recalculation
}

export type FieldType = 
  | 'link' 
  | 'text' 
  | 'notes' 
  | 'rating_folder' 
  | 'artist_select' 
  | 'multi_choice' 
  | 'single_choice'
  | 'custom_text'
  | 'text_dynamic_filter'
  | 'button_link'
  | 'gallery_notes'
  | 'month_year'
  | 'number'
  | 'release_date';

export interface MasterOptionItem {
  id: string;
  name: string;
  description?: string;
}

export interface CustomFieldDefinition {
  id: string;
  key: string;
  label: string;
  description: string;
  type: FieldType;
  order: number;
  required?: boolean;
  is_required?: boolean; // Dynamic required flag (Poin 2)
  isSystem?: boolean; // System fields cannot be deleted but can be reordered & renamed
  options?: string[]; // Legacy options array
  optionItems?: MasterOptionItem[]; // Master Normalized Tag/Options (Poin 1 - ID Reference)
  optionDescriptions?: Record<string, string>; // Optional description per option item
  defaultFolderNames?: string[]; // For rating_folder defaults
  maxEntries?: number;
  targetEntryTypeId?: string; // For Many-to-Many relation to other entry types
  prefix?: string; // Input Affixes - Prefix (satuan di depan, e.g. "Rp", "$", "#")
  suffix?: string; // Input Affixes - Suffix (satuan di belakang, e.g. "cm", "kg", "th")
}

export interface EntryTypeDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName?: string;
  fields: CustomFieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface GenericEntry {
  id: string;
  entryTypeId: string;
  title: string;
  fieldsData: Record<string, any>; // fieldId -> value
  relatedEntryIds?: Record<string, string[]>; // fieldId -> targetEntryIds
  createdAt: string;
  updatedAt: string;
}

export interface ThemeSettings {
  mode: 'dark' | 'light';
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  colors: {
    bg: string;
    card: string;
    cardBorder: string;
    textPrimary: string;
    textSecondary: string;
    primary: string;
    accent: string;
    danger: string;
  };
}

export interface NoteBlock {
  id: string;
  type: 'text' | 'heading' | 'bullet_list' | 'image' | 'quote';
  content: string;
  images?: string[];
  bold?: boolean;
  italic?: boolean;
}

export interface GalleryNote {
  id: string;
  title: string;
  blocks: NoteBlock[];
  linkedArtistIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FilterCriteria {
  searchQuery: string;
  sortOrder: 'desc' | 'asc'; // highest rating first or lowest rating first
  singleChoices: Record<string, string>; // fieldId -> chosenOption
  multiChoices: Record<string, string[]>; // fieldId -> chosenOptions
  minRating?: number;
  maxRating?: number;
}
