// Shared helpers for the hooks in this folder.
// PocketBase runs each hook handler in its own isolated scope, so helpers
// must be loaded inside the handler with require(`${__hooks}/utils.js`).

module.exports = {
  // Rejects the request unless it carries the right group code
  // (or comes from an admin logged into the admin screen).
  requireGroupCode(e) {
    if (e.hasSuperuserAuth()) return;

    const expected = $os.getenv("DT_GROUP_CODE");
    if (!expected) {
      // Fail closed: if the server was started without a code, nobody can write.
      throw new ForbiddenError("Le serveur n'a pas de code de groupe configuré.");
    }

    // Header names come lower-cased with "-" turned into "_"
    const given = String(e.requestInfo().headers["x_group_code"] || "").trim();
    if (given !== expected) {
      throw new ForbiddenError("Code de groupe manquant ou incorrect.");
    }
  },
};
