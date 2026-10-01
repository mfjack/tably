revoke execute on function public.has_role from anon;
revoke execute on function public.is_member from anon;
revoke execute on function public.can_manage_storage_folder from anon;
revoke execute on function public.organization_today from anon;
revoke execute on function public.stamp_order_operator from anon;
revoke execute on function public.stamp_account_entry_operator from anon;
revoke execute on function public.set_order_item_unit_cost from anon;
revoke execute on function public.handle_new_user from anon, authenticated;
