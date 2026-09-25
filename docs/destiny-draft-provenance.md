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
Btop screenshots: real Wayland captures, 1920×1080, losslessly converted to WebP, no metrics edited. Controlled 100-second test: 14 CPU workers, CUDA compute loop, TCP loopback transfer on lo. First frame CPU 87%, GPU 97%; second CPU 69%, GPU 97%. RAM reflects existing machine use, not a synthetic memory test. Theme read from active btop current.theme and project colors.toml. Notifications hidden for capture; original settings restored.
