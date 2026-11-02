/// <reference path="../pb_data/types.d.ts" />

// Data checks the field settings can't express on their own.

onRecordValidate((e) => {
  const b = e.record;

  // Ratings go by half stars: 0.5, 1, 1.5 … 5 (0 / empty = not rated)
  const rating = b.getFloat("rating");
  if (rating && (rating < 0.5 || Math.round(rating * 2) !== rating * 2)) {
    throw new BadRequestError("La note doit aller de 0,5 à 5, par demi-étoiles.");
  }

  // A finished book has read all its pages
  if (b.getString("status") === "finished") {
    const total = b.getInt("pages_total");
    if (total > 0 && b.getInt("pages_read") < total) b.set("pages_read", total);
  }

  // Ending can't come before starting
  const start = b.getDateTime("started_on");
  const end = b.getDateTime("ended_on");
  if (!start.isZero() && !end.isZero() && end.before(start)) {
    throw new BadRequestError("La date de fin est avant la date de début.");
  }

  e.next();
}, "books");
