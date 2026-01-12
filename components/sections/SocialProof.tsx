// components/sections/SocialProof.tsx
import { Star, Quote, Award } from 'lucide-react'

export function SocialProof() {
  const testimonials = [
    {
      quote: "CACK-pass transformed how we manage our events. The gasless transactions are a game-changer for our international attendees.",
      author: "Sarah Johnson",
      role: "Event Director, TechFest",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      rating: 5,
    },
    {
      quote: "As an artist, I love how transparent the royalty system is. I can see exactly how much I earn from secondary sales.",
      author: "Marcus Chen",
      role: "Musician & Producer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
      rating: 5,
    },
    {
      quote: "The hybrid payment system made it easy for all our attendees to purchase tickets, regardless of their payment preference.",
      author: "Amina Bello",
      role: "Organizer, Lagos Fashion Week",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amina",
      rating: 5,
    },
  ]

  const partners = [
    { name: "AfroTech", logo: "🖥️" },
    { name: "Lisk Foundation", logo: "🔗" },
    { name: "Paystack", logo: "💳" },
    { name: "Flutterwave", logo: "🌍" },
    { name: "Biconomy", logo: "⚡" },
    { name: "Privy", logo: "🔐" },
  ]

  return (
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Trusted by Industry Leaders
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Loved by Organizers & Attendees
          </h2>
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 relative"
            >
              <Quote className="h-12 w-12 text-primary/20 absolute top-6 right-6" />
              
              <div className="flex items-center mb-6">
                <div className="flex mr-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-500 fill-current" />
                  ))}
                </div>
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 mb-8 italic">
                "{testimonial.quote}"
              </p>
              
              <div className="flex items-center">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.author}
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <div className="font-semibold">{testimonial.author}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Partners */}
        <div className="text-center mb-12">
          <h3 className="text-2xl font-semibold mb-8">
            Trusted by Amazing Partners
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {partners.map((partner, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 flex items-center justify-center hover:scale-105 transition-transform"
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{partner.logo}</div>
                  <div className="font-medium">{partner.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* App Store Ratings */}
        <div className="bg-gradient-to-r from-primary to-secondary rounded-3xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0">
              <h3 className="text-2xl font-bold mb-2">4.9/5 Rating</h3>
              <p className="opacity-90">Across app stores and review platforms</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-3xl font-bold">10K+</div>
                <div className="text-sm opacity-90">5-Star Reviews</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold">98%</div>
                <div className="text-sm opacity-90">Satisfaction Rate</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold">24h</div>
                <div className="text-sm opacity-90">Avg. Response Time</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}