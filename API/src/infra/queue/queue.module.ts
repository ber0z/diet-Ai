import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('REDIS_HOST');
        const portRaw = config.get<string>('REDIS_PORT');

        if (!host) throw new Error('REDIS_HOST não definido no .env');
        if (!portRaw) throw new Error('REDIS_PORT não definido no .env');

        const port = Number.parseInt(portRaw, 10);
        if (!Number.isFinite(port))
          throw new Error(`REDIS_PORT inválido: "${portRaw}"`);

        return { connection: { host, port } };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
