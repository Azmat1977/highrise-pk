import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Star } from 'lucide-react';

export const Testimonials: React.FC = () => {
  const testimonials = [
    {
      name: 'Ahmed Raza',
      role: 'Property Investor',
      content: 'Highrise.pk made finding my dream home so easy. The platform is user-friendly and the property listings are always up-to-date.',
      rating: 5,
    },
    {
      name: 'Sarah Khan',
      role: 'Home Buyer',
      content: 'Excellent service! The team helped me find the perfect apartment in Lahore within my budget. Highly recommended!',
      rating: 5,
    },
    {
      name: 'Muhammad Ali',
      role: 'Real Estate Agent',
      content: 'As a professional in the industry, I can say Highrise.pk is one of the best platforms for property listings in Pakistan.',
      rating: 4,
    },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Trusted by Thousands
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join our community of satisfied customers who have found their perfect properties through Highrise.pk
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="p-6 h-full">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < testimonial.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
