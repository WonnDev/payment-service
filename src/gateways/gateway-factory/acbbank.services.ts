import axios from 'axios';
import { GateType, Payment } from '../gate.interface';
import * as moment from 'moment-timezone';
import { Gate } from '../gates.services';

export class ACBBankService extends Gate {
  async getHistory(): Promise<Payment[]> {
    const url = `https://api.web2m.com/historyapiacbv3/${encodeURIComponent(
      this.config.password,
    )}/${this.config.account}/${this.config.token}`;

    const { data } = await axios<{
      status: true;
      message: 'Thành công';
      transactions: {
        transactionID: number;
        amount: number;
        description: string;
        transactionDate: string;
        type: 'IN' | 'OUT';
      }[];
    }>(url);
    if (!data.status) {
      throw new Error(data.message);
    }
    return data.transactions
      .filter((el) => el.type == 'IN')
      .map((transaction) => ({
        transaction_id: 'acbbank-' + transaction.transactionID.toString(),
        amount: transaction.amount,
        content: transaction.description,
        date: moment(
          transaction.transactionDate,
          'DD/MM/YYYY HH:mm:ss',
        ).toDate(),
        gate: GateType.ACBBANK,
        account_receiver: this.config.account,
      }));
  }
}
