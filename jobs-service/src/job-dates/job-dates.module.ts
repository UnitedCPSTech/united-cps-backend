import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsModule } from '../jobs/jobs.module';
import { JobDatesController } from './job-dates.controller';
import { JobDatesService } from './job-dates.service';
import { JobDates, JobDatesSchema } from './schemas/job-dates.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: JobDates.name, schema: JobDatesSchema }]),
    JobsModule,
  ],
  controllers: [JobDatesController],
  providers: [JobDatesService],
  exports: [JobDatesService],
})
export class JobDatesModule {}