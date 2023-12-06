import { Payment } from 'src/gateways/gate.interface';

export function CheckPaymentConditions(
  payment: Payment,
  condition: {
    content_regex: string;
    account_regex: string;
  },
) {
  const { content_regex, account_regex } = condition;
  const isMatchContent = !!payment.content.match(content_regex);
  const isMatchAccount = !!payment.account_receiver.match(account_regex);
  return isMatchContent && isMatchAccount;
}
