import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center space-x-3 mb-4">
              <button 
                onClick={() => navigate(-1)} 
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Shield className="w-6 h-6" />
              <h1 className="text-2xl font-bold">Privacy Policy</h1>
            </div>
            <p className="text-blue-100 text-sm">Last updated: October 18, 2025</p>
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
                1. Introduction
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Welcome to MyXpense. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy explains how we collect, use, and safeguard your information when you use our 
                expense tracking application.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <div className="flex items-center space-x-2 mb-3">
                <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  2. Information We Collect
                </h2>
              </div>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                    2.1 Personal Information
                  </h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Name and email address (for account creation)</li>
                    <li>Profile picture (optional)</li>
                    <li>Authentication credentials (encrypted)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                    2.2 Financial Data
                  </h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Transaction records (expenses and income)</li>
                    <li>Budget information</li>
                    <li>Savings goals</li>
                    <li>Receipt images (optional)</li>
                    <li>Secret vault data (encrypted)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                    2.3 Usage Data
                  </h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Device information</li>
                    <li>Browser type and version</li>
                    <li>Usage patterns and preferences</li>
                    <li>Notification preferences</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section>
              <div className="flex items-center space-x-2 mb-3">
                <UserCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  3. How We Use Your Information
                </h2>
              </div>
              <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ml-4">
                <li>To provide and maintain our expense tracking service</li>
                <li>To personalize your experience</li>
                <li>To generate AI-powered financial insights (optional)</li>
                <li>To send notifications about your budgets and goals</li>
                <li>To improve our services and develop new features</li>
                <li>To ensure security and prevent fraud</li>
              </ul>
            </section>

            {/* Data Security */}
            <section>
              <div className="flex items-center space-x-2 mb-3">
                <Lock className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  4. Data Security
                </h2>
              </div>
              <div className="space-y-3 text-gray-600 dark:text-gray-300">
                <p className="leading-relaxed">
                  We implement industry-standard security measures to protect your data:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>End-to-end encryption for sensitive data</li>
                  <li>Secure Firebase authentication</li>
                  <li>Encrypted storage for Secret Vault data</li>
                  <li>HTTPS encryption for all data transmission</li>
                  <li>Regular security audits and updates</li>
                  <li>UID-based access control in database</li>
                </ul>
                <p className="leading-relaxed">
                  Your Secret Vault data is encrypted on your device before being stored, 
                  ensuring only you can access it with your PIN.
                </p>
              </div>
            </section>

            {/* Data Storage and Sharing */}
            <section>
              <div className="flex items-center space-x-2 mb-3">
                <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  5. Data Storage and Sharing
                </h2>
              </div>
              <div className="space-y-3 text-gray-600 dark:text-gray-300">
                <p className="leading-relaxed">
                  Your data is stored securely using Firebase services (Google Cloud Platform). 
                  We <strong className="text-gray-800 dark:text-white">never sell</strong> your personal data to third parties.
                </p>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                    Third-Party Services:
                  </h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Firebase</strong> (Google) - Authentication, database, and storage</li>
                    <li><strong>OpenAI</strong> - AI-powered insights (only when you use the AI assistant)</li>
                  </ul>
                </div>
                <p className="text-sm italic">
                  We only share anonymized, aggregated data with these services as required for functionality.
                </p>
              </div>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                6. Your Rights
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data</li>
                <li>Opt-out of notifications</li>
                <li>Disable AI features</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
                You can exercise these rights through the Settings page in the app or by contacting us.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                7. Data Retention
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                We retain your data as long as your account is active. If you delete your account, 
                all your personal data will be permanently deleted within 30 days. You can export 
                your data before deletion.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                8. Children's Privacy
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                MyXpense is not intended for children under 13. We do not knowingly collect data 
                from children. If you believe a child has provided us with personal information, 
                please contact us immediately.
              </p>
            </section>

            {/* Changes to Policy */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                9. Changes to This Policy
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of significant 
                changes through the app or via email. Continued use of the service after changes 
                constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* Contact */}
            <section className="bg-blue-50 dark:bg-gray-700/50 rounded-xl p-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                10. Contact Us
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                If you have questions about this privacy policy or your data, please contact us at:
              </p>
              <p className="text-blue-600 dark:text-blue-400 font-semibold mt-2">
                privacy@myxpenseapp.site
              </p>
            </section>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default PrivacyPolicyPage;
