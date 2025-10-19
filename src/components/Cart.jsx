function Cart({ cart, onRemove, onAdd, onClose }) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="cart">
      <div className="cart-header">
        <h2>Корзина</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {cart.length === 0 ? (
        <p className="empty-cart">Корзина пуста</p>
      ) : (
        <>
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <span className="cart-item-icon">{item.image}</span>
                  <div>
                    <h4>{item.name}</h4>
                    <p className="cart-item-price">{item.price.toLocaleString('ru-RU')} ₽</p>
                  </div>
                </div>
                <div className="cart-item-controls">
                  <button onClick={() => onRemove(item.id)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => onAdd(item)}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-total">
            <h3>Итого: {total.toLocaleString('ru-RU')} ₽</h3>
          </div>
        </>
      )}
    </div>
  );
}

export default Cart;
