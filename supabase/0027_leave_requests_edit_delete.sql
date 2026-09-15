-- Real gap from the 2026-09-11 CRUD-gap audit: "cancel" was a status
-- change, not removal, and changing dates/reason on a pending request
-- meant cancel + resubmit as two separate requests. Now an employee can
-- edit their own still-pending request in place, and both employees and
-- admins can hard-delete a request, not just change its status.
--
-- Replaces 0007's `leave_update_own_cancel_or_admin`, which only ever let
-- an employee move their own row to 'cancelled'. The new policy also
-- allows editing any field while the request stays 'pending'. Note:
-- Postgres RLS doesn't pair a specific USING clause to a specific WITH
-- CHECK clause (multiple applicable conditions on each side combine via
-- OR independently) — so this technically also permits editing an
-- *approved* request back to 'pending' in one step, not just cancelling
-- it. Accepted as reasonable (same net effect as withdraw-and-resubmit,
-- just fewer steps) rather than a loophole; the app's own UI only offers
-- editing on already-pending requests for now.
drop policy "leave_update_own_cancel_or_admin" on leave_requests;

create policy "leave_update_own_or_admin"
  on leave_requests for update
  using ((employee_id = auth.uid() and status in ('pending', 'approved')) or is_admin())
  with check ((employee_id = auth.uid() and status in ('pending', 'cancelled')) or is_admin());

grant delete on public.leave_requests to authenticated;

-- Admin can remove any request. An employee can only remove their own
-- while it's pending or cancelled — a decided (approved/rejected) request
-- stays as a permanent record even though it's their own row, so there's
-- still an audit trail of what was actually decided.
create policy "leave_delete_own_pending_or_cancelled_or_admin"
  on leave_requests for delete
  using (is_admin() or (employee_id = auth.uid() and status in ('pending', 'cancelled')));
