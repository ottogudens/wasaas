import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { FeaturesService } from './features.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('features')
@UseGuards(JwtAuthGuard)
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get()
  async getFeatures(@Req() req: any) {
    // req.user has { userId, organizationId, email, role } based on JwtStrategy
    const organizationId = req.user.organizationId;
    const features = await this.featuresService.getFeaturesForOrganization(organizationId);
    
    return {
      features
    };
  }
}
