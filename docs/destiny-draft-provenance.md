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

## Wireframe, ambient loops and music analysis

Latest author direction supersedes the earlier solid nozzle treatment: all ship detail geometry now renders as linework, without metallic surfaces. Opening construction runs at 0–8.18s, starting with the whole ship and a faint complete guide silhouette before moving into a wider radiator flight. The later nozzle orbit remains at 1:56–2:06. Gentle camera roll is under one degree in sheet views and a few degrees during spatial flight; reduced motion remains static.

All 42 sheets have a separate silent 24-second ink-light loop. The overlay extracts actual bright ink from the original release thumbnail and masks local breathing/travelling light to it; no image content, labels or machine geometry are warped. This is artistic light, not a physical simulation or a rotation of painted machinery. Renderer and per-sheet profiles are portable and also saved in the theme project under tools/ambient, with a standalone viewer and deterministic MP4 exporter. A Fusion example was exported at 1920×810, 24fps, 24 seconds, without audio. Desktop integration awaits an actual supported Omarchy playback interface.

With music enabled, the same lines become a real visualizer: one Web Audio MediaElementSource/AnalyserNode reads the existing continuous player, FFT 1024 with smoothed bass (35–180Hz), midrange (180–2200Hz) and treble (2200–12000Hz). Local ink brightness and 3D line opacity follow measured bands; the music-card meter uses those measurements too. No separate soundtrack, simulated spectrum or new audio requests are used. Without audible music, the quiet standalone loop remains. No microphone access.

QA: all 42 overlays produced visible temporal changes; frame alpha differs by at most 1 at the 24-second seam. Whole-ship opening and wireframe orbit visually inspected. Actual MP3 produced varying measured band energy; audio remained continuous through dock/hide/reopen transitions. Earlier screenshot review caught and corrected scoped-CSS specificity that had reduced music title/button prominence after reparenting.

Drawing refinement: replace the extruded tube mesh with progressive line strokes, following the author’s many-pens reference. Rejoin only exact matching endpoints within the same named part and only unambiguous degree-two junctions: 1,483 input paths become 735 continuous strokes with unchanged total line length. Sixteen coordinated pen tracks draw long contours first and small details later, lifting across disconnected paths; the camera-followed radiator line has its own leading tip. No lines are invented across occlusion gaps. A faint whole-ship guide retains context while strokes gain brightness. Source paths remain archived in fusion-paths.json; current rendering reads fusion-strokes.json.

## Laser-led drawing score (current, supersedes opening-only construction)

The drawing is now the main motif: 43 passages covering all 42 devices, 226.11 of the track's 299.21 seconds (including short blends), separated by full-sheet/ambient moments and the existing real-nozzle wireframe orbit. The score in `site/src/data/drawing-score.json` uses the existing musical cut times. Six camera movement families follow different real contours and orientations; each passage establishes the silhouette, approaches the geometry, and pulls back. Proxy captions during construction now describe the visible robot, rather than off-screen bedroom/watch insets. Dinner/dog/gnome shots remain original-image details; Truth Lamp construction only appears during its pendant-reflector shot.

`tools/export-drawing-strokes.py` reads the frozen wallpaper release f4a51dd directly through Git. Per-sheet provenance and SHA-256 are in `site/public/gallery/destiny/drawing/manifest.json`. These 42 JSON assets total about 4.95 MB, fetched individually as needed, with the next passage prefetched six seconds ahead and no more than six drawing geometries retained on the GPU. They use original visible projected paths, not raster edge tracing. Endpoints are rounded to .01 source units, only unambiguous degree-two junctions within the same named part/role are stitched, total line length is checked before simplification, and curves are simplified with .035 source-unit tolerance. Coordinates are centered/scaled with aspect ratio preserved. Paper colour is sampled from each existing release thumbnail. No release wallpaper or historical comparison image changes.

Fourteen pen lanes build the surrounding detail; six long contours from distinct named parts receive slower, staggered laser leads. A bright small core/halo follows each active lead, with a short ignition burst and a fading deterministic particle trail along that same path. Particles use analytic time/seed positions, so scrubbing reproduces the same frame, without accumulated emitter state. Measured treble affects sparks; bass affects ink brightness. No full-screen flashes, new audio source, or audio-clock reset. These are projected drawings separated into shallow layers, not inferred hidden 3D geometry; the nozzle orbit still uses the actual 3D source mesh exclusively as wireframe.

QA: Astro production build; all 43 passages and geometry IDs through the actual seek control; eviction/reload while paused; deterministic same-time canvas; effects toggle, mobile layout, reduced-motion change, missing-asset fallback; desktop/mobile frames visually inspected. Music FFT and dock/hide/mute regression checked; natural transitions across 28.11, 51.78, 116.38 and 126.65 seconds produced zero audio pause events and the audio clock continued advancing. Normal blog route, feeds and listings continue to exclude this draft. Browser smoke test: `python3 tools/check-drawing-tour.py` after build, optionally with the deployed preview URL.

## Registered drawing-to-wallpaper dissolve

