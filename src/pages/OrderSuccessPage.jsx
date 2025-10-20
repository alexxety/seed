import { useEffect, useState } from 'react';
import './OrderSuccessPage.css';

export default function OrderSuccessPage({ orderNumber, onBackToHome }) {
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orderNumber) {
      fetchOrderDetails();
    }
  }, [orderNumber]);

  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`/api/order/${orderNumber}`);

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      setOrderDetails(data.order);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="order-success-page">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-success-page">
        <div className="success-icon">✓</div>
        <h2>Заказ успешно оформлен!</h2>
        <p className="order-number">Номер заказа: <strong>{orderNumber}</strong></p>
        <p className="success-message">Мы свяжемся с вами в ближайшее время.</p>
        <button className="home-btn" onClick={onBackToHome}>
          Вернуться в каталог
        </button>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="order-success-page">
        <div className="error-icon">⚠️</div>
        <h2>Заказ не найден</h2>
        <button className="home-btn" onClick={onBackToHome}>
          Вернуться в каталог
        </button>
      </div>
    );
  }

  const deliveryLabel = orderDetails.deliveryType === 'address' ? '📍 По адресу' : '📦 СДЕК ПВЗ';
  const deliveryDetailsLabel = orderDetails.deliveryType === 'address' ? 'Адрес' : 'Номер ПВЗ';

  return (
    <div className="order-success-page">
      <div className="success-icon">✓</div>
      <h2>Заказ успешно оформлен!</h2>

      <div className="order-info">
        <div className="order-number-block">
          <span className="label">Номер заказа:</span>
          <span className="order-number-value">{orderDetails.orderNumber}</span>
        </div>

        <div className="customer-info">
          <h3>Информация о заказе</h3>
          <div className="info-row">
            <span className="label">ФИО:</span>
            <span className="value">{orderDetails.fullName}</span>
          </div>
          <div className="info-row">
            <span className="label">Телефон:</span>
            <span className="value">{orderDetails.phone}</span>
          </div>
          <div className="info-row">
            <span className="label">Доставка:</span>
            <span className="value">{deliveryLabel}</span>
          </div>
          <div className="info-row">
            <span className="label">{deliveryDetailsLabel}:</span>
            <span className="value">{orderDetails.deliveryDetails}</span>
          </div>
        </div>

        <div className="order-items">
          <h3>Состав заказа</h3>
          {orderDetails.items.map((item, index) => (
            <div key={index} className="order-item">
              <div className="item-name">{item.name}</div>
              <div className="item-details">
                {item.quantity} шт. × {item.price.toLocaleString('ru-RU')} ₽ = {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
              </div>
            </div>
          ))}

          <div className="order-total">
            <span>Итого:</span>
            <span className="total-amount">{orderDetails.total.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>

        <div className="success-message">
          <p>Мы получили ваш заказ и свяжемся с вами в ближайшее время для подтверждения.</p>
          <p>Спасибо за покупку! 🌱</p>
        </div>
      </div>

      <button className="home-btn" onClick={onBackToHome}>
        Вернуться в каталог
      </button>
    </div>
  );
}
