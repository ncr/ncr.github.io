---
title: I reverse engineered my headphones
date: 2026-08-21
description: All I wanted was battery levels in my desktop bar. Two brands and two undocumented protocols later, I got them.
draft: true
---

All I wanted was earbud battery levels in my desktop bar. Linux showed one number,
and it was wrong: BlueZ said 20% while the earbuds were about to die. Over the
hands-free profile a battery level is a digit from 0 to 9, and my JBL TUNE230NC
rounds it optimistically.

The real numbers — left, right, case — travel over the Google Fast Pair Message
Stream. That one is actually documented: a public Google spec, an RFCOMM channel,
and BlueZ hands you the socket if you register as a profile. Battery solved.

Then I wanted the noise-cancelling modes, and the documented part ended.

The JBL app talks to a vendor RFCOMM channel, so I replayed its commands there.
The earbuds answered every single one with the same one-byte refusal. Wrong
transport: the modes live on the BLE side, in a GATT service whose 128-bit UUID,
read as ASCII, spells `excelpoint.com` — the chip vendor left their domain in the
UUID. Best documentation I found. Frames there are `AA <cmd> <len> <payload>`, no
sequence numbers, no checksum. Slot 1 is ANC, slot 2 Ambient Aware, slot 3
TalkThru. TalkThru is settable but missing from the touch-control cycle, so the
plugin can reach a mode the earbuds themselves can't.

One catch: the BLE address is a resolvable private address and rotates, so nothing
can be hard-coded. You get the current address by asking… the Fast Pair stream on
the classic side. The two protocols reference each other whether Google and the
chip vendor planned it or not.

Then I paired my Sony WH-CH720N and entered a different civilization. Sony MDR
protocol v2 over RFCOMM: framed, escaped, checksummed, and every frame must be
ACKed — where the ACK carries `1 - seq`, a sequence number that just alternates
between 0 and 1. Two open-source projects disagreed about which "inquired type"
this model uses for noise cancelling, because both were extrapolating from other
headphones. A probe against the actual hardware settled it: `0x17`. Gadgetbridge
uses `0x15` for this model, which the headphones politely ACK and then ignore, so
setting a mode silently does nothing.

My favorite trap: after you set a mode, the headphones ACK it — and if you
immediately read the state back, you get the *old* one. The truth arrives about
300 ms later as an unsolicited notification. Trust the notification, never the
readback.

All of it ended up in [Omaphones](https://github.com/ncr/omarchy-headphones), a
plugin for the Omarchy bar: battery per earbud, listening modes, two brands, two
completely different protocols pretending to be one dropdown menu.
