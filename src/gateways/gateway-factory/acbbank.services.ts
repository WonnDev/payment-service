import { parse } from 'node-html-parser';
import * as moment from 'moment-timezone';
import * as playwright from 'playwright';
import * as _request from 'request-promise';
import { GateType, Payment } from '../gate.interface';

import { Gate } from '../gates.services';
import { sleep } from 'src/shards/helpers/sleep';
export class ACBBankService extends Gate {
  private browser: playwright.Browser | undefined;
  private context: playwright.BrowserContext | undefined;
  private page: playwright.Page | undefined;
  private jar: _request.CookieJar;
  private request: _request.RequestPromiseAPI | undefined = undefined;
  private dse_sessionId: string | undefined;
  private dse_processorId: string | undefined;
  parseAcbHistory(html: string): Payment[] {
    const document = parse(html);
    const table = document.getElementById('table1');
    const rows = table.querySelectorAll('tr');
    const payments = [];
    for (const row of rows) {
      const tds = row.querySelectorAll('td');
      if (tds.length == 6) {
        const date = tds[0].text.split('-');
        const addYear = `${date[0]}/${date[1]}/20${date[2]}`;
        payments.push({
          date: moment.tz(addYear, 'DD/MM/YYYY', 'Asia/Ho_Chi_Minh').toDate(),
          transaction_id: 'acbbank-' + tds[1].text,

          amount: parseInt(tds[4].text.replace(/\./g, '')),

          content: tds[2].text,
          gate: GateType.ACBBANK,
          account_receiver: this.config.account,
        });
      }
    }

    return payments;
  }

  async login() {
    this.browser = await playwright.chromium.launch({ headless: true });
    this.context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    this.page = await this.context.newPage();

    const getCaptchaWaitResponse = this.page.waitForResponse('**/Captcha.jpg');
    await this.page.goto('https://online.acb.com.vn/acbib/Request');
    await this.page.getByLabel('Tên truy cập').click();
    await this.page.getByLabel('Tên truy cập').fill(this.config.login_id);
    await this.page.getByLabel('Mật khẩu').click();
    await this.page.getByLabel('Mật khẩu').fill(this.config.password);
    await this.page.getByLabel('Mật khẩu').press('Tab');

    const getCaptchaBuffer = await getCaptchaWaitResponse.then((d) => d.body());
    const captchaBase64 = getCaptchaBuffer.toString('base64');
    const captchaText = await this.captchaSolver.solveCaptcha(captchaBase64);

    await sleep(5000);
    await this.page.locator('#security-code').fill(captchaText);
    await this.page.locator('#security-code').press('Enter');

    const cookie = await this.context.cookies();
    this.jar = _request.jar();
    for (const c of cookie) {
      this.jar.setCookie(`${c.name}=${c.value}`, 'https://' + c.domain);
    }

    const linkMyAccount = await this.page.getByText(this.config.account);
    const linkMyAccountHref = await linkMyAccount.getAttribute('href');

    this.request = _request.defaults({
      jar: this.jar,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
      followRedirect: true,
      followAllRedirects: true,
    });

    const dashboardPageHtml = await this.request.get(
      `https://online.acb.com.vn/acbib/${linkMyAccountHref}`,
    );
    // await fs.promises.writeFile('acb1.1.html', dashboardPageHtml);

    this.dse_sessionId =
      /<input type="hidden" name="dse_sessionId" value="(.*?)"/gm.exec(
        dashboardPageHtml,
      )?.[1];
    this.dse_processorId =
      /<input type="hidden" name="dse_processorId" value="(.*?)"/gm.exec(
        dashboardPageHtml,
      )?.[1];

    //close
    await this.browser.close();
  }

  async getHistory(): Promise<Payment[]> {
    if (!this.dse_sessionId) {
      await this.login();
    }
    const fromDate = moment()
      .tz('Asia/Ho_Chi_Minh')
      .subtract(14, 'days')
      .format('DD/MM/YYYY');
    const toDate = moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY');

    const dataSend = {
      dse_sessionId: this.dse_sessionId,
      dse_applicationId: '-1',
      dse_operationName: 'ibkacctDetailProc',
      dse_pageId: '5',
      dse_processorState: 'acctDetailPage',
      dse_processorId: this.dse_processorId,
      dse_errorPage: '/ibk/acctinquiry/trans.jsp',
      AccountNbr: this.config.account,
      CheckRef: 'false',
      EdtRef: '',
      dse_nextEventName: 'byDate',
      FromDate: fromDate,
      ToDate: toDate,
    };
    console.log({ dataSend });

    // await fs.promises.writeFile('acb2.2.html', historyPageHtml);

    try {
      const historyPageHtml = await this.request.post(
        'https://online.acb.com.vn/acbib/Request',
        {
          form: dataSend,
        },
      );

      const payments = this.parseAcbHistory(historyPageHtml);
      return payments;
    } catch (error) {
      console.error(error);
      await this.login();

      throw error;
    }
  }
}
