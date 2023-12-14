import axios from 'axios';
import * as moment from 'moment-timezone';
import { Injectable } from '@nestjs/common';
import * as playwright from 'playwright';

import { GateType, Payment } from '../gate.interface';
import { Gate } from '../gates.services';

interface MbBankTransactionDto {
  refNo: string;
  result: { responseCode: string; message: string; ok: boolean };
  transactionHistoryList: {
    postingDate: string; //'14/12/2023 04:29:00';
    transactionDate: string;
    accountNo: string;
    creditAmount: string;
    debitAmount: string;
    currency: 'VND';
    description: string;
    availableBalance: string;
    beneficiaryAccount: null;
    refNo: string;
    benAccountName: string;
    bankName: string;
    benAccountNo: string;
    dueDate: null;
    docId: null;
    transactionType: string;
  }[];
}

@Injectable()
export class MBBankService extends Gate {
  private sessionId: string | null | undefined;
  private deviceId: string = '';

  private browser: playwright.Browser | undefined;
  private context: playwright.BrowserContext | undefined;
  private page: playwright.Page | undefined;

  private async login() {
    this.browser = await playwright.chromium.launch({
      headless: true,
    });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();

    const getCaptchaWaitResponse = this.page.waitForResponse(
      '**/retail-web-internetbankingms/getCaptchaImage',
    );
    await this.page.goto('https://online.mbbank.com.vn/pl/login');

    const getCaptchaJson = await getCaptchaWaitResponse.then((d) => d.json());

    const captchaText = await this.captchaSolver.solveCaptcha(
      getCaptchaJson.imageString,
    );

    await this.page.locator('#form1').getByRole('img').click();
    await this.page.getByPlaceholder('Tên đăng nhập').click();
    await this.page
      .getByPlaceholder('Tên đăng nhập')
      .fill(this.config.login_id);
    await this.page.getByPlaceholder('Tên đăng nhập').press('Tab');
    await this.page
      .getByPlaceholder('Nhập mật khẩu')
      .fill(this.config.password);
    await this.page.getByPlaceholder('NHẬP MÃ KIỂM TRA').click();
    await this.page.getByPlaceholder('NHẬP MÃ KIỂM TRA').fill(captchaText);

    const loginWaitResponse = this.page.waitForResponse(
      '**/retail_web/internetbanking/doLogin',
    );

    await this.page.getByRole('button', { name: 'Đăng nhập' }).click();

    const loginJson = await loginWaitResponse.then((d) => d.json());

    if (loginJson.result.responseCode == 'GW283') {
      throw new Error('Wrong captcha');
      //
    }
    if (!loginJson.result.ok) throw new Error(loginJson.result.message.message);

    this.sessionId = loginJson.sessionId;
    this.deviceId = loginJson.cust.deviceId;
    await this.browser.close();
    this.browser = undefined;
    console.log('MBBankService login success');
  }

  async getHistory(): Promise<Payment[]> {
    if (!this.sessionId) await this.login();

    const fromDate = moment()
      .tz('Asia/Ho_Chi_Minh')
      .subtract(7, 'days')
      .format('DD/MM/YYYY');
    const toDate = moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY');
    const dataSend = {
      accountNo: this.config.account,
      fromDate,
      toDate,
      sessionId: this.sessionId,
      refNo: moment().tz('Asia/Ho_Chi_Minh').format('DDMMYYYYHHmmssSSS'),
      deviceIdCommon: this.deviceId,
    };

    const { data } = await axios.post<MbBankTransactionDto>(
      'https://online.mbbank.com.vn/api/retail-web-transactionservice/transaction/getTransactionAccountHistory',
      dataSend,
      {
        headers: {
          'X-Request-Id': moment()
            .tz('Asia/Ho_Chi_Minh')
            .format('DDMMYYYYHHmmssSSS'),
          'Cache-Control': 'no-cache',
          Accept: 'application/json, text/plain, */*',
          Authorization:
            'Basic RU1CUkVUQUlMV0VCOlNEMjM0ZGZnMzQlI0BGR0AzNHNmc2RmNDU4NDNm',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          Origin: 'https://online.mbbank.com.vn',
          Referer: 'https://online.mbbank.com.vn/',
          'Content-Type': 'application/json; charset=UTF-8',
        },
      },
    );

    if (data.result.responseCode === 'GW200') {
      await this.login();
    }

    if (!data.result.ok) throw new Error(data.result.message);

    return data.transactionHistoryList.map((transaction) => ({
      transaction_id: 'mbbank-' + transaction.refNo,
      amount: Number(transaction.creditAmount),
      content: transaction.description,
      date: moment
        .tz(
          transaction.transactionDate,
          'DD/MM/YYYY HH:mm:ss',
          'Asia/Ho_Chi_Minh',
        )
        .toDate(),

      account_receiver: transaction.accountNo,
      gate: GateType.MBBANK,
    }));
  }
}
