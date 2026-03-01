-- Remove ALL assignments for deactivated teacher Dimitar Emilov
-- (both assistant roles and primary roles — a deactivated teacher should have none)
DELETE FROM public.student_teacher_assignments
WHERE teacher_id = '2882ca6b-02ea-46ef-bc8b-e543d09b9101';
