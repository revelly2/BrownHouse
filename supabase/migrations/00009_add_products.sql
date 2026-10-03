-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone."
    ON public.products FOR SELECT
    USING (TRUE);

CREATE POLICY "Only admins and cashiers can insert/update products."
    ON public.products FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.role = 'cashier')
        )
    );

-- Trigger for updated_at
CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert some default products for POS
INSERT INTO public.products (name, price, stock)
VALUES
    ('Bottled Water', 20.00, 100),
    ('Energy Drink', 60.00, 50),
    ('Protein Shake', 120.00, 30),
    ('Gym Towel', 150.00, 20),
    ('Locker Padlock', 100.00, 15)
ON CONFLICT DO NOTHING;
