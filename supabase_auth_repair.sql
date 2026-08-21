-- Reparacion segura para Supabase Auth.
-- Ejecutar en Supabase SQL Editor.
-- No borra usuarios, perfiles ni datos de la aplicacion.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_odisea ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_registration();

CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    assigned_rol VARCHAR(20);
    new_pseudonimo VARCHAR(50);
    user_count INTEGER;
BEGIN
    assigned_rol := COALESCE(NEW.raw_user_meta_data->>'rol', 'estudiante');

    IF assigned_rol = 'estudiante' THEN
        SELECT COUNT(*) + 1
        INTO user_count
        FROM public.perfiles_usuarios
        WHERE rol = 'estudiante';
        new_pseudonimo := 'EST-2026-' || LPAD(user_count::text, 4, '0');
    ELSE
        new_pseudonimo := COALESCE(
            NEW.raw_user_meta_data->>'name',
            'USER-' || SUBSTRING(NEW.id::text FROM 1 FOR 8)
        );
    END IF;

    INSERT INTO public.perfiles_usuarios (id, correo, pseudonimo, rol)
    VALUES (NEW.id, NEW.email, new_pseudonimo, assigned_rol)
    ON CONFLICT (id) DO NOTHING;

    IF assigned_rol = 'estudiante' THEN
        INSERT INTO public.sesiones_entrenamiento (usuario_id, numero_sesion, semana)
        SELECT NEW.id, session_number, CEIL(session_number::numeric / 3)::integer
        FROM generate_series(1, 24) AS session_number
        ON CONFLICT (usuario_id, numero_sesion) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_odisea ON auth.users;
CREATE TRIGGER on_auth_user_created_odisea
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_registration();

-- La funcion auth.uid() pertenece a Supabase. No crearla ni reemplazarla.
