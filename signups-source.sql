alter table public.signups add column if not exists source text check (char_length(source) < 80);
