/// <reference path="../pb_data/types.d.ts" />

// Every write through the API needs the shared group code in an
// "X-Group-Code" header. The code itself lives in the DT_GROUP_CODE
// environment variable on the server (see server/.env.example), never in the repo.
// Reading needs nothing.

onRecordCreateRequest((e) => {
  require(`${__hooks}/utils.js`).requireGroupCode(e);
  e.next();
}, "readers", "books", "goals");

onRecordUpdateRequest((e) => {
  require(`${__hooks}/utils.js`).requireGroupCode(e);
  e.next();
}, "readers", "books", "goals");

onRecordDeleteRequest((e) => {
  require(`${__hooks}/utils.js`).requireGroupCode(e);
  e.next();
}, "readers", "books", "goals");
