import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionFeatureService } from '../subscriptions/subscription-feature.service';
import { FeatureGuard } from './guards/feature.guard';

describe('FeatureGuard', () => {
  let guard: FeatureGuard;
  let reflector: Reflector;
  let subscriptionFeatureService: jest.Mocked<Pick<SubscriptionFeatureService, 'hasFeature'>>;

  beforeEach(() => {
    reflector = new Reflector();
    subscriptionFeatureService = { hasFeature: jest.fn() };
    guard = new FeatureGuard(reflector, subscriptionFeatureService as never);
  });

  it('allows when all required subscription features are enabled', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['POS']);
    subscriptionFeatureService.hasFeature.mockResolvedValue(true);

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          tenantContext: { tenantId: 'tenant-a' },
        }),
      }),
    } as never;

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies with subscription message when feature unavailable (TEST 3)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['INVENTORY']);
    subscriptionFeatureService.hasFeature.mockResolvedValue(false);

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          tenantContext: { tenantId: 'tenant-a' },
        }),
      }),
    } as never;

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('This feature is not included in your current subscription.'),
    );
  });
});
