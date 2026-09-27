# MT760L profile restore

Static Chrome/Edge WebHID app restricted to the Rapoo receiver `24AE:1870`, vendor collection `FF00:000E`, output report `BA` (31 payload bytes). Razer devices are rejected at selection and before every write.

This first version replays the 13 settings writes captured from A HUB restoring this user's **New default** profile on 2026-09-27. The user confirmed both media buttons worked after that native restore. It does not accept arbitrary memory writes, edit profiles, change pairing or firmware, or claim permanent onboard storage.

## Run locally

From this folder, run `python -m http.server 8766 --bind 127.0.0.1` and open `http://127.0.0.1:8766` in Chrome. Quit A HUB, connect the Rapoo, then choose **Restore profile**.

The same files can be hosted on HTTPS as a static website. Work laptop policies may block WebHID. No Rapoo software or local helper is required for the hosted app.

## Verification

Run `node check.mjs` for the receiver guard and report encoding check. A complete browser test profile changed both media buttons to next-track with A HUB fully closed, confirmed by the user on 2026-09-27. A single-button write did not change physical behavior in the earlier test; this app sends the complete captured sequence. DPI and retention after switching computers have not been verified. Device settings readback has not been verified, so the app says **Profile sent**, not **Profile verified**. There is no automatic hardware backup or rollback in this version. Keep A HUB available to restore settings if interrupted.

`A-HUB-profile-backup.json` preserves the source profile. `protocol.mjs` contains the exact captured command payloads. Profile editing, live capture and automatic readback remain unimplemented.
