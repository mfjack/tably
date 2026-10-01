alter table public.categories
  add column menu_group text,
  add column menu_is_highlighted boolean not null default false;
