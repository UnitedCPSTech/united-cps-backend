import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { JobDatesModule } from './job-dates/job-dates.module';
import { AssignmentsModule } from './assignments/assignments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI as string, { dbName: 'jobs_db' }),

    AuthModule,
  JobsModule,
  JobDatesModule,
  AssignmentsModule,
  ],
})
export class AppModule {}