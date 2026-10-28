alter table public.signups add column if not exists variant text check (char_length(variant) < 120);
