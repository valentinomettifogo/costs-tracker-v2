-- ============================================================
-- Cancellazione account self-service (route /account)
-- Da eseguire UNA VOLTA nello SQL editor di Supabase, PRIMA del deploy
-- del codice che chiama prepare_account_deletion().
-- ============================================================

-- 1. I movimenti inseriti da un utente cancellato restano negli spazi
--    condivisi, ma senza più il collegamento all'autore.
ALTER TABLE costs_movements ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE costs_movements DROP CONSTRAINT IF EXISTS costs_movements_user_id_fkey;
ALTER TABLE costs_movements
    ADD CONSTRAINT costs_movements_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES user_roles(user_id) ON DELETE SET NULL;

-- 2. Rimuove/scollega tutti i dati applicativi dell'utente in un'unica
--    transazione. L'utente auth.users viene poi cancellato dal server con
--    auth.admin.deleteUser().
--
--    Spazi di cui l'utente è proprietario:
--      - con altri membri → la proprietà passa al membro che ha inserito
--        più movimenti nello spazio (a parità, ordine per user_id);
--      - senza altri membri → lo spazio viene eliminato (cascade su
--        categorie, movimenti, inviti, notifiche).
CREATE OR REPLACE FUNCTION public.prepare_account_deletion(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _space_id uuid;
    _heir uuid;
BEGIN
    FOR _space_id IN SELECT id FROM costs_spaces WHERE owner_id = _user_id LOOP
        SELECT sc.user_id INTO _heir
        FROM costs_spaces_connections sc
        WHERE sc.space_id = _space_id
          AND sc.user_id <> _user_id
        ORDER BY (
            SELECT count(*) FROM costs_movements m
            WHERE m.space_id = _space_id AND m.user_id = sc.user_id
        ) DESC, sc.user_id
        LIMIT 1;

        IF _heir IS NULL THEN
            DELETE FROM costs_spaces WHERE id = _space_id;
        ELSE
            UPDATE costs_spaces SET owner_id = _heir WHERE id = _space_id;
        END IF;
    END LOOP;

    UPDATE costs_movements SET user_id = NULL WHERE user_id = _user_id;
    UPDATE costs_movements SET expense_user_id = NULL WHERE expense_user_id = _user_id;
    DELETE FROM costs_space_invites WHERE created_by = _user_id;
    DELETE FROM costs_notifications WHERE user_id = _user_id OR actor_id = _user_id;
    DELETE FROM costs_push_subscriptions WHERE user_id = _user_id;
    DELETE FROM costs_spaces_connections WHERE user_id = _user_id;
    DELETE FROM user_roles WHERE user_id = _user_id;
END;
$$;

-- Solo il service role (admin client lato server) può invocarla.
REVOKE ALL ON FUNCTION public.prepare_account_deletion(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(uuid) TO service_role;
