import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { assertTrustedTenantSchemaName } from '../utils/schema-name.util';

export interface TenantSchemaContext {
  tx: Prisma.TransactionClient;
  schemaName: string;
}

@Injectable()
export class TenantSchemaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run queries against a tenant schema using schema-qualified table names.
   * Avoids SET search_path to prevent prepared-statement cache issues across schemas.
   */
  async withTenantSchema<T>(
    schemaName: string,
    callback: (ctx: TenantSchemaContext) => Promise<T>,
  ): Promise<T> {
    assertTrustedTenantSchemaName(schemaName);

    return this.prisma.$transaction(async (tx) =>
      callback({
        tx,
        schemaName,
      }),
    );
  }
}
