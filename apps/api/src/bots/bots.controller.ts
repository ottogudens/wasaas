import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { BotsService } from './bots.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

class CreateBotDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  aiModel?: string;
}

class UpdateBotDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  aiModel?: string;
}

@Controller('bots')
@UseGuards(JwtAuthGuard)
export class BotsController {
  constructor(private readonly botsService: BotsService) {}

  @Get()
  async listBots(@Req() req: any) {
    return this.botsService.listBots(req.user.organizationId);
  }

  @Post()
  async createBot(@Req() req: any, @Body() dto: CreateBotDto) {
    return this.botsService.createBot(req.user.organizationId, dto);
  }

  @Get(':id')
  async getBot(@Param('id') id: string, @Req() req: any) {
    return this.botsService.getBot(id, req.user.organizationId);
  }

  @Patch(':id')
  async updateBot(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateBotDto) {
    return this.botsService.updateBot(id, req.user.organizationId, dto);
  }

  @Get(':id/conversations')
  async listConversations(@Param('id') id: string, @Req() req: any) {
    return this.botsService.listConversations(id, req.user.organizationId);
  }

  @Get('conversations/:conversationId/messages')
  async getMessages(@Param('conversationId') conversationId: string, @Req() req: any) {
    return this.botsService.getConversationMessages(conversationId, req.user.organizationId);
  }
}
