function ProductCard({ product, onAdd, cartQuantity }) {
  return (
    <div className="product-card">
      <div className="product-icon">{product.image}</div>
      <h3 className="product-name">{product.name}</h3>
      <p className="product-description">{product.description}</p>
      <div className="product-footer">
        <span className="product-price">{product.price.toLocaleString('ru-RU')} ₽</span>
        <button className="add-btn" onClick={() => onAdd(product)}>
          {cartQuantity > 0 ? `В корзине: ${cartQuantity}` : 'Добавить'}
        </button>
      </div>
    </div>
  );
}

export default ProductCard;
