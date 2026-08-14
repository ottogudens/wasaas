import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeaturesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todos los flags evaluados para una organización específica.
   */
  async getFeaturesForOrganization(organizationId: string): Promise<Record<string, boolean>> {
    const globalFlags = await this.prisma.featureFlag.findMany();
    const overrides = await this.prisma.organizationFeatureFlag.findMany({
      where: { organizationId },
    });

    const result: Record<string, boolean> = {};

    // Apply global defaults and percentage logic
    for (const flag of globalFlags) {
      if (!flag.isEnabled) {
        result[flag.name] = false;
      } else if (flag.percentage === 100) {
        result[flag.name] = true;
      } else if (flag.percentage === 0) {
        result[flag.name] = false;
      } else {
        // Simple deterministic percentage check using the organizationId
        // This is a naive hash: sum of char codes modulo 100
        let hash = 0;
        for (let i = 0; i < organizationId.length; i++) {
          hash += organizationId.charCodeAt(i);
        }
        const assignedValue = hash % 100;
        result[flag.name] = assignedValue < flag.percentage;
      }
    }

    // Apply specific organization overrides
    for (const override of overrides) {
      result[override.featureName] = override.isEnabled;
    }

    return result;
  }
}
