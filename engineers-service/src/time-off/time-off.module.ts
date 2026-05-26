import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TimeoffController } from './time-off.controller';
import { TimeOffService } from './time-off.service';

import { TimeOffRequest, TimeOffRequestSchema } from './schemas/time-off-request.schema';
import { Engineer, EngineerSchema } from '../engineers/schemas/engineer.schema';

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: TimeOffRequest.name, schema: TimeOffRequestSchema },
        { name: Engineer.name, schema: EngineerSchema },
      ],
      'engineers',
    ),
  ],
  controllers: [TimeoffController],
  providers: [TimeOffService],
  exports: [TimeOffService],
})
export class TimeoffModule {}