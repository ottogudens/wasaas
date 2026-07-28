import { IsString, IsOptional, MaxLength } from 'class-validator';

export class AiChatDto {
  @IsString()
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  systemPrompt?: string;

  @IsOptional()
  contextChunks?: string[];
}

export class AiChatWithContextDto {
  @IsString()
  tenantId: string;

  @IsString()
  customerPhone: string;

  @IsString()
  @MaxLength(4000)
  message: string;
}
