import { useState, useEffect } from 'react';
import { CustomFieldDefinition, Artist, Video } from '../types';
import { subscribeStorage } from './storage';

/**
 * Checks if a field definition can participate in the Dynamic Filtering Schema.
 * Supports: single_choice, multi_choice, custom_text, text_dynamic_filter, text, number.
 */
export function isFilterableField(field: CustomFieldDefinition): boolean {
  if (!field) return false;
  // Exclude structural/media non-filter system fields from appearing as filter tabs
  if (['name', 'photos', 'bio', 'embedImages', 'galleryNoteIds', 'links'].includes(field.key)) {
    return false;
  }
  if (
    [
      'art_field_name',
      'art_field_photos',
      'art_field_bio',
      'art_field_embed_images',
      'art_field_notes',
      'art_field_button',
      'art_field_birth',
    ].includes(field.id)
  ) {
    return false;
  }
  return (
    field.type === 'single_choice' ||
    field.type === 'multi_choice' ||
    field.type === 'text_dynamic_filter' ||
    field.type === 'custom_text' ||
    field.type === 'text' ||
    field.type === 'number'
  );
}

/**
 * Formats a number or numeric string with optional Prefix and Suffix affixes.
 * Examples:
 * - formatNumberWithAffixes(165, '', 'cm') -> "165 cm"
 * - formatNumberWithAffixes(100, '$', '') -> "$100"
 * - formatNumberWithAffixes(50000, 'Rp', '') -> "Rp 50000"
 * - formatNumberWithAffixes(95, '', '%') -> "95%"
 */
