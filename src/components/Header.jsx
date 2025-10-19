function Header({ cartCount, onCartClick }) {
  return (
    <header className="header">
      <h1>Магазин</h1>
      <button className="cart-button" onClick={onCartClick}>
        🛒 Корзина {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
      </button>
    </header>
  );
}

export default Header;
