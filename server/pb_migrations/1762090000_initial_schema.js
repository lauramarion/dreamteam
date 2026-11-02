/// <reference path="../pb_data/types.d.ts" />

// Initial schema for the Dream Team reading tracker.
//
// readers  one row per person (no login: people pick their name on the site)
// books    one row per book read by one reader
// goals    yearly reading goal per reader
//
// Access model ("honor system"):
// - Anyone can read everything (the dashboard is public).
// - Writing needs the shared group code, checked in pb_hooks/group_code.pb.js.
//   The rules below are open ("") so that check is the only gate.
// - Deleting a reader is admin-only (rule null = superusers only).

migrate((app) => {
  const timestamps = [
    { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
  ];

  // ── readers ──────────────────────────────────────────────
  const readers = new Collection({
    type: "base",
    name: "readers",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: null,
    fields: [
      { name: "name", type: "text", required: true, min: 1, max: 40, presentable: true },
      // Accent colour as #rrggbb
      { name: "color", type: "text", required: true, pattern: "^#[0-9a-fA-F]{6}$" },
      { name: "emoji", type: "text", max: 16 },
      { name: "goodreads_url", type: "url" },
      ...timestamps,
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_readers_name ON readers (name COLLATE NOCASE)",
    ],
  });
  app.save(readers);

  // Self-relations need the collection id, so they are added after the first save.
  // invited_by:    who shared the invite link (empty for the founding members)
  // shown_readers: whose books this reader shows on the dashboard.
  //                Empty means "everyone".
  readers.fields.add(new RelationField({
    name: "invited_by",
    collectionId: readers.id,
    maxSelect: 1,
    cascadeDelete: false,
  }));
  readers.fields.add(new RelationField({
    name: "shown_readers",
    collectionId: readers.id,
    maxSelect: 999,
    cascadeDelete: false,
  }));
  app.save(readers);

  // ── books ────────────────────────────────────────────────
  const books = new Collection({
    type: "base",
    name: "books",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "reader", type: "relation", required: true, collectionId: readers.id, maxSelect: 1, cascadeDelete: false },
      { name: "title", type: "text", required: true, max: 300, presentable: true },
      { name: "author", type: "text", max: 300 },
      { name: "author_gender", type: "text", max: 40 },
      { name: "publisher", type: "text", max: 200 },
      { name: "format", type: "text", max: 60 },
      { name: "pages_total", type: "number", onlyInt: true, min: 0 },
      { name: "pages_read", type: "number", onlyInt: true, min: 0 },
      { name: "genre", type: "text", max: 80 },
      // Keywords as a JSON array of strings
      { name: "tags", type: "json", maxSize: 4000 },
      { name: "started_on", type: "date" },
      // Date the book was finished OR abandoned (DNF). Decides which year it counts for.
      { name: "ended_on", type: "date" },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["reading", "finished", "dnf"] },
      // 0.5 to 5, half stars allowed (checked in the hook)
      { name: "rating", type: "number", min: 0, max: 5 },
      { name: "review", type: "text", max: 20000 },
      // Where an imported row came from, e.g. "2026!R12". Empty for books added on the site.
      { name: "legacy_ref", type: "text", max: 40 },
      ...timestamps,
    ],
    indexes: [
      "CREATE INDEX idx_books_reader ON books (reader)",
      "CREATE INDEX idx_books_ended_on ON books (ended_on)",
      "CREATE INDEX idx_books_status ON books (status)",
    ],
  });
  app.save(books);

  // ── goals ────────────────────────────────────────────────
  const goals = new Collection({
    type: "base",
    name: "goals",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: null,
    fields: [
      { name: "reader", type: "relation", required: true, collectionId: readers.id, maxSelect: 1, cascadeDelete: true },
      { name: "year", type: "number", required: true, onlyInt: true, min: 2000, max: 2100 },
      { name: "target", type: "number", required: true, onlyInt: true, min: 1, max: 1000 },
      ...timestamps,
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_goals_reader_year ON goals (reader, year)",
    ],
  });
  app.save(goals);
}, (app) => {
  for (const name of ["goals", "books", "readers"]) {
    app.delete(app.findCollectionByNameOrId(name));
  }
});
