import { VideoMetadata } from '../types';

export async function fetchUrlMetadata(url: string): Promise<VideoMetadata> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error('URL tidak boleh kosong');
  }

  // Normalize URL protocol if missing
  let normalizedUrl = trimmed;
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    throw new Error('Format URL tidak valid');
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const domain = hostname.replace(/^www\./, '');

  // 1. YouTube Detection
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
    let videoId = '';
    if (domain.includes('youtu.be')) {
      videoId = parsedUrl.pathname.slice(1).split('?')[0];
    } else if (parsedUrl.pathname.startsWith('/shorts/')) {
      videoId = parsedUrl.pathname.replace('/shorts/', '').split('?')[0];
    } else if (parsedUrl.pathname.startsWith('/embed/')) {
      videoId = parsedUrl.pathname.replace('/embed/', '').split('?')[0];
    } else {
      videoId = parsedUrl.searchParams.get('v') || '';
    }

    if (videoId) {
      // Try oEmbed API for real video title
      let title = `YouTube Video (${videoId})`;
      let author = 'YouTube Creator';
      let thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      try {
        const oembedRes = await fetch(
          `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
        );
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          if (data.title) title = data.title;
          if (data.author_name) author = data.author_name;
          if (data.thumbnail_url) thumbnail = data.thumbnail_url;
        }
      } catch {
        // Fallback works directly from videoId
      }

      const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0`;
      const embedHtml = `<iframe width="100%" height="100%" src="${embedUrl}" title="${title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

      return {
        title,
        thumbnailUrl: thumbnail,
        embedUrl,
        embedHtml,
        domain: 'youtube.com',
        author,
      };
    }
  }

  // 2. Vimeo Detection
  if (domain.includes('vimeo.com')) {
    const match = parsedUrl.pathname.match(/\/(\d+)/);
    const vimeoId = match ? match[1] : '';
    let title = 'Vimeo Video';
    let thumbnail = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80';

    if (vimeoId) {
      try {
        const oembedRes = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(normalizedUrl)}`);
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          if (data.title) title = data.title;
          if (data.thumbnail_url) thumbnail = data.thumbnail_url;
        }
      } catch {
        // fallback
      }

      const embedUrl = `https://player.vimeo.com/video/${vimeoId}`;
      const embedHtml = `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;

      return {
        title,
        thumbnailUrl: thumbnail,
        embedUrl,
        embedHtml,
        domain: 'vimeo.com',
      };
    }
  }

  // 3. TikTok / Dailymotion / Twitch / General oEmbed via noembed
  try {
    const oembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(normalizedUrl)}`);
    if (oembedRes.ok) {
      const data = await oembedRes.json();
      if (data.title || data.html || data.thumbnail_url) {
        return {
          title: data.title || `${domain} Video`,
          thumbnailUrl: data.thumbnail_url || `https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80`,
          embedHtml: data.html,
          domain,
          author: data.author_name,
        };
      }
    }
  } catch {
    // proceed to generic fallback
  }

  // 4. Generic Web Link Fallback
  const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
  const guessedTitle = pathParts.length > 0 
    ? decodeURIComponent(pathParts[pathParts.length - 1].replace(/[-_]/g, ' '))
    : domain;

  return {
    title: guessedTitle.charAt(0).toUpperCase() + guessedTitle.slice(1),
    thumbnailUrl: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&auto=format&fit=crop&q=80',
    domain,
    embedUrl: normalizedUrl,
  };
}
