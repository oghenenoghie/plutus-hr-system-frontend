"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input, Label } from "@/components/ui/input";
import { Table, Td, Th, Thead } from "@/components/ui/table";
import { financialStatementsApi } from "@/lib/api/endpoints";
import { formatNaira } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

export default function FinancialStatementsPage() {
  const [asOf, setAsOf] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const balanceSheet = useApiResource(
    () => financialStatementsApi.balanceSheet(asOf || undefined),
    [asOf],
  );
  const incomeStatement = useApiResource(
    () =>
      financialStatementsApi.incomeStatement({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    [fromDate, toDate],
  );

  return (
    <div>
      <PageHeader
        title="Financial Statements"
        subtitle="Balance Sheet and Income Statement, computed live from the general ledger"
      />

      <Card className="mb-6">
        <CardHeader
          title="Balance Sheet"
          subtitle="A snapshot as of a point in time. No equity account or period-end closing exists yet, so assets will not equal liabilities + equity."
          action={
            <div className="w-44">
              <Label htmlFor="asOf">As Of</Label>
              <Input id="asOf" type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} />
            </div>
          }
        />
        {balanceSheet.loading ? <LoadingState /> : null}
        {balanceSheet.error ? <ErrorState message={balanceSheet.error} /> : null}
        {balanceSheet.data ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.03em] text-ink-soft">
                Assets
              </h3>
              <Table>
                <Thead>
                  <tr>
                    <Th>Account</Th>
                    <Th align="right">Balance</Th>
                  </tr>
                </Thead>
                <tbody>
                  {balanceSheet.data.assets.map((line) => (
                    <tr key={line.account}>
                      <Td>{line.account_name}</Td>
                      <Td align="right">{formatNaira(line.balance_minor)}</Td>
                    </tr>
                  ))}
                  <tr>
                    <Td className="font-bold">Total Assets</Td>
                    <Td align="right" className="font-bold">
                      {formatNaira(balanceSheet.data.total_assets_minor)}
                    </Td>
                  </tr>
                </tbody>
              </Table>
            </div>
            <div>
              <h3 className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.03em] text-ink-soft">
                Liabilities &amp; Equity
              </h3>
              <Table>
                <Thead>
                  <tr>
                    <Th>Account</Th>
                    <Th align="right">Balance</Th>
                  </tr>
                </Thead>
                <tbody>
                  {balanceSheet.data.liabilities.map((line) => (
                    <tr key={line.account}>
                      <Td>{line.account_name}</Td>
                      <Td align="right">{formatNaira(line.balance_minor)}</Td>
                    </tr>
                  ))}
                  {balanceSheet.data.equity.map((line) => (
                    <tr key={line.account}>
                      <Td>{line.account_name}</Td>
                      <Td align="right">{formatNaira(line.balance_minor)}</Td>
                    </tr>
                  ))}
                  {balanceSheet.data.equity.length === 0 ? (
                    <tr>
                      <Td className="text-ink-soft">No equity accounts</Td>
                      <Td align="right">—</Td>
                    </tr>
                  ) : null}
                  <tr>
                    <Td className="font-bold">Total Liabilities &amp; Equity</Td>
                    <Td align="right" className="font-bold">
                      {formatNaira(
                        balanceSheet.data.total_liabilities_minor + balanceSheet.data.total_equity_minor,
                      )}
                    </Td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title="Income Statement"
          action={
            <div className="flex gap-3">
              <div className="w-40">
                <Label htmlFor="fromDate">From</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                />
              </div>
              <div className="w-40">
                <Label htmlFor="toDate">To</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </div>
            </div>
          }
        />
        {incomeStatement.loading ? <LoadingState /> : null}
        {incomeStatement.error ? <ErrorState message={incomeStatement.error} /> : null}
        {incomeStatement.data ? (
          <Table>
            <Thead>
              <tr>
                <Th>Account</Th>
                <Th align="right">Amount</Th>
              </tr>
            </Thead>
            <tbody>
              <tr>
                <Td className="font-extrabold uppercase tracking-[0.03em] text-ink-soft">Revenue</Td>
                <Td>{null}</Td>
              </tr>
              {incomeStatement.data.revenue.map((line) => (
                <tr key={line.account}>
                  <Td>{line.account_name}</Td>
                  <Td align="right">{formatNaira(line.balance_minor)}</Td>
                </tr>
              ))}
              <tr>
                <Td className="font-bold">Total Revenue</Td>
                <Td align="right" className="font-bold">
                  {formatNaira(incomeStatement.data.total_revenue_minor)}
                </Td>
              </tr>
              <tr>
                <Td className="pt-5 font-extrabold uppercase tracking-[0.03em] text-ink-soft">
                  Expenses
                </Td>
                <Td className="pt-5">{null}</Td>
              </tr>
              {incomeStatement.data.expenses.map((line) => (
                <tr key={line.account}>
                  <Td>{line.account_name}</Td>
                  <Td align="right">{formatNaira(line.balance_minor)}</Td>
                </tr>
              ))}
              <tr>
                <Td className="font-bold">Total Expenses</Td>
                <Td align="right" className="font-bold">
                  {formatNaira(incomeStatement.data.total_expenses_minor)}
                </Td>
              </tr>
              <tr>
                <Td className="pt-5 text-[14px] font-extrabold">Net Income</Td>
                <Td align="right" className="pt-5 text-[14px] font-extrabold">
                  {formatNaira(incomeStatement.data.net_income_minor)}
                </Td>
              </tr>
            </tbody>
          </Table>
        ) : null}
      </Card>
    </div>
  );
}
