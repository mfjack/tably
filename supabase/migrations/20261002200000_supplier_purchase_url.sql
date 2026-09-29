alter table public.suppliers
  drop constraint suppliers_document_check,
  drop constraint suppliers_email_check,
  drop column document,
  drop column email,
  add column purchase_url text check (
    char_length(purchase_url) <= 500 and purchase_url ~ '^https?://'
  );
