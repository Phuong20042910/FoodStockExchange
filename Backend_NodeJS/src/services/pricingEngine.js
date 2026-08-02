const db = require('../config/db');
const crypto = require('crypto');
const externalApis = require('./externalApis');

let isCrashMode = false;
let crashEndTime = null;

const start = (io) => {
  console.log('Pricing Engine started...');
  
  // Run every 10 seconds
  setInterval(async () => {
    try {
      if (isCrashMode) {
        if (Date.now() >= crashEndTime) {
          await endMarketCrash(io);
        }
        return;
      }

      await fetchExternalAssets();
      await runPricingAlgorithm(io);
      await processLimitOrders(io);
    } catch (err) {
      console.error('Error running pricing engine cycle:', err);
    }
  }, 10000);
};

// Fetch real-world financial assets (CoinGecko & ExchangeRate API via externalApis module)
const fetchExternalAssets = async () => {
  try {
    const assets = await externalApis.syncExternalAssetFeeds();
    return assets;
  } catch (err) {
    console.warn('Could not fetch external financial API. Using cached values. Error:', err.message);
  }
};


const runPricingAlgorithm = async (io) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch system configs
    const configsRes = await client.query('SELECT key, value FROM system_config');
    const configs = {};
    configsRes.rows.forEach(r => configs[r.key] = r.value);
    
    const kMultiplier = parseFloat(configs['k_factor_amplifier'] || '1.0');
    const idleMinutes = parseInt(configs['idle_cool_down_minutes'] || '10');
    const breakerThreshold = parseFloat(configs['circuit_breaker_threshold'] || '0.40');

    // Adaptive K-Factor
    const activeConnections = io.engine.clientsCount;
    let adaptiveKMultiplier = kMultiplier;
    if (activeConnections < 50) {
      adaptiveKMultiplier *= 0.5;
    } else if (activeConnections >= 200) {
      adaptiveKMultiplier *= 1.5;
    }

    const productsRes = await client.query('SELECT * FROM products ORDER BY id ASC');
    const products = productsRes.rows;
    const priceUpdates = [];

    for (const product of products) {
      if (!product.is_trading) continue; // Skip halted items

      let newPrice = parseFloat(product.current_price);
      const basePrice = parseFloat(product.base_price);
      const minPrice = parseFloat(product.min_price);
      const maxPrice = parseFloat(product.max_price);
      const baseK = parseFloat(product.elasticity_k);
      const kFactor = baseK * adaptiveKMultiplier;

      // 2. Count order items in last 5 minutes (Local Demand)
      const demandRes = await client.query(`
        SELECT COALESCE(SUM(oi.quantity), 0) as qty
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.product_id = $1 
          AND o.created_at > NOW() - INTERVAL '5 minutes'
          AND o.status != 'CANCELLED'
      `, [product.id]);
      const qty5m = parseInt(demandRes.rows[0].qty);

      // 3. Check for product inactivity (Cool-down)
      const lastOrderRes = await client.query(`
        SELECT MAX(o.created_at) as last_time
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.product_id = $1 
          AND o.status != 'CANCELLED'
      `, [product.id]);
      const lastOrderTime = lastOrderRes.rows[0].last_time;
      const minutesIdle = lastOrderTime ? (Date.now() - new Date(lastOrderTime).getTime()) / 60000 : 999;

      let hasChanged = false;

      // 4. Calculate price based on Linked Financial Assets if available
      const liveAssets = externalApis.getAssetCache();
      if (product.linked_asset && liveAssets[product.linked_asset]) {
        const assetValue = liveAssets[product.linked_asset];
        const multiplier = parseFloat(product.asset_multiplier);

        
        // Base price is augmented by the real-world asset value
        let calculatedAssetPrice = basePrice + (assetValue * multiplier);

        // Blend with local demand: Surge pricing adds to the calculated asset base
        if (qty5m > 0) {
          const surgeFactor = 1 + (Math.log(1 + qty5m) * kFactor);
          calculatedAssetPrice *= surgeFactor;
        }

        newPrice = calculatedAssetPrice;
        hasChanged = true;
      } else {
        // Standard Supply-Demand model
        if (qty5m > 0) {
          const multiplier = 1 + (Math.log(1 + qty5m) * kFactor);
          newPrice = newPrice * multiplier;
          hasChanged = true;
        } else if (minutesIdle >= idleMinutes) {
          newPrice = newPrice * 0.985;
          hasChanged = true;
        }
      }

      // Check boundary constraints
      if (newPrice > maxPrice) newPrice = maxPrice;
      if (newPrice < minPrice) newPrice = minPrice;

      if (hasChanged && Math.abs(newPrice - parseFloat(product.current_price)) > 0.01) {
        // 5. Volatility Check (Circuit Breaker)
        const prevPriceRes = await client.query(`
          SELECT recorded_price FROM price_history 
          WHERE product_id = $1 AND timestamp > NOW() - INTERVAL '60 seconds'
          ORDER BY timestamp ASC LIMIT 1
        `, [product.id]);
        
        const prevPrice = prevPriceRes.rows[0] ? parseFloat(prevPriceRes.rows[0].recorded_price) : parseFloat(product.current_price);
        const percentChange = Math.abs((newPrice - prevPrice) / prevPrice);

        if (percentChange >= breakerThreshold) {
          await client.query('UPDATE products SET is_trading = FALSE, current_price = $1 WHERE id = $2', [newPrice, product.id]);
          await client.query(`
            INSERT INTO price_history (product_id, recorded_price, change_percentage)
            VALUES ($1, $2, $3)
          `, [product.id, newPrice, (newPrice - parseFloat(product.current_price)) / parseFloat(product.current_price) * 100]);

          io.emit('trading_halt', {
            product_id: product.id,
            reason: `Volatility limit exceeded (+${(percentChange * 100).toFixed(0)}% within 60s)`,
            resume_at: new Date(Date.now() + 120000).toISOString()
          });

          setTimeout(async () => {
            await db.query('UPDATE products SET is_trading = TRUE WHERE id = $1', [product.id]);
            io.emit('trading_resume', { product_id: product.id });
          }, 120000);

        } else {
          await client.query('UPDATE products SET current_price = $1 WHERE id = $2', [newPrice, product.id]);
          
          const changePercent = ((newPrice - parseFloat(product.current_price)) / parseFloat(product.current_price)) * 100;
          await client.query(`
            INSERT INTO price_history (product_id, recorded_price, change_percentage)
            VALUES ($1, $2, $3)
          `, [product.id, newPrice, changePercent]);

          priceUpdates.push({
            product_id: product.id,
            new_price: Math.round(newPrice),
            trend: newPrice > parseFloat(product.current_price) ? 'up' : 'down'
          });
        }
      }
    }

    await client.query('COMMIT');

    if (priceUpdates.length > 0) {
      io.emit('PRICE_UPDATE', priceUpdates);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Process limit orders automatically when prices hit customer targets
const processLimitOrders = async (io) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Get all pending limit orders
    const limitOrdersRes = await client.query("SELECT * FROM limit_orders WHERE status = 'PENDING' FOR UPDATE");
    const limitOrders = limitOrdersRes.rows;

    for (const order of limitOrders) {
      const productRes = await client.query('SELECT current_price, is_trading, name FROM products WHERE id = $1 FOR UPDATE', [order.product_id]);
      const product = productRes.rows[0];

      if (!product || !product.is_trading) continue;

      const currentPrice = parseFloat(product.current_price);
      const targetPrice = parseFloat(order.target_price);

      // If price dropped below or reached customer target price: TRIGGER PURCHASE
      if (currentPrice <= targetPrice) {
        const userRes = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [order.user_id]);
        const walletBalance = parseFloat(userRes.rows[0].wallet_balance);
        const orderCost = currentPrice * order.quantity;

        // Verify funds
        if (walletBalance >= orderCost) {
          // Check raw materials (BOM Recipe)
          const recipeRes = await client.query(`
            SELECT r.usage_qty, rm.name, rm.stock_qty, rm.id as rm_id
            FROM recipes r
            JOIN raw_materials rm ON rm.id = r.material_id
            WHERE r.product_id = $1
          `, [order.product_id]);

          let canFulfillInventory = true;
          for (const recipe of recipeRes.rows) {
            const requiredQty = parseFloat(recipe.usage_qty) * order.quantity;
            const availableQty = parseFloat(recipe.stock_qty);
            if (availableQty < requiredQty) {
              canFulfillInventory = false;
              break;
            }
          }

          if (canFulfillInventory) {
            // Deduct inventory
            for (const recipe of recipeRes.rows) {
              const requiredQty = parseFloat(recipe.usage_qty) * order.quantity;
              await client.query('UPDATE raw_materials SET stock_qty = stock_qty - $1 WHERE id = $2', [requiredQty, recipe.rm_id]);
            }

            // Create Order
            const newOrderRes = await client.query(
              "INSERT INTO orders (user_id, table_number, total_amount, status) VALUES ($1, 'LIMIT_ORDER', $2, 'PENDING') RETURNING id, created_at",
              [order.user_id, orderCost]
            );
            const newOrder = newOrderRes.rows[0];

            // Create Order Item (assigned to the buyer as owner)
            const newItemRes = await client.query(
              'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
              [newOrder.id, order.product_id, order.quantity, currentPrice, order.user_id]
            );

            // Deduct Wallet
            await client.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [orderCost, order.user_id]);

            // Ledger logging
            const txHashInput = `${order.user_id}${orderCost * -1}ORDER_PAYMENT${newOrder.id}`;
            const txHash = crypto.createHash('sha256').update(txHashInput).digest('hex');
            await client.query(`
              INSERT INTO wallet_transactions (user_id, amount, type, reference_id, tx_hash)
              VALUES ($1, $2, 'ORDER_PAYMENT', $3, $4)
            `, [order.user_id, orderCost * -1, newOrder.id, txHash]);

            // Update Limit Order status
            await client.query("UPDATE limit_orders SET status = 'FILLED' WHERE id = $1", [order.id]);

            // Broadcast to user wallet
            io.emit(`WALLET_UPDATE_${order.user_id}`, {
              balance: walletBalance - orderCost,
              amount: -orderCost
            });

            // Broadcast to KDS (Kitchen)
            io.emit('KITCHEN_NEW_ORDER', {
              order_id: newOrder.id,
              table_number: 'AUTO-LIMIT',
              total_amount: orderCost,
              created_at: newOrder.created_at,
              items: [{ product_id: order.product_id, name: product.name, qty: order.quantity }]
            });

            // Notify user of execution
            io.emit(`LIMIT_ORDER_FILLED_${order.user_id}`, {
              order_id: newOrder.id,
              product_name: product.name,
              qty: order.quantity,
              executed_price: currentPrice
            });
          }
        }
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error executing limit orders cycle:', err);
  } finally {
    client.release();
  }
};

