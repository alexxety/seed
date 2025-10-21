import { useState } from 'react';
import './CheckoutPage.css';

export default function CheckoutPage({ cart, total, onBack, onOrderSuccess }) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    deliveryType: 'address', // 'address' or 'pvz'
    deliveryDetails: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Очистить ошибку при изменении поля
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Введите ФИО';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Введите телефон';
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Некорректный номер телефона';
    }

    if (!formData.deliveryDetails.trim()) {
      newErrors.deliveryDetails = formData.deliveryType === 'address'
        ? 'Введите адрес доставки'
        : 'Введите номер ПВЗ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sendToTelegram = async (orderData) => {
    const response = await fetch('/api/send-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send order');
    }

    return await response.json();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    // Получаем данные пользователя Telegram
    const tg = window.Telegram?.WebApp;
    const telegramUser = tg?.initDataUnsafe?.user || {};

    const orderData = {
      customer: {
        ...formData,
        telegramUsername: telegramUser.username || null,
        telegramId: telegramUser.id || null,
        telegramFirstName: telegramUser.first_name || null,
        telegramLastName: telegramUser.last_name || null
      },
      items: cart,
      total
    };

    try {
      const result = await sendToTelegram(orderData);

      // Переходим на страницу успешного заказа
      if (result.orderNumber) {
        onOrderSuccess(result.orderNumber);
      }
    } catch (error) {
      console.error('Ошибка отправки заказа:', error);
      alert('Ошибка при оформлении заказа. Попробуйте еще раз.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkout-page">
      <header className="header">
        <button className="back-button" onClick={onBack}>
          ← Назад
        </button>
        <h2>Оформление заказа</h2>
      </header>

      <form className="checkout-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>ФИО *</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Иванов Иван Иванович"
            className={errors.fullName ? 'error' : ''}
          />
          {errors.fullName && <span className="error-text">{errors.fullName}</span>}
        </div>

        <div className="form-group">
          <label>Телефон *</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+7 999 123-45-67"
            className={errors.phone ? 'error' : ''}
          />
          {errors.phone && <span className="error-text">{errors.phone}</span>}
        </div>

        <div className="form-group">
          <label>Тип доставки *</label>
          <div className="delivery-options">
            <label className="radio-option">
              <input
                type="radio"
                name="deliveryType"
                value="address"
                checked={formData.deliveryType === 'address'}
                onChange={handleChange}
              />
              <span>📍 По адресу</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="deliveryType"
                value="pvz"
                checked={formData.deliveryType === 'pvz'}
                onChange={handleChange}
              />
              <span>📦 СДЕК ПВЗ</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>
            {formData.deliveryType === 'address' ? 'Адрес доставки *' : 'Номер ПВЗ *'}
          </label>
          <input
            type="text"
            name="deliveryDetails"
            value={formData.deliveryDetails}
            onChange={handleChange}
            placeholder={
              formData.deliveryType === 'address'
                ? 'г. Москва, ул. Пушкина, д. 10'
                : 'MSK125'
            }
            className={errors.deliveryDetails ? 'error' : ''}
          />
          {errors.deliveryDetails && <span className="error-text">{errors.deliveryDetails}</span>}
        </div>

        <div className="order-summary">
          <h3>Ваш заказ</h3>
          {cart.map(item => (
            <div key={item.id} className="summary-item">
              <div className="summary-item-image">
                <img
                  src={item.image}
                  alt={item.name}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '🌱';
                  }}
                />
              </div>
              <div className="summary-item-info">
                <span className="summary-item-name">{item.name}</span>
                <span className="summary-item-quantity">{item.quantity} шт. × {item.price} ₽</span>
              </div>
              <span className="summary-item-total">{(item.price * item.quantity).toLocaleString('ru-RU')} ₽</span>
            </div>
          ))}
          <div className="summary-total">
            <span>Итого:</span>
            <span>{total.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
        <button
          type="submit"
          className="submit-btn"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Отправка...' : 'Подтвердить заказ'}
        </button>
      </form>
    </div>
  );
}
