import { PayHereGateway } from './payhere.gateway';
import { PayHereService } from '../payhere.service';

describe('PayHereGateway', () => {
  let payHereService: jest.Mocked<
    Pick<
      PayHereService,
      'isConfigured' | 'verifyNotifySignature' | 'buildCheckoutParams'
    >
  >;
  let gateway: PayHereGateway;

  beforeEach(() => {
    payHereService = {
      isConfigured: jest.fn().mockReturnValue(true),
      verifyNotifySignature: jest.fn(),
      buildCheckoutParams: jest.fn().mockReturnValue({ order_id: 'PO-1', hash: 'abc' }),
    };

    gateway = new PayHereGateway(payHereService as unknown as PayHereService);
  });

  it('maps paid status code to paid verification result', () => {
    payHereService.verifyNotifySignature.mockReturnValue(true);

    const result = gateway.verifyWebhook({
      merchant_id: 'm',
      order_id: 'PO-1',
      payhere_amount: '5000.00',
      payhere_currency: 'LKR',
      status_code: '2',
      md5sig: 'SIG',
      payment_id: 'PH-99',
    });

    expect(result.valid).toBe(true);
    expect(result.status).toBe('paid');
    expect(result.transactionId).toBe('PH-99');
  });

  it('rejects invalid signatures', () => {
    payHereService.verifyNotifySignature.mockReturnValue(false);

    const result = gateway.verifyWebhook({
      merchant_id: 'm',
      order_id: 'PO-1',
      payhere_amount: '5000.00',
      payhere_currency: 'LKR',
      status_code: '2',
      md5sig: 'BAD',
    });

    expect(result.valid).toBe(false);
  });
});
