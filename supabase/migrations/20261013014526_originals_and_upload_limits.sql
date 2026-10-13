-- Originals and upload limits (roadmap: "original images, cheap and safe").
--
-- Every piece of art is kept three ways: the display copy and a thumb in the
-- public `art` bucket, and the file as uploaded (metadata stripped in the
-- browser, pixels untouched) in this private `originals` bucket, at the same
-- path: originals/<user id>/<folder>/<uuid>.<ext>. Originals are read through
-- signed URLs (commission deliveries, "full size" when the artist allows it),
-- never through public links, so full-size art is harder to scrape.
--
-- Limits, so nobody uses us as free hosting: up to 600 files a day across
-- `art` and `originals` (a picture is up to three files), and 5 GB stored
-- (50 GB on Flow+). Checked on insert, from what's already stored.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('originals', 'originals', false, 26214400, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "Artists keep originals in their own folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'originals' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Artists see their own originals"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'originals' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Artists delete their own originals"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'originals' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- True while the signed-in user is under today's file count and their storage
-- quota. Security invoker: it only sees the caller's own files (the select
-- policies above), found by folder through the (bucket_id, name "C") index:
-- names from '<uid>/' up to (not including) '<uid>0'.
create function public.under_upload_limits()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  with mine as (
    select o.created_at, coalesce((o.metadata ->> 'size')::bigint, 0) as bytes
    from storage.objects o
    where o.bucket_id in ('art', 'originals')
      and o.name collate "C" >= (select auth.uid())::text || '/'
      and o.name collate "C" < (select auth.uid())::text || '0'
  )
  select
    (select count(*) from mine where created_at > now() - interval '1 day') < 600
    and (select coalesce(sum(bytes), 0) from mine) < (
      case when (select p.plan from public.profiles p where p.id = (select auth.uid())) = 'flow_plus' then 50 else 5 end
    )::bigint * 1024 * 1024 * 1024
$$;

revoke all on function public.under_upload_limits() from public, anon;
grant execute on function public.under_upload_limits() to authenticated;

create policy "Uploads stay under the daily and storage limits"
  on storage.objects as restrictive for insert
  to authenticated
  with check (bucket_id not in ('art', 'originals') or public.under_upload_limits());
