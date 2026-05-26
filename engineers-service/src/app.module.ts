import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { EngineersModule } from './engineers/engineers.module';
import { TimeoffModule } from './time-off/time-off.module';
import { AvailabilityModule } from './availability/availability.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_AUTH_URI as string, {
      dbName: 'auth_db',
      connectionName: 'auth',
    }),

    MongooseModule.forRoot(process.env.MONGO_ENGINEERS_URI as string, {
      dbName: 'engineers_db',
      connectionName: 'engineers',
    }),

    AuthModule,
    EngineersModule,
    TimeoffModule,
    AvailabilityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}