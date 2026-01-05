import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BottomNav } from './BottomNav';
import QuickAddModal from './QuickAddModal';
import AddTransactionModal from './AddTransactionModal';
import AddGoalModal from './AddGoalModal';
import ScanReceiptModal from './ScanReceiptModal';
import BorrowMoneyModal from './BorrowMoneyModal';

const MainLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Modal states
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [showAddTransaction, setShowAddTransaction] = useState(false);
    const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
    const [showAddGoal, setShowAddGoal] = useState(false);
    const [showScanReceipt, setShowScanReceipt] = useState(false);
    const [showBorrowModal, setShowBorrowModal] = useState(false);

    // Handle Quick Add Actions
    const handleQuickAddAction = (action: 'expense' | 'income' | 'borrow' | 'scan' | 'plan' | 'goal') => {
        if (action === 'expense') {
            setTransactionType('expense');
            setShowAddTransaction(true);
        } else if (action === 'income') {
            setTransactionType('income');
            setShowAddTransaction(true);
        } else if (action === 'borrow') {
            setShowBorrowModal(true);
        } else if (action === 'scan') {
            setShowScanReceipt(true);
        } else if (action === 'plan') {
            navigate('/trips');
        } else if (action === 'goal') {
            setShowAddGoal(true);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <AnimatePresence mode="wait">
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -10 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.5 }}
                    layout
                    className="mx-auto max-w-7xl w-full bg-white dark:bg-gray-900 min-h-screen shadow-sm dark:shadow-none transition-colors duration-300"
                >
                    <Outlet />
                </motion.div>
            </AnimatePresence>

            {/* Hide Bottom Nav on specific pages */}
            {!location.pathname.match(/^\/trips\/[^/]+$/) && (
                <BottomNav onAddClick={() => setShowQuickAdd(true)} />
            )}

            {/* Global Modals */}
            <QuickAddModal
                isOpen={showQuickAdd}
                onClose={() => setShowQuickAdd(false)}
                onSelectAction={handleQuickAddAction}
            />

            <AddTransactionModal
                isOpen={showAddTransaction}
                onClose={() => setShowAddTransaction(false)}
                type={transactionType}
            />

            <AddGoalModal
                isOpen={showAddGoal}
                onClose={() => setShowAddGoal(false)}
            />

            <ScanReceiptModal
                isOpen={showScanReceipt}
                onClose={() => setShowScanReceipt(false)}
            />

            <BorrowMoneyModal
                isOpen={showBorrowModal}
                onClose={() => setShowBorrowModal(false)}
            />
        </div>
    );
};

export default MainLayout;
