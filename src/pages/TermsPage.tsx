import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center space-x-3 mb-4">
              <button 
                onClick={() => navigate(-1)} 
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <FileText className="w-6 h-6" />
              <h1 className="text-2xl font-bold">Terms & Conditions</h1>
            </div>
            <p className="text-purple-100 text-sm">Last updated: October 18, 2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-6"
          >
            {/* Introduction */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                By accessing and using MyXpense ("the Service"), you accept and agree to be bound by 
                these Terms and Conditions. If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            {/* Service Description */}
            <section>
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  2. Service Description
                </h2>
              </div>
              <div className="space-y-3 text-gray-600 dark:text-gray-300">
                <p className="leading-relaxed">
                  MyXpense is a Progressive Web Application (PWA) that provides:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Expense and income tracking</li>
                  <li>Budget management</li>
                  <li>Savings goal tracking</li>
                  <li>Receipt storage</li>
                  <li>AI-powered financial insights (optional)</li>
                  <li>Secure vault for funds</li>
                  <li>Data analytics and reports</li>
                  <li>Offline functionality</li>
                </ul>
              </div>
            </section>

            {/* User Accounts */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                3. User Accounts
              </h2>
              <div className="space-y-3 text-gray-600 dark:text-gray-300">
                <p className="leading-relaxed">
                  To use MyXpense, you must:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Be at least 13 years of age</li>
                  <li>Provide accurate and complete registration information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Be responsible for all activities under your account</li>
                </ul>
                <p className="leading-relaxed">
                  You may not share your account with others or create multiple accounts for the same person.
                </p>
              </div>
            </section>

            {/* Acceptable Use */}
            <section>
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  4. Acceptable Use Policy
                </h2>
              </div>
              <div className="space-y-3 text-gray-600 dark:text-gray-300">
                <p className="leading-relaxed">You agree NOT to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Use the Service for illegal activities</li>
                  <li>Attempt to reverse engineer, hack, or bypass security measures</li>
                  <li>Upload malicious code or viruses</li>
                  <li>Scrape or copy data for commercial purposes</li>
                  <li>Impersonate others or create fake accounts</li>
                  <li>Spam, harass, or abuse other users</li>
                  <li>Violate any applicable laws or regulations</li>
                </ul>
              </div>
            </section>

            {/* Data and Privacy */}
            <section>
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  5. Data and Privacy
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Your use of the Service is also governed by our Privacy Policy. We collect and process 
                your data as described in our Privacy Policy. You retain ownership of your data, and we 
                provide tools to export and delete it at any time.
              </p>
            </section>

            {/* Financial Accuracy */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                6. Financial Data Accuracy
              </h2>
              <div className="space-y-3 text-gray-600 dark:text-gray-300">
                <p className="leading-relaxed">
                  MyXpense is a tool to help you track your finances. However:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>We do not guarantee the accuracy of AI-generated insights</li>
                  <li>You are responsible for verifying all financial data</li>
                  <li>We are not a financial advisor or accountant</li>
                  <li>We do not provide tax, legal, or investment advice</li>
                  <li>The Service is for personal use and record-keeping only</li>
                </ul>
                <p className="leading-relaxed font-semibold text-gray-800 dark:text-white">
                  Always consult with qualified professionals for financial, tax, or legal advice.
                </p>
              </div>
            </section>

            {/* AI Features */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                7. AI-Powered Features
              </h2>
              <div className="space-y-3 text-gray-600 dark:text-gray-300">
                <p className="leading-relaxed">
                  Our AI chat assistant and insights are powered by OpenAI. By using these features:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>You acknowledge that AI responses may contain errors</li>
                  <li>AI insights are suggestions, not financial advice</li>
                  <li>We send anonymized data to OpenAI for processing</li>
                  <li>You can disable AI features at any time in Settings</li>
                </ul>
              </div>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                8. Intellectual Property
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                All content, features, and functionality of MyXpense (including but not limited to 
                design, text, graphics, logos, and software) are owned by us and protected by 
                international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border-l-4 border-orange-500">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                9. Limitation of Liability
              </h2>
              <div className="space-y-3 text-gray-600 dark:text-gray-300">
                <p className="leading-relaxed font-semibold text-gray-800 dark:text-white">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>We provide the Service "AS IS" without warranties of any kind</li>
                  <li>We are not liable for data loss, financial loss, or business interruption</li>
                  <li>We do not guarantee uninterrupted or error-free service</li>
                  <li>Our total liability is limited to the amount you paid us (if any)</li>
                </ul>
                <p className="text-sm italic">
                  We recommend regularly backing up your data using the export feature.
                </p>
              </div>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                10. Termination
              </h2>
              <div className="space-y-3 text-gray-600 dark:text-gray-300">
                <p className="leading-relaxed">
                  We reserve the right to suspend or terminate your account if:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>You violate these Terms and Conditions</li>
                  <li>You engage in fraudulent or illegal activity</li>
                  <li>You abuse or misuse the Service</li>
                  <li>Required by law or legal authority</li>
                </ul>
                <p className="leading-relaxed">
                  You may delete your account at any time through the Settings page.
                </p>
              </div>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                11. Changes to Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                We may modify these Terms and Conditions at any time. We will notify users of significant 
                changes via email or in-app notification. Continued use of the Service after changes 
                constitutes acceptance of the modified terms.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                12. Governing Law
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                These Terms and Conditions are governed by and construed in accordance with applicable 
                laws. Any disputes shall be resolved through binding arbitration or in courts of 
                competent jurisdiction.
              </p>
            </section>

            {/* Contact */}
            <section className="bg-purple-50 dark:bg-gray-700/50 rounded-xl p-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                13. Contact Information
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
                For questions about these Terms and Conditions, please contact:
              </p>
              <div className="space-y-1">
                <p className="text-purple-600 dark:text-purple-400 font-semibold">
                  Email: support@myxpenseapp.site
                </p>
                <p className="text-purple-600 dark:text-purple-400 font-semibold">
                  Website: https://myxpenseapp.site
                </p>
              </div>
            </section>

            {/* Acknowledgment */}
            <section className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border-l-4 border-green-500">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Acknowledgment
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                By using MyXpense, you acknowledge that you have read, understood, and agree to be bound 
                by these Terms and Conditions and our Privacy Policy.
              </p>
            </section>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default TermsPage;
