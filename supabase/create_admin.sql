-- =====================================================================
-- Donner le rôle administrateur à un compte existant.
-- 1. Créez d'abord l'utilisateur dans Supabase : Authentication > Users > Add user
-- 2. Remplacez l'e-mail ci-dessous puis exécutez ce script dans le SQL Editor.
-- =====================================================================
insert into public.profiles (id, full_name, role)
select id, 'Administrateur', 'admin'
from auth.users
where email = 'admin@exemple.tn'      -- ← remplacez par votre e-mail
on conflict (id) do update set role = 'admin';

-- Vérification : doit renvoyer une ligne avec role = admin
select p.id, u.email, p.role
from public.profiles p join auth.users u on u.id = p.id;
