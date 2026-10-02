revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.stamp_order_operator() from public, anon, authenticated;
revoke execute on function public.stamp_account_entry_operator() from public, anon, authenticated;
revoke execute on function public.set_order_item_unit_cost() from public, anon, authenticated;

revoke execute on function public.organization_today(uuid) from public, anon;
grant execute on function public.organization_today(uuid) to authenticated;
