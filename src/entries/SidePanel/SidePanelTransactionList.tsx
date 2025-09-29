import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clock, CreditCard, ArrowUpRight, Zap } from 'lucide-react';
import { TransactionFields, TransactionList } from '../../utils/misc';
import { filter, get as jsonGet, last } from 'lodash';
import { getCookiesByHost, getHeadersByHost } from '../Background/db';
import Icon from '../../components/Icon';
import { exec } from 'child_process';


interface Transaction {
    id: string;
    amount: number;
    currency: string;
    merchant: string;
    date: Date;
    status: 'pending' | 'completed';
    category: string;
    description?: string;
}

interface RequestResponse {
    url: string,
    method: string,
    headers: Record<string, string>
}


interface TransactionSidePanelProps {
    onVerifyTransaction?: (transactionId: string) => void;
    action: TransactionList,
    lastResponse: RequestResponse
}

const TransactionSidePanel: React.FC<TransactionSidePanelProps> = ({
    onVerifyTransaction = () => { },
    action: {
        transactionList: {
            transactionsPath,
            platformName,
            variableName,
            fields,
            acceptableStates,
            acceptableTypes
        }
    },
    lastResponse
}) => {

    const [transactions, setTransactions] = useState<undefined | any[]>();

    // We fetch the transactions using the last Response
    useEffect(() => {

        const executeRequest = async () => {

            const requestResult = await fetch(lastResponse.url, { headers: lastResponse.headers, method: lastResponse.method })
            if (!requestResult.ok) {
                // We retry in a few seconds
                console.warn("Retrying fetching transactions in a few seconds")
                setTimeout(executeRequest, 2000)
            }
            const trs = await requestResult.json()
            const extractedTransactions = transactionsPath ? jsonGet(trs, transactionsPath) : trs;
            setTransactions(extractedTransactions)
        };
        executeRequest()

    }, [lastResponse, setTransactions]);

    const filteredTransactions = useMemo(() => {
        return transactions?.filter(t => acceptableStates.includes(jsonGet(t, fields.state)) && acceptableTypes.includes(jsonGet(t, fields.type)) && !!jsonGet(t, fields.recipientCode))
    }, [transactions])

    const formatAmount = (amount: number, decimals: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(Math.abs(amount) / 10 ** decimals,);
    };

    const formatTime = (dateNumber: number) => {
        const date = new Date(dateNumber);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const getCategoryColor = (category: string) => {
        const colors: { [key: string]: string } = {
            'Shopping': 'bg-blue-100 text-blue-700',
            'Food & Dining': 'bg-orange-100 text-orange-700',
            'Transportation': 'bg-green-100 text-green-700',
            'Entertainment': 'bg-purple-100 text-purple-700',
        };
        return colors[category] || 'bg-gray-100 text-gray-700';
    };

    const handleVerifyClick = (transactionId: string) => {
        onVerifyTransaction(transactionId);
    };

    return (
        <div className="h-screen w-100 bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col shadow-2xl border-l border-gray-200">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 px-6 py-6">
                <div className={`absolute inset-0 bg-[url('data:image/svg+xml,<svg xmlns=\" http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"grain\" width=\"100\" height=\"100\" patternUnits=\"userSpaceOnUse\"><circle cx=\"20\" cy=\"20\" r=\"1\" fill=\"white\" opacity=\"0.1\"/><circle cx=\"80\" cy=\"40\" r=\"0.5\" fill=\"white\" opacity=\"0.1\"/><circle cx=\"40\" cy=\"80\" r=\"1.5\" fill=\"white\" opacity=\"0.05\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23grain)\"/></svg>')] opacity-30`}></div>
                < div className="relative z-10" >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-lg font-semibold text-white">Transactions</h1>
                    </div>
                    <p className="text-indigo-100 text-sm font-medium">Recent Activity</p>
                </div >
            </div >

            {/* Transactions List */}
            < div className="flex-1 p-6 space-y-4 overflow-y-auto" >
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Latest 2 {platformName} Transactions</h2>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Zap className="w-3 h-3" />
                        Live
                    </div>
                </div>

                {
                    filteredTransactions && filteredTransactions.map((transaction, index) => (
                        <div
                            key={jsonGet(transaction, fields.id)}
                            className="group relative bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:border-indigo-200 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                            onClick={() => handleVerifyClick(jsonGet(transaction, fields.id))}
                        >
                            {/* Status indicator */}
                            <div className="absolute top-4 right-4">
                                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                                    <Check className="w-3 h-3" />
                                    Completed
                                </div>
                            </div>

                            {/* Transaction Details */}
                            <div className="pr-20">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                            {jsonGet(transaction, fields.recipientCode)}
                                        </h3>
                                        {jsonGet(transaction, fields.description) && (
                                            <p className="text-sm text-gray-600 mb-2">{jsonGet(transaction, fields.description)}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-2xl font-bold text-gray-900">
                                        {formatAmount(jsonGet(transaction, fields.amount), fields.decimals, fields.currency.field ? jsonGet(transaction, fields.currency.field) : fields.currency.default)}
                                    </span>
                                    <span className="text-sm text-gray-500 font-medium">
                                        {formatTime(jsonGet(transaction, fields.completedDate) ?? 0)}
                                    </span>
                                </div>
                            </div>

                            {/* Verify Button */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <button
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl font-medium text-sm hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 group-hover:shadow-md"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleVerifyClick(jsonGet(transaction, fields.id));
                                    }}
                                >
                                    Verify Transaction
                                    <ArrowUpRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Hover effect overlay */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                        </div>
                    ))
                }
                {
                    !filteredTransactions && <div className="flex flex-col items-center flex-grow gap-4 border border-slate-300 p-8 mx-8 rounded bg-slate-100">
                        <Icon
                            className="animate-spin w-fit text-slate-500"
                            fa="fa-solid fa-spinner"
                            size={1}
                        />
                    </div>
                }
            </div >

            {/* Footer */}
            < div className="p-6 pt-0" >
                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        Click any transaction to submit for verification
                    </p>
                </div>
            </div >
        </div >
    );
};

export default TransactionSidePanel;