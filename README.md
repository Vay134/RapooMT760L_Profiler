# MT760L Profiler

[Open the app](https://vay134.github.io/RapooMT760L_Profiler/).

A static Chrome/Edge WebHID settings editor for the Rapoo MT760L over its 2.4 GHz receiver (24AE:1870).

## Use

Quit A HUB, connect the receiver, and select a profile or edit settings. **Apply to mouse** sends the displayed profile once. **Export profile** saves a JSON file; **Import profile** loads an exported JSON file into the editor without writing to the mouse. The built-in **Load default profile** preset is always available and cannot be overwritten.

Supported controls: up to seven DPI levels (50–4000 in steps of 50), active DPI level, polling rate (125/250/500/1000 Hz), all eleven button/wheel assignments, mouse actions, keyboard keys, media/system actions and custom modifier + key shortcuts. Version 1 exports are migrated while preserving their original wire mappings. Macros support 16 mouse slots, keyboard recording, editable keyboard/mouse events, relative pointer moves, scroll events, delays, repeat counts, toggle playback and playback while held. Macro events are included in profile exports. Applying overwrites only the macro slots included in the profile. A HUB JSON imports are not implemented.

Windows pointer speed, Windows scroll speed and M+ cross-device features depend on Windows software; a static WebHID page cannot configure them.

## Device reads and persistence

The editor initially shows the built-in preset, not a claimed device backup. On connection it requests status; if interrupt report BB arrives, current DPI is shown separately. A HUB reads full configuration through Windows HidD_GetInputReport control transfers; WebHID does not provide that operation. Full button/polling configuration has not been read successfully in Chrome, so imported or edited settings remain the source of the displayed profile. Applying sends commands without verified readback. Test the mouse after applying; retention after switching computers remains unverified.

## Protocol evidence

The preset replays the original 13 captured A HUB writes. Its DPI block at 0x638 starts with 20 (1000 DPI / 50). A later 2000 DPI capture starts with 40. The final byte 3 in this block is preserved, not interpreted as polling rate.

Polling interval is encoded at 0x630: 1 = 1000 Hz, 2 = 500 Hz, 4 = 250 Hz, 8 = 125 Hz. All four were captured while changing A HUB settings. Profile-download writes preserve trailing bytes FF FF; direct polling changes used 01 00. A HUB's JSON returnRate enum uses a different numbering scheme.

Button encodings and wheel directions come from captures and inspection of A HUB's encoder. The DPI encoder stores seven little-endian DPI/50 values, level count minus one at byte 14 and active index at byte 16. Captured flags at bytes 17–19 are preserved. Multiple DPI levels have not yet been physically confirmed. Profile imports are validated and compiled only to fixed configuration addresses and the 16 macro memory slots; raw commands cannot be imported. A left-click assignment is required. Files are processed in the browser and never uploaded.

`A-HUB-profile-backup.json` preserves the original source preset. `protocol.mjs` defines the built-in profile and encodings. Run `node check.mjs` for validation, round-trip and captured-byte checks.

## Local development

Run `python -m http.server 8766 --bind 127.0.0.1` in this folder and open `http://127.0.0.1:8766`. HTTPS static hosting also works. Workplace browser policies may block WebHID.

Macro encoding was checked against an A HUB Shift+A capture: a four-byte length/playback header followed by three-byte key events (delay times two plus press flag, key code). The captured slot-zero button assignment is `05 00 00 00`. Slot indexing, movement/scroll encoding and playback flags were inspected in the vendor encoder. Macro writes use chunks of up to 24 bytes. Physical playback from the website has not yet been confirmed.
