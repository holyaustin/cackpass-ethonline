// components/sections/SocialProof.tsx
import { Star, Quote, Award, Users, Calendar, TrendingUp } from 'lucide-react'

export function SocialProof() {
  const testimonials = [
    {
      quote: "CACK-pass eliminated our biggest pain point: gas fees for international attendees. Ticket sales increased by 300% after switching.",
      author: "Sarah Johnson",
      role: "Event Director, TechFest Africa",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      rating: 5,
      event: "TechFest Lagos 2024",
    },
    {
      quote: "The hybrid payment system allowed us to reach audiences in both crypto-native and traditional markets. Game-changer for African events.",
      author: "Marcus Okafor",
      role: "Music Festival Organizer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
      rating: 5,
      event: "AfroBeats Festival",
    },
    {
      quote: "As an artist, I love earning royalties from secondary sales. Transparency and automated payments are incredible.",
      author: "Amina Bello",
      role: "Musician & Performer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amina",
      rating: 5,
      event: "Lagos Concert Series",
    },
  ]

  const partners = [
    { name: "AfroTech", logo: "🤖", desc: "Tech Partner" },
    { name: "Lisk", logo: "🔗", desc: "Blockchain Partner" },
    { name: "Paystack", logo: "💳", desc: "Payment Partner" },
    { name: "Flutterwave", logo: "🌍", desc: "Payment Partner" },
    { name: "Biconomy", logo: "⚡", desc: "Gas Sponsor" },
    { name: "Privy", logo: "🔐", desc: "Auth Partner" },
  ]

  const stats = [
    { icon: <Users className="h-6 w-6" />, value: "50K+", label: "Tickets Sold" },
    { icon: <Calendar className="h-6 w-6" />, value: "500+", label: "Events Hosted" },
    { icon: <Star className="h-6 w-6" />, value: "4.9/5", label: "Rating" },
    { icon: <TrendingUp className="h-6 w-6" />, value: "300%", label: "Growth" },
  ]

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary-500/10 to-accent-500/10 rounded-full backdrop-blur-sm mb-6">
            <Award className="h-5 w-5 text-primary-500" />
            <span className="text-sm font-medium bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              Trusted by Industry Leaders
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-8 font-display">
            Loved by Organizers &{' '}
            <span className="gradient-text">Attendees</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Join thousands of event organizers and attendees who trust CACK-pass 
            for seamless, secure, and gasless ticketing experiences.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {stats.map((stat, index) => (
            <div key={index} className="glass-card p-6 rounded-2xl text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <div className="text-white">
                  {stat.icon}
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">{stat.value}</div>
              <div className="text-gray-600 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-accent-500 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000" />
              
              <div className="relative glass-card p-8 rounded-3xl">
                <Quote className="h-12 w-12 text-primary-500/20 absolute top-6 right-6" />
                
                <div className="flex items-center mb-6">
                  <div className="flex mr-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-500 fill-current" />
                    ))}
                  </div>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 mb-8 italic text-lg">
                  "{testimonial.quote}"
                </p>
                
                <div className="flex items-center">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    className="w-12 h-12 rounded-full mr-4 ring-2 ring-primary-500/20"
                  />
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {testimonial.role}
                    </div>
                    <div className="text-xs text-primary-500 mt-1">{testimonial.event}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Partners */}
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-12">
            Backed by Amazing Partners
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {partners.map((partner, index) => (
              <div
                key={index}
                className="group"
              >
                <div className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center hover:shadow-xl transition-all duration-300">
                  <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform">
                    {partner.logo}
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white">{partner.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{partner.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="mt-24 bg-gradient-to-r from-primary-600 via-accent-600 to-secondary-600 rounded-3xl p-8 md:p-12 text-white overflow-hidden">
          <div className="relative">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            
            <div className="relative flex flex-col md:flex-row items-center justify-between">
              <div className="mb-8 md:mb-0 md:mr-8">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  Ready to Transform Your Events?
                </h3>
                <p className="opacity-90">
                  Join the revolution in event ticketing
                </p>
              </div>
              
              <button className="px-8 py-4 bg-white text-primary-600 rounded-xl font-bold hover:bg-gray-100 hover:scale-105 transform transition-all">
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}