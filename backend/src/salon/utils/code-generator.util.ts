export async function generateSequentialCode(
  tx: { $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T> },
  table: string,
  prefix: string,
): Promise<string> {
  const result = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM ${table}`,
  );
  const next = Number(result[0]?.count ?? 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}
