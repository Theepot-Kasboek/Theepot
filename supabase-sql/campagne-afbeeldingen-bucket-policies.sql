-- Uitvoeren in de Supabase SQL-editor, NA het aanmaken van de storage bucket
-- "campagne-afbeeldingen" (Storage > New bucket, "Public bucket" aangevinkt).
-- Zonder deze policies weigert Supabase elke upload met "new row violates
-- row-level security policy", ook als de bucket publiek is - "publiek"
-- betekent alleen dat lezen geen policy nodig heeft, uploaden altijd wel.

-- Ingelogde gebruikers mogen uploaden, vervangen en verwijderen in deze bucket.
drop policy if exists "Ingelogd upload campagne-afbeeldingen" on storage.objects;
create policy "Ingelogd upload campagne-afbeeldingen"
  on storage.objects for insert
  with check (bucket_id = 'campagne-afbeeldingen' and auth.uid() is not null);

drop policy if exists "Ingelogd update campagne-afbeeldingen" on storage.objects;
create policy "Ingelogd update campagne-afbeeldingen"
  on storage.objects for update
  using (bucket_id = 'campagne-afbeeldingen' and auth.uid() is not null);

drop policy if exists "Ingelogd verwijdert campagne-afbeeldingen" on storage.objects;
create policy "Ingelogd verwijdert campagne-afbeeldingen"
  on storage.objects for delete
  using (bucket_id = 'campagne-afbeeldingen' and auth.uid() is not null);

-- Iedereen (ook niet-ingelogd) mag lezen - nodig zodat afbeeldingen in de
-- e-mail-HTML en op de publieke evenementpagina's gewoon tonen.
drop policy if exists "Publiek leest campagne-afbeeldingen" on storage.objects;
create policy "Publiek leest campagne-afbeeldingen"
  on storage.objects for select
  using (bucket_id = 'campagne-afbeeldingen');
