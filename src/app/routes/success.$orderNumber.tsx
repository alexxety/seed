import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const Route = createFileRoute('/success/$orderNumber')({
  component: SuccessPage,
});

function SuccessPage() {
  const navigate = useNavigate();
  const { orderNumber } = Route.useParams();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="text-7xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">Заказ оформлен!</h1>
        <p className="text-tg-hint mb-6">
          Номер заказа: <span className="font-semibold">#{orderNumber}</span>
        </p>
        <p className="mb-6">Спасибо за заказ! Мы свяжемся с вами в ближайшее время.</p>
        <Button onClick={() => navigate({ to: '/' })} className="w-full">
          Вернуться на главную
        </Button>
      </Card>
    </div>
  );
}
