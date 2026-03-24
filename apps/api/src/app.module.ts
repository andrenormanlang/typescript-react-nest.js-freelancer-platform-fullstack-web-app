import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import typeorm from './config/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SkillsModule } from './skills/skills.module';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { MailModule } from './mail/mail.module';
import { ChatGateway } from './chat/chat.gateway';
import { ChatModule } from './chat/chat.module';
import { RoomsModule } from './chat/rooms.module';
import { FirebaseModule } from './firebase/firebase.module';
import firebaseConfig from './config/firebase.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeorm, firebaseConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) =>
        configService.get('typeorm'),
      inject: [ConfigService],
    }),
    CacheModule.register({
      ttl: 5, // Cache time-to-live in seconds
      max: 100, // Maximum number of items in cache
    }),

    // ThrottlerModule global configuration
    ThrottlerModule.forRoot([
      {
        ttl: 60 * 1000, // Time window in milliseconds (60 seconds)
        limit: 10, // Max number of requests within the time window
      },
    ]),

    AuthModule,
    UsersModule,
    SkillsModule,
    MailModule,
    ChatModule,
    RoomsModule,
    FirebaseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Apply throttling globally
    },
  ],
})
export class AppModule {}
