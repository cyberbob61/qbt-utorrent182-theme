# qBittorrent → µTorrent 1.8.2 look

A UI theme for the **qBittorrent 5.x desktop app** (Windows) that makes it look like the classic µTorrent 1.8.2:
light Win32 look, compact menu and toolbar, thin "Done" progress bars, black list text, solid blue selection,
a category panel without section captions, and µTorrent's column order. qBittorrent's own icons are kept.

Tested with qBittorrent 5.2.4 x64 on Windows 11.

## What is in here

| File | What it does |
| --- | --- |
| `config.json` | Light palette and colors (black list text, pieces bar, progress bar) |
| `stylesheet.qss` | Compact menu/toolbar/rows, thin progress bars, tab strip, captionless filter panel |
| `tools/apply-settings.js` | Sets the qBittorrent options the theme depends on, including the column order |

## Install

1. Clone or download this repository somewhere permanent, e.g. `%APPDATA%\qBittorrent\themes\utorrent182`.
2. **Close qBittorrent** (it rewrites its settings on exit).
3. Run (needs [Node.js](https://nodejs.org)):

   ```bat
   node tools\apply-settings.js
   ```

   It backs up `%APPDATA%\qBittorrent\qBittorrent.ini` next to it, then sets:

   - Options → Behavior: style `windowsvista`, color scheme `Light`, custom UI theme = this folder's `config.json`
   - no alternating row colors
   - "Auto hide zero status filters" on; Tags / Trackers groups collapsed
   - transfer list columns in µTorrent order: Name, #, Size, Done, Status, Seeds, Peers, Down Speed, Up Speed,
     ETA, Uploaded, Ratio, Avail., Label (Category), Added On, Completed On

   If you prefer to do it by hand, set the theme and style in Options → Behavior and arrange the columns yourself.
4. Start qBittorrent.

To undo: in Options → Behavior untick "Use custom UI Theme" and pick your old style, or restore the `.bak-*` ini copy.

## Notes and limits

- List icons are set to 9 px in `stylesheet.qss`, which is 16 physical pixels at 175 % Windows scaling, the size
  µTorrent draws them. Use 16 px at 100 %, 12 px at 125 %, 11 px at 150 %.
- The torrent list row height cannot go below qBittorrent's built-in minimum; a theme cannot change it.
- Hiding the STATUS / CATEGORIES captions also hides the Tags and Trackers groups. To get them back, set
  `TagFilterState` / `trackerFilterState` to `true` under `[TransferListFilters]` in the ini.
- Window title, menu names (Edit/View/Tools), the Transfers/RSS tabs and the extra status filters
  (Running, Stalled, ...) are hard-coded in qBittorrent and stay as they are.
- The column layout is stored by qBittorrent in a binary Qt format; `apply-settings.js` refuses to touch it unless
  it can read and re-write it byte-for-byte.
