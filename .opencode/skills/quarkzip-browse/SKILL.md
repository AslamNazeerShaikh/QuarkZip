---
name: quarkzip-browse
description: The archive browsing model for QuarkZip: entries, trees, virtualized lists, selection, sorting, filtering, nested archives, and drag out. Use when building or changing the browser, sidebar, inspector, extraction selection, or archive navigation.
---

# Browsing archives

macOS has no built-in archive browser. QuarkZip's reason to exist is a fast,
beautiful one.

## Model

- `ArchiveEntry` is a value type: id, path, name, kind, sizes, dates, CRC,
  method, encryption flag, attributes, and a parent id.
- `ArchiveTree` builds folders from flat entry paths once, in `QuarkZipKit`,
  in O(n) with a dictionary. Views never rebuild the tree per row.
- The current folder is a path, not an index into a mutable array. The
  breadcrumb derives from it. Back and forward keep a history stack.
- Selection is a `Set<EntryID>`. Actions resolve the selection to entries
  again before running, so a stale row can never act on the wrong file.
- Sorting and filtering are pure functions in the kit and are tested with
  table tests.

## List

- Use a virtualized table (`Table` or `NSTableView` bridge) for large
  archives. A 200k-entry archive must scroll without allocating 200k views.
- Enumerate in batches of 2,000 from the engine. Show the first batch in under
  100 ms, then append. The status bar shows "12,340 of 84,102".
- Row height is fixed. Column widths persist per format-independent id.
- Size, packed size, ratio, and dates use monospaced digits.

## Nested archives

- Opening an entry that is itself an archive extracts that one entry to the
  app cache and opens it as a child session.
- The breadcrumb shows `outer.zip > inner.7z`. Closing a child deletes its
  temp copy.
- Depth is unlimited but each level costs a temp copy. Warn above 3 levels in
  the inspector, do not block.

## Drag and drop

- Dropping files or folders on the window starts the compress flow with those
  items.
- Dragging selected entries out extracts them to a temp folder and vends file
  promises, so Finder copy works. Clean up after the drag session.
- Dropping onto a folder row inside the archive targets that folder.

## Keyboard

Arrows move. Return opens the selected folder or archive. Command-Up goes to
the parent. Space previews. Command-A selects all. Delete asks to remove the
entry from the archive when the format supports writing, otherwise it is
disabled.

Done when the archive opens, the tree and list agree, selection survives
sorting, and a 100k-entry fixture scrolls at 60 fps.