The drawing no longer fades from an independently centered/framed device to a differently framed photograph. Each vector asset now records its exact center and scale in the frozen f4a51dd Cairo composition's 2560 × 1080 design coordinates. During the final 1.5–2.3 seconds of a passage, the projected linework and laser tips settle into that placement using the wallpaper camera's actual responsive scale, translation and roll. The remaining approximately 0.6–1 second dissolves the registered drawing into the original wallpaper, with a maximum .65 CSS-pixel focus softening to blend ink/antialiasing differences. Alignment is complete before appreciable opacity loss; time-based easing makes seeking deterministic. ResizeObserver also recalculates a paused frame on viewport/fullscreen changes.

Proxy, Presence Rig and Volumetric Stage now use the exact final main-scene assets from the same release commit, superseding the earlier mannequin/older hardware projections. Truth Lamp uses only the named pendant components from the actual final dinner scene; its position/scale are derived from the whole scene bounds. The export script and per-asset manifest record these source changes. No wallpaper raster or historical comparison is modified. Versioned vector requests prevent mixing the new shader with stale pre-registration JSON.

QA: production build, all 43 registered handoffs (fully aligned at the middle of the dissolve), seeking/reload/toggle/reduced-motion/fallback regression; desktop and mobile visual inspection of the opening ship, Quantum, Proxy and pendant transitions. Audio element and soundtrack clock are unchanged.

## Close pen following, moving dissolve, and time to look

Each of the 43 drawing passages now reserves three explicit phases within the unchanged 299.21-second soundtrack: close tracking of one active laser contour, a retreat with the registered dissolve happening during motion, and a clean overview held for 1.60–2.65 seconds. The hold is genuinely part of the score, not merely the last blended frame. Four subsequent sheet/detail shots use intentional cuts so they cannot restart an old close crop after the overview.

The principal pen has its own start/end clock shared by the fragment shader, laser head, trailing particles and camera target. Its line continues growing while the camera follows, instead of the camera following a contour that has already finished. Surrounding coordinated pens and measured-audio reactivity remain in place.

`camera-operator.js` integrates a damped second-order position rig and a separately damped gaze at a fixed 90 Hz. It tracks the real nib with a small look-ahead, position lag, seeded low-frequency sway, breathing and bank corrections. The resulting motion is cached and sampled by soundtrack time, so seeking remains deterministic. Distance, side offset, chosen contour and motion seed differ among devices. It simulates a human operator's small imperfections; it is not recorded camera motion. The former six pre-authored spatial flight formulas are superseded by this contour-driven rig.

Both live and baked layers continue zooming out together during their overlap. Registration completes early in the retreat, the dissolve completes before the retreat ends, and the fully revealed wallpaper then remains framed as a whole. The original full-track timing, nozzle wireframe interlude, silent ambient loops, audio element, reduced-motion fallback and unlisted draft status remain unchanged. `tools/score-camera-passages.py` reproduces the phase budgets and native-image framing from registered geometry.

QA: production build; all 43 close views checked for an active principal pen, close camera distance and nib position near the image center; outgoing native scale decreases during every dissolve; every passage reserves at least 1.59 seconds of fully revealed overview; deterministic seeking, cold asset reload, reduced motion, missing-asset fallback and effects toggle. Close tracking, mid-retreat blends and held overviews visually inspected on desktop/mobile.

## Spectrum particles, scene dissolves and offline film preparation

The laser now emits 48 analytic sparks on each of six leading pen lanes, plus 20 pen heads. Sixteen logarithmic frequency ranges from the actual persistent soundtrack (40 Hz–14 kHz, FFT 1024, sampled at 30 Hz) drive their fan width, brightness and size. Warm low-frequency sparks grade into cool high-frequency sparks. Attack/release smoothing prevents noisy flicker. The shader samples the real pen position at each spark's emission time; there is no CPU particle simulation or per-frame vertex-buffer upload. Silent playback retains a much quieter trail.

All 50 discontinuous scene changes now preserve the outgoing wallpaper at its exact final framing and dissolve it over the incoming moving shot for up to .85 seconds. Same-device close-crop cuts are included. The drawing-to-baked-image handoff still registers and dissolves during the retreat, followed by the existing 1.6–2.65-second overview hold. Captions fade at their boundaries. The audio element and 299.21-second master clock are unchanged.

Preparation is reproducible, after installing the site's existing dependencies:

1. `python3 tools/score-camera-passages.py` when editing passage timings/framing.
2. `node tools/prepare-film.mjs` after changing the drawing score, camera operator, source vectors or nozzle. It writes binary geometry, 90 Hz camera tracks, 60 Hz pen-position texture tables and the merged nozzle edge geometry to `site/public/gallery/destiny/film-data/`. All 42 per-device geometry/track files together are 15.57 MiB, fetched on demand, never all at startup. Camera distance is stored relative to viewport fit; mobile and desktop use the same precomputed movement.
3. `python3 tools/prepare-film-images.py` after changing release image inputs. This needs Pillow and NumPy. It prepares 2560×1080 WebP film derivatives (about 4.5 MiB total for 42 sheets) and 1280×540 ink masks. Full 5120×2160 originals remain unchanged and available in free browsing/downloads.
4. Run the normal Astro production build. Generated assets are committed, so Pages needs no Python, NumPy, Blender or extra build step.

