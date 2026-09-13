import { Injectable, NotFoundException } from '@nestjs/common';
import { InAppNotificationStatus, Prisma } from '@prisma/client';
import {
  buildPaginatedResponse,
  resolvePagination,
} from '../common/dto/pagination.dto';
import { PrismaService } from '../database/prisma.service';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listInApp(tenantId: string, query: NotificationQueryDto) {
    const { page, limit, offset } = resolvePagination(query.page, query.limit);
    const where: Prisma.NotificationWhereInput = {
      tenantId,
      ...(query.unreadOnly ? { status: InAppNotificationStatus.UNREAD } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async markRead(id: string, tenantId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, tenantId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.status === InAppNotificationStatus.READ) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: InAppNotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  async markAllRead(tenantId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { tenantId, status: InAppNotificationStatus.UNREAD },
      data: {
        status: InAppNotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  async unreadCount(tenantId: string) {
    const count = await this.prisma.notification.count({
      where: { tenantId, status: InAppNotificationStatus.UNREAD },
    });

    return { count };
  }
}
