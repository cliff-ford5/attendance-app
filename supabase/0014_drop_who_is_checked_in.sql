-- Reverts 0013: the "who's in" presence strip was removed after the user
-- questioned its value for this team — it was inspired by patterns seen in
-- multi-location/shift-based competitor apps during UI/UX research, not a
-- need actually described for this business, and for a small
-- mostly-one-location team it's just restating information everyone
-- already has by being in the room.
drop view if exists who_is_checked_in;
