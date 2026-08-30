// types/flutterwave.d.ts

declare module 'flutterwave-node-v3' {
  export interface FlwResponse<T = any> {
    status: 'success' | 'error';
    message: string;
    data: T;
  }

  export default class Flutterwave {
    constructor(publicKey: string, secretKey: string);
    
    Payment: {
      create(payload: {
        tx_ref: string;
        amount: number;
        currency: string;
        redirect_url: string;
        customer: {
          email: string;
          phone_number?: string;
          name: string;
        };
        customizations?: {
          title?: string;
          description?: string;
          logo?: string;
        };
      }): Promise<FlwResponse<{ link: string }>>;
    };
    
    Transaction: {
      verify(payload: { id: string | number }): Promise<FlwResponse>;
    };
  }
}