export function formatNumberWithAffixes(
  value: number | string | null | undefined,
  prefix?: string,
  suffix?: string
): string {
  if (value === null || value === undefined || value === '') return '';
  const valStr = String(value).trim();
  if (!prefix && !suffix) return valStr;

  const p = (prefix || '').trim();
  const s = (suffix || '').trim();

  let pre = '';
  if (p) {
    if (/^[#$€£¥]/.test(p)) {
      pre = p;
    } else {
      pre = `${p} `;
    }
  }

  let suf = '';
  if (s) {
    if (/^[%°]/.test(s)) {
      suf = s;
    } else {
      suf = ` ${s}`;
    }
  }

  return `${pre}${valStr}${suf}`;
}

/**
 * Safely extracts custom field value from an Artist entity.
 */
export function getArtistFieldValue(artist: Artist, field: CustomFieldDefinition): string | number | null {
  if (!artist || !field) return null;

  if (field.type === 'number') {
    const num =
      artist.numberFields?.[field.label] ??
      artist.numberFields?.[field.key] ??
      artist.numberFields?.[field.id];
    if (num !== undefined && num !== null && !isNaN(Number(num))) {
      return Number(num);
    }
    const txtNum =
      artist.textFields?.[field.label] ??
      artist.textFields?.[field.key] ??
      artist.customFields?.[field.label] ??
      artist.customFields?.[field.key];
    if (txtNum !== undefined && txtNum !== null && String(txtNum).trim() !== '' && !isNaN(Number(txtNum))) {
      return Number(txtNum);
    }
    return null;
  }

  // Text types (custom_text, text_dynamic_filter, text)
  if (
    field.key === 'Peran Utama' ||
    field.id === 'art_field_peran_utama' ||
    field.label === 'Peran / Profesi Utama' ||
    field.label === 'Peran Utama'
  ) {
    const val =
      artist.textFields?.['Peran Utama'] ??
      artist.textFields?.['Peran / Profesi Utama'] ??
      artist.textFields?.[field.label] ??
      artist.textFields?.[field.key];
    if (val && typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
    return null;
  }

  const val =
    artist.textFields?.[field.label] ??
    artist.textFields?.[field.key] ??
    artist.textFields?.[field.id] ??
    artist.customFields?.[field.label] ??
    artist.customFields?.[field.key] ??
    artist.customFields?.[field.id];

  if (val !== undefined && val !== null) {
    const s = String(val).trim();
    if (s.length > 0) return s;
  }

  return null;
}

/**
 * Safely extracts custom field values from a Video entity.
 */
export function getVideoFieldValues(video: Video, field: CustomFieldDefinition): string[] {
  if (!video || !field) return [];
  const results: string[] = [];

  if (field.type === 'single_choice') {
    const val =
      video.singleChoices?.[field.id] ??
      video.singleChoices?.[field.key] ??
      video.singleChoices?.[field.label];
    if (val && typeof val === 'string' && val.trim().length > 0) {
      results.push(val.trim());
    }
  } else if (field.type === 'multi_choice') {
    const list =
      video.multiChoices?.[field.id] ??
      video.multiChoices?.[field.key] ??
      video.multiChoices?.[field.label];
    if (Array.isArray(list)) {
      list.forEach((item) => {
        if (item && typeof item === 'string' && item.trim().length > 0) {
          results.push(item.trim());
        }
      });
    }
  } else if (
    field.type === 'custom_text' ||
    field.type === 'text' ||
    field.type === 'text_dynamic_filter'
  ) {
    const val =
      video.customFields?.[field.id] ??
      video.customFields?.[field.key] ??
      video.customFields?.[field.label];
    if (val && typeof val === 'string' && val.trim().length > 0) {
      results.push(val.trim());
    }
  } else if (field.type === 'number') {
    const val =
      video.customFields?.[field.id] ??
      video.customFields?.[field.key] ??
      video.customFields?.[field.label];
    if (val !== undefined && val !== null && String(val).trim().length > 0) {
      results.push(String(val).trim());
    }
  }

  return Array.from(new Set(results));
}

/**
 * Dynamic Filtering Schema for Halaman Rank Artis:
 * - Maps Field Text and Field Number from Artist Fields (and relevant Video tags)
 * - Applies AUTO-PRUNING: Only fields with >= 1 active record (non-null/non-empty) are kept.
 * - Only active options found in the actual records are rendered.
 */
export function computeDynamicFilterSchemaForArtists(
  artists: Artist[],
  videos: Video[],
  artistFields: CustomFieldDefinition[],
  videoFields: CustomFieldDefinition[] = []
): {
  activeFields: CustomFieldDefinition[];
  dynamicOptionsByField: Record<string, string[]>;
} {
  const candidates: CustomFieldDefinition[] = [];
  const seenIds = new Set<string>();

  // Add artist fields that are filterable
  artistFields.forEach((af) => {
    if (isFilterableField(af) && !seenIds.has(af.id)) {
      candidates.push(af);
      seenIds.add(af.id);
    }
  });

  // Add video fields that are filterable
  videoFields.forEach((vf) => {
    if (isFilterableField(vf) && !seenIds.has(vf.id)) {
      candidates.push(vf);
      seenIds.add(vf.id);
    }
  });

  const activeFields: CustomFieldDefinition[] = [];
  const dynamicOptionsByField: Record<string, string[]> = {};

  for (const field of candidates) {
    const optionsSet = new Set<string>();
    const isArtistField = artistFields.some((af) => af.id === field.id);

    if (isArtistField) {
      for (const artist of artists) {
        const val = getArtistFieldValue(artist, field);
        if (val !== null) {
          const strVal = String(val).trim();
          if (strVal.length > 0) {
            optionsSet.add(strVal);
          }
        }
      }
    } else {
      for (const artist of artists) {
        const artistVideos = videos.filter((v) => v.artistIds && v.artistIds.includes(artist.id));
        for (const vid of artistVideos) {
          const vals = getVideoFieldValues(vid, field);
          vals.forEach((v) => {
            if (v && v.trim().length > 0) {
              optionsSet.add(v.trim());
            }
          });
        }
      }
    }

    // AUTO-PRUNING: Only keep field if it has >= 1 active record value
    if (optionsSet.size > 0) {
      let sortedOptions: string[];
      if (field.type === 'number') {
        sortedOptions = Array.from(optionsSet).sort((a, b) => {
          const nA = Number(a);
          const nB = Number(b);
          if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
          return a.localeCompare(b);
        });
      } else {
        sortedOptions = Array.from(optionsSet).sort((a, b) =>
          a.localeCompare(b, 'id', { sensitivity: 'base' })
        );
      }

      dynamicOptionsByField[field.id] = sortedOptions;
      activeFields.push(field);
    }
  }

  activeFields.sort((a, b) => a.order - b.order);

  return { activeFields, dynamicOptionsByField };
}

/**
 * Dynamic Filtering Schema for Halaman Rank Video:
 * - Integrates Video fields AND Artist Field Text and Field Number from "Struktur & Urutan Field Artis"
 * - Maps field.label automatically as Tab Title
 * - Values from linked artists and/or videos are rendered as Filter Options
 * - Applies AUTO-PRUNING: Only fields with >= 1 active record (non-null/non-empty) are kept.
 * - Only active options found in the actual records are rendered.
 */
export function computeDynamicFilterSchemaForVideos(
  videos: Video[],
  artists: Artist[],
  videoFields: CustomFieldDefinition[],
  artistFields: CustomFieldDefinition[] = []
): {
  activeFields: CustomFieldDefinition[];
  dynamicOptionsByField: Record<string, string[]>;
} {
  const candidates: CustomFieldDefinition[] = [];
  const seenIds = new Set<string>();

  // 1. Add video fields
  videoFields.forEach((vf) => {
    if (isFilterableField(vf) && !seenIds.has(vf.id)) {
      candidates.push(vf);
      seenIds.add(vf.id);
    }
  });

  // 2. Add artist fields (Text and Number from "Struktur & Urutan Field Artis")
  artistFields.forEach((af) => {
    if (isFilterableField(af) && !seenIds.has(af.id)) {
      candidates.push(af);
      seenIds.add(af.id);
    }
  });

  const activeFields: CustomFieldDefinition[] = [];
  const dynamicOptionsByField: Record<string, string[]> = {};

  for (const field of candidates) {
    const optionsSet = new Set<string>();
    const isArtistField = artistFields.some((af) => af.id === field.id);

    if (isArtistField) {
      // Collect values from linked artists of each video
      for (const video of videos) {
        if (!video.artistIds || video.artistIds.length === 0) continue;
        const linkedArtists = artists.filter((a) => video.artistIds.includes(a.id));
        for (const artist of linkedArtists) {
          const val = getArtistFieldValue(artist, field);
          if (val !== null) {
            const strVal = String(val).trim();
            if (strVal.length > 0) {
              optionsSet.add(strVal);
            }
          }
        }
      }
    } else {
      // Collect values directly from videos
      for (const video of videos) {
        const vals = getVideoFieldValues(video, field);
        vals.forEach((v) => {
          if (v && v.trim().length > 0) {
            optionsSet.add(v.trim());
          }
        });
      }
    }

    // AUTO-PRUNING: Only keep field if it has >= 1 active record value
    if (optionsSet.size > 0) {
      let sortedOptions: string[];
      if (field.type === 'number') {
        sortedOptions = Array.from(optionsSet).sort((a, b) => {
          const nA = Number(a);
          const nB = Number(b);
          if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
          return a.localeCompare(b);
        });
      } else {
        sortedOptions = Array.from(optionsSet).sort((a, b) =>
          a.localeCompare(b, 'id', { sensitivity: 'base' })
        );
      }

      dynamicOptionsByField[field.id] = sortedOptions;
      activeFields.push(field);
    }
  }

  activeFields.sort((a, b) => a.order - b.order);

  return { activeFields, dynamicOptionsByField };
}

/**
 * Evaluates whether an Artist matches the active dynamic filter.
 */
export function matchArtistAgainstDynamicFilter(
  artist: Artist,
  activeFieldId: string | null,
  selectedOption: string | null,
  allFields: CustomFieldDefinition[],
  artistVideos: Video[]
): boolean {
  if (!activeFieldId || !selectedOption) return true;

  const field = allFields.find((f) => f.id === activeFieldId);
  if (!field) return true;

  // 1. Direct artist field value
  const artistVal = getArtistFieldValue(artist, field);
  if (artistVal !== null) {
    return String(artistVal) === selectedOption;
  }

  // 2. Video field value of linked videos
  const hasMatchingVideo = artistVideos.some((vid) => {
    const vals = getVideoFieldValues(vid, field);
    return vals.includes(selectedOption);
  });

  return hasMatchingVideo;
}

/**
 * Evaluates whether a Video matches the active dynamic filter.
 */
export function matchVideoAgainstDynamicFilter(
  video: Video,
  activeFieldId: string | null,
  selectedOption: string | null,
  allFields: CustomFieldDefinition[],
  artists: Artist[]
): boolean {
  if (!activeFieldId || !selectedOption) return true;

  const field = allFields.find((f) => f.id === activeFieldId);
  if (!field) return true;

  // 1. Direct video field values
  const directVals = getVideoFieldValues(video, field);
  if (directVals.includes(selectedOption)) {
    return true;
  }

  // 2. Linked artists field values
  if (video.artistIds && video.artistIds.length > 0) {
    const linkedArtists = artists.filter((a) => video.artistIds.includes(a.id));
    const matchesLinkedArtist = linkedArtists.some((art) => {
      const artVal = getArtistFieldValue(art, field);
      return artVal !== null && String(artVal) === selectedOption;
    });
    if (matchesLinkedArtist) return true;
  }

  return false;
}

/**
 * Real-time reactive listener hook that triggers on any storage mutation.
 */
export function useStorageRealtimeSync(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handler = () => {
      setVersion((v) => v + 1);
    };

    const unsubscribe = subscribeStorage(handler);
    return () => {
      unsubscribe();
    };
  }, []);

  return version;
}
