import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateDietRequestDto } from './dto/create-diet-request.dto';
import { DietService } from './diet.service';
import { JsonObject } from '../../common/types/json';

@UseGuards(JwtAuthGuard)
@Controller('diets')
export class DietController {
  constructor(private diet: DietService) {}

  @Post()
  create(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateDietRequestDto,
  ) {
    const config: JsonObject = {
      ...(dto.config.days !== undefined ? { days: dto.config.days } : {}),
      ...(dto.config.mealsPerDay !== undefined
        ? { mealsPerDay: dto.config.mealsPerDay }
        : {}),

      ...(dto.config.preferences
        ? { preferences: { ...dto.config.preferences } }
        : {}),

      ...(dto.config.constraints
        ? { constraints: { ...dto.config.constraints } }
        : {}),

      ...(dto.config.targets ? { targets: { ...dto.config.targets } } : {}),

      ...(dto.notes ? { notes: dto.notes } : {}),
    };

    return this.diet.createRequest(user.id, config);
  }

  @Get()
  list(@CurrentUser() user: { id: number }) {
    return this.diet.listRequests(user.id);
  }

  @Get('/:id')
  get(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.diet.getRequest(user.id, id);
  }
}
