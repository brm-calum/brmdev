import React from 'react';
import { Building2, Shield, Users } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">About BRM Warehouse</h1>
          <p className="mt-4 text-xl text-gray-600">
            Connecting trading businesses with warehouse space since 2023
          </p>
        </div>

        <div className="mt-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="flex justify-center">
                <Building2 className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="mt-4 text-xl font-medium text-gray-900">Quality Spaces</h3>
              <p className="mt-2 text-gray-500">
                We carefully vet all warehouse spaces to ensure they meet our high standards
                for quality and safety.
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center">
                <Shield className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="mt-4 text-xl font-medium text-gray-900">Secure Platform</h3>
              <p className="mt-2 text-gray-500">
                Our platform provides secure transactions and protects your data with
                enterprise-grade security.
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center">
                <Users className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="mt-4 text-xl font-medium text-gray-900">Expert Support</h3>
              <p className="mt-2 text-gray-500">
                Our dedicated team is here to help you find the perfect warehouse space
                for your needs.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <div className="prose prose-green mx-auto">
            <h2>Our Mission</h2>
            <p>
              At BRM Warehouse, we're dedicated to revolutionizing how businesses find and
              manage warehouse space. Our platform connects warehouse owners with businesses
              needing storage solutions, making the process simple, transparent, and efficient.
            </p>

            <h2>Our Values</h2>
            <ul>
              <li>Transparency in all transactions</li>
              <li>Quality assurance for all listed spaces</li>
              <li>Customer-first approach</li>
              <li>Continuous innovation</li>
            </ul>

            <h2>Our Team</h2>
            <p>
              Our team brings together experts in real estate, technology, and customer
              service to provide the best possible experience for our users. We're
              passionate about helping businesses grow by finding the right storage
              solutions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}