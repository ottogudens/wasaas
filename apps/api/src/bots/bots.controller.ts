import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, UnauthorizedException, Headers } from '@nestjs/common';
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

class SendDocumentDto {
  @IsString()
  customerPhone: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  documentTitle?: string;

  @IsString()
  @MinLength(1)
  documentContent: string;
}

@Controller('bots/internal')
export class InternalBotsController {
  constructor(private readonly botsService: BotsService) {}

  private validateApiKey(apiKey: string) {
    // INTERNAL_API_KEY es obligatoria — check-env.ts ya validó que existe al arrancar.
    const expectedKey = process.env.INTERNAL_API_KEY;
    if (!apiKey || apiKey !== expectedKey) {
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
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    return this.botsService.listBots(req.user.organizationId, isSuperAdmin);
  }

  @Post()
  async createBot(@Req() req: any, @Body() dto: CreateBotDto) {
    return this.botsService.createBot(req.user.organizationId, dto);
  }

  @Get(':id')
  async getBot(@Param('id') id: string, @Req() req: any) {
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    return this.botsService.getBot(id, req.user.organizationId, isSuperAdmin);
  }

  @Patch(':id')
  async updateBot(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateBotDto) {
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    // Si el usuario no es SUPER_ADMIN, remover la modificación de aiModel para evitar cambios no autorizados
    if (!isSuperAdmin) {
      delete dto.aiModel;
    }
    return this.botsService.updateBot(id, req.user.organizationId, dto, isSuperAdmin);
  }

  @Delete(':id')
  async deleteBot(@Param('id') id: string, @Req() req: any) {
    return this.botsService.deleteBot(id, req.user.organizationId);
  }

  @Get(':id/conversations')
  async listConversations(@Param('id') id: string, @Req() req: any) {
    return this.botsService.listConversations(id, req.user.organizationId);
  }

  @Delete(':id/conversations')
  async clearConversations(@Param('id') id: string, @Req() req: any) {
    return this.botsService.clearAllConversations(id, req.user.organizationId);
  }

  @Delete('conversations/:conversationId')
  async deleteConversation(@Param('conversationId') conversationId: string, @Req() req: any) {
    return this.botsService.deleteConversation(conversationId, req.user.organizationId);
  }

  @Get('conversations/:conversationId/messages')
  async getMessages(@Param('conversationId') conversationId: string, @Req() req: any) {
    return this.botsService.getConversationMessages(conversationId, req.user.organizationId);
  }
  
  @Post('conversations/:conversationId/messages')
  async sendMessage(@Param('conversationId') conversationId: string, @Req() req: any, @Body() dto: SendMessageDto) {
    return this.botsService.sendManualMessage(conversationId, req.user.organizationId, dto.content);
  }

  @Post(':id/send-document')
  async sendDocument(@Param('id') id: string, @Req() req: any, @Body() dto: SendDocumentDto) {
    return this.botsService.sendDocument(id, req.user.organizationId, dto);
  }

  @Patch('conversations/:conversationId/human-mode')
  async toggleHumanMode(
    @Param('conversationId') conversationId: string,
    @Req() req: any,
    @Body('isHumanMode') isHumanMode?: boolean,
  ) {
    return this.botsService.toggleHumanMode(conversationId, req.user.organizationId, isHumanMode);
  }

  @Post(':id/start')
  async startBot(@Param('id') id: string, @Req() req: any) {
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    return this.botsService.startBot(id, req.user.organizationId, isSuperAdmin);
  }

  @Post(':id/pair-phone')
  async requestPairingCode(
    @Param('id') id: string,
    @Req() req: any,
    @Body('phoneNumber') phoneNumber: string,
  ) {
    return this.botsService.requestPairingCode(id, req.user.organizationId, phoneNumber);
  }
}
