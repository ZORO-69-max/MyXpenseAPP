
export interface ParsedTransaction {
    id: string; // Temporary ID for the review modal
    originalText: string;
    type: 'income' | 'expense' | 'debt';
    amount: number;
    date: Date;
    entity: string; // Name of person/merchant
    description: string;
    category?: string; // For expenses
    debtType?: 'lent' | 'borrowed'; // For debts
    paymentMethod?: string; // UPI, Cash, Card, etc.
    confidence: 'high' | 'medium' | 'low';
}

export const parseSMS = (text: string): ParsedTransaction[] => {
    const lines = text.split(/\n|\r\n/).filter(line => line.trim().length > 0);
    const parsedTransactions: ParsedTransaction[] = [];

    lines.forEach(line => {
        // 1. Basic cleaning
        const cleanLine = line.trim();
        if (cleanLine.length < 3) return; // Skip very short lines

        // 2. Extract Amount
        // First try: Rs. 100, INR 100, ₹100, Rs 100.00
        const currencyRegex = /(?:Rs\.?|INR|₹)\s*([\d,.]+)/i;
        // Second try: Simple formats like "20 paid to", "paid 100 to", "received 50 from"
        const simpleStartRegex = /^(\d+(?:\.\d{1,2})?)\s+(?:paid|sent|received|credited|debited)/i;
        const simpleMiddleRegex = /(?:paid|sent|received|got|gave)\s+(?:rs\.?\s*)?(\d+(?:\.\d{1,2})?)/i;
        // Fallback: Any number in the text (for flexible parsing like "coffee 50" or "amazon 1200")
        const anyNumberRegex = /(\d+(?:\.\d{1,2})?)/;

        let amount = 0;
        let amountMatch = cleanLine.match(currencyRegex);

        if (amountMatch) {
            amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        } else {
            // Try simple formats
            amountMatch = cleanLine.match(simpleStartRegex);
            if (amountMatch) {
                amount = parseFloat(amountMatch[1]);
            } else {
                amountMatch = cleanLine.match(simpleMiddleRegex);
                if (amountMatch) {
                    amount = parseFloat(amountMatch[1]);
                } else {
                    // Fallback: Extract any number from the text
                    amountMatch = cleanLine.match(anyNumberRegex);
                    if (amountMatch) {
                        amount = parseFloat(amountMatch[1]);
                    }
                }
            }
        }

        if (!amount || isNaN(amount) || amount <= 0) return;

        // 3. Extract Date
        // Matches: DD/MM/YY, DD-MM-YYYY, etc.
        const dateRegex = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/;
        const dateMatch = cleanLine.match(dateRegex);
        let date = new Date(); // Default to today

        if (dateMatch) {
            const day = parseInt(dateMatch[1]);
            const month = parseInt(dateMatch[2]) - 1; // Month is 0-indexed
            let year = parseInt(dateMatch[3]);

            // Handle 2-digit year (e.g., 26 -> 2026)
            if (year < 100) {
                year += 2000;
            }

            date = new Date(year, month, day);
        }

        // 4. Identify Type (Income/Expense/Debt)
        const lowerLine = cleanLine.toLowerCase();
        let type: 'income' | 'expense' | 'debt' = 'expense'; // Default to expense
        let debtType: 'lent' | 'borrowed' | undefined;

        // Keywords
        const incomeKeywords = ['credited', 'received', 'deposited', 'avl bal', 'refund'];
        const expenseKeywords = ['debited', 'paid', 'spent', 'sent', 'purchase', 'withdrawn'];
        // Debt detection is tricky without knowing participants. 
        // We will rely on keywords like "lent", "borrowed" if present, 
        // BUT predominantly we default to Expense/Income and let the Smart Modal 
        // allow the user to fuzzy match "Entity" to "Trip Participant" to switch to Debt.

        if (incomeKeywords.some(k => lowerLine.includes(k))) {
            type = 'income';
        } else if (expenseKeywords.some(k => lowerLine.includes(k))) {
            type = 'expense';
        }

        // 5. Extract Entity (Merchant/Person)
        // Improved regex to handle semicolons, commas, and other delimiters
        let entity = '';

        // Pattern for "to {name}" - stops at punctuation, stop words, or end
        const toMatch = cleanLine.match(/(?:to|at)\s+([A-Za-z0-9\s]+?)(?:[;,.]|\s+(?:on|via|ref|bal|using|thru|UPI|A\/c)|$)/i);

        // Pattern for "from {name}" - stops at punctuation, stop words, or end
        const fromMatch = cleanLine.match(/(?:from)\s+([A-Za-z0-9\s]+?)(?:[;,.]|\s+(?:on|via|ref|bal|using|thru|UPI|A\/c)|$)/i);

        if (type === 'expense' && toMatch) {
            entity = toMatch[1].trim();
        } else if (type === 'income' && fromMatch) {
            entity = fromMatch[1].trim();
        } else {
            // Fallback: Try to extract any name-like pattern after "from" or "to"
            const fallbackFrom = cleanLine.match(/from\s+([A-Z][A-Za-z]+)/i);
            const fallbackTo = cleanLine.match(/to\s+([A-Z][A-Za-z]+)/i);

            if (type === 'income' && fallbackFrom) {
                entity = fallbackFrom[1].trim();
            } else if (type === 'expense' && fallbackTo) {
                entity = fallbackTo[1].trim();
            } else {
                entity = 'Unknown';
            }
        }

        // Clean up entity: remove extra spaces, capitalize properly
        if (entity && entity !== 'Unknown') {
            entity = entity.replace(/\s+/g, ' ').trim(); // Normalize spaces
            entity = entity.split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
        }

        // 6. Generate cleaner description
        let description = '';
        if (entity && entity !== 'Unknown') {
            if (type === 'expense') {
                description = `Paid to ${entity}`;
            } else if (type === 'income') {
                description = `Received from ${entity}`;
            } else {
                description = entity;
            }
        } else {
            // Fallback: use a generic description
            if (type === 'expense') {
                description = 'Expense';
            } else if (type === 'income') {
                description = 'Income';
            } else {
                description = 'Transaction';
            }
        }

        // 7. Detect Payment Method
        let paymentMethod = 'Cash'; // Default
        if (/\b(upi|gpay|phonepe|paytm|bhim|imps|neft)\b/i.test(lowerLine)) {
            paymentMethod = 'UPI';
        } else if (/\b(atm|withdrawn|withdrawal)\b/i.test(lowerLine)) {
            paymentMethod = 'Cash';
        } else if (/\b(card|debit|credit|pos|swipe)\b/i.test(lowerLine)) {
            paymentMethod = 'Card';
        } else if (/\b(cash)\b/i.test(lowerLine)) {
            paymentMethod = 'Cash';
        } else if (/\b(online|net\s*banking|transfer)\b/i.test(lowerLine)) {
            paymentMethod = 'UPI'; // Treat online as UPI for simplicity
        }

        // 8. Construct Record
        parsedTransactions.push({
            id: Math.random().toString(36).substr(2, 9),
            originalText: cleanLine,
            type,
            amount,
            date,
            entity,
            description,
            paymentMethod,
            confidence: 'medium', // Default confidence
            debtType
        });
    });

    return parsedTransactions;
};
