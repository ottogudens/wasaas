import { Module } from '@nestjs/common';
import { BotsService } from './bots.service';
import { BotsController, InternalBotsController } from './bots.controller';

@Module({
  controllers: [BotsController, InternalBotsController],
  providers: [BotsService],
  exports: [BotsService],
})
export class BotsModule {}
