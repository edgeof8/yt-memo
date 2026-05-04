**✅ PRD: yt-memo**  
**YouTube Video → Clean Markdown Bookmarklet**

**Version**: 0.1  
**Date**: May 4, 2026  
**Author**: edgeof8  
**Status**: Draft – Ready for implementation

---

### 1. Executive Summary

**yt-memo** is a lightweight bookmarklet that turns any YouTube video into a clean, well-structured Markdown note — complete with title, channel, description, chapters, and full transcript — ready to drop straight into Obsidian, Notion, Logseq, or your second brain.

It extends the **Edge Toolkit** with video content:

- `bttn` → AI chats  
- `md-memo` → articles  
- `x-memo` → X threads  
- **yt-memo** → YouTube videos

**One click. Full video context. Perfect Markdown. Zero friction.**

---

### 2. Problem Statement

YouTube contains an enormous amount of high-quality knowledge, but saving it for later is frustrating:

- Transcripts are buried behind “Show transcript”
- Chapters are useful but scattered
- Descriptions are often long and messy
- People want the full context (title + description + chapters + transcript) in clean Markdown for their PKM tools
- Existing solutions are either heavy extensions or require API keys

**yt-memo** solves this with the same philosophy as the rest of the suite: **dead simple, privacy-first, and reliable**.

---

### 3. Goals

**Primary Goal**  
Convert any YouTube video page into high-quality Markdown (with transcript and chapters) in under 4 seconds with one click.

**Secondary Goals**
- Match the output quality and consistency of `bttn`, `md-memo`, and `x-memo`
- Gracefully handle both manual and auto-generated transcripts
- Be robust against YouTube’s frequent DOM changes

**Success Metrics (MVP)**
- Works on 90%+ of public videos
- Produces clean, readable Markdown on first try
- < 4 KB minified bookmarklet
- Zero permanent external dependencies

---

### 4. Target Users

- Researchers and students saving educational videos
- PKM enthusiasts building video-based notes
- Content creators and writers who reference YouTube
- AI power users feeding video transcripts into LLMs
- Anyone who watches long-form content and wants to keep the knowledge

---

### 5. Key Features (MVP)

| Feature                      | Description                                                                 | Priority |
|-----------------------------|-----------------------------------------------------------------------------|----------|
| **Video Metadata**          | Title, channel name + link, upload date, view count                         | P0      |
| **Description**             | Full description converted to clean Markdown                                | P0      |
| **Chapters**                | Timestamped chapters extracted and formatted as list                        | P0      |
| **Transcript Extraction**   | Automatically opens transcript panel and extracts full text                 | P0      |
| **YAML Frontmatter**        | `title`, `channel`, `source`, `clipped`, `duration`, `transcript_type`      | P0      |
| **Speaker Attribution**     | Labels auto-generated transcripts as “Auto-generated” or speaker name       | P1      |
| **Toast + Title Feedback**  | “✓ Copied 42-min video + transcript” + tab title flash                      | P0      |
| **Smart Scrolling**         | Ensures full transcript is loaded before extraction                         | P0      |

**Nice-to-have (Post-MVP)**
- Multiple language transcript selection
- Thumbnail as base64 or link in frontmatter
- Comment section (top comments only)
- Playlist support
- Timestamp links in transcript (clickable in Markdown)

---

### 6. User Flow

1. User is on any YouTube video page (`youtube.com/watch?v=...`)
2. Clicks **yt-memo** bookmark
3. Bookmarklet:
   - Detects YouTube and video ID
   - Extracts title, channel, description, and chapters
   - Opens transcript panel (if not already open)
   - Scrolls to load full transcript
   - Converts everything to clean Markdown + YAML
   - Copies to clipboard
4. User sees toast: `✓ Copied “Video Title” (transcript included)`
5. Tab title briefly flashes `✓ Copied`

**Edge case handling**:
- No transcript available → still exports metadata + description + chapters with note
- Very long videos (2+ hours) → handles gracefully with progress indication
- Shorts or music videos → works but notes limited transcript value

---

### 7. Technical Requirements

- **Pure client-side JavaScript** (ES6+)
- **DOM interaction** for dynamic elements (transcript panel, chapters)
- **Smart waiting logic** using `MutationObserver` + timeouts (YouTube loads content asynchronously)
- **Platform detection**: `youtube.com`, `youtu.be`, and music.youtube.com
- **Markdown conversion**: Turndown.js (via CDN, like md-memo) or custom lightweight parser
- **Clipboard API** with fallback
- **Minified size** target: < 4 KB

**Key Technical Challenges & Solutions**
- Transcript loads on demand → programmatically click “Show transcript” and wait
- Chapters can appear in two places (description or dedicated panel) → dual detection
- Auto-generated vs manual transcripts → detect and label accordingly
- Frequent YouTube UI changes → multiple fallback selectors + robust error handling

---

### 8. Non-Functional Requirements

- **Privacy**: 100% local processing. No data sent anywhere
- **Performance**: < 4 seconds even on long videos
- **Reliability**: Works on slow connections and partially loaded pages
- **Language**: Primary support for English; graceful fallback for others
- **Maintainability**: Clean, modular code with clear extraction functions

---

### 9. Scope

**In Scope (MVP)**
- Standard watch pages
- Title, channel, description, chapters, full transcript
- Basic formatting preservation (bold, links, lists in description)
- Auto-generated and manual transcripts

**Out of Scope (MVP)**
- Downloading video or audio
- Full comment sections
- Live streams (real-time)
- YouTube Music or non-video pages
- Private/unlisted videos (only visible content)

---

### 10. Success Criteria

**Launch Criteria**
- Successfully exports 15 different real-world videos (mix of educational, tech talks, long-form)
- Transcript is complete and readable
- Output looks excellent when pasted into Obsidian/Notion
- Matches polish level of existing tools

**Post-Launch**
- < 8% failure rate on popular videos over 30 days
- Positive user feedback on transcript quality

---

### 11. Risks & Mitigations

| Risk                              | Likelihood | Impact | Mitigation |
|-----------------------------------|------------|--------|----------|
| YouTube changes transcript UI     | High       | High   | Multiple detection methods + easy update path |
| Very long transcripts (3+ hours)  | Medium     | Medium | Chunked extraction + clear messaging |
| No transcript available           | Medium     | Low    | Still export rich metadata + note |
| CSP or loading delays             | Low        | Medium | Robust waiting + fallback to metadata-only |

---

### 12. Future Roadmap (Post-MVP)

- **v0.2**: Multi-language transcript picker
- **v0.3**: “Video Notes” mode (adds blank sections for user notes)
- **v0.4**: yt-memo + bttn combo (save AI discussion about a video)
- **v0.5**: Support for YouTube Shorts + community posts

---

### 13. Open Questions

1. Should we default to including the full transcript, or make it optional via a toast prompt? // yes full transcript
2. Preferred transcript format: plain paragraphs or timestamped lines (`[00:12] Text...`)? // timestamped lines
3. Should we add view count and like count to the frontmatter? // no
