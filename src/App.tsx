import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, 
  Menu, 
  X, 
  MapPin, 
  Mail, 
  Phone, 
  Clock, 
  Star, 
  ArrowRight, 
  CheckCircle2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

import { ASSETS } from './assets-config';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  onSnapshot, 
  increment, 
  runTransaction,
  serverTimestamp 
} from 'firebase/firestore';

export default function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeLightbox, setActiveLightbox] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const [selectedService, setSelectedService] = useState<any>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeCampaign, setActiveCampaign] = useState<any>(null);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);

  const galleryItems = [
    { img: ASSETS.clinic.gallery1, label: 'Clinic Facility' },
    { img: ASSETS.clinic.gallery2, label: 'Advanced Care' },
    { img: ASSETS.clinic.gallery3, label: 'Modern Equipment' },
    { img: ASSETS.clinic.gallery4, label: 'Patient Care' },
    { img: ASSETS.clinic.gallery5, label: 'Our Team' }
  ];

  const nextGallery = () => {
    setCurrentGalleryIndex((prev) => (prev + 1) % galleryItems.length);
  };

  const prevGallery = () => {
    setCurrentGalleryIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
  };

  const TIME_SLOTS = [
    '10:00 AM – 11:00 AM',
    '11:00 AM – 12:00 PM',
    '2:00 PM – 3:00 PM',
    '3:00 PM – 4:00 PM',
    '4:00 PM – 5:00 PM',
    '5:00 PM – 6:00 PM',
    '6:00 PM – 7:00 PM'
  ];

  const isSlotPast = (slot: string, date: string) => {
    if (!date) return false;
    const now = new Date();
    const selected = new Date(date);
    
    // Check if it's a past date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) return true;
    
    // If it's not today, it's not past (since we already checked for past dates)
    if (selected.toDateString() !== now.toDateString()) return false;

    // It's today, check the time
    const [timeStr] = slot.split(' – ');
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);

    return now > slotTime;
  };

  useEffect(() => {
    // Real-time listener for slot counts
    const unsubscribeSlots = onSnapshot(collection(db, 'slots'), (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.forEach((doc) => {
        counts[doc.id] = doc.data().count || 0;
      });
      setSlotCounts(counts);
    });

    // Real-time listener for active campaigns
    const unsubscribeCampaigns = onSnapshot(collection(db, 'campaigns'), (snapshot) => {
      const campaigns: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive) {
          campaigns.push({ id: doc.id, ...data });
        }
      });
      // Pick the first active campaign for now
      setActiveCampaign(campaigns.length > 0 ? campaigns[0] : null);
    });

    return () => {
      unsubscribeSlots();
      unsubscribeCampaigns();
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    // Construct WhatsApp message
    const message = `*New Appointment Request - Shree Netralaya*\n\n` +
      `*Name:* ${data.firstName} ${data.lastName}\n` +
      `*Phone:* ${data.phone}\n` +
      `*Date:* ${data.date}\n` +
      `*Time:* ${data.time}\n` +
      `*Notes:* ${data.notes || 'None'}\n\n` +
      `Please confirm my booking.`;
    
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/917385876572?text=${encodedMessage}`;
    setWhatsappUrl(url);

    try {
      const selectedTime = data.time as string;
      
      // Use a transaction to ensure atomic update and check limit
      await runTransaction(db, async (transaction) => {
        const slotRef = doc(db, 'slots', selectedTime);
        const slotDoc = await transaction.get(slotRef);
        
        const currentCount = slotDoc.exists() ? slotDoc.data().count : 0;
        
        if (currentCount >= 2) {
          throw new Error('This slot is already full. Please select another time.');
        }
        
        // Add appointment doc
        const appointmentRef = doc(collection(db, 'appointments'));
        transaction.set(appointmentRef, {
          ...data,
          createdAt: new Date().toISOString(),
          timestamp: serverTimestamp()
        });
        
        // Increment slot count
        if (!slotDoc.exists()) {
          transaction.set(slotRef, { count: 1 });
        } else {
          transaction.update(slotRef, { count: increment(1) });
        }
      });

      setFormSubmitted(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      
      // Redirect to WhatsApp after a brief delay to show success state
      setTimeout(() => {
        window.open(url, '_blank');
      }, 1000);
    } catch (error: any) {
      console.error('Error submitting form:', error);
      alert(error.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Campaign Banner */}
      <AnimatePresence>
        {activeCampaign && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-teal-primary text-white py-2.5 px-[5%] text-center relative z-[60] overflow-hidden"
          >
            <div className="flex items-center justify-center gap-3 text-[13px] font-bold tracking-wide">
              <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] uppercase">Special Event</span>
              <p>{activeCampaign.title}</p>
              {activeCampaign.buttonLink && (
                <a 
                  href={activeCampaign.buttonLink}
                  className="underline hover:text-white/80 transition-colors ml-2"
                >
                  {activeCampaign.buttonText || 'Learn More'} →
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 px-[5%] transition-all duration-500 flex items-center justify-between ${isScrolled ? 'h-[64px] bg-white/95 border-b border-ink/5 backdrop-blur-md shadow-sm' : 'h-[88px] bg-transparent border-b border-transparent'}`}>
        <a href="#" className={`font-serif text-xl font-bold flex items-center gap-2.5 tracking-tight transition-colors duration-300 ${isScrolled ? 'text-ink' : 'text-white'}`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-300 ${isScrolled ? 'bg-teal-primary/5' : 'bg-white'}`}>
            {ASSETS.logo.url ? (
              <img 
                src={ASSETS.logo.url} 
                alt="Logo" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    const icon = document.createElement('div');
                    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye text-teal-primary"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
                    parent.appendChild(icon.firstChild as Node);
                  }
                }}
              />
            ) : (
              <Eye className={`${isScrolled ? 'text-teal-primary' : 'text-teal-primary'} w-5 h-5`} />
            )}
          </div>
          Shree Netralaya
        </a>

        <ul className="hidden md:flex gap-8 list-none">
          {['Services', 'About', 'Gallery', 'Doctors', 'Reviews', 'Contact'].map((item) => (
            <li key={item}>
              <a href={`#${item.toLowerCase()}`} className={`text-[13px] font-bold tracking-widest uppercase transition-all duration-300 hover:text-teal-primary ${isScrolled ? 'text-ink/70' : 'text-white/80'}`}>
                {item}
              </a>
            </li>
          ))}
        </ul>

        <button 
          onClick={() => document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })}
          className={`hidden md:block px-7 py-2.5 rounded font-bold text-[12px] tracking-wider uppercase transition-all duration-300 hover:-translate-y-0.5 ${isScrolled ? 'bg-teal-primary text-white shadow-md shadow-teal-primary/20' : 'bg-white text-teal-primary'}`}
        >
          Book Appointment
        </button>

        <button className={`md:hidden p-1 transition-colors duration-300 ${isScrolled ? 'text-ink' : 'text-white'}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-ink pt-24 px-6 md:hidden"
          >
            <ul className="flex flex-col gap-6">
              {['Services', 'About', 'Gallery', 'Doctors', 'Reviews', 'Contact'].map((item) => (
                <li key={item}>
                  <a 
                    href={`#${item.toLowerCase()}`} 
                    onClick={() => setIsMenuOpen(false)}
                    className="text-white text-xl font-medium"
                  >
                    {item}
                  </a>
                </li>
              ))}
              <li>
                <button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full bg-teal-primary text-white py-4 rounded-lg font-bold"
                >
                  Book Appointment
                </button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section id="hero" className="min-h-screen relative flex items-center overflow-hidden">
        {/* Campaign Mode Indicator */}
        {activeCampaign && (
          <div className="absolute top-32 right-10 z-20 hidden lg:block">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl max-w-[300px] shadow-2xl"
            >
              {activeCampaign.imageUrl && (
                <img 
                  src={activeCampaign.imageUrl} 
                  alt="Campaign" 
                  className="w-full h-40 object-cover rounded-lg mb-4"
                  referrerPolicy="no-referrer"
                />
              )}
              <h4 className="text-white font-serif text-lg font-bold mb-2">{activeCampaign.title}</h4>
              <p className="text-white/60 text-xs leading-relaxed mb-4">{activeCampaign.description}</p>
              <button 
                onClick={() => document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full bg-teal-primary text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest"
              >
                {activeCampaign.buttonText || 'Register Now'}
              </button>
            </motion.div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-br from-[#071524] via-[#0e2640] to-[#0a3d52]"></div>
        <div 
          className="absolute inset-0 opacity-18 mix-blend-luminosity bg-center bg-cover no-repeat"
          style={{ backgroundImage: `url('${ASSETS.clinic.hero}')` }}
        ></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        <div className="absolute -right-[200px] top-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(10,124,110,0.25)_0%,transparent_70%)] pointer-events-none"></div>
        
        <div className="relative z-10 px-[5%] pt-[120px] pb-20 max-w-[680px]">
          <div className="inline-flex items-center gap-2 bg-teal-primary/20 border border-teal-primary/40 text-teal-hover text-[12px] font-semibold tracking-[0.1em] uppercase px-4 py-1.5 rounded-full mb-7">
            <span className="w-1.5 h-1.5 bg-teal-hover rounded-full animate-pulse"></span>
            10+ Years of Excellence · Aurangabad's Premier Eye Care
          </div>
          <h1 className="font-serif text-[clamp(42px,6vw,72px)] font-bold text-white leading-[1.1] mb-6">
            See The World<br />
            <span className="text-transparent italic [-webkit-text-stroke:1px_var(--color-gold-light)] block">In Perfect Clarity.</span>
          </h1>
          <p className="text-white/60 text-base font-light leading-[1.85] max-w-[500px] mb-10">
            At Shree Netralaya, we fuse cutting-edge ophthalmic technology with over a decade of surgical expertise — delivering vision care that truly transforms lives.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <a href="#book" className="bg-teal-primary hover:bg-teal-hover text-white px-8 py-3.5 rounded font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(10,124,110,0.4)]">
              Book Free Consultation
            </a>
            <a href="#services" className="bg-transparent text-white border border-white/25 hover:border-white/60 hover:bg-white/5 px-8 py-3.5 rounded font-medium text-sm transition-all duration-200">
              Explore Services
            </a>
          </div>
          
          <div className="flex flex-wrap gap-12 mt-15 pt-12 border-t border-white/10">
            <div>
              <div className="font-serif text-[40px] font-bold text-gold-light leading-none">10+</div>
              <div className="text-[12px] text-white/45 tracking-widest uppercase mt-1">Years of Excellence</div>
            </div>
            <div>
              <div className="font-serif text-[40px] font-bold text-gold-light leading-none">5K+</div>
              <div className="text-[12px] text-white/45 tracking-widest uppercase mt-1">Surgeries Performed</div>
            </div>
            <div>
              <div className="font-serif text-[40px] font-bold text-gold-light leading-none">6</div>
              <div className="text-[12px] text-white/45 tracking-widest uppercase mt-1">Super Specialities</div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee Section */}
      <div className="bg-teal-primary py-6 overflow-hidden border-y border-white/10 flex flex-col gap-5">
        {/* Top Marquee - Sliding Right */}
        <div className="marquee-track-reverse">
          {[
            'Cataract Surgery (Advanced Phaco Technique)', 'Stitchless Cataract Surgery', 
            'Intraocular Lens (IOL) Implantation', 'Laser Cataract Surgery', 
            'Treatment for Eye Floaters (Black Spots)', 'Squint Eye (Strabismus) Surgery', 
            'Computerized Vision Testing'
          ].concat([
            'Cataract Surgery (Advanced Phaco Technique)', 'Stitchless Cataract Surgery', 
            'Intraocular Lens (IOL) Implantation', 'Laser Cataract Surgery', 
            'Treatment for Eye Floaters (Black Spots)', 'Squint Eye (Strabismus) Surgery', 
            'Computerized Vision Testing'
          ]).map((item, i) => (
            <span key={i} className="text-[13px] text-white/90 tracking-[0.12em] uppercase font-bold flex items-center gap-4">
              <span className="w-1.5 h-1.5 bg-gold-light rounded-full shadow-[0_0_8px_rgba(224,184,78,0.6)]"></span>
              {item}
            </span>
          ))}
        </div>

        {/* Bottom Marquee - Sliding Left */}
        <div className="marquee-track">
          {[
            'Pediatric Eye Care', 'Diabetic Retinopathy Screening', 
            'Dry Eye Diagnosis & Treatment', 'Contact Lens Fitting', 
            'Glaucoma Screening & Treatment', 'Emergency Eye Care Service'
          ].concat([
            'Pediatric Eye Care', 'Diabetic Retinopathy Screening', 
            'Dry Eye Diagnosis & Treatment', 'Contact Lens Fitting', 
            'Glaucoma Screening & Treatment', 'Emergency Eye Care Service'
          ]).map((item, i) => (
            <span key={i} className="text-[13px] text-white/90 tracking-[0.12em] uppercase font-bold flex items-center gap-4">
              <span className="w-1.5 h-1.5 bg-gold-light rounded-full shadow-[0_0_8px_rgba(224,184,78,0.6)]"></span>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Services Section */}
      <section id="services" className="bg-white py-24 px-[5%]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2.5 text-teal-primary text-[11px] font-semibold tracking-[0.15em] uppercase mb-3 before:content-[''] before:w-7 before:h-[1.5px] before:bg-teal-primary">
            What We Offer
          </div>
          <h2 className="font-serif text-[clamp(28px,4vw,46px)] font-bold text-ink leading-[1.2] mb-3.5">
            World-Class Eye Care Services
          </h2>
          <p className="text-slate-500 text-[15px] leading-[1.85] max-w-[520px] mb-13">
            From routine vision checks to complex microsurgery, our subspecialty-trained team delivers outcomes that restore and protect the gift of sight.
          </p>
        </motion.div>
        
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            show: {
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0.5 bg-ink/10 border border-ink/10"
        >
          {[
            { id: '01', name: 'Advanced Cataract Surgery', category: 'Surgery', desc: 'Specialized Phaco technique with no injection and stitchless recovery. Premium Intraocular Lens (IOL) implantation for crystal clear vision.', img: ASSETS.services.cataract },
            { id: '02', name: 'Computerized Vision Testing', category: 'Diagnostics', desc: 'Precision diagnostics using advanced computerized systems for accurate spectacle prescriptions and early detection of eye conditions.', img: ASSETS.services.diagnostics },
            { id: '03', name: 'Pediatric Eye Care', category: 'Pediatric', desc: 'Specialized children eye checkups and treatments for squint (strabismus), lazy eye, and pediatric vision development.', img: ASSETS.services.paediatric },
            { id: '04', name: 'Retina & Diabetic Care', category: 'Medical Retina', desc: 'Comprehensive screening and treatment for Diabetic Retinopathy, eye floaters (black spots), and other retinal disorders.', img: ASSETS.services.retina },
            { id: '05', name: 'Glaucoma & Dry Eye', category: 'Specialized', desc: 'Advanced screening and management for Glaucoma (the silent thief of sight) and specialized dry eye diagnosis and treatment.', img: ASSETS.services.glaucoma },
            { id: '06', name: 'Specialty Consultations', category: 'Consultation', desc: 'Contact lens fitting, emergency eye care services, and expert consultations for all complex ophthalmic conditions.', img: ASSETS.services.lasik },
            { id: '07', name: 'Squint & Orthoptics', category: 'Specialized', desc: 'Expert management of eye misalignment in both children and adults using surgical and non-surgical methods.', img: ASSETS.services.paediatric },
            { id: '08', name: 'Oculoplasty & Aesthetics', category: 'Surgery', desc: 'Cosmetic and functional eyelid surgeries, tear duct procedures, and orbital treatments.', img: ASSETS.services.diagnostics },
            { id: '09', name: 'Cornea & External Disease', category: 'Medical', desc: 'Treatment for corneal infections, ulcers, and advanced corneal transplantation procedures.', img: ASSETS.services.retina }
          ].map((svc) => (
            <motion.div 
              key={svc.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              onClick={() => setSelectedService(svc)}
              className="bg-white group cursor-pointer relative overflow-hidden"
            >
              <div className="h-[220px] overflow-hidden relative">
                <motion.img 
                  src={svc.img} 
                  alt={svc.name} 
                  className="w-full h-full object-cover saturate-[0.8] group-hover:saturate-100"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300"></div>
                <div className="absolute bottom-4 left-6">
                  <div className="bg-teal-primary text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded">
                    {svc.category}
                  </div>
                </div>
              </div>
              <div className="p-8 pb-9 flex flex-col h-full border-b border-transparent group-hover:border-teal-primary/20 transition-colors duration-300">
                <div className="font-serif text-[11px] text-teal-primary font-semibold tracking-[0.12em] mb-2.5">{svc.id}</div>
                <h3 className="font-serif text-xl font-bold text-ink mb-3 group-hover:text-teal-primary transition-colors duration-300">{svc.name}</h3>
                <p className="text-slate-500 text-[14px] leading-[1.8] flex-grow line-clamp-3">{svc.desc}</p>
                <div className="inline-flex items-center gap-2 text-[12px] text-teal-primary font-bold tracking-wider uppercase mt-6 transition-all duration-300 group-hover:gap-3">
                  Learn More <ChevronRight size={16} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Service Detail Modal */}
      <AnimatePresence>
        {selectedService && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-ink/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
            onClick={() => setSelectedService(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-ink/5 flex items-center justify-center text-ink hover:bg-ink/10 transition-colors"
                onClick={() => setSelectedService(null)}
              >
                <X size={20} />
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="h-[300px] md:h-full relative">
                  <img src={selectedService.img} alt={selectedService.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent"></div>
                  <div className="absolute bottom-8 left-8">
                    <div className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-2">{selectedService.category}</div>
                    <h2 className="text-white font-serif text-3xl font-bold">{selectedService.name}</h2>
                  </div>
                </div>
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <div className="w-12 h-1 bg-teal-primary mb-8"></div>
                  <h3 className="font-serif text-2xl font-bold text-ink mb-6">Comprehensive Care</h3>
                  <p className="text-slate-600 text-base leading-[1.8] mb-8">
                    {selectedService.desc} Our approach combines advanced diagnostic tools with personalized treatment plans to ensure the best possible outcomes for your vision.
                  </p>
                  <div className="space-y-4 mb-10">
                    <div className="flex items-center gap-3 text-sm font-semibold text-ink">
                      <CheckCircle2 size={18} className="text-teal-primary" /> Advanced Technology
                    </div>
                    <div className="flex items-center gap-3 text-sm font-semibold text-ink">
                      <CheckCircle2 size={18} className="text-teal-primary" /> Expert Specialists
                    </div>
                    <div className="flex items-center gap-3 text-sm font-semibold text-ink">
                      <CheckCircle2 size={18} className="text-teal-primary" /> Personalized Treatment
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedService(null);
                      document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full bg-teal-primary hover:bg-teal-hover text-white py-4 rounded-lg font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    Book Consultation <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Section */}
      <section id="about" className="bg-cream py-24 px-[5%]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-18 items-center">
          <div className="hidden lg:grid grid-cols-2 grid-rows-2 gap-3 relative">
            <div className="col-span-1 row-span-2 rounded overflow-hidden h-[440px]">
              <img src={ASSETS.clinic.reception} className="w-full h-full object-cover hover:scale-105 transition-transform duration-600" referrerPolicy="no-referrer" />
            </div>
            <div className="rounded overflow-hidden h-[210px]">
              <img src={ASSETS.clinic.consultation} className="w-full h-full object-cover hover:scale-105 transition-transform duration-600" referrerPolicy="no-referrer" />
            </div>
            <div className="rounded overflow-hidden h-[210px]">
              <img src={ASSETS.clinic.equipment} className="w-full h-full object-cover hover:scale-105 transition-transform duration-600" referrerPolicy="no-referrer" />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-teal-primary text-white rounded p-5 z-10">
              <div className="font-serif text-[40px] font-bold leading-none">2016</div>
              <div className="text-[12px] opacity-80 mt-1">Founded in Aurangabad</div>
            </div>
          </div>
          
          <div className="lg:pl-2">
            <div className="flex items-center gap-2.5 text-teal-primary text-[11px] font-semibold tracking-[0.15em] uppercase mb-3 before:content-[''] before:w-7 before:h-[1.5px] before:bg-teal-primary">
              Our Story
            </div>
            <h2 className="font-serif text-[clamp(28px,4vw,46px)] font-bold text-ink leading-[1.2] mb-3.5">
              A Decade of Transforming Lives Through Vision
            </h2>
            <p className="text-slate-500 text-[15px] leading-[1.85] mb-3">
              Shree Netralaya was established in 2016 with a single mission: to make world-class eye care accessible to every family in Marathwada. Today, under the expert leadership of Dr. Swati Jadhav, we are Aurangabad's most trusted ophthalmology centre with over 5,000 successful surgeries.
            </p>
            <p className="text-slate-500 text-[15px] leading-[1.85]">
              Dr. Jadhav, a Gold Medalist from GMC Nagpur and trained at the prestigious Aravind Eye Hospital, brings a decade of surgical excellence. Our state-of-the-art facility is matched only by her warmth and dedication to patient care.
            </p>
            

          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="bg-ink py-18 px-[5%]">
        <div className="flex justify-between items-end mb-9">
          <div>
            <div className="flex items-center gap-2.5 text-teal-hover text-[11px] font-semibold tracking-[0.15em] uppercase mb-3 before:content-[''] before:w-7 before:h-[1.5px] before:bg-teal-hover">
              Visual Tour
            </div>
            <h2 className="font-serif text-[clamp(28px,4vw,46px)] font-bold text-white leading-[1.2]">
              Our Clinic & Facilities
            </h2>
          </div>
        </div>
        
        <div className="relative group max-w-5xl mx-auto">
          <div className="overflow-hidden rounded-2xl aspect-[16/9] md:aspect-[21/9] relative shadow-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentGalleryIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full h-full cursor-pointer"
                onClick={() => setActiveLightbox(galleryItems[currentGalleryIndex].img)}
              >
                <img 
                  src={galleryItems[currentGalleryIndex].img} 
                  alt={galleryItems[currentGalleryIndex].label}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent flex items-end p-8 md:p-12">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="bg-teal-primary text-white text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded inline-block mb-3">
                      Visual Tour
                    </div>
                    <h3 className="text-white font-serif text-2xl md:text-3xl font-bold">
                      {galleryItems[currentGalleryIndex].label}
                    </h3>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Controls */}
            <button 
              onClick={(e) => { e.stopPropagation(); prevGallery(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-teal-primary transition-all duration-300 z-10 opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); nextGallery(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-teal-primary transition-all duration-300 z-10 opacity-0 group-hover:opacity-100"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Indicators */}
          <div className="flex justify-center gap-3 mt-8">
            {galleryItems.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentGalleryIndex(i)}
                className={`h-1.5 transition-all duration-300 rounded-full ${i === currentGalleryIndex ? 'w-8 bg-teal-primary' : 'w-2 bg-white/20 hover:bg-white/40'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Doctors Section */}
      <section id="doctors" className="bg-white py-24 px-[5%]">
        <div className="flex items-center gap-2.5 text-teal-primary text-[11px] font-semibold tracking-[0.15em] uppercase mb-3 before:content-[''] before:w-7 before:h-[1.5px] before:bg-teal-primary">
          Our Specialist
        </div>
        <h2 className="font-serif text-[clamp(28px,4vw,46px)] font-bold text-ink leading-[1.2] mb-13">
          Meet Our Chief Surgeon
        </h2>
        
        <div className="bg-cream rounded-2xl overflow-hidden border border-ink/5 shadow-[0_24px_80px_rgba(0,0,0,0.06)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Image Column */}
            <div className="lg:col-span-5 relative h-[400px] lg:h-auto overflow-hidden group">
              <img 
                src={ASSETS.doctor.url} 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = ASSETS.doctor.fallback;
                }}
                alt="Dr. Swati Jadhav" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent opacity-60"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-sm">
                  <div className="w-2 h-2 bg-teal-primary rounded-full animate-pulse"></div>
                  <span className="text-[11px] font-bold text-ink uppercase tracking-wider">Available for Consultation</span>
                </div>
              </div>
            </div>

            {/* Content Column */}
            <div className="lg:col-span-7 p-8 md:p-14 lg:p-16 flex flex-col justify-center">
              <div className="mb-8">
                <h3 className="font-serif text-[32px] md:text-[42px] font-bold text-ink mb-2 leading-tight">Dr. Swati Jadhav</h3>
                <div className="text-teal-primary font-semibold tracking-[0.1em] uppercase text-sm mb-6">Chief Ophthalmologist & Eye Surgeon</div>
                
                <div className="space-y-4 mb-10">
                  <p className="text-slate-600 text-base md:text-lg leading-[1.75]">
                    Dr. Jadhav, a <span className="text-ink font-semibold">Gold Medalist</span> from GMC Nagpur and trained at the prestigious <span className="text-ink font-semibold">Aravind Eye Hospital</span>, brings a decade of surgical excellence. Our state-of-the-art facility is matched only by her warmth and dedication to patient care.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <div>
                    <h4 className="text-[11px] font-bold text-ink/40 uppercase tracking-widest mb-4">Qualifications</h4>
                    <ul className="space-y-3">
                      {[
                        'MBBS (GMC, Ambejogai)',
                        'DOMS (Gold Medalist) (GMC, Nagpur)',
                        'DNB (Aravind Eye Hospital, Tamilnadu)',
                        'FAICO (Delhi)'
                      ].map((q, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-ink/80 font-medium">
                          <CheckCircle2 size={16} className="text-teal-primary flex-shrink-0" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-ink/40 uppercase tracking-widest mb-4">Professional Details</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="text-[11px] text-slate-400 font-medium mb-1">Registration No.</div>
                        <div className="text-sm text-ink font-semibold">2015/05/2343</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 font-medium mb-1">Experience</div>
                        <div className="text-sm text-ink font-semibold">10+ Years of Excellence</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-8 border-t border-ink/5">
                <button 
                  onClick={() => document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-teal-primary hover:bg-teal-hover text-white px-8 py-4 rounded-lg font-bold tracking-wide transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(10,124,110,0.3)] flex items-center gap-2"
                >
                  Book Consultation <ArrowRight size={18} />
                </button>
                <a 
                  href="tel:+917385876572"
                  className="bg-white border border-ink/10 hover:border-teal-primary/30 text-ink px-8 py-4 rounded-lg font-bold tracking-wide transition-all duration-300 flex items-center gap-2"
                >
                  <Phone size={18} className="text-teal-primary" /> 7385876572
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="reviews" className="bg-cream py-24 px-[5%]">
        <div className="flex items-center gap-2.5 text-teal-primary text-[11px] font-semibold tracking-[0.15em] uppercase mb-3 before:content-[''] before:w-7 before:h-[1.5px] before:bg-teal-primary">
          Patient Stories
        </div>
        <h2 className="font-serif text-[clamp(28px,4vw,46px)] font-bold text-ink leading-[1.2] mb-3.5">
          What Our Patients Say
        </h2>
        <p className="text-slate-500 text-[15px] leading-[1.85] max-w-[520px] mb-13">
          Real experiences from real patients who trusted us with their most precious sense.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { name: 'Sunil Deshmukh', loc: 'Padegaon · Cataract Surgery', text: '"Best eye hospital in Padegaon area. Dr. Swati Jadhav is very experienced and explains everything clearly. My father\'s cataract surgery was successful and recovery was very fast."', initial: 'SD' },
            { name: 'Megha Patil', loc: 'Chh. Sambhajinagar · Vision Testing', text: '"Very clean and well-maintained clinic. The staff is very helpful. Computerized vision testing is very accurate. Highly recommended for any eye related issues."', initial: 'MP' },
            { name: 'Amol Gadekar', loc: 'Cantonment · General Checkup', text: '"I had a great experience for my eye checkup. The consultation fee is reasonable and the treatment is top-notch. Dr. Jadhav takes time to listen to patients."', initial: 'AG' },
            { name: 'Snehal K.', loc: 'Padegaon · Pediatric Care', text: '"Excellent pediatric eye care. My daughter was very comfortable during her squint evaluation. Dr. Jadhav has a great way with kids, making them feel at ease."', initial: 'SK' },
            { name: 'Vijay Rathod', loc: 'Waluj · Diabetic Retina', text: '"The state-of-the-art equipment at Shree Netralaya is impressive. I got my diabetic retinopathy screening done here and the process was very smooth and professional."', initial: 'VR' },
            { name: 'Deepak G.', loc: 'Padegaon · Emergency Care', text: '"Quick and efficient service. I went for a sudden eye irritation and was seen almost immediately. The emergency care is truly reliable and the staff is very prompt."', initial: 'DG' }
          ].map((testi, i) => (
            <div key={i} className="bg-white rounded-xl p-7 border border-ink/5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              <div className="flex gap-1 text-gold-primary text-sm mb-4">
                {[...Array(5)].map((_, i) => <span key={i}>★</span>)}
              </div>
              <p className="text-[14px] text-ink/80 leading-[1.8] mb-6 italic">{testi.text}</p>
              <div className="flex items-center gap-3 mt-auto">
                <div className="w-10 h-10 rounded-full bg-teal-primary/10 flex items-center justify-center font-serif text-sm text-teal-primary font-bold flex-shrink-0">
                  {testi.initial}
                </div>
                <div>
                  <div className="text-sm font-bold text-ink">{testi.name}</div>
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{testi.loc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Booking Section */}
      <section id="book" className="bg-ink relative overflow-hidden py-24 px-[5%]">
        <div 
          className="absolute inset-0 opacity-8 bg-center bg-cover no-repeat"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=1400&q=70')" }}
        ></div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-18 items-start">
          <div className="text-left">
            <div className="flex items-center gap-2.5 text-teal-hover text-[11px] font-semibold tracking-[0.15em] uppercase mb-3 before:content-[''] before:w-7 before:h-[1.5px] before:bg-teal-hover">
              Appointments
            </div>
            <h2 className="font-serif text-[clamp(28px,4vw,46px)] font-bold text-white leading-[1.2] mb-3.5">
              Book Your Consultation
            </h2>
            <p className="text-white/55 text-[15px] leading-[1.85] mb-8">
              Take the first step towards better vision. Our team will confirm your slot within 2 hours and send full instructions via SMS and email.
            </p>
            
            <ul className="flex flex-col gap-5.5">
              {[
                { n: 1, t: 'Fill the form', d: 'Share your name, contact details, and reason for visit — it takes under 2 minutes.' },
                { n: 2, t: 'Get confirmed', d: 'We confirm your slot within 2 hours via SMS and email with all details.' },
                { n: 3, t: 'Visit us', d: 'Arrive on time. Most consultations take 45–60 minutes. Bring your old prescription if available.' }
              ].map((step) => (
                <li key={step.n} className="flex gap-4.5 items-start">
                  <div className="w-9.5 h-9.5 rounded-full border-[1.5px] border-teal-primary text-teal-hover flex items-center justify-center font-serif text-base font-bold flex-shrink-0">
                    {step.n}
                  </div>
                  <div>
                    <strong className="block text-white text-sm font-semibold mb-1">{step.t}</strong>
                    <span className="text-white/45 text-[13px] leading-[1.65]">{step.d}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-white rounded-xl p-10 md:p-9">
            {!formSubmitted ? (
              <form onSubmit={handleFormSubmit}>
                <h3 className="font-serif text-[22px] font-bold text-ink mb-1.5">Request an Appointment</h3>
                <p className="text-[13px] text-slate-500 mb-7">Free first consultation for new patients</p>
                
                <div className="flex gap-2 mb-6">
                  <div className="flex-1 h-1 rounded-full bg-teal-primary"></div>
                  <div className="flex-1 h-1 rounded-full bg-teal-primary"></div>
                  <div className="flex-1 h-1 rounded-full bg-teal-primary"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold tracking-wider uppercase text-ink/60">First Name</label>
                    <input name="firstName" required type="text" placeholder="Rahul" className="border-[1.5px] border-ink/10 rounded p-3 text-sm font-sans text-ink bg-cream outline-none focus:border-teal-primary focus:ring-3 focus:ring-teal-primary/12 transition-all" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold tracking-wider uppercase text-ink/60">Last Name <span className="text-red-500">*</span></label>
                    <input name="lastName" required type="text" placeholder="Sharma" className="border-[1.5px] border-ink/10 rounded p-3 text-sm font-sans text-ink bg-cream outline-none focus:border-teal-primary focus:ring-3 focus:ring-teal-primary/12 transition-all" />
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5 mb-3.5">
                  <label className="text-[11px] font-semibold tracking-wider uppercase text-ink/60">Mobile Number <span className="text-red-500">*</span></label>
                  <input name="phone" required type="tel" pattern="[0-9]{10}" placeholder="9876543210" className="border-[1.5px] border-ink/10 rounded p-3 text-sm font-sans text-ink bg-cream outline-none focus:border-teal-primary focus:ring-3 focus:ring-teal-primary/12 transition-all" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold tracking-wider uppercase text-ink/60">Preferred Date <span className="text-red-500">*</span></label>
                    <input 
                      name="date" 
                      required 
                      type="date" 
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="border-[1.5px] border-ink/10 rounded p-3 text-sm font-sans text-ink bg-cream outline-none focus:border-teal-primary focus:ring-3 focus:ring-teal-primary/12 transition-all" 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold tracking-wider uppercase text-ink/60">Preferred Time <span className="text-red-500">*</span></label>
                    <select name="time" required className="border-[1.5px] border-ink/10 rounded p-3 text-sm font-sans text-ink bg-cream outline-none focus:border-teal-primary focus:ring-3 focus:ring-teal-primary/12 transition-all">
                      <option value="">Select Time</option>
                      {TIME_SLOTS.map(slot => {
                        const count = slotCounts[slot] || 0;
                        const isFull = count >= 2;
                        const isPast = isSlotPast(slot, selectedDate);
                        const isDisabled = isFull || isPast;
                        
                        let label = slot;
                        if (isFull) label += ' (No Booking Available)';
                        else if (isPast) label += ' (Past Time)';

                        return (
                          <option key={slot} value={slot} disabled={isDisabled} className={isDisabled ? 'text-slate-400 bg-slate-100' : ''}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5 mb-7">
                  <label className="text-[11px] font-semibold tracking-wider uppercase text-ink/60">Symptoms / Notes</label>
                  <textarea name="notes" placeholder="Describe your concern..." className="border-[1.5px] border-ink/10 rounded p-3 text-sm font-sans text-ink bg-cream outline-none focus:border-teal-primary focus:ring-3 focus:ring-teal-primary/12 transition-all resize-vertical min-height-[88px]"></textarea>
                </div>
                
                <button type="submit" className="w-full bg-teal-primary hover:bg-teal-hover text-white p-4 rounded font-bold tracking-wider transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(10,124,110,0.35)] flex items-center justify-center gap-2">
                  Confirm Appointment Request <ChevronRight size={18} />
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-2.5">🔒 Your information is private & secure.</p>
              </form>
            ) : (
              <div className="text-center py-8 px-4">
                <div className="w-16 h-16 rounded-full bg-teal-primary/10 flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
                <h3 className="font-serif text-[22px] font-bold text-ink mb-2">Request Received!</h3>
                <p className="text-sm text-slate-500 mb-8">We're redirecting you to WhatsApp to send your booking confirmation. Please click "Send" on the next screen to finalize your appointment.</p>
                <div className="flex flex-col gap-3">
                  <a 
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-[#25D366] text-white px-8 py-3 rounded font-bold flex items-center justify-center gap-2 hover:bg-[#128C7E] transition-colors"
                  >
                    Send via WhatsApp Now
                  </a>
                  <button 
                    onClick={() => setFormSubmitted(false)}
                    className="text-slate-400 text-[12px] font-semibold hover:text-ink transition-colors"
                  >
                    Book Another Appointment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="bg-white py-24 px-[5%]">
        <div className="flex items-center gap-2.5 text-teal-primary text-[11px] font-semibold tracking-[0.15em] uppercase mb-3 before:content-[''] before:w-7 before:h-[1.5px] before:bg-teal-primary">
          Find Us
        </div>
        <h2 className="font-serif text-[clamp(28px,4vw,46px)] font-bold text-ink leading-[1.2] mb-3.5">
          Get in Touch
        </h2>
        <p className="text-slate-500 text-[15px] leading-[1.85] max-w-[520px] mb-13">
          We're here to help, Monday through Sunday. Walk-ins welcome during working hours.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-ink/10 border border-ink/10 mt-13">
          <div className="bg-white p-9 transition-colors duration-200 hover:bg-cream">
            <div className="w-12 h-12 rounded-lg bg-teal-primary/8 flex items-center justify-center mb-4.5">
              <MapPin className="text-teal-primary w-5.5 h-5.5" />
            </div>
            <div className="text-[11px] tracking-widest uppercase text-slate-500 font-semibold mb-2">Address</div>
            <div className="text-[15px] text-ink leading-[1.65]">SHOP NO. 04, IMPACT TRADE CENTRE,<br />beside Woodlot hotel, Padegaon,<br />Chhatrapati Sambhajinagar, MH — 431002</div>
          </div>
          <div className="bg-white p-9 transition-colors duration-200 hover:bg-cream">
            <div className="w-12 h-12 rounded-lg bg-teal-primary/8 flex items-center justify-center mb-4.5">
              <Mail className="text-teal-primary w-5.5 h-5.5" />
            </div>
            <div className="text-[11px] tracking-widest uppercase text-slate-500 font-semibold mb-2">Email & Phone</div>
            <div className="text-[15px] text-ink leading-[1.65]">
              <a href="mailto:care@shreenetralaya.com" className="text-teal-primary hover:underline">care@shreenetralaya.com</a><br />
              <a href="tel:+912402481234" className="text-teal-primary hover:underline">+91 240 248 1234</a><br />
              <a href="tel:+919876543210" className="text-teal-primary hover:underline">+91 98765 43210</a>
            </div>
          </div>
          <div className="bg-white p-9 transition-colors duration-200 hover:bg-cream">
            <div className="w-12 h-12 rounded-lg bg-teal-primary/8 flex items-center justify-center mb-4.5">
              <Clock className="text-teal-primary w-5.5 h-5.5" />
            </div>
            <div className="text-[11px] tracking-widest uppercase text-slate-500 font-semibold mb-2">Working Hours</div>
            <div className="text-[15px] text-ink leading-[1.65]">
              Mon – Fri: 9:00 AM – 6:30 PM<br />
              Saturday: 9:00 AM – 5:00 PM<br />
              Sunday: 10:00 AM – 1:00 PM
            </div>
          </div>
        </div>
        
        <div className="mt-10 rounded overflow-hidden h-[400px] border border-ink/10 relative bg-cream">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3752.138855474614!2d75.28735887508933!3d19.88442698149176!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bdb99b7287fe83f%3A0x4e868d6dff4558b8!2sShree%20Netralaya!5e0!3m2!1sen!2sin!4v1712561234567!5m2!1sen!2sin" 
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen={true} 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Shree Netralaya Location"
          ></iframe>
          <div className="absolute bottom-4 right-4">
            <a 
              href="https://www.google.com/maps/dir//Shree+Netralaya,+SHOP+NO.+04,+IMPACT+TRADE+CENTRE,+SHREE+NETRALAYA,+beside+Woodlot+hotel,+Padegaon,+Chhatrapati+Sambhajinagar,+Maharashtra+431002/@19.890303,75.2829042,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3bdb99b7287fe83f:0x4e868d6dff4558b8!2m2!1d75.2895475!2d19.884427?entry=ttu" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white shadow-lg text-teal-primary text-[13px] px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-teal-primary hover:text-white transition-all duration-300"
            >
              <MapPin size={16} /> Get Directions
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#060f1c] px-[5%] pt-12 pb-7">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pb-10 border-b border-white/7 mb-7">
          <div>
            <a href="#" className="font-serif text-xl text-white font-bold flex items-center gap-2.5 tracking-tight mb-3.5">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {ASSETS.logo.url ? (
                <img 
                  src={ASSETS.logo.url} 
                  alt="Logo" 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      const icon = document.createElement('div');
                      icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye text-teal-primary"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
                      parent.appendChild(icon.firstChild as Node);
                    }
                  }}
                />
              ) : (
                <Eye className="text-teal-primary w-5 h-5" />
              )}
            </div>
              Shree Netralaya
            </a>
            <p className="text-[13px] text-white/35 leading-[1.8] max-w-[260px]">Aurangabad's most trusted eye care centre. Delivering excellence in ophthalmology since 2003.</p>
          </div>
          
          <div>
            <h4 className="text-[11px] tracking-[0.12em] uppercase text-white/50 font-semibold mb-4">Services</h4>
            <ul className="flex flex-col gap-2.5">
              {['Eye Examination', 'Cataract Surgery', 'LASIK & Smile', 'Retina Care', 'Glaucoma', 'Paediatric Eye'].map(item => (
                <li key={item}><a href="#services" className="text-[13px] text-white/35 hover:text-white/80 transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="text-[11px] tracking-[0.12em] uppercase text-white/50 font-semibold mb-4">Quick Links</h4>
            <ul className="flex flex-col gap-2.5">
              {['About Us', 'Our Doctors', 'Gallery', 'Reviews', 'Book Appointment', 'Contact'].map(item => (
                <li key={item}><a href={`#${item.toLowerCase().replace(' ', '')}`} className="text-[13px] text-white/35 hover:text-white/80 transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="text-[11px] tracking-[0.12em] uppercase text-white/50 font-semibold mb-4">Contact</h4>
            <ul className="flex flex-col gap-2.5">
              <li><a href="tel:+912402481234" className="text-[13px] text-white/35 hover:text-white/80 transition-colors">+91 240 248 1234</a></li>
              <li><a href="mailto:care@shreenetralaya.com" className="text-[13px] text-white/35 hover:text-white/80 transition-colors">care@shreenetralaya.com</a></li>
              <li className="text-[13px] text-white/35">Padegaon, Chhatrapati Sambhajinagar</li>
              <li className="text-[13px] text-white/35">Mon–Sun: 9 AM – 6 PM</li>
            </ul>
          </div>
        </div>
        
        <div className="flex flex-col sm:row justify-between items-center gap-4">
          <div className="text-[12px] text-white/20">© 2026 Shree Netralaya Eye Care Centre. All rights reserved.</div>
          <div className="flex gap-2 items-center text-[11px] text-white/25">
            <div className="w-1.5 h-1.5 bg-teal-primary rounded-full"></div>
            NABH Accredited &nbsp;·&nbsp; ISO 9001:2015
          </div>
        </div>
      </footer>

      {/* Lightbox */}
      <AnimatePresence>
        {activeLightbox && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/92 flex items-center justify-center p-4"
            onClick={() => setActiveLightbox(null)}
          >
            <div className="relative max-w-[80vw] max-h-[85vh]" onClick={e => e.stopPropagation()}>
              <button 
                className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/15 text-white text-lg flex items-center justify-center hover:bg-white/25 transition-colors"
                onClick={() => setActiveLightbox(null)}
              >
                <X size={18} />
              </button>
              <img src={activeLightbox} className="w-full h-full object-contain rounded" referrerPolicy="no-referrer" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <div className={`fixed bottom-8 right-8 z-[9998] bg-teal-primary text-white px-6 py-3.5 rounded font-medium text-sm shadow-lg transition-all duration-400 pointer-events-none ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-25 opacity-0'}`}>
        ✓ Appointment submitted! We'll call you within 2 hours.
      </div>
    </div>
  );
}

