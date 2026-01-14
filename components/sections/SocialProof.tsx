// components/sections/SocialProof.tsx
import { Star, Quote, Award, Users, Calendar, TrendingUp } from 'lucide-react'

export function SocialProof() {
  const testimonials = [
    {
      quote: "TicketPass eliminated ticket fraud for our events. The smart digital tickets and anti-scalping features have been game-changers.",
      author: "Sarah Johnson",
      role: "Event Director, TechFest Africa",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      rating: 5,
      event: "TechFest Lagos 2024",
    },
    {
      quote: "The instant ticket delivery and easy sharing features made our festival experience seamless for thousands of attendees.",
      author: "Marcus Okafor",
      role: "Music Festival Organizer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
      rating: 5,
      event: "AfroBeats Festival",
    },
    {
      quote: "As a fan, I love collecting beautiful digital tickets that remind me of amazing concert memories. So much better than paper!",
      author: "Amina Bello",
      role: "Music Enthusiast",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amina",
      rating: 5,
      event: "Lagos Concert Series",
    },
  ]

  const partners = [
    { name: "AfroTech", logo: "🎤", desc: "Tech Partner" },
    { name: "Paystack", logo: "💳", desc: "Payment Partner" },
    { name: "Flutterwave", logo: "🌍", desc: "Payment Partner" },
    { name: "Eventbrite", logo: "🎟️", desc: "Integration Partner" },
  ]

  const stats = [
    { icon: <Users className="h-5 w-5" />, value: "50K+", label: "Tickets Sold" },
    { icon: <Calendar className="h-5 w-5" />, value: "500+", label: "Events Hosted" },
    { icon: <Star className="h-5 w-5" />, value: "4.9/5", label: "Rating" },
    { icon: <TrendingUp className="h-5 w-5" />, value: "300%", label: "Growth" },
  ]

  return (
    <section className="py-12 md:py-24 bg-background dark:bg-dark-background">
      <div className="responsive-container">
        <div className="text-center mb-8 md:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-primary/10 dark:bg-dark-primary/10 rounded-full mb-4 md:mb-6">
            <Award className="h-4 w-4 md:h-5 md:w-5 text-primary dark:text-dark-primary" />
            <span className="text-sm md:text-base font-medium text-primary dark:text-dark-primary">
              Trusted by Event Professionals
            </span>
          </div>
          <h2 className="text-responsive-md font-bold mb-4 md:mb-6 font-display">
            Loved by Organizers &{' '}
            <span className="text-primary dark:text-dark-primary">Attendees</span>
          </h2>
          <p className="section-subtitle">
            Join thousands of event organizers and attendees who trust TicketPass 
            for seamless, secure ticketing experiences.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="card p-4 md:p-6 text-center">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 dark:bg-dark-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                <div className="text-primary dark:text-dark-primary">
                  {stat.icon}
                </div>
              </div>
              <div className="text-xl md:text-2xl font-bold mb-1 md:mb-2">{stat.value}</div>
              <div className="text-text-light dark:text-dark-secondary text-sm md:text-base">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-12 md:mb-24">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group"
            >
              <div className="card p-6 md:p-8 h-full">
                <Quote className="h-8 w-8 md:h-10 md:w-10 text-primary/20 dark:text-dark-primary/20 mb-4 md:mb-6" />
                
                <div className="flex items-center mb-4 md:mb-6">
                  <div className="flex mr-3 md:mr-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 md:h-5 md:w-5 text-yellow-500 fill-current" />
                    ))}
                  </div>
                </div>
                
                <p className="text-text-light dark:text-dark-secondary mb-6 md:mb-8 italic text-sm md:text-base">
                  "{testimonial.quote}"
                </p>
                
                <div className="flex items-center">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full mr-3 md:mr-4 ring-2 ring-primary/20 dark:ring-dark-primary/20"
                  />
                  <div>
                    <div className="font-semibold text-sm md:text-base">{testimonial.author}</div>
                    <div className="text-text-light dark:text-dark-secondary text-xs md:text-sm">
                      {testimonial.role}
                    </div>
                    <div className="text-primary dark:text-dark-primary text-xs mt-1">{testimonial.event}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Partners */}
        <div className="text-center mb-12 md:mb-16">
          <h3 className="text-xl md:text-2xl font-semibold mb-6 md:mb-8">
            Backed by Amazing Partners
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {partners.map((partner, index) => (
              <div
                key={index}
                className="group"
              >
                <div className="card p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center">
                  <div className="text-3xl md:text-4xl mb-2 md:mb-3">{partner.logo}</div>
                  <div className="font-bold text-text dark:text-dark-text text-sm md:text-base">{partner.name}</div>
                  <div className="text-text-light dark:text-dark-secondary text-xs md:text-sm mt-1">{partner.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-primary dark:bg-dark-primary rounded-2xl md:rounded-3xl p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0 md:mr-8">
              <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">
                Ready to Transform Your Events?
              </h3>
              <p className="opacity-90 text-sm md:text-base">
                Join the smart ticketing revolution
              </p>
            </div>
            
            <button className="px-6 py-3 md:px-8 md:py-4 bg-white text-primary dark:text-dark-primary rounded-xl font-bold hover:bg-gray-100 transition-colors w-full md:w-auto">
              Start Free Trial
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}