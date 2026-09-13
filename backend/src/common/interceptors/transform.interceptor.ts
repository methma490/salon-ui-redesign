import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const NUMERIC_FIELD_PATTERN =
  /^(subtotal|discount|total|amount|quantity|price|revenue|unitPrice|costPrice|sellingPrice|totalPrice|stockQuantity)$/i;

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber: () => number }).toNumber === 'function'
  );
}

function toNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }

  if (isDecimalLike(value)) {
    return value.toNumber();
  }

  return null;
}

function transformValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (isDecimalLike(value)) {
    return value.toNumber();
  }

  if (Array.isArray(value)) {
    return value.map(transformValue);
  }

  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const record = value as Record<string, unknown>;
    const transformed: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(record)) {
      if (NUMERIC_FIELD_PATTERN.test(key)) {
        const numeric = toNumeric(nestedValue);
        transformed[key] = numeric ?? transformValue(nestedValue);
      } else {
        transformed[key] = transformValue(nestedValue);
      }
    }

    return transformed;
  }

  return value;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => transformValue(data)));
  }
}
