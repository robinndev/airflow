-- Profile details artists fill in from "Edit profile": a one-line headline,
-- pronouns, location and their links elsewhere. Owners update them directly
-- (same as display_name and bio) under the existing "Owners can update their
-- profile" policy; the checks below keep them short and well-formed.

alter table public.profiles
  add column headline text not null default '' check (char_length(headline) <= 80),
  add column pronouns text not null default '' check (char_length(pronouns) <= 24),
  add column location text not null default '' check (char_length(location) <= 40),
  -- [{ "url": "https://…", "label": "…" }], at most 8.
  add column links jsonb not null default '[]'::jsonb
    check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 8 and pg_column_size(links) < 4000);

grant update (headline, pronouns, location, links) on public.profiles to authenticated;
