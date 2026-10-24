-- AUTO-GENERATED from tbhf-platform/supabase/*.sql (chronological order).
-- Replays every GRANT/REVOKE so the AWS database has the same privileges as the live one.
-- Statements for functions that were later replaced/dropped are skipped with a NOTICE.


-- ===== from phase1_writes.sql =====
do $do$ begin
  execute $sql$revoke execute on function public.get_enum_values(text) from public$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.get_enum_values(text) from public$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke execute on function public.get_enum_values(text) from anon$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.get_enum_values(text) from anon$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.get_enum_values(text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.get_enum_values(text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.set_my_skills(text[]) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.set_my_skills(text[]) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.set_my_languages(text[]) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.set_my_languages(text[]) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.set_my_interests(text[]) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.set_my_interests(text[]) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.replace_my_academic_records(jsonb) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.replace_my_academic_records(jsonb) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.upsert_my_alumni_details(jsonb) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.upsert_my_alumni_details(jsonb) to authenticated$sql$, 90);
end $do$;

-- ===== from phase1b_profile_extras.sql =====
do $do$ begin
  execute $sql$grant execute on function public.replace_my_employment_history(jsonb) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.replace_my_employment_history(jsonb) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.replace_my_certifications(jsonb) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.replace_my_certifications(jsonb) to authenticated$sql$, 90);
end $do$;

-- ===== from phase1c_volunteer.sql =====
do $do$ begin
  execute $sql$grant execute on function public.replace_my_volunteer_experiences(jsonb) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.replace_my_volunteer_experiences(jsonb) to authenticated$sql$, 90);
end $do$;

-- ===== from phase2b_messaging.sql =====
do $do$ begin
  execute $sql$grant execute on function public.is_conversation_member(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.is_conversation_member(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.get_or_create_dm(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.get_or_create_dm(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.send_message(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.send_message(uuid, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.mark_conversation_read(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.mark_conversation_read(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.list_my_conversations() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.list_my_conversations() to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.my_unread_total() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.my_unread_total() to authenticated$sql$, 90);
end $do$;

-- ===== from phase2c_groups.sql =====
do $do$ begin
  execute $sql$grant execute on function public.create_group(text, text, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.create_group(text, text, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.list_groups(text, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.list_groups(text, text) to authenticated$sql$, 90);
end $do$;

-- ===== from phase2d_discussions.sql =====
do $do$ begin
  execute $sql$grant execute on function public.is_group_member(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.is_group_member(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.get_group_feed(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.get_group_feed(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.create_group_post(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.create_group_post(uuid, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.add_post_comment(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.add_post_comment(uuid, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.toggle_post_like(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.toggle_post_like(uuid) to authenticated$sql$, 90);
end $do$;

-- ===== from phase3_resources.sql =====
do $do$ begin
  execute $sql$grant execute on function public.is_admin() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.is_admin() to authenticated$sql$, 90);
end $do$;

-- ===== from phase5_mentorship.sql =====
do $do$ begin
  execute $sql$grant execute on function public.list_mentors(text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.list_mentors(text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.my_mentorships() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.my_mentorships() to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.request_mentorship(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.request_mentorship(uuid, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.respond_mentorship(uuid, boolean) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.respond_mentorship(uuid, boolean) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.end_mentorship(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.end_mentorship(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.set_mentor_availability(boolean, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.set_mentor_availability(boolean, text) to authenticated$sql$, 90);
end $do$;

-- ===== from phase6_stories.sql =====
do $do$ begin
  execute $sql$grant execute on function public.set_story_featured(uuid, boolean) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.set_story_featured(uuid, boolean) to authenticated$sql$, 90);
end $do$;

-- ===== from phase12_admin.sql =====
do $do$ begin
  execute $sql$grant execute on function public.admin_overview() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_overview() to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_demographics() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_demographics() to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_engagement() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_engagement() to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_members(text, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_members(text, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_set_role(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_set_role(uuid, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_set_active(uuid, boolean) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_set_active(uuid, boolean) to authenticated$sql$, 90);
end $do$;

-- ===== from phase13_moderation.sql =====
do $do$ begin
  execute $sql$grant execute on function public.admin_review_content(text, uuid, text, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_review_content(text, uuid, text, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_pending_counts() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_pending_counts() to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_pending_items(text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_pending_items(text) to authenticated$sql$, 90);
end $do$;

-- ===== from phase14_admin_access.sql =====
do $do$ begin
  execute $sql$revoke execute on function public.verify_admin_code(text) from public$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.verify_admin_code(text) from public$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke execute on function public.verify_admin_code(text) from anon$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.verify_admin_code(text) from anon$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke execute on function public.verify_admin_code(text) from authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.verify_admin_code(text) from authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.redeem_admin_access(text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.redeem_admin_access(text) to authenticated$sql$, 90);
end $do$;

-- ===== from phase15_communities.sql =====
do $do$ begin
  execute $sql$grant execute on function public.is_community_member(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.is_community_member(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.can_access_community(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.can_access_community(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_create_community(text, text, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_create_community(text, text, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_add_community_member(uuid, uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_add_community_member(uuid, uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_remove_community_member(uuid, uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_remove_community_member(uuid, uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_delete_community(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_delete_community(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.list_communities(text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.list_communities(text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.get_community(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.get_community(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.get_community_feed(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.get_community_feed(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.create_community_post(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.create_community_post(uuid, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.add_community_comment(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.add_community_comment(uuid, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.toggle_community_like(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.toggle_community_like(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.get_community_member_content(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.get_community_member_content(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_addable_profiles(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_addable_profiles(uuid, text) to authenticated$sql$, 90);
end $do$;

-- ===== from phase16_surveys.sql =====
do $do$ begin
  execute $sql$grant execute on function public.get_surveys_overview() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.get_surveys_overview() to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.submit_survey_response(uuid, jsonb) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.submit_survey_response(uuid, jsonb) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.get_survey_results(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.get_survey_results(uuid) to authenticated$sql$, 90);
end $do$;

-- ===== from phase19_moderators.sql =====
do $do$ begin
  execute $sql$grant execute on function public.is_moderator() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.is_moderator() to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.mod_can(text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.mod_can(text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_list_moderators() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_list_moderators() to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_set_moderator(uuid, text[]) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_set_moderator(uuid, text[]) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_revoke_moderator(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_revoke_moderator(uuid) to authenticated$sql$, 90);
end $do$;

-- ===== from phase20_admin_members_fix.sql =====
do $do$ begin
  execute $sql$grant execute on function public.admin_members(text, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_members(text, text) to authenticated$sql$, 90);
end $do$;

-- ===== from phase21_moderators_fix.sql =====
do $do$ begin
  execute $sql$grant execute on function public.is_moderator() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.is_moderator() to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.mod_can(text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.mod_can(text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_list_moderators() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_list_moderators() to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_set_moderator(uuid, text[]) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_set_moderator(uuid, text[]) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_revoke_moderator(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_revoke_moderator(uuid) to authenticated$sql$, 90);
end $do$;

-- ===== from phase24_notify_prefs_and_delete.sql =====
do $do$ begin
  execute $sql$grant execute on function public.admin_review_content(text, uuid, text, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_review_content(text, uuid, text, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke all on function public.delete_my_account() from public$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke all on function public.delete_my_account() from public$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.delete_my_account() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.delete_my_account() to authenticated$sql$, 90);
end $do$;

-- ===== from phase25_notifications_all.sql =====
do $do$ begin
  execute $sql$grant execute on function public.send_message(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.send_message(uuid, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.add_community_comment(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.add_community_comment(uuid, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.toggle_community_like(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.toggle_community_like(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.request_mentorship(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.request_mentorship(uuid, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.respond_mentorship(uuid, boolean) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.respond_mentorship(uuid, boolean) to authenticated$sql$, 90);
end $do$;

-- ===== from phase26_event_reminders.sql =====
do $do$ begin
  execute $sql$revoke all on function public.sweep_event_reminders() from public$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke all on function public.sweep_event_reminders() from public$sql$, 90);
end $do$;

-- ===== from phase27_moderator_enforcement.sql =====
do $do$ begin
  execute $sql$grant execute on function public.my_capabilities() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.my_capabilities() to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_review_content(text, uuid, text, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_review_content(text, uuid, text, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_pending_counts() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_pending_counts() to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_pending_items(text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_pending_items(text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.can_access_community(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.can_access_community(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_create_community(text, text, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_create_community(text, text, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_add_community_member(uuid, uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_add_community_member(uuid, uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_remove_community_member(uuid, uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_remove_community_member(uuid, uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_delete_community(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_delete_community(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.list_communities(text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.list_communities(text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.get_community(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.get_community(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.admin_addable_profiles(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_addable_profiles(uuid, text) to authenticated$sql$, 90);
end $do$;

-- ===== from phase28_community_group_moderation.sql =====
do $do$ begin
  execute $sql$grant execute on function public.admin_delete_community(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_delete_community(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.get_community(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.get_community(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.delete_community_post(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.delete_community_post(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.get_group_feed(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.get_group_feed(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.delete_group(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.delete_group(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.delete_group_post(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.delete_group_post(uuid) to authenticated$sql$, 90);
end $do$;

-- ===== from phase29_community_interactions.sql =====
do $do$ begin
  execute $sql$grant execute on function public.community_staff_role(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.community_staff_role(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.community_can_moderate(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.community_can_moderate(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.notify_community_mentions(uuid, uuid, text, uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.notify_community_mentions(uuid, uuid, text, uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.create_community_post(uuid, text, boolean) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.create_community_post(uuid, text, boolean) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.edit_community_post(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.edit_community_post(uuid, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.delete_community_post(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.delete_community_post(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.toggle_pin_community_post(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.toggle_pin_community_post(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.toggle_lock_community_post(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.toggle_lock_community_post(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.toggle_bookmark_community_post(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.toggle_bookmark_community_post(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.add_community_comment(uuid, text, uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.add_community_comment(uuid, text, uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.edit_community_comment(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.edit_community_comment(uuid, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.delete_community_comment(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.delete_community_comment(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.toggle_pin_community_comment(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.toggle_pin_community_comment(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.set_community_spotlight(uuid, uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.set_community_spotlight(uuid, uuid, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.clear_community_spotlight(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.clear_community_spotlight(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.get_community(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.get_community(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.get_community_feed(uuid, text, boolean) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.get_community_feed(uuid, text, boolean) to authenticated$sql$, 90);
end $do$;

-- ===== from phase30_community_media.sql =====
do $do$ begin
  execute $sql$grant execute on function public.admin_create_community(text, text, text, text, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.admin_create_community(text, text, text, text, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.list_communities(text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.list_communities(text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.get_community(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.get_community(uuid) to authenticated$sql$, 90);
end $do$;

-- ===== from phase31_message_deletions.sql =====
do $do$ begin
  execute $sql$grant execute on function public.delete_message_for_me(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.delete_message_for_me(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.delete_message_for_everyone(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.delete_message_for_everyone(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.list_my_conversations() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.list_my_conversations() to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.my_unread_total() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.my_unread_total() to authenticated$sql$, 90);
end $do$;

-- ===== from phase32_moderator_badge.sql =====
do $do$ begin
  execute $sql$grant execute on function public.is_profile_moderator(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.is_profile_moderator(uuid) to authenticated$sql$, 90);
end $do$;

-- ===== from security_hardening.sql =====
do $do$ begin
  execute $sql$revoke execute on function public.verify_admin_code(text) from public$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.verify_admin_code(text) from public$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke execute on function public.verify_admin_code(text) from anon$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.verify_admin_code(text) from anon$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke execute on function public.verify_admin_code(text) from authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.verify_admin_code(text) from authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke execute on function public.get_enum_values(text) from public$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.get_enum_values(text) from public$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke execute on function public.get_enum_values(text) from anon$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.get_enum_values(text) from anon$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant execute on function public.get_enum_values(text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.get_enum_values(text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke select on public.profiles from anon$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke select on public.profiles from anon$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke select on public.profiles from authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke select on public.profiles from authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant select (
  id, full_name, avatar_url, role, country, nationality, gender, bio,
  profile_visibility, is_active, created_at, updated_at, onboarded_at,
  date_of_birth, phone, city, dashboard_layout, notification_prefs,
  field_privacy, research_interests, career_aspirations, volunteer_experience
) on public.profiles to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant select ($sql$, 90);
end $do$;

-- ===== from phase33_field_privacy.sql =====
do $do$ begin
  execute $sql$revoke execute on function public.get_profile_full(uuid) from public, anon$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.get_profile_full(uuid) from public, anon$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant  execute on function public.get_profile_full(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant  execute on function public.get_profile_full(uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke select (
  phone,
  date_of_birth,
  city,
  gender,
  bio,
  career_aspirations,
  research_interests,
  volunteer_experience
) on public.profiles from authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke select ($sql$, 90);
end $do$;

-- ===== from phase34_admin_redeem_hardening.sql =====
do $do$ begin
  execute $sql$revoke execute on function public.redeem_admin_access(text) from public$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.redeem_admin_access(text) from public$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke execute on function public.redeem_admin_access(text) from anon$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.redeem_admin_access(text) from anon$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant  execute on function public.redeem_admin_access(text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant  execute on function public.redeem_admin_access(text) to authenticated$sql$, 90);
end $do$;

-- ===== from phase35_redeem_backoff.sql =====
do $do$ begin
  execute $sql$revoke execute on function public.redeem_admin_access(text) from public$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.redeem_admin_access(text) from public$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke execute on function public.redeem_admin_access(text) from anon$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.redeem_admin_access(text) from anon$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant  execute on function public.redeem_admin_access(text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant  execute on function public.redeem_admin_access(text) to authenticated$sql$, 90);
end $do$;

-- ===== from phase36_read_receipts.sql =====
do $do$ begin
  execute $sql$revoke execute on function public.get_my_read_receipts() from public, anon$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.get_my_read_receipts() from public, anon$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant  execute on function public.get_my_read_receipts() to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant  execute on function public.get_my_read_receipts() to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke execute on function public.set_my_read_receipts(boolean) from public, anon$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.set_my_read_receipts(boolean) from public, anon$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant  execute on function public.set_my_read_receipts(boolean) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant  execute on function public.set_my_read_receipts(boolean) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke execute on function public.conversation_seen_enabled(uuid) from public, anon$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.conversation_seen_enabled(uuid) from public, anon$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant  execute on function public.conversation_seen_enabled(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant  execute on function public.conversation_seen_enabled(uuid) to authenticated$sql$, 90);
end $do$;

-- ===== from phase37_message_reactions.sql =====
do $do$ begin
  execute $sql$revoke execute on function public.react_to_message(uuid, text) from public, anon$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.react_to_message(uuid, text) from public, anon$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant  execute on function public.react_to_message(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant  execute on function public.react_to_message(uuid, text) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke execute on function public.list_conversation_reactions(uuid) from public, anon$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.list_conversation_reactions(uuid) from public, anon$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant  execute on function public.list_conversation_reactions(uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant  execute on function public.list_conversation_reactions(uuid) to authenticated$sql$, 90);
end $do$;

-- ===== from phase38_chat_replies_and_emoji.sql =====
do $do$ begin
  execute $sql$grant execute on function public.send_message(uuid, text, uuid) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant execute on function public.send_message(uuid, text, uuid) to authenticated$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$revoke execute on function public.react_to_message(uuid, text) from public, anon$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$revoke execute on function public.react_to_message(uuid, text) from public, anon$sql$, 90);
end $do$;
do $do$ begin
  execute $sql$grant  execute on function public.react_to_message(uuid, text) to authenticated$sql$;
exception when undefined_function or undefined_table or undefined_column or undefined_object then
  raise notice 'skipped (object no longer exists): %', left($sql$grant  execute on function public.react_to_message(uuid, text) to authenticated$sql$, 90);
end $do$;
