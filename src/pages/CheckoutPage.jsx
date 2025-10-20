import { useState } from 'react';
import './CheckoutPage.css';

export default function CheckoutPage({ cart, total, onBack }) {
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
    const tg = window.Telegram.WebApp;
    const chatId = '-1004869379501';

    const itemsList = cart.map(item =>
      `• ${item.name} - ${item.quantity} шт. × ${item.price} ₽ = ${(item.price * item.quantity).toLocaleString('ru-RU')} ₽`
    ).join('\n');

    const deliveryLabel = formData.deliveryType === 'address' ? '📍 По адресу' : '📦 СДЕК ПВЗ';
    const deliveryDetailsLabel = formData.deliveryType === 'address' ? 'Адрес' : 'Номер ПВЗ';

    const message = `🛒 НОВЫЙ ЗАКАЗ!

👤 ФИО: ${formData.fullName}
📱 Телефон: ${formData.phone}
🚚 Доставка: ${deliveryLabel}
${deliveryDetailsLabel}: ${formData.deliveryDetails}

📦 Товары:
${itemsList}

💰 Итого: ${total.toLocaleString('ru-RU')} ₽`;

    // Отправляем через Telegram WebApp API
    tg.sendData(JSON.stringify({
      chatId,
      message,
      order: orderData
    }));

    // Закрываем WebApp после отправки
    tg.close();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    const orderData = {
      customer: formData,
      items: cart,
      total
    };

    try {
      await sendToTelegram(orderData);
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
              <span>{item.name} × {item.quantity}</span>
              <span>{(item.price * item.quantity).toLocaleString('ru-RU')} ₽</span>
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
