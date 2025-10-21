import { useState } from 'react';
import './ProductPage.css';

export default function ProductPage({ product, onBack, onAddToCart, cartCount, onCartClick }) {
  const [quantity, setQuantity] = useState(1);

  const increaseQuantity = () => setQuantity(q => q + 1);
  const decreaseQuantity = () => setQuantity(q => (q > 1 ? q - 1 : 1));

  const totalPrice = product.price * quantity;

  return (
    <div className="product-page">
      <header className="header">
        <button className="back-button" onClick={onBack}>
          ← Назад
        </button>
        <div className="cart-icon" onClick={onCartClick}>
          🛒
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </div>
      </header>

      <div className="product-details">
        <div className="product-image-large">
          <img
            src={product.image}
            alt={product.name}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '🌱';
            }}
          />
        </div>

        <h1 className="product-title">{product.name}</h1>
        <p className="product-price-large">{product.price} ₽</p>

        <div className="product-description">
          <h3>Описание</h3>
          <p>{product.description}</p>
        </div>

        <div className="quantity-selector">
          <h3>Количество</h3>
          <div className="quantity-controls">
            <button onClick={decreaseQuantity} className="qty-btn">−</button>
            <span className="quantity">{quantity}</span>
            <button onClick={increaseQuantity} className="qty-btn">+</button>
          </div>
        </div>

        <div className="total-price">
          <span>Итого:</span>
          <span className="total-amount">{totalPrice.toLocaleString('ru-RU')} ₽</span>
        </div>

        <button className="add-to-cart-btn" onClick={() => onAddToCart(quantity)}>
          Добавить в корзину
        </button>
      </div>
    </div>
  );
}
