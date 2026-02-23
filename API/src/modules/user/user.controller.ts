import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from './user.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@ApiTags('Users')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: { id: number }) {
    return this.users.me(user.id);
  }

  @Put('me/profile')
  upsertProfile(
    @CurrentUser() user: { id: number },
    @Body() dto: UpsertProfileDto,
  ) {
    return this.users.upsertProfile(user.id, dto);
  }
}
