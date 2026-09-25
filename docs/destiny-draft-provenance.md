# Destiny draft image provenance

All four images are byte-identical Git blobs (no regenerated history, crops or retouching). Both stages are 5120×2160 and use the same displayed width. “Before” means the earliest preserved 21:9 version in available Git history, not an unrecorded original sketch. “After” is the released collection at the remotely verified commit f4a51dd46bf62c2865adb88f1efb7e5cc613a17e, containing 42 backgrounds.

- fusion-before.webp: 142e4ac:backgrounds/05-fusion-transport.webp
- fusion-after.webp: f4a51dd:backgrounds/03-fusion-transport.webp
- truth-before.webp: 142e4ac:backgrounds/14-truth-lamp.webp
- truth-after.webp: f4a51dd:backgrounds/10-truth-lamp.webp

Source repository: https://github.com/ncr/omarchy-destiny-theme
Aesthetic history: e2d7f70 README; f9f991f FIDELITY; 73f4f01 figures; 8d6cbda production guide/layout refinements. The author's thesis and optimism come from the blog task conversation. Images inspected visually against the production guide and reference manifest; historical references are not substituted for final release images.

The preview URL is unlisted, not authenticated; no other drafts are opted in. Production blog routes and feeds retain their existing draft filtering.

## Detail comparisons

Four `*-detail.svg` diagrams embed the exact original WebP bytes. Each shows an unchanged full sheet, an amber region rectangle, connector lines and a magnified SVG viewport of that exact region. No pixels, geometry or historical details are generated or retouched. Fusion focuses on the crew ring; Truth Lamp focuses on a seated figure at the left end of the table. Different viewing angles and local magnifications are intentional; these are design comparisons, not matched-camera engineering measurements. Crop coordinates (x,y,w,h) are in a 1500-wide overview:

- fusion-before: (380, 145, 240, 280)
- fusion-after: (520, 215, 240, 280)
- truth-before: (390, 235, 210, 250)
- truth-after: (580, 300, 160, 190)

## Expanded selection gallery

The current draft offers five candidates with one preserved intermediate each (15 views total). Sources are Git blobs from 142e4ac, 73f4f01 and f4a51dd. Exact paths, hashes and crop boxes are in destiny-detail-studies.json. The Quantum example compares the same function after an architectural redesign, not the same component. Intermediate versions are historical checkpoints, not claims of approved final work. The gallery and alternate hooks are editorial choices to be narrowed by the author.

## Author selection

Keep examples 1, 3 and 4 (Truth Lamp, Proxy, Quantum Simulator). In Proxy final stage, mirror the magnified viewport horizontally, as explicitly requested, to align running direction. The overview retains original orientation and the caption identifies the reflected detail. Original source bytes remain unchanged.

## Gallery and live btop screenshots

Gallery: 42 originals and release thumbnails extracted from project commit f4a51dd, checked against docs/collection/release.json.
Btop screenshots: host spawner (confirmed with hostname and /etc/hostname), real Wayland captures, 1920×1080, losslessly converted to WebP, no metrics edited. Controlled 100-second test: 14 CPU workers, CUDA compute loop, TCP loopback transfer on lo. First frame CPU 87%, GPU 97%; second CPU 69%, GPU 97%. RAM reflects existing machine use, not a synthetic memory test. Theme read from active btop current.theme and project colors.toml. Notifications hidden for capture; original settings restored.

## Guided gallery tour

96-second tour of Quantum Simulator, Proxy and Truth Lamp using the same release originals as the gallery. Twelve authored camera regions and Polish captions in site/src/data/destiny-tour.json. Captions checked against visible labels and illustrations; the machines remain fictional concepts. No new images or altered historical illustrations. Camera interpolates over 2.8 seconds, then holds; reduced-motion uses static cuts and starts paused. Desktop/mobile tests cover playback, seeking, all scene boundaries, captions, return to free browsing, restart and close.

## Rhythmic tour revision

