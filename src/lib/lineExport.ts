import type { UserOrder } from '../types';

export function buildLineExport(orders: UserOrder[]): string {
  const lines = ['名字/餐點/價格'];
  orders.forEach(order => {
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        lines.push(`${order.filler_name}/${item.meal.name} × ${item.quantity}/${item.subtotal}`);
      });
    } else {
      lines.push(`${order.filler_name}/無餐點明細/${order.total_price}`);
    }
  });
  return lines.join('\n');
}
