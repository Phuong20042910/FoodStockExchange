/**
 * Global & Vietnam Food & Beverage API Integration Service
 * Connects with:
 * 1. Open Food Facts API (3M+ Global & Vietnam food/beverage products with barcode/brand data)
 * 2. TheCocktailDB API (International Cocktail & Bar drinks)
 * 3. TheMealDB API (International Dishes & Cuisine)
 * 4. Vietnamese Authentic F&B Specialty Dataset (Phở, Cà phê trứng, Bánh mỳ, Bia hơi)
 */

const fetchOpenFoodFacts = async (query = 'coffee', country = 'vietnam') => {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.products || data.products.length === 0) return [];

    return data.products.map(p => {
      let cat = 'FOOD';
      const categories = (p.categories || '').toLowerCase();
      if (categories.includes('beer') || categories.includes('bier')) cat = 'BEER';
      else if (categories.includes('cocktail') || categories.includes('alcohol')) cat = 'COCKTAIL';
      else if (categories.includes('beverage') || categories.includes('drink') || categories.includes('tea') || categories.includes('coffee')) cat = 'SOFT_DRINK';

      return {
        name: p.product_name_vi || p.product_name || p.product_name_en || 'Sản phẩm F&B Quốc Tế',
        category: cat,
        image_url: p.image_front_url || p.image_url || 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500',
        base_price: 45000.00,
        current_price: 45000.00,
        min_price: 25000.00,
        max_price: 95000.00,
        elasticity_k: 0.015,
        linked_asset: cat === 'BEER' ? 'EUR_VND' : cat === 'SOFT_DRINK' ? 'COFFEE' : 'BTC',
        asset_multiplier: 1.0
      };
    });
  } catch (err) {
    console.warn('[Global Food API] OpenFoodFacts error:', err.message);
    return [];
  }
};

const fetchGlobalBeverages = async () => {
  try {
    const res = await fetch('https://www.thecocktaildb.com/api/json/v1/1/search.php?s=m');
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.drinks) return [];

    return data.drinks.slice(0, 5).map(d => ({
      name: d.strDrink + ' (Quốc Tế)',
      category: 'COCKTAIL',
      image_url: d.strDrinkThumb || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=500',
      base_price: 85000.00,
      current_price: 85000.00,
      min_price: 55000.00,
      max_price: 160000.00,
      elasticity_k: 0.02,
      linked_asset: 'EUR_VND',
      asset_multiplier: 0.5
    }));
  } catch (err) {
    console.warn('[Global Food API] TheCocktailDB fetch fallback error:', err.message);
    return [];
  }
};

const fetchGlobalMeals = async () => {
  try {
    const res = await fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=b');
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.meals) return [];

    return data.meals.slice(0, 5).map(m => ({
      name: m.strMeal + ' (Quốc Tế)',
      category: 'FOOD',
      image_url: m.strMealThumb || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
      base_price: 125000.00,
      current_price: 125000.00,
      min_price: 85000.00,
      max_price: 250000.00,
      elasticity_k: 0.025,
      linked_asset: 'COFFEE',
      asset_multiplier: 1000.0
    }));
  } catch (err) {
    console.warn('[Global Food API] TheMealDB fetch fallback error:', err.message);
    return [];
  }
};

/**
 * Authentic Vietnamese Food & Beverage Specialty Dataset
 */
const getVietnamIconicItems = () => [
  {
    name: 'Phở Bò Wagyu Hà Nội (Việt Nam)',
    category: 'FOOD',
    image_url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500',
    base_price: 95000.00,
    current_price: 95000.00,
    min_price: 65000.00,
    max_price: 195000.00,
    elasticity_k: 0.025,
    linked_asset: 'BTC',
    asset_multiplier: 0.000001
  },
  {
    name: 'Bánh Mỳ Nướng Cột Điện Sài Gòn (Việt Nam)',
    category: 'FOOD',
    image_url: 'https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=500',
    base_price: 35000.00,
    current_price: 35000.00,
    min_price: 25000.00,
    max_price: 75000.00,
    elasticity_k: 0.018,
    linked_asset: null,
    asset_multiplier: 1.0
  },
  {
    name: 'Cà Phê Trứng Giảng Hà Nội (Việt Nam)',
    category: 'SOFT_DRINK',
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500',
    base_price: 45000.00,
    current_price: 45000.00,
    min_price: 30000.00,
    max_price: 90000.00,
    elasticity_k: 0.02,
    linked_asset: 'COFFEE',
    asset_multiplier: 15.0
  },
  {
    name: 'Bia Hơi Hà Nội 1976 (Việt Nam)',
    category: 'BEER',
    image_url: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500',
    base_price: 15000.00,
    current_price: 15000.00,
    min_price: 10000.00,
    max_price: 35000.00,
    elasticity_k: 0.012,
    linked_asset: 'EUR_VND',
    asset_multiplier: 0.2
  },
  {
    name: 'Trà Chanh Giã Tay Quảng Châu & Việt Nam',
    category: 'SOFT_DRINK',
    image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500',
    base_price: 32000.00,
    current_price: 32000.00,
    min_price: 20000.00,
    max_price: 65000.00,
    elasticity_k: 0.015,
    linked_asset: null,
    asset_multiplier: 1.0
  }
];

/**
 * Curated Global Menu Preset for international coverage
 */
const getPresetGlobalItems = () => [
  {
    name: 'Bia Heineken Silver Premium (Hà Lan)',
    category: 'BEER',
    image_url: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500',
    base_price: 45000.00,
    current_price: 48500.00,
    min_price: 32000.00,
    max_price: 95000.00,
    elasticity_k: 0.02,
    linked_asset: 'EUR_VND',
    asset_multiplier: 0.5
  },
  {
    name: 'Steak Thắt Lưng Bò Wagyu A5 (Nhật Bản)',
    category: 'FOOD',
    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500',
    base_price: 250000.00,
    current_price: 250000.00,
    min_price: 180000.00,
    max_price: 550000.00,
    elasticity_k: 0.03,
    linked_asset: 'BTC',
    asset_multiplier: 1.5
  },
  {
    name: 'Cocktail Mojito Bạc Hà Havana (Cuba)',
    category: 'COCKTAIL',
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500',
    base_price: 75000.00,
    current_price: 75000.00,
    min_price: 50000.00,
    max_price: 150000.00,
    elasticity_k: 0.015,
    linked_asset: 'EUR_VND',
    asset_multiplier: 0.8
  },
  {
    name: 'Cold Brew Cà Phê Arabica Cauca (Colombia)',
    category: 'SOFT_DRINK',
    image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500',
    base_price: 55000.00,
    current_price: 55000.00,
    min_price: 38000.00,
    max_price: 110000.00,
    elasticity_k: 0.02,
    linked_asset: 'COFFEE',
    asset_multiplier: 1200.0
  },
  {
    name: 'Bánh Pizza Truffle Nấm Ý (Italia)',
    category: 'FOOD',
    image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
    base_price: 145000.00,
    current_price: 145000.00,
    min_price: 95000.00,
    max_price: 280000.00,
    elasticity_k: 0.025,
    linked_asset: 'EUR_VND',
    asset_multiplier: 1.2
  }
];

module.exports = {
  fetchOpenFoodFacts,
  fetchGlobalBeverages,
  fetchGlobalMeals,
  getVietnamIconicItems,
  getPresetGlobalItems
};
