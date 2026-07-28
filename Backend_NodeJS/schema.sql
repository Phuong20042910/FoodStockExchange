-- ==========================================
-- SQL SCHEMA FOR FOOD STOCK EXCHANGE (POSTGRESQL) - ENTERPRISE VERSION
-- Copy and paste this directly into Supabase SQL Editor
-- ==========================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop tables if they exist (Clean slate)
DROP TABLE IF EXISTS p2p_listings CASCADE;
DROP TABLE IF EXISTS limit_orders CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS raw_materials CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(100),
    role VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN', 'CASHIER', 'KITCHEN', 'CUSTOMER')),
    wallet_balance DECIMAL(12,2) DEFAULT 0.00 CHECK (wallet_balance >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS TABLE (Extended with Linked Assets for Forex/Coin)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('BEER', 'COCKTAIL', 'FOOD', 'SOFT_DRINK')),
    image_url VARCHAR(500),
    base_price DECIMAL(12,2) NOT NULL,
    current_price DECIMAL(12,2) NOT NULL,
    min_price DECIMAL(12,2) NOT NULL,
    max_price DECIMAL(12,2) NOT NULL,
    elasticity_k DECIMAL(6,4) DEFAULT 0.0100,
    is_trading BOOLEAN DEFAULT TRUE,
    linked_asset VARCHAR(50) DEFAULT NULL, -- 'BTC', 'EUR_VND', 'COFFEE', or NULL
    asset_multiplier DECIMAL(18,8) DEFAULT 1.00000000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT price_check CHECK (min_price <= base_price AND base_price <= max_price)
);

-- 3. PRICE HISTORY TABLE
CREATE TABLE price_history (
    id BIGSERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    recorded_price DECIMAL(12,2) NOT NULL,
    change_percentage DECIMAL(5,2) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_price_history_prod_time ON price_history(product_id, timestamp DESC);

-- 4. RAW MATERIALS
CREATE TABLE raw_materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    stock_qty DECIMAL(12,3) DEFAULT 0.000 CHECK (stock_qty >= 0),
    unit VARCHAR(20) NOT NULL,
    min_threshold DECIMAL(12,3) NOT NULL
);

-- 5. RECIPES (BOM)
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    material_id INT REFERENCES raw_materials(id) ON DELETE CASCADE,
    usage_qty DECIMAL(12,3) NOT NULL CHECK (usage_qty > 0)
);

-- 6. ORDERS
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    table_number VARCHAR(10) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ORDER ITEMS (Extended with owner for P2P trading)
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price_at_purchase DECIMAL(12,2) NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL -- Tracks current owner of the drink ticket
);

-- 8. LIMIT ORDERS (New - for Auto Buy triggers)
CREATE TABLE limit_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    target_price DECIMAL(12,2) NOT NULL CHECK (target_price > 0),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'FILLED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. P2P LISTINGS (New - for reselling purchased drinks)
CREATE TABLE p2p_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_item_id BIGINT REFERENCES order_items(id) ON DELETE CASCADE,
    price DECIMAL(12,2) NOT NULL CHECK (price > 0),
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'SOLD', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. WALLET TRANSACTIONS
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('TOPUP', 'ORDER_PAYMENT', 'ORDER_REFUND', 'CANCEL_PENALTY', 'P2P_SALE', 'P2P_BUY')),
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tx_hash VARCHAR(64)
);

-- 11. SYSTEM CONFIG
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT
);

-- ==========================================
-- SEED INITIAL DATA
-- ==========================================

-- System Configurations (Including Gemini AI Config)
INSERT INTO system_config (key, value, description) VALUES
('crash_duration', '180', 'Duration of market crash in seconds'),
('circuit_breaker_threshold', '0.40', 'Price change threshold to trigger trading halt (e.g. 40%)'),
('idle_cool_down_minutes', '10', 'Inactivity duration before price cools down'),
('k_factor_amplifier', '1.0', 'Multiplier for elasticity factor'),
('gemini_api_key', 'YOUR_GEMINI_API_KEY_HERE', 'Google Gemini API key for AI Broker Chatbot');

