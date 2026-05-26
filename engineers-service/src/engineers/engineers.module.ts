import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EngineersController } from './engineers.controller';
import { EngineersService } from './engineers.service';
import { Engineer, EngineerSchema } from './schemas/engineer.schema';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: Engineer.name, schema: EngineerSchema }],
      'engineers',
    ),
  ],
  controllers: [EngineersController],
  providers: [EngineersService],
  exports: [EngineersService],
})
export class EngineersModule {}
