-- ============================================================
-- SCHEMA COMPLETO costs-tracker
-- ============================================================

-- 1. Tipo ENUM
CREATE TYPE cost_category_type AS ENUM ('needs', 'wants', 'income', 'savings');

-- 2. costs_spaces
CREATE TABLE costs_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    format TEXT DEFAULT 'IT',
    currency TEXT DEFAULT 'EUR',
    owner_id UUID NOT NULL REFERENCES user_roles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. costs_spaces_connections
CREATE TABLE costs_spaces_connections (
    space_id UUID REFERENCES costs_spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_roles(user_id) ON DELETE CASCADE,
    PRIMARY KEY (space_id, user_id)
);

-- 4. costs_categories
CREATE TABLE costs_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type cost_category_type NOT NULL,
    space_id UUID REFERENCES costs_spaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. costs_movements
CREATE TABLE costs_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(10, 2) NOT NULL,
    category_id UUID REFERENCES costs_categories(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    description TEXT,
    user_id UUID NOT NULL REFERENCES user_roles(user_id) ON DELETE CASCADE,
    expense_user_id UUID REFERENCES user_roles(user_id) ON DELETE SET NULL,
    space_id UUID NOT NULL REFERENCES costs_spaces(id) ON DELETE CASCADE,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS POLICIES
-- Necessarie per le letture (SELECT) da client utente.
-- Le scritture usano il service role e bypassano l'RLS.
-- ============================================================

ALTER TABLE costs_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs_spaces_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs_movements ENABLE ROW LEVEL SECURITY;

-- costs_spaces: visibili solo agli spazi di cui fai parte
CREATE POLICY "spaces: select" ON costs_spaces
    FOR SELECT TO authenticated
    USING (id IN (
        SELECT space_id FROM costs_spaces_connections WHERE user_id = auth.uid()
    ));

-- costs_spaces_connections: visibili solo le proprie
CREATE POLICY "connections: select" ON costs_spaces_connections
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- costs_categories: visibili solo nelle categorie degli spazi a cui appartieni
CREATE POLICY "categories: select" ON costs_categories
    FOR SELECT TO authenticated
    USING (space_id IN (
        SELECT space_id FROM costs_spaces_connections WHERE user_id = auth.uid()
    ));

-- costs_movements: visibili solo nei propri spazi
CREATE POLICY "movements: select" ON costs_movements
    FOR SELECT TO authenticated
    USING (space_id IN (
        SELECT space_id FROM costs_spaces_connections WHERE user_id = auth.uid()
    ));

-- 6. costs_space_invites
-- Gestisce i link di invito per condividere uno spazio.
-- Nessuna RLS: tutto l'accesso avviene tramite il service role (admin client) lato server.
CREATE TABLE costs_space_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES costs_spaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);