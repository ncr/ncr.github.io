---
title: An Inventory of 167 Desks
date: 2026-09-02
description: Two strangers wrote the same treadmill button for the same bar. Nineteen days of the Omarchy plugin marketplace as evidence that the malleable computer includes hardware.
draft: false
---

Two people wanted a button in the top bar that starts their treadmill.

<aside>
The under-desk kind: a flat treadmill slides beneath a standing desk and you walk slowly while you work. 10,000 steps burns over 400 kcal.
</aside>

They own the same treadmill, a KingSmith WalkingPad, and run the same desktop, Omarchy. Each wrote a plugin that talks to the pad over Bluetooth LE, skips the vendor app, and shows steps and speed next to the clock. They didn't know about each other. When the second guy found out, he added a note to his README: "Go and try it as well. There are ideas in it worth learning from, and some may well find their way here."

<aside>
The two plugins: <a href="https://github.com/msegoviadev/omarchy-walkingpad">WalkingPad</a> by msegoviadev and <a href="https://github.com/shllg/omarchy-walkingpad-control">WalkingPad Control</a> by shllg — the second one has the README note.
</aside>

Nobody waited for KingSmith to ship Linux support. They just added their treadmill to their computer.

I could end the post here, but I got curious: how many stories like this are hiding in the plugin list?

## The numbers

The plugin marketplace is itself a community project — one person put it up on July 28, 2026, before Omarchy Quattro even shipped on August 14. Nineteen days after Quattro: 2,105 plugins, 167 in the Hardware category.

- **17 headphone plugins.** Sony XM4. Sennheiser Momentum 4 (two of them). Bowers & Wilkins. Shokz. Nothing Ear (two). Galaxy Buds. Pixel Buds (two). Huawei FreeBuds. AirPods (two). One of them is [mine](https://github.com/ncr/omarchy-headphones).
- **Fan control, one laptop at a time.** Mac T2. MacBook Pro. Framework. MSI GP66. ASUS G14. Lenovo Legion. Acer.
- **Everything else.** Two Bambu Lab plugins, two OctoPrint. Flipper Zero. Kinesis Advantage 360. ZSA Voyager (twice). A drawing tablet. Magic Mouse battery. Elgato Key Lights (three times). Dyson, Govee, WiZ, Tapo, Ring, Reolink, an air conditioner, a UPS, LTE modems, Thunderbolt docks, YubiKeys, phone mirroring for Android and iPhone.

There's no "headphones plugin" on that list. 17 people wrote a plugin for their headphones, and seven people wrote fan control for seven laptops.

## Why headphones

Headphones are the best example of why this couldn't have come from a vendor, a distro, or a standard.

Headphones talk Bluetooth Classic, not BLE, and Classic gives you audio and media keys. It has no idea about ANC mode, per-bud battery or in-ear detection.

That's a bit surprising, because the spec has standard characteristics for exactly this kind of thing. BLE has a Battery Service and a Fitness Machine Service (FTMS) for treadmills. If a device uses them, there's nothing to write: you read a number from a known address. That's why so many BLE gadgets get Linux support in an afternoon.

Headphones don't get that: the Classic profiles (A2DP, HFP, AVRCP) have no place for a second battery, let alone ANC. Nobody standardised it, so every vendor made their own protocol: Apple has the Apple Accessory Protocol, Sony has its own, Samsung, JBL and Nothing all different. BlueZ knows none of them. On Linux your expensive headphones always did the bare minimum: they carried sound.

The WalkingPad is BLE and could have used the Fitness Machine Service. KingSmith went custom, so both plugins are reverse-engineered. My treadmill is a Urevo SpaceWalk 3S, neither plugin talks to it, so I wrote a third one, [omarchy-spacewalk](https://github.com/ncr/omarchy-spacewalk), and there the standard mostly worked: speed, distance, incline and the belt itself are plain FTMS, read and written where the spec says. Only the step counter needed a dig through Urevo's own characteristics.

<div class="figure">
  <img src="/spacewalk-light.webp" data-light="/spacewalk-light.webp" data-dark="/spacewalk-dark.webp" alt="The Omarchy bar with the Spacewalk step counter pill and its panel open: today's numbers, a history grid, speed and incline controls" loading="lazy">
</div>

In those nineteen days:

- Someone reverse-engineered Apple's protocol into a single Python file with no dependencies. AirPods now show per-pod battery, Transparency, Adaptive, Conversation Awareness, and pause the music when you pull one out.
- Someone else did AirPods again, independently, with a different daemon and a rule that the panel only shows the modes your particular model actually has.
- I had JBLs and Sonys and wanted them and my computer to get along: battery in the bar, noise cancelling one click away. So my [Omaphones](https://github.com/ncr/omarchy-headphones) speaks six protocols and picks the right one for whatever's connected. I only own the two; Samsung, Soundcore, Xiaomi and more Sonys arrived as pull requests — *nine* merged in the first 13 days. Yours missing? The README says how to add them.

The AirPods plugins go deep on one device. Omaphones goes wide, one pull request at a time. Nobody has more than their own headphones, but if you multiply that by enough users, every model ends up covered.

<div class="figure">
  <img src="/omaphones-light.webp" data-light="/omaphones-light.webp" data-dark="/omaphones-dark.webp" alt="Omaphones plugin in the Omarchy bar: per-earbud battery and listening modes" loading="lazy">
</div>

## The third option

Omarchy Quattro runs the whole desktop as one Quickshell process, and nearly everything in it is a plugin: the bar, the panels, the lock screen. Yours go in `~/.config/omarchy/plugins/` and load like the built-in ones. So adding your treadmill to the bar takes one QML file and a script. 167 people did it in under three weeks, for hardware DHH has never heard of.

<aside>
How plugins load, the manifest, hot reload: <a href="https://omarchy.org/manual/shell-plugins/">Shell Plugins</a> in the Omarchy manual.
</aside>

With hardware there were always two options: the vendor writes the driver, or you don't have one.

Those 167 plugins are the third option: you write it yourself, for the exact thing on your desk — a treadmill, an MSI GP66 with loud fans — and its icon shows up in the bar next to the built-in ones, looking like it was always there.

My bar shows my headphones and my treadmill. Whatever's on your desk is one QML file away.

Open the [Hardware category](https://plugins.omarchy.org/?category=Hardware) and you're reading an inventory of 167 desks.
