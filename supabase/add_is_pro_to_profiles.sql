-- Ensures the profiles table has an is_pro flag used for feature paywalling.
alter table if exists public.profiles
add column if not exists is_pro boolean not null default false;
