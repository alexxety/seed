import { useState } from 'react';
import './ProductList.css';

export default function ProductList({
  categories,
  products,
  selectedCategory,
  onSelectCategory,
  onProductClick,
  cartCount,
  onCartClick
}) {
  const filteredProducts = selectedCategory
    ? products.filter(p => p.category === selectedCategory)
    : products;

  return (
    <div className="product-list">
      <header className="header">
        <h1>🌿 Магазин семян</h1>
        <div className="cart-icon" onClick={onCartClick}>
          🛒
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </div>
      </header>

      <div className="category-filter">
        <button
          className={!selectedCategory ? 'active' : ''}
          onClick={() => onSelectCategory(null)}
        >
          Все
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={selectedCategory === cat.id ? 'active' : ''}
            onClick={() => onSelectCategory(cat.id)}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      <div className="products-grid">
        {filteredProducts.map(product => (
          <div
            key={product.id}
            className="product-card"
            onClick={() => onProductClick(product)}
          >
            <div className="product-image">
              <img
                src={product.image}
                alt={product.name}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '🌱';
                }}
              />
            </div>
            <h3 className="product-name">{product.name}</h3>
            <p className="product-price">{product.price} ₽</p>
            <button className="view-button">Подробнее →</button>
          </div>
        ))}
      </div>
    </div>
  );
}
