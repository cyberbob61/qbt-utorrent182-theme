# qBittorrent → µTorrent 1.8.2 look

A UI theme for the **qBittorrent 5.x desktop app** (Windows) that makes it look like the classic µTorrent 1.8.2:
light Win32 look, compact menu and toolbar, thin "Done" progress bars, black list text, solid blue selection,
a category panel without section captions, and µTorrent's column order.

Tested with qBittorrent 5.2.4 x64 on Windows 11.

## What is in here

| File | What it does |
| --- | --- |
| `config.json` | Light palette and colors (black list text, pieces bar, progress bar) |
| `stylesheet.qss` | Compact menu/toolbar/rows, thin progress bars, tab strip, captionless filter panel |
| `tools/apply-settings.js` | Sets the qBittorrent options the theme depends on, including the column order |
| `icons/` | **Not included**, see [Icons](#icons) |

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

## Icons

µTorrent's icons belong to BitTorrent, Inc., so they are not in this repository. Without icons the theme still works
and qBittorrent shows its own icons.

To use your own, put PNG files (any size, 32×32 recommended) into `icons/`, named after the qBittorrent icon ids:

| Where | Icon ids |
| --- | --- |
| Toolbar | `list-add`, `insert-link`, `list-remove`, `torrent-start`, `torrent-stop`, `go-top`, `go-up`, `go-down`, `go-bottom`, `torrent-creator`, `configure` |
| Torrent states / status filters | `downloading`, `stalledDL`, `upload`, `stalledUP`, `stopped`, `checked-completed`, `force-recheck`, `queued`, `error`, `filter-all`, `filter-active`, `filter-inactive`, `filter-stalled` |
| Detail tabs | `help-about` (General), `trackers`, `peers`, `network-server` (HTTP Sources), `directory` (Content), `chart-line` (Speed) |
| Categories | `view-categories` (a transparent PNG gives µTorrent's icon-less labels) |

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
