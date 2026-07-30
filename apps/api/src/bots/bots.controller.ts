import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req, UnauthorizedException, Headers } from '@nestjs/common';
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

class SendMessageDto {
  @IsString()
  content: string;
}

@Controller('bots/internal')
export class InternalBotsController {
  constructor(private readonly botsService: BotsService) {}

  private validateApiKey(apiKey: string) {
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      throw new UnauthorizedException('Invalid API Key');
    }
  }

  @Get('active-bots')
  async getActiveBots(@Headers('x-api-key') apiKey: string) {
    this.validateApiKey(apiKey);
    return this.botsService.getActiveBots();
  }

  @Post('webhook')
  async webhook(@Headers('x-api-key') apiKey: string, @Body() data: any) {
    this.validateApiKey(apiKey);
    return this.botsService.handleWebhook(data);
  }
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
  
  @Post('conversations/:conversationId/messages')
  async sendMessage(@Param('conversationId') conversationId: string, @Req() req: any, @Body() dto: SendMessageDto) {
    return this.botsService.sendManualMessage(conversationId, req.user.organizationId, dto.content);
  }
}
