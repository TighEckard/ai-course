-- One-time admin password claim for admin@ovoa.ai, and remove the old admin address.
delete from public.admins where lower(email) <> 'admin@ovoa.ai';

create table public.admin_claim (
  id int primary key default 1 check (id = 1),
  claimed boolean not null default false
);
insert into public.admin_claim (id, claimed) values (1, false);
alter table public.admin_claim enable row level security;  -- no policies: nobody can read it directly

create function public.claim_admin(pw text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare done boolean;
begin
  if pw is null or char_length(pw) < 8 then return false; end if;
  select claimed into done from public.admin_claim where id = 1 for update;
  if done then return false; end if;
  update auth.users
     set encrypted_password = crypt(pw, gen_salt('bf')),
         email_confirmed_at = coalesce(email_confirmed_at, now())
   where lower(email) = 'admin@ovoa.ai';
  if not found then return false; end if;
  update public.admin_claim set claimed = true where id = 1;
  return true;
end $$;
grant execute on function public.claim_admin(text) to anon, authenticated;
