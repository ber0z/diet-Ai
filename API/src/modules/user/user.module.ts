import { Module } from '@nestjs/common';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';
import { UsersRepository } from './user.repository';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
})
export class UserModule {}
