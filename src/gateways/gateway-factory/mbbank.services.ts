import axios from 'axios';
import { GateType, Payment } from '../gate.interface';
import * as moment from 'moment-timezone';
import { Injectable } from '@nestjs/common';
import { Gate } from '../gates.services';

@Injectable()
export class MBBankService extends Gate {
  async getHistory(): Promise<Payment[]> {
    const url = `https://api.web2m.com/historyapimbnotiv3/${encodeURIComponent(
      this.config.password,
    )}/${this.config.account}/${this.config.token}`;

    const { data } = await axios<{
      status: true | number;
      message: 'Thành công';
      transactions: {
        transactionID: string;
        amount: string;
        description: string;
        transactionDate: string;
        type: 'IN' | 'OUT';
      }[];
    }>(url);
    if (data.status !== true && data.status !== 0) {
      throw new Error(data.message);
    }
    return data.transactions
      .filter((el) => el.type == 'IN')
      .map((transaction) => ({
        transaction_id: 'mbbank-' + transaction.transactionID,
        amount: Number(transaction.amount),
        content: transaction.description,
        date: moment(
          transaction.transactionDate,
          'DD/MM/YYYY HH:mm:ss',
        ).toDate(),
        gate: GateType.MBBANK,
        account_receiver: this.config.account,
      }));
  }
}