-- Raw Materials (Inventory)
INSERT INTO raw_materials (name, stock_qty, unit, min_threshold) VALUES
('Bia Tiger Lon', 500.0, 'lon', 50.0),
('Bia Heineken Lon', 400.0, 'lon', 40.0),
('Khoai Tây Đông Lạnh', 50.0, 'kg', 5.0),
('Thịt Bò Kobe', 20.0, 'kg', 2.0),
('Rượu Rum', 5000.0, 'ml', 500.0),
('Nước Chanh', 10000.0, 'ml', 1000.0),
('Đường Cát', 10.0, 'kg', 1.0),
('Hạt Cà Phê Moka', 20.0, 'kg', 2.0),
('Sữa Đặc', 30.0, 'lon', 3.0),
('Trà Đen Phúc Long', 5.0, 'kg', 0.5),
('Bột Matcha Nhật', 2.0, 'kg', 0.2);

-- Products (Menu Items with Pricing Boundaries and Asset Mappings)
INSERT INTO products (id, name, category, image_url, base_price, current_price, min_price, max_price, elasticity_k, linked_asset, asset_multiplier) VALUES
(1, 'Bia Tiger Bạc', 'BEER', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500', 30000.00, 30000.00, 20000.00, 75000.00, 0.0150, NULL, 1.00000000),
(2, 'Bia Heineken Silver', 'BEER', 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=500', 38000.00, 38000.00, 25000.00, 95000.00, 0.0180, 'EUR_VND', 0.00150000), -- Linked to EUR/VND
(3, 'Mojito Classic', 'COCKTAIL', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500', 65000.00, 65000.00, 45000.00, 150000.00, 0.0200, NULL, 1.00000000),
(4, 'Bò Bít Tết Kobe', 'FOOD', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500', 450000.00, 450000.00, 350000.00, 990000.00, 0.0300, NULL, 1.00000000),
(5, 'Khoai Tây Chiên Lắc Phô Mai', 'FOOD', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500', 45000.00, 45000.00, 30000.00, 90000.00, 0.0100, NULL, 1.00000000),
(6, 'Cà Phê Sữa Đá Moka', 'SOFT_DRINK', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500', 35000.00, 35000.00, 25000.00, 80000.00, 0.0120, 'COFFEE', 15.00000000), -- Linked to Coffee Futures
(7, 'Trà Sữa Matcha Trân Châu', 'SOFT_DRINK', 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500', 50000.00, 50000.00, 35000.00, 120000.00, 0.0140, 'BTC', 0.00000050); -- Linked to BTC

-- Associate Products with Raw Materials (BOM Recipes)
INSERT INTO recipes (product_id, material_id, usage_qty) VALUES (1, 1, 1.000);
INSERT INTO recipes (product_id, material_id, usage_qty) VALUES (2, 2, 1.000);
INSERT INTO recipes (product_id, material_id, usage_qty) VALUES (3, 5, 50.000);
INSERT INTO recipes (product_id, material_id, usage_qty) VALUES (3, 6, 30.000);
INSERT INTO recipes (product_id, material_id, usage_qty) VALUES (3, 7, 0.015);
INSERT INTO recipes (product_id, material_id, usage_qty) VALUES (4, 4, 0.250);
INSERT INTO recipes (product_id, material_id, usage_qty) VALUES (5, 3, 0.200);
-- Cafe Moka Recipe
INSERT INTO recipes (product_id, material_id, usage_qty) VALUES (6, 8, 0.020);
INSERT INTO recipes (product_id, material_id, usage_qty) VALUES (6, 9, 0.030);
-- Matcha Milk Tea Recipe
INSERT INTO recipes (product_id, material_id, usage_qty) VALUES (7, 11, 0.010);
INSERT INTO recipes (product_id, material_id, usage_qty) VALUES (7, 9, 0.040);

-- Mock accounts
INSERT INTO users (username, password_hash, role, wallet_balance) VALUES
('admin', '$2a$10$95PZ0T4k7k6yTj48pE9y9OuI1vRjQ6F4hQ0.v/1Z0p9lP3Gep5D.W', 'ADMIN', 10000000.00), -- admin123
('cashier', '$2a$10$95PZ0T4k7k6yTj48pE9y9OuI1vRjQ6F4hQ0.v/1Z0p9lP3Gep5D.W', 'CASHIER', 5000000.00),
('kitchen', '$2a$10$95PZ0T4k7k6yTj48pE9y9OuI1vRjQ6F4hQ0.v/1Z0p9lP3Gep5D.W', 'KITCHEN', 0.00),
('trader01', '$2a$10$95PZ0T4k7k6yTj48pE9y9OuI1vRjQ6F4hQ0.v/1Z0p9lP3Gep5D.W', 'CUSTOMER', 1000000.00);
