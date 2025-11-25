import * as moment from 'moment';
import { Environment } from '../env-settings.service';
import { AppleNotificationUnifiedReceipt } from '../../routes/payments/payment-notifications';
import { request } from '../../utils/util';

const environments = {
    sandbox: 'https://sandbox.itunes.apple.com/verifyReceipt',
    production: 'https://buy.itunes.apple.com/verifyReceipt',
};

const responses: Record<number, string> = {
    21000: 'The App Store could not read the JSON object you provided.',
    21002: 'The data in the receipt-data property was malformed or missing.',
    21003: 'The receipt could not be authenticated.',
    21004: 'The shared secret you provided does not match the shared secret on file for your account.',
    21005: 'The receipt server is not currently available.',
    21006: 'This receipt is valid but the subscription has expired. ',
    21007: 'This receipt is from the test environment, but it was sent to the production service for verification. Send it to the test environment service instead.',
    21008: 'This receipt is from the production receipt, but it was sent to the test environment service for verification. Send it to the production environment service instead.',
    21009: 'Internal data access error. Try again later.',
    21010: 'The user account cannot be found or has been deleted.',
};

export interface AppleNotificationLatestReceiptInfo {
    original_transaction_id: string;
    transaction_id: string;
    expires_date: string;
}
export class AppleLastReceipt {
    receipt?: unknown;
    lastTransaction?: AppleNotificationLatestReceiptInfo;
    expiryDate?: moment.Moment;
}

export class AppleReceiptService {
    static async getReceiptData(receiptData: unknown) {
        const requestOptions = {
            'receipt-data': receiptData,
            'password': Environment.apiKeys.apple_shared_secret,
        };

        try {
            let response = await this.verifyReceipt(environments.production, requestOptions);
            if (response.status === 21007) {
                try {
                    response = await this.verifyReceipt(environments.sandbox, requestOptions);
                    if (response.status === 0) {
                        return Promise.resolve(this.parseReceipt(response));
                    } else {
                        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                        return Promise.reject(
                            (response.status ? responses[response.status] : undefined) ?? `unhandled status ${response.status}`,
                        );
                    }
                } catch (error) {
                    return Promise.reject(error as Error);
                }
            } else if (response.status === 0) {
                return Promise.resolve(this.parseReceipt(response));
            } else {
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                return Promise.reject((response.status ? responses[response.status] : undefined) ?? `unhandled status ${response.status}`);
            }
        } catch (error) {
            return Promise.reject(error as Error);
        }
    }

    private static async verifyReceipt(url: string, json: unknown) {
        const res = await request({
            method: 'POST',
            url,
            json,
        });
        return res.body as AppleNotificationUnifiedReceipt;
    }

    static parseReceipt(receiptData: AppleNotificationUnifiedReceipt) {
        let allReceipts: AppleNotificationLatestReceiptInfo[] = [];
        if (receiptData.latest_receipt_info?.[0]) {
            allReceipts = receiptData.latest_receipt_info.sort((a, b) => {
                return moment(a.expires_date, 'YYYY-MM-DD HH:mm:ss').isAfter(moment(b.expires_date, 'YYYY-MM-DD HH:mm:ss')) ? -1 : 1;
            });
        }

        if (allReceipts.length > 0) {
            const lastTransaction = allReceipts[0];

            let expiryDate;
            if (lastTransaction.expires_date && moment(lastTransaction.expires_date, 'YYYY-MM-DD HH:mm:ss').isValid()) {
                expiryDate = moment(lastTransaction.expires_date, 'YYYY-MM-DD HH:mm:ss');
            }
            const returnObject = new AppleLastReceipt();
            returnObject.receipt = receiptData.receipt;
            returnObject.lastTransaction = lastTransaction;
            returnObject.expiryDate = expiryDate;
            return returnObject;
        } else {
            return undefined;
        }
    }
}
