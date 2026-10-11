# Xbox Remote Play touch overlay (web plan B)

A bookmarklet / userscript that runs on xbox.com Remote Play and adds the same portrait layout as the native wrapper:
stream on top (16:9), virtual Xbox gamepad underneath.

- **Gamepad**: replaces `navigator.getGamepads()` with a virtual standard-mapping pad driven by multi-touch (sticks, D-pad, face buttons, bumpers, triggers, View/Menu/Xbox/Share; tap a stick to click L3/R3). A physical pad is used when the overlay is hidden.
- **Audio**: sets `navigator.audioSession.type = 'ambient'` (Safari 16.4+) so the stream mixes with background audio such as YouTube PiP instead of interrupting it.
- The pad auto-appears once the stream `<video>` starts; the 🎮 button (top right) toggles it.

## Install (iOS Safari)
1. Open `install.html` (or copy the contents of `bookmarklet.txt`), tap **Copy bookmarklet**.
2. Bookmark any page, edit the bookmark, paste into the URL field.
3. Go to xbox.com/play, start the console stream, then run the bookmark.

Userscript users (e.g. the *Userscripts* iOS app) can install `overlay.js` directly; it has a metadata header.

`node build.js` regenerates `bookmarklet.txt` and `install.html` after editing `overlay.js`.

## Caveats
Tested only against a mock page in headless Chromium, not a live Xbox session. The site's DOM and whether the audio-session
setting is honoured by its player may differ; if the video isn't resized, the `video` CSS rule in `overlay.js` is the place to adjust.
