/// <reference path="../pb_data/types.d.ts" />

// When someone joins through an invite link (invited_by is set):
// - the newcomer is added to the inviter's shown_readers, so the inviter
//   sees them straight away;
// - the newcomer starts out showing themself and their inviter.
// Everyone else only sees the newcomer once they tick them in the
// show/hide widget, unless their shown_readers is empty ("show everyone").

onRecordAfterCreateSuccess((e) => {
  const reader = e.record;
  const inviterId = reader.getString("invited_by");

  if (inviterId) {
    const inviter = e.app.findRecordById("readers", inviterId);
    const shown = inviter.getStringSlice("shown_readers");
    // An empty list already means "everyone", so only extend explicit lists.
    if (shown.length > 0 && !shown.includes(reader.id)) {
      inviter.set("shown_readers", [...shown, reader.id]);
      e.app.save(inviter);
    }

    if (reader.getStringSlice("shown_readers").length === 0) {
      reader.set("shown_readers", [reader.id, inviterId]);
      e.app.save(reader);
    }
  }

  e.next();
}, "readers");
