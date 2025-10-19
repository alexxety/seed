import { useState, useEffect } from 'react';
import { categories, products } from './data/products';
import Header from './components/Header';
import CategoryFilter from './components/CategoryFilter';
import ProductCard from './components/ProductCard';
import Cart from './components/Cart';
import './App.css';

function App() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

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

  useEffect(() => {
    const tg = window.Telegram.WebApp;

    if (cart.length > 0) {
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      tg.MainButton.setText(`Оформить заказ (${total.toLocaleString('ru-RU')} ₽)`);
      tg.MainButton.show();

      tg.MainButton.onClick(() => {
        const orderData = {
          items: cart,
          total: total
        };
        tg.sendData(JSON.stringify(orderData));
      });
    } else {
      tg.MainButton.hide();
    }

    return () => {
      tg.MainButton.offClick();
    };
  }, [cart]);

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category === selectedCategory)
    : products;

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === productId);
      if (existingItem.quantity === 1) {
        return prevCart.filter(item => item.id !== productId);
      }
      return prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  };

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="app">
      <Header cartCount={cartItemsCount} onCartClick={() => setShowCart(!showCart)} />

      {showCart ? (
        <Cart cart={cart} onRemove={removeFromCart} onAdd={addToCart} onClose={() => setShowCart(false)} />
      ) : (
        <>
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />

          <div className="products-grid">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={addToCart}
                cartQuantity={cart.find(item => item.id === product.id)?.quantity || 0}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
