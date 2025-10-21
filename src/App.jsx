import { useState, useEffect } from 'react';
import ProductList from './pages/ProductList';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import './App.css';

function App() {
  const [page, setPage] = useState('list'); // 'list', 'product', 'cart', 'checkout', 'success'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [orderNumber, setOrderNumber] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // Настройка темы
    document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
    document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#3390ec');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');

    // Загрузка данных из API
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем категории и товары параллельно
      const [categoriesRes, productsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/products')
      ]);

      if (!categoriesRes.ok || !productsRes.ok) {
        throw new Error('Ошибка загрузки данных');
      }

      const categoriesData = await categoriesRes.json();
      const productsData = await productsRes.json();

      // Преобразуем данные из API в нужный формат
      const transformedCategories = categoriesData.categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon
      }));

      const transformedProducts = productsData.products.map(prod => ({
        id: prod.id,
        name: prod.name,
        price: prod.price,
        category: prod.category_id,
        image: prod.image,
        description: prod.description
      }));

      setCategories(transformedCategories);
      setProducts(transformedProducts);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { ...product, quantity }];
    });
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.id !== productId));
    } else {
      setCart(prevCart => prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const openProduct = (product) => {
    setSelectedProduct(product);
    setPage('product');
  };

  const handleOrderSuccess = (orderNum) => {
    setOrderNumber(orderNum);
    setCart([]); // Очищаем корзину
    setPage('success');
  };

  const handleBackToHome = () => {
    setPage('list');
    setSelectedCategory(null);
    setOrderNumber(null);
  };

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Отображение загрузки
  if (loading) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '20px' }}>
        <div style={{ fontSize: '48px' }}>⏳</div>
        <div style={{ fontSize: '18px', color: '#666' }}>Загрузка товаров...</div>
      </div>
    );
  }

  // Отображение ошибки
  if (error) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '20px', padding: '20px' }}>
        <div style={{ fontSize: '48px' }}>❌</div>
        <div style={{ fontSize: '18px', color: '#c62828', textAlign: 'center' }}>Ошибка загрузки: {error}</div>
        <button
          onClick={loadData}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: '#3390ec',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      {page === 'list' && (
        <ProductList
          categories={categories}
          products={products}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onProductClick={openProduct}
          cartCount={cartItemsCount}
          onCartClick={() => setPage('cart')}
        />
      )}

      {page === 'product' && (
        <ProductPage
          product={selectedProduct}
          onBack={() => setPage('list')}
          onAddToCart={(quantity) => {
            addToCart(selectedProduct, quantity);
            setPage('list');
          }}
          cartCount={cartItemsCount}
          onCartClick={() => setPage('cart')}
        />
      )}

      {page === 'cart' && (
        <CartPage
          cart={cart}
          onBack={() => setPage('list')}
          onUpdateQuantity={updateCartQuantity}
          onRemove={removeFromCart}
          onCheckout={() => setPage('checkout')}
          total={cartTotal}
        />
      )}

      {page === 'checkout' && (
        <CheckoutPage
          cart={cart}
          total={cartTotal}
          onBack={() => setPage('cart')}
          onOrderSuccess={handleOrderSuccess}
        />
      )}

      {page === 'success' && (
        <OrderSuccessPage
          orderNumber={orderNumber}
          onBackToHome={handleBackToHome}
        />
      )}
    </div>
  );
}

export default App;
