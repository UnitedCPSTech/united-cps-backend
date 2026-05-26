import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { TimeOffRequest, TimeOffRequestSchema } from '../time-off/schemas/time-off-request.schema';
import { HttpModule } from '@nestjs/axios';


@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature(
      [{ name: TimeOffRequest.name, schema: TimeOffRequestSchema }],
      'engineers',
    ),
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}