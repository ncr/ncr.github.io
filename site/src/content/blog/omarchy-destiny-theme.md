---
title: I Picked the Third One
date: 2026-09-26
description: Three AI agents made three music videos for my Omarchy theme in under an hour. My part was two words, and no model could have typed them for me.
draft: true
---

On Saturday evening three AI agents made three music videos for my new
Omarchy theme. Same brief, same song, no peeking at each other's work. The
fastest finished in 9 minutes, the slowest in 49. I watched all three and
typed two words: third best.

Then I watched the winner again. It opened with two seconds left over from the
previous verse before the line I wanted, "They said this day would never come."
I asked for a clean cut. The title read DESTINY in letters that looked a lot
like the game's logo and never said this was an Omarchy theme. I asked for
"destiny" and, on the next line, "omarchy theme". Each fix took an agent a few
minutes. Knowing what to fix took me one viewing.

## Forty-two machines

Destiny is a theme for [Omarchy](https://omarchy.org). Deep-space navy instead
of black, ice-white text, and accent colors named after the energies in
Bungie's game. The focused window gets an Arc-to-Void border.

<div class="destiny-palette" aria-label="The Destiny palette">
<span style="--swatch:#4cc9ff">Arc</span><span style="--swatch:#b97aff">Void</span><span style="--swatch:#ff8a3d">Solar</span><span style="--swatch:#f5c945">Exotic</span>
</div>

It also has 42 wallpapers: technical blueprints of machines from a hopeful
future. A fusion transport that gets a crew to Mars in 75 days. A lawn system
that keeps your grass 4% greener than your neighbor's, whose garden gnome, it
turns out, also has a camera. A robot that goes running with your smartwatch
while you sleep. It doesn't need a head. The watch doesn't ask.

I wanted wallpapers you can watch like fish in an aquarium. From across the
room, color and calm. Up close, a mechanism, a caption, and somebody's entire
engineering budget spent on beating the lawn next door.

## Who did what

The machines did the drawing. Every wallpaper starts as a 3D model in Blender,
gets flattened into vector lines with hidden edges removed, and is laid out in
Cairo, with text from a real font and the Omarchy logo from its original SVG.
Agents wrote all of that code, built the models, and ran the audits. Nine
days, 34 commits.

I did the deciding. The project has a production guide, 685 lines, and most of
it is things I said no to. No wallpapers straight out of an image model: we
tried, the lettering wobbled and the detail turned to mush. "An artifact from
the past" meant a document from the future, not a western, and sepia needed
its own paragraph. More lines is not more quality; empty space is part of the
design. And the running robot's knee bent the wrong way.

<div class="detail-pair detail-triptych">

<figure class="figure detail-comparison">
<p><strong>First concept · Sep 18</strong></p>
<a href="/draft-assets/destiny/proxy-before-study.svg"><img src="/draft-assets/destiny/proxy-before-study.svg" alt="Proxy, first concept: limbs made of simple blocks, joints marked with circles." width="900" height="1450" loading="lazy" /></a>
<figcaption>Blocks for limbs, circles for joints.</figcaption>
</figure>

<figure class="figure detail-comparison">
<p><strong>Midway · Sep 22</strong></p>
<a href="/draft-assets/destiny/proxy-middle-study.svg"><img src="/draft-assets/destiny/proxy-middle-study.svg" alt="Proxy, midway: rounded covers and marked joints, the legs still in the old pose." width="900" height="1450" loading="lazy" /></a>
<figcaption>Nicer covers. Same legs.</figcaption>
</figure>

<figure class="figure detail-comparison">
<p><strong>Released · Sep 25</strong></p>
<a href="/draft-assets/destiny/proxy-after-study.svg"><img src="/draft-assets/destiny/proxy-after-study.svg" alt="Proxy, released: a new running phase with the rear leg clearly bent. Close-up mirrored to match the running direction." width="900" height="1450" loading="lazy" /></a>
<figcaption>A new stride, knee the right way round. Mirrored to compare.</figcaption>
</figure>

</div>

None of these is a hard problem for a model. Each one is a choice. A model will
happily draw a hundred more gears. Somebody has to notice that the wallpaper
just got worse.

## Throwing things away

Before the three videos there was a first one: a five-minute film rendered
live in the browser, laser pens drawing every machine in time with the bass.
Two agents spent 17 hours and about 20 commits on it. It worked. I asked for
three new ones anyway, from scratch, with the old code off limits. The one at
the top of this page is the third.

Intelligence is getting cheap, maybe unlimited. What to make, what to add,
what to cut, how it should look, where to go next: none of that got any
cheaper. People who count p(doom) see that as the problem. I see a job, and
it's the fun one.

Three videos, two words. I picked the third one.

`p(bloom) > p(doom)`

<hr />

<p class="fan-note"><small><strong>Fan project.</strong> Destiny and its world belong to Bungie. The theme's name, the energy colors and the mood of the sheets are a fan's homage; the drawings, machines and texts are original, made for this project, with no art, logos or other material from the game. Not affiliated with or endorsed by Bungie. I hope they don't mind. Music: <a href="https://x.com/koozeex1">Kevin Koontz</a>, <a href="https://x.com/koozeex1/status/2096140707329368181">"We Can Fix Everything"</a>.</small></p>
