import React, { useState } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSubmitted(true);
    setIsSubmitting(false);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Contact Us</h1>
          <p className="mt-4 text-xl text-gray-600">
            Get in touch with our team for any questions or support
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="prose prose-green">
              <h2>Get in Touch</h2>
              <p>
                Whether you have questions about our platform, need help with a booking,
                or want to learn more about listing your warehouse, we're here to help.
              </p>

              <div className="mt-8 space-y-6">
                <div className="flex items-center">
                  <Mail className="h-6 w-6 text-green-600" />
                  <span className="ml-4">support@brm.ee</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-6 w-6 text-green-600" />
                  <span className="ml-4">Tallinn, Estonia</span>
                </div>
              </div>

              <h2 className="mt-12">Office Hours</h2>
              <p>
                Monday - Friday: 9:00 AM - 6:00 PM EET<br />
                Saturday - Sunday: Closed
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}