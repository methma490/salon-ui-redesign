import { registerAs } from '@nestjs/config';

export default registerAs('payhere', () => {
  const env = (process.env.PAYHERE_ENV ?? '').toLowerCase();
  const sandbox =
    env === 'sandbox'
      ? true
      : env === 'production' || env === 'live'
        ? false
        : process.env.PAYHERE_SANDBOX !== 'false';

  return {
    merchantId: process.env.PAYHERE_MERCHANT_ID ?? '',
    merchantSecret: process.env.PAYHERE_MERCHANT_SECRET ?? process.env.PAYHERE_SECRET ?? '',
    sandbox,
    notifyUrl: process.env.PAYHERE_NOTIFY_URL ?? '',
    returnUrl: process.env.PAYHERE_RETURN_URL ?? '',
    cancelUrl: process.env.PAYHERE_CANCEL_URL ?? '',
    allowReturnConfirm: process.env.PAYHERE_ALLOW_RETURN_CONFIRM === 'true',
  };
});
