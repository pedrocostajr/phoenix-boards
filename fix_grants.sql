-- Grants for Tag Tables
GRANT ALL ON TABLE public.project_tags TO authenticated;
GRANT ALL ON TABLE public.project_tags TO service_role;

GRANT ALL ON TABLE public.task_tags TO authenticated;
GRANT ALL ON TABLE public.task_tags TO service_role;

-- Grants for Tasks (Just ensure)
GRANT ALL ON TABLE public.tasks TO authenticated;
GRANT ALL ON TABLE public.tasks TO service_role;

-- Grants for Sequences (if any, though UUIDs use gen_random_uuid())
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Ensure Schema Usage
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