19 shots / 74.46 seconds / six different narrative arcs: Quantum (part to assembly), Proxy (sleeper to substitute), Fusion (lateral tour), Truth Lamp (scene to observer to dog), Greener (competitive escalation), Light Sail (quiet release). All added sheets visually inspected from release originals. Short phrase captions use deterministic timeline-based reveal, so scrubbing and reduced-motion stay readable.

Music: Kevin Koontz, We Can Fix Everything (The Ultimate Machine), identified at https://omarchy.org/ and official source https://github.com/omacom/omarchy-site/blob/master/src/lib/music.ts . Track streamed on explicit opt-in from the official GitHub-hosted MP3; no audio copied into blog repo, no claim of a redistribution license. Browser buffers it for accurate seeks; music clock drives the timeline. Offset 20.45s; editorial cuts snapped to onsets in official src/data/track.json. Original source hosted on omarchy.org did not seek reliably in browser testing. Source attribution visible in player.

QA: Chromium desktop 1440×1000, mobile 390×844, reduced motion 900×800: all 19 captions/camera scenes, no audio request before opt-in, actual MP3 playback, pause, seek and audio-clock sync, gallery exit and close silence verified.

Music feature card: official cover art linked from omarchy.org, prominent title/artist, volume control and playback-state indicator (decorative activity indicator, not spectrum measurement). All six tour originals and thumbnails preload on opening. Audio clock no longer depends on image readiness: deliberately blocked Proxy original during transition, audio advanced continuously with zero pause events; thumbnail remained available. Camera moves interpolate logarithmic scale and preserve prior drift across continuous shots. Retry preserves tour mode.

## Full-length spatial show and persistent soundtrack (supersedes earlier timings)

The current timeline runs 299.21 seconds, starting at track time zero: 60 shots include all 42 release wallpapers. Six authored detail stories alternate with full-sheet portraits. Cut times follow the official Omarchy track analysis. The audio element is persistent and independent of image decoding and WebGL rendering; the track's ended event stops the timeline at its final frame.

Fusion drawing effect (1:40–1:56): 1,483 joined/simplified visible paths extracted from f4a51dd:tools/assets/hardware-family/fusion-transport.json, lifted slightly off a paper plane as cylindrical lines. This is an artistic extrusion of the original vector drawing, not a claimed reconstruction of hidden ship geometry. The camera rides one liquid-tin path while other lines grow, then pulls back. Gentle local accents use track onsets, without screen flashes.

Fusion nozzle orbit (1:56–2:06): 56 actual mesh parts exported from the project's tools/hardware3d/fusion_transport.py / family_core.py Blender scene (nozzle coils, support vanes, throat flange/studs, vessel, field coils and service pods). This shot uses real 3D mesh geometry. No wallpaper or historical comparison image is regenerated. WebGL is lazy-loaded, optional and disabled for reduced motion; original image framing remains the fallback.

The sound invitation animates with a small lift, ripple and note motion until the visitor makes a choice. Explicit on/off preference uses a first-party destiny-sound cookie (one year, SameSite=Lax, Secure over HTTPS). Playback restoration waits for opening the gallery; a page visit alone does not start audio. Closing the gallery moves the controls into a compact sticky header dock with a FLIP transition while the same audio element continues playing. Hiding the dock preserves audio and points to the permanent header music icon. Reopening the gallery resumes the current track position. Music can be muted separately.

Desktop hover/focus on the gallery cover runs a silent camera/caption preview from the same timeline, beginning with the first detail scene. It uses release thumbnails, stops on leaving, respects reduced motion and does not interact with the soundtrack. Only the first two tour originals preload on opening; subsequent originals preload one scene ahead.

QA: 60 scene captions/framing at desktop 1440×1000, mobile 390×844 and reduced motion 900×800; actual audio playback and seek sync; sound preference on/off across reload; no audio before opening; track ends without restarting; zero audio pause events at drawing/orbit/return transitions and gallery close/hide/restore/reopen; sticky dock and mobile overflow; silent hover and reduced-motion fallback. WebGL shots visually reviewed at multiple timeline positions, including mobile orbit.
