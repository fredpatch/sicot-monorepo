Authorization refactor is complete and approved.

Proceed with Phase 8 — Mission official report responsibility.

Business rule already decided:

one official consolidated report per mission
exactly one designated participant may be responsible for submitting that report
existing rapportDocumentId remains the single official report document
introduce:
rapportResponsableId?: number | null

as a nullable FK to users

Required domain rules:

rapportResponsableId must reference a user who is actually a participant of the mission
a mission may exist with no responsible person yet
legacy/existing missions with rapportDocumentId but no rapportResponsableId remain valid
only the designated responsible participant may submit/replace the official report through the personal mission workflow
admin/super_admin with MISSION_MANAGE may assign/change the responsible participant
do not create one report per participant
do not remove or repurpose rapportDocumentId

Start with a fresh audit of:

mission schema
mission participants structure
create/update mission DTOs
/mes-missions
current report upload path
admin mission detail/edit UI
any existing report replacement/delete behavior

Then implement the smallest coherent change across DB/server/client.

Add tests for:

assigning a participant as report responsible
rejecting a non-participant
responsible participant can upload official report
another participant cannot upload/replace it
unrelated user cannot upload
admin assignment/change works
mission with report but null responsible remains readable/valid
only one official rapportDocumentId exists per mission

Preserve the current capability architecture; contextual responsibility should be enforced as a domain relationship, not a new persistent role.

Generate the Drizzle migration but do not commit/push.

Stop after this feature and report before starting documentation/help work.
