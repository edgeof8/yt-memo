(function () {
  'use strict';

  if (!window.location.hostname.includes('youtube.com') || !window.location.pathname.includes('/watch')) {
    alert('yt-memo: Please run on a YouTube video page');
    return;
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  function qsText(sel, root) {
    return (root || document).querySelector(sel)?.textContent?.trim() || '';
  }

  function toTimestamp(seconds) {
    if (isNaN(seconds) || seconds == null) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  }

  function showToast(msg, color) {
    const existing = document.getElementById('yt-memo-toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'yt-memo-toast';
    el.textContent = msg;
    el.style.cssText = [
      'position:fixed', 'top:20px', 'right:20px',
      `background:${color || '#4CAF50'}`, 'color:#fff',
      'padding:12px 16px', 'border-radius:4px',
      'z-index:10000', 'font-family:Arial,sans-serif',
      'font-size:14px', 'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
      'transition:opacity 0.3s',
    ].join(';');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  // ── Metadata ───────────────────────────────────────────────────────────────

  function getTitle() {
    return qsText('h1.ytd-video-primary-info-renderer')
      || qsText('h1.ytd-watch-metadata')
      || document.title.replace(/ - YouTube$/, '').trim()
      || 'Unknown Title';
  }

  function getChannel() {
    const el = document.querySelector('a.yt-simple-endpoint.ytd-channel-name')
      || document.querySelector('a.ytd-video-owner-renderer')
      || document.querySelector('ytd-channel-name a');
    return {
      name: el?.textContent?.trim() || 'Unknown Channel',
      url: el?.href || '',
    };
  }

  function getUploadDate() {
    return qsText('#info-strings yt-formatted-string')
      || qsText('.ytd-video-primary-info-renderer #info-strings yt-formatted-string')
      || '';
  }

  function getDuration() {
    return qsText('.ytp-time-duration') || '';
  }

  function getViewCount() {
    try {
      const primary = window.ytInitialData
        ?.contents?.twoColumnWatchNextResults?.results?.results?.contents
        ?.find(c => c.videoPrimaryInfoRenderer)?.videoPrimaryInfoRenderer;
      const views = primary?.viewCount?.videoViewCountRenderer?.viewCount?.simpleText;
      if (views) return views;
    } catch (e) {}
    return qsText('.view-count') || qsText('span.view-count') || '';
  }

  // ── Description ────────────────────────────────────────────────────────────

  function getDescription() {
    // Preferred: ytInitialData runs (preserves links as Markdown)
    try {
      const contents = window.ytInitialData
        ?.contents?.twoColumnWatchNextResults?.results?.results?.contents;
      const runs = contents
        ?.find(c => c.videoSecondaryInfoRenderer)
        ?.videoSecondaryInfoRenderer?.description?.runs;
      if (runs?.length > 0) {
        return runs.map(run => {
          const rawUrl = run.navigationEndpoint?.urlEndpoint?.url;
          if (rawUrl) {
            // Unwrap YouTube redirect URLs
            const cleanUrl = rawUrl.startsWith('https://www.youtube.com/redirect')
              ? (new URL(rawUrl).searchParams.get('q') || rawUrl)
              : rawUrl;
            return `[${run.text}](${cleanUrl})`;
          }
          return run.text;
        }).join('').trim();
      }
    } catch (e) {}

    // DOM fallback
    const el = document.querySelector('#description-inline-expander yt-formatted-string')
      || document.querySelector('ytd-expander #description yt-formatted-string')
      || document.querySelector('#description yt-formatted-string');
    return el?.textContent?.trim() || '';
  }

  // ── Chapters ───────────────────────────────────────────────────────────────

  function getChapters(description) {
    const chapters = [];

    // Method 1: chapter panel DOM elements
    document.querySelectorAll('ytd-macro-markers-list-item-renderer').forEach(el => {
      const time = qsText('#time', el);
      const title = qsText('#title', el);
      if (time && title) chapters.push({ time, title });
    });
    if (chapters.length > 0) return chapters;

    // Method 2: timestamp patterns in description text
    const re = /(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*(.+)/gm;
    let m;
    while ((m = re.exec(description)) !== null) {
      chapters.push({ time: m[1], title: m[2].trim() });
    }
    return chapters;
  }

  // ── Transcript ─────────────────────────────────────────────────────────────

  async function getTranscript() {
    // Preferred: fetch caption XML via ytInitialPlayerResponse (avoids all UI interaction)
    try {
      const tracks = window.ytInitialPlayerResponse
        ?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (tracks?.length > 0) {
        const track = tracks.find(t => t.languageCode?.startsWith('en')) || tracks[0];
        const type = track.kind === 'asr' ? 'Auto-generated' : (track.name?.simpleText || 'Manual');
        const res = await fetch(track.baseUrl);
        const xml = await res.text();
        const xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
        const lines = [];
        xmlDoc.querySelectorAll('text').forEach(node => {
          const start = parseFloat(node.getAttribute('start') || '0');
          const text = node.textContent.replace(/\s+/g, ' ').trim();
          if (text) lines.push(`[${toTimestamp(start)}] ${text}`);
        });
        if (lines.length > 0) return { text: lines.join('\n'), type };
      }
    } catch (e) {}

    // Fallback: open transcript panel via DOM clicks
    try {
      return await transcriptViaDOM();
    } catch (e) {}

    return { text: '', type: 'None' };
  }

  function waitFor(sel, ms) {
    const found = document.querySelector(sel);
    if (found) return Promise.resolve(found);
    return new Promise((res, rej) => {
      const ob = new MutationObserver(() => {
        const el = document.querySelector(sel);
        if (el) { ob.disconnect(); res(el); }
      });
      ob.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { ob.disconnect(); rej(new Error(`${sel} not found`)); }, ms || 5000);
    });
  }

  async function transcriptViaDOM() {
    let btn = document.querySelector('button[aria-label="Show transcript"]')
      || document.querySelector('button[aria-label*="transcript" i]')
      || document.querySelector('ytd-video-description-transcript-section-renderer button');

    // Try the three-dot More menu
    if (!btn) {
      const moreBtn = document.querySelector('ytd-menu-renderer yt-icon-button[aria-label*="More" i]')
        || document.querySelector('#button-shape button[aria-label*="More" i]');
      if (moreBtn) {
        moreBtn.click();
        await new Promise(r => setTimeout(r, 600));
        document.querySelectorAll('ytd-menu-service-item-renderer').forEach(item => {
          if (/transcript/i.test(item.textContent)) btn = item;
        });
      }
    }

    if (!btn) return { text: '', type: 'None' };

    btn.click();
    await new Promise(r => setTimeout(r, 1000));

    const panel = await waitFor('ytd-transcript-renderer', 4000);
    const body = panel.querySelector('#body');
    if (body) {
      // Scroll to force-load all segments
      body.scrollTop = body.scrollHeight;
      await new Promise(r => setTimeout(r, 2000));
      body.scrollTop = 0;
      await new Promise(r => setTimeout(r, 500));
    }

    const lines = [];
    panel.querySelectorAll('ytd-transcript-segment-renderer').forEach(seg => {
      const time = qsText('.segment-timestamp', seg);
      const text = qsText('.segment-text', seg);
      if (text) lines.push(`[${time}] ${text}`);
    });
    return { text: lines.join('\n'), type: lines.length ? 'Auto-generated' : 'None' };
  }

  // ── Markdown Builder ───────────────────────────────────────────────────────

  function buildMarkdown({ title, channel, uploadDate, viewCount, duration, description, chapters, transcript }) {
    const today = new Date().toISOString().split('T')[0];

    const frontmatter = [
      '---',
      `title: "${title.replace(/"/g, '\\"')}"`,
      `channel: "${channel.name.replace(/"/g, '\\"')}"`,
      `source: "${window.location.href}"`,
      `clipped: "${today}"`,
      `duration: "${duration}"`,
      `transcript_type: "${transcript.type}"`,
      '---',
    ].join('\n');

    const metaLines = [
      `# ${title}`,
      '',
      `**Channel:** [${channel.name}](${channel.url})`,
      uploadDate ? `**Uploaded:** ${uploadDate}` : null,
      viewCount ? `**Views:** ${viewCount}` : null,
      duration ? `**Duration:** ${duration}` : null,
      '',
    ].filter(l => l !== null).join('\n');

    const descSection = description ? `## Description\n\n${description}\n\n` : '';
    const chapSection = chapters.length
      ? `## Chapters\n\n${chapters.map(c => `- [${c.time}] ${c.title}`).join('\n')}\n\n`
      : '';
    const trSection = transcript.text
      ? `## Transcript\n\n${transcript.text}\n\n`
      : '';

    return `${frontmatter}\n\n${metaLines}\n${descSection}${chapSection}${trSection}`.trimEnd();
  }

  // ── Main ───────────────────────────────────────────────────────────────────

  async function main() {
    const origTitle = document.title;
    document.title = '⏳ Extracting…';
    showToast('yt-memo: Extracting transcript…', '#1565C0');

    const title = getTitle();
    const channel = getChannel();
    const uploadDate = getUploadDate();
    const duration = getDuration();
    const viewCount = getViewCount();
    const description = getDescription();
    const chapters = getChapters(description);
    const transcript = await getTranscript();

    const markdown = buildMarkdown({ title, channel, uploadDate, viewCount, duration, description, chapters, transcript });
    await copyToClipboard(markdown);

    document.title = origTitle;
    const info = transcript.text ? ' (transcript included)' : '';
    showToast(`✓ Copied "${title}"${info}`);
    document.title = '✓ Copied';
    setTimeout(() => { document.title = origTitle; }, 1000);
  }

  main().catch(err => {
    console.error('yt-memo:', err);
    showToast('yt-memo: Failed — see console for details', '#c62828');
    document.title = document.title.replace('⏳ Extracting…', '');
  });
})();
