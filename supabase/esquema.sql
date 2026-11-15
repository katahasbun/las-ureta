-- Las Ureta · Esquema de la base de datos
-- Pegar completo en Supabase → SQL Editor → New query → Run.
-- Se puede ejecutar más de una vez sin duplicar nada.

-- 1. Numeración de las órdenes de trabajo (OT)
--    Empieza en 49656, que es el número que venía usando el prototipo.
create sequence if not exists numero_ot start 49656;

-- 2. Órdenes de trabajo (enmarcaciones y restauraciones)
--    Los detalles de cada orden (cliente, trabajos, abono, historial,
--    pedidos a proveedores) se guardan en "datos".
create table if not exists ordenes (
  n               bigint primary key default nextval('numero_ot'),
  tipo            text not null check (tipo in ('enm', 'rest')),
  estado          text not null default 'Recibida',
  datos           jsonb not null default '{}'::jsonb,
  creado          timestamptz not null default now(),
  actualizado     timestamptz not null default now(),
  creado_por      uuid default auth.uid() references auth.users (id),
  actualizado_por uuid default auth.uid() references auth.users (id)
);
alter sequence numero_ot owned by ordenes.n;

create index if not exists ordenes_estado_idx on ordenes (estado);
create index if not exists ordenes_creado_idx on ordenes (creado desc);

-- Registra quién y cuándo modificó cada orden
create or replace function marcar_actualizacion() returns trigger
language plpgsql as $$
begin
  new.actualizado := now();
  new.actualizado_por := auth.uid();
  return new;
end $$;

drop trigger if exists ordenes_actualizacion on ordenes;
create trigger ordenes_actualizacion before update on ordenes
  for each row execute function marcar_actualizacion();

-- 3. Seguridad: solo usuarias con sesión iniciada pueden ver y editar.
--    No se permite borrar órdenes desde el portal.
alter table ordenes enable row level security;

drop policy if exists "equipo puede ver" on ordenes;
create policy "equipo puede ver" on ordenes
  for select to authenticated using (true);

drop policy if exists "equipo puede crear" on ordenes;
create policy "equipo puede crear" on ordenes
  for insert to authenticated with check (true);

drop policy if exists "equipo puede editar" on ordenes;
create policy "equipo puede editar" on ordenes
  for update to authenticated using (true) with check (true);

revoke all on ordenes from anon;
grant select, insert, update on ordenes to authenticated;
grant usage, select on sequence numero_ot to authenticated;

-- 4. Fotos de las obras (privadas, solo para el equipo)
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

drop policy if exists "equipo ve fotos" on storage.objects;
create policy "equipo ve fotos" on storage.objects
  for select to authenticated using (bucket_id = 'fotos');

drop policy if exists "equipo sube fotos" on storage.objects;
create policy "equipo sube fotos" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos');

drop policy if exists "equipo reemplaza fotos" on storage.objects;
create policy "equipo reemplaza fotos" on storage.objects
  for update to authenticated using (bucket_id = 'fotos');
