import './CartPage.css';

export default function CartPage({ cart, onBack, onUpdateQuantity, onRemove, onCheckout, total }) {
  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <header className="header">
          <button className="back-button" onClick={onBack}>
            ← Назад
          </button>
          <h2>Корзина</h2>
        </header>
        <div className="empty-cart">
          <p className="empty-icon">🛒</p>
          <p>Корзина пуста</p>
          <button className="continue-shopping" onClick={onBack}>
            Продолжить покупки
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <header className="header">
        <button className="back-button" onClick={onBack}>
          ← Назад
        </button>
        <h2>Корзина</h2>
      </header>

      <div className="cart-items">
        {cart.map(item => (
          <div key={item.id} className="cart-item">
            <div className="item-image">
              <img
                src={item.image}
                alt={item.name}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '🌱';
                }}
              />
            </div>
            <div className="item-details">
              <h3>{item.name}</h3>
              <p className="item-price">{item.price} ₽</p>
              <div className="quantity-controls">
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  className="qty-btn"
                >
                  −
                </button>
                <span className="quantity">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="qty-btn"
                >
                  +
                </button>
              </div>
              <p className="item-total">
                Сумма: {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
              </p>
            </div>
            <button className="remove-btn" onClick={() => onRemove(item.id)}>
              🗑️
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="summary-row">
          <span>Итого:</span>
          <span className="total-price">{total.toLocaleString('ru-RU')} ₽</span>
        </div>
        <button className="checkout-btn" onClick={onCheckout}>
          Оформить заказ
        </button>
      </div>
    </div>
  );
}
