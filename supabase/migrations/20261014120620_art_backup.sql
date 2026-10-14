-- The art backup's two questions to the database (src/lib/backup/art.ts): what
-- files were created since the last run, and which of a list still exist.
-- Storage files aren't in Supabase's own backups, so a cron copies `art` and
-- `originals` to a bucket at another company. Only the secret key (the
-- cron, the team's scripts) can call these.

create function public.backup_objects_after(after_time timestamptz, after_bucket text, after_name text, max_rows int)
returns table (bucket_id text, name text, created_at timestamptz, mimetype text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.bucket_id, o.name, o.created_at, o.metadata ->> 'mimetype'
  from storage.objects o
  where o.bucket_id in ('art', 'originals')
    and (o.created_at, o.bucket_id, o.name) > (after_time, after_bucket, after_name)
  order by o.created_at, o.bucket_id, o.name
  limit least(greatest(max_rows, 1), 1000)
$$;

create function public.backup_objects_existing(bucket text, names text[])
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select n from unnest(names) as n
  where exists (select 1 from storage.objects o where o.bucket_id = bucket and o.name = n)
$$;

revoke all on function public.backup_objects_after(timestamptz, text, text, int) from public, anon, authenticated;
revoke all on function public.backup_objects_existing(text, text[]) from public, anon, authenticated;
grant execute on function public.backup_objects_after(timestamptz, text, text, int) to service_role;
grant execute on function public.backup_objects_existing(text, text[]) to service_role;
