import { useState, useEffect } from 'react';
import { categories, products } from './data/products';
import ProductList from './pages/ProductList';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import './App.css';

function App() {
  const [page, setPage] = useState('list'); // 'list', 'product', 'cart', 'checkout'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);

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
  }, []);

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

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

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
        />
      )}
    </div>
  );
}

export default App;
