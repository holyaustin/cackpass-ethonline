// types/biconomy.d.ts
declare module '@biconomy/account' {
  export class BiconomySmartAccountV2 {
    static create(config: any): Promise<BiconomySmartAccountV2>
    sendUserOp(userOp: any): Promise<any>
    buildUserOp(transactions: any[]): Promise<any>
    getAccountAddress(): Promise<string>
    paymaster: any
  }
  
  export const DEFAULT_ENTRYPOINT_ADDRESS: string
  
  export function createECDSAOwnershipValidationModule(config: {
    signer: any
    moduleAddress: string
  }): Promise<any>
}

declare module '@biconomy/bundler' {
  export class Bundler {
    constructor(config: any)
  }
  export interface IBundler {
    // Interface methods
  }
}

declare module '@biconomy/paymaster' {
  export class BiconomyPaymaster {
    constructor(config: any)
    getPaymasterAndData(userOp: any): Promise<{ paymasterAndData: string }>
  }
  export interface IPaymaster {
    getPaymasterAndData(userOp: any): Promise<{ paymasterAndData: string }>
  }
}