import React from 'react';
import { HelpCircle } from 'lucide-react';

export function FAQPage() {
  const faqs = [
    {
      question: "How does BRM Warehouse work?",
      answer: "BRM Warehouse connects businesses needing storage space with warehouse owners. You can browse available spaces, send inquiries, and manage your bookings all through our platform."
    },
    {
      question: "How do I list my warehouse?",
      answer: "Register an account, click on 'List Warehouse' in your dashboard, and follow the steps to add your space. You'll need to provide details about the space, pricing, and photos."
    },
    {
      question: "Is there a fee to list my warehouse?",
      answer: "No, listing your warehouse is completely free. We only charge a small commission when a successful booking is made."
    },
    {
      question: "How are payments handled?",
      answer: "All payments are processed securely through our platform. We use industry-standard encryption and secure payment processors to ensure your transactions are safe."
    },
    {
      question: "What if I have issues with a booking?",
      answer: "Our support team is available to help resolve any issues. You can contact us through the platform or email support@brm.ee."
    },
    {
      question: "Can I cancel a booking?",
      answer: "Cancellation policies vary by warehouse. Please check the specific terms for each space before booking."
    }
  ];

  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-green-600" />
          <h1 className="mt-4 text-4xl font-bold text-gray-900">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Find answers to common questions about BRM Warehouse
          </p>
        </div>

        <div className="mt-16">
          <dl className="space-y-8">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-200 pb-8">
                <dt className="text-lg font-medium text-gray-900">
                  {faq.question}
                </dt>
                <dd className="mt-2 text-gray-500">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Still have questions?
          </h2>
          <p className="mt-4 text-gray-500">
            Can't find the answer you're looking for? Please contact our support team.
          </p>
          <a
            href="/contact"
            className="mt-8 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}