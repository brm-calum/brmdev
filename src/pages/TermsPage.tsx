import React from 'react';
import { Shield } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-green-600" />
          <h1 className="mt-4 text-4xl font-bold text-gray-900">
            Terms & Conditions
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Please read these terms carefully before using our platform
          </p>
        </div>

        <div className="mt-16 prose prose-green mx-auto">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using the BRM Warehouse platform, you agree to be bound by these Terms and
            Conditions and all applicable laws and regulations.
          </p>

          <h2>2. Platform Usage</h2>
          <p>
            Our platform connects warehouse owners with businesses seeking storage solutions. Users must
            provide accurate information and maintain the confidentiality of their account credentials.
          </p>

          <h2>3. Listing Requirements</h2>
          <p>
            Warehouse owners must provide accurate and complete information about their spaces,
            including size, location, features, and pricing. All listings are subject to review.
          </p>

          <h2>4. Booking Process</h2>
          <p>
            All bookings made through our platform are subject to confirmation from the warehouse
            owner. Payment terms and cancellation policies are set by individual warehouse owners.
          </p>

          <h2>5. Privacy & Data Protection</h2>
          <p>
            We are committed to protecting your privacy. All personal data is collected and processed
            in accordance with our Privacy Policy and applicable data protection laws.
          </p>

          <h2>6. Liability</h2>
          <p>
            While we strive to maintain the accuracy of information on our platform, we cannot
            guarantee its completeness or accuracy. Users agree to use the platform at their own risk.
          </p>

          <h2>7. Modifications</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the platform
            after changes constitutes acceptance of the modified terms.
          </p>

          <h2>8. Contact</h2>
          <p>
            If you have any questions about these Terms & Conditions, please contact us at{' '}
            <a href="mailto:legal@brm24.com">legal@brm24.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}