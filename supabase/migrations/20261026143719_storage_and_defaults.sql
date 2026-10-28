-- Ujaagar Sales: private storage for payment proofs, and default reference data.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Files live under "<agent id>/<file>". Agents upload and read only their own folder; the CEO reads all.
create policy payment_proofs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy payment_proofs_select on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_ceo()));

-- Default services
insert into public.services (name) values
  ('Website Development'), ('Meta Ads'), ('Google Ads'), ('Social Media Management'),
  ('Video Editing'), ('SEO'), ('Branding & Design')
on conflict do nothing;

-- Default commission rates (owner's rules). New rate sets are added with a later effective_from.
insert into public.commission_tiers (kind, min_amount_pkr, max_amount_pkr, rate_percent, effective_from) values
  ('new_sale', 0, 50000, 10, '2026-01-01'),
  ('new_sale', 50001, 100000, 12, '2026-01-01'),
  ('new_sale', 100001, 200000, 13.5, '2026-01-01'),
  ('new_sale', 200001, 300000, 15, '2026-01-01'),
  ('new_sale', 300001, null, 18, '2026-01-01'),
  ('recurring', 0, 150000, 1.5, '2026-01-01'),
  ('recurring', 150001, null, 2, '2026-01-01');

insert into public.app_settings (key, value) values
  ('recurring_stops_when_agent_inactive', 'true'::jsonb),
  ('monthly_payment_due_day', '10'::jsonb)
on conflict (key) do nothing;
