# Payment service

# Mục đích

- Source có khả năng thêm các cổng thanh toán tuỳ chỉnh dễ dàng.
- Khi có thanh toán mới, bot sẽ gửi thông báo thông qua Telegram, Discord tuỳ vào config.
- Khi có thanh toán mới, sẽ gửi webhook để các service khác cộng số dư cho user.
- Sử dụng bullmq

# Next ?

- Dockerfile & public image
- Database
- Auth

![image info](./docs/a.png)

# Cài đặt

## Tạo file config.yml

- Xem ví dụ tại config/config.example.yml

## Khởi chạy với docker

```
docker-compose up -d
```

## Hướng dẫn thêm cổng thanh toán

- Tạo thêm file mới `/gateways/gateway-factory/yourgateway.services.ts`

```ts
import { GateType, Payment } from '../gate.interface';
import { Gate } from '../gates.services';

export class YourGatewayService extends Gate {
  async getHistory(): Promise<Payment[]> {
    // your code here
    return ...
  }
}
```

- Sửa `GateType` (nếu cần)
- Cập nhật `GateFactory`

## Hướng dẫn tích hợp web2m

## Hướng dẫn tích hợp bot Telegram

```

```