At playback, binary typed-array views replace JSON stroke sorting and camera spring integration. A float texture supplies pen positions to the GPU. The nozzle's 56 edge objects become one draw call. Upcoming geometry is prepared up to nine seconds ahead; shader compilation and GPU upload run ahead of its cut via idle scheduling and a tiny offscreen target. At most six device geometries and five decoded film images are retained. Prepared masks replace full-image pixel readback/blur/extraction. Ambient rendering stops behind opaque drawing, and WebGL rendering stops during the fully revealed overview hold. Viewport dimensions come from ResizeObserver rather than layout reads each frame.

QA: `tools/check-drawing-tour.py` checks all 43 close follows, registration/retreat/hold, deterministic seeking, evicted assets, mobile/reduced motion, effects toggle and missing binary fallback. `tools/check-film-transitions.py` checks all 50 cut dissolves, real 16-band MP3 output, zero audio pause events across multiple device/orbit boundaries and close/hide/reopen, spectral influence at fixed camera/time, mobile layout and return from free browsing. Desktop/mobile frames were inspected, including intermediate blends and particles. An 11-second warmed Chromium software-GL sample crossing a device cut recorded 1,517 animation callbacks: median .10 ms, p95 .20 ms, maximum 1.10 ms, no main-thread long tasks. These are callback CPU costs in this test environment, not a guarantee of GPU frame rate or cold-start/network performance on every device.

## Six independent radiator voices

The Fusion Transport's parallel liquid-tin streams `.024`, `.027`, `.030`, `.033`, `.036`, `.039` now carry six simultaneous laser voices. These are the authentic release contours, selected offline from the existing vector asset; no new geometry is invented. The camera still follows the original middle contour. Their starts are staggered by 65 ms per voice and all finish before the existing registered retreat. The duplicate original pen on the middle line is suppressed.

Each voice receives one disjoint group of the existing 16 FFT ranges: 0–2, 3–5, 6–8, 9–11, 12–13, 14–15. Lower voices use warm amber, broader glows and slower spark decay; higher voices use cooler cyan, smaller glows and quicker decay. Head brightness/size, the freshly drawn tip and that voice's sparks follow only its assigned group. Spectrum smoothing gives the bass a longer release and treble a faster response. No synthetic beat, new audio node or soundtrack interruption is introduced. Silent mode keeps the six pens subdued.

Six extra rows in Fusion's precomputed pen texture add about 109 KiB to that device's binary. The other 41 device binaries are unchanged. GPU particles use the same single points draw; camera integration and stroke lookup stay offline. `tools/check-laser-voices.py` injects isolated test bands at a fixed camera/time and checks pixel changes around all six heads: each assigned head responds strongly while unrelated heads remain unchanged apart from occasional crossing sparks. All 43 camera/dissolve/hold regression checks pass; desktop and mobile six-voice frames inspected.

## Bass-triggered bursts and moving overviews

Continuous particle recycling is removed. Sparks now start in short, irregular groups on low-frequency attacks from the exact soundtrack, then disappear completely between attacks. Their count, speed, size and decay vary with attack strength; two recent bursts can overlap, with no particle simulation or persistent emitter state. The six laser heads retain their independent frequency-band lighting, but all particle launches follow the bass. With sound off there are no music-triggered particles; quiet parts of the recording also stay quiet visually.

`python3 tools/prepare-bass-beats.py /path/to/kevin_koontz-we_can_fix_everything.mp3` prepares `site/src/data/bass-beats.json`. The source URL and SHA-256 are recorded there. ffmpeg isolates 35–150 Hz; NumPy measures 20 ms RMS and positive 30 ms energy rises with an adaptive threshold and 320 ms peak suppression. This yields 520 measured attacks, not a fabricated metronome or a claim of perfect musicological beat annotation. Only timestamps/strengths ship with the page; the recording remains at its existing official source. Playback uses a binary timestamp lookup against the existing soundtrack clock and analytic GPU trajectories. No extra audio graph or live onset analysis.

The whole-sheet view after each registered dissolve now continues retreating by about 3% over its existing viewing interval, with eased endpoints. Other full-sheet shots use a slow asymptotic retreat that continues throughout the shot. Their final pose feeds the existing crossfade, so the next image does not reset the outgoing framing. Reduced motion remains static; the full composition stays visible.

QA: all 43 drawing/registration/overview sequences including monotonic overview zoom-out; 50 cut dissolves, real MP3 continuity and unchanged 16-band head response; pixel comparison verifies particles on an attack and exactly zero particle change in a genuine inter-attack gap. Deterministic seeking and static reduced-motion overview verified. Desktop/mobile burst and overview frames inspected. An 11-second warmed software-GL playback sample had no main-thread long tasks and maximum animation callback cost .90 ms; this is not a device FPS guarantee. Tests: `tools/check-bass-bursts.py`, `tools/check-drawing-tour.py`, `tools/check-film-transitions.py`.