const triggerMarketCrash = async (io) => {
  if (isCrashMode) return;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    isCrashMode = true;
    const duration = 180; 
    crashEndTime = Date.now() + (duration * 1000);

    await client.query('UPDATE products SET current_price = min_price');

    const products = (await client.query('SELECT id, current_price FROM products')).rows;
    for (const p of products) {
      await client.query(`
        INSERT INTO price_history (product_id, recorded_price, change_percentage)
        VALUES ($1, $2, -50.00)
      `, [p.id, p.current_price]);
    }

    await client.query('COMMIT');

    io.emit('market_crash_start', {
      duration_seconds: duration,
      message: 'MARKET CRASH DETECTED! Price plunged to floor levels!'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    isCrashMode = false;
    throw err;
  } finally {
    client.release();
  }
};

const endMarketCrash = async (io) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    isCrashMode = false;
    crashEndTime = null;

    await client.query('UPDATE products SET current_price = base_price');

    const products = (await client.query('SELECT id, current_price FROM products')).rows;
    for (const p of products) {
      await client.query(`
        INSERT INTO price_history (product_id, recorded_price, change_percentage)
        VALUES ($1, $2, 50.00)
      `, [p.id, p.current_price]);
    }

    await client.query('COMMIT');
    io.emit('market_crash_end', {
      message: 'Market stabilized. Prices returned to baseline.'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  start,
  triggerMarketCrash,
  endMarketCrash,
  getCrashStatus: () => ({ isCrashMode, crashEndTime })
};
