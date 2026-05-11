import clinicLogo from './assets/images/clinic-logo.png';
import serviceDiagnostics from './assets/images/service-diagnostics.jpg';
import gallery1 from './assets/images/gallery-1.webp';
import gallery2 from './assets/images/gallery-2.webp';
import gallery3 from './assets/images/gallery-3.webp';
import gallery4 from './assets/images/gallery-4.webp';
import gallery5 from './assets/images/gallery-5.jpg';
import doctorPhoto from './assets/images/doctor-photo.jpg';

/**
 * ASSETS CONFIGURATION
 */

export const ASSETS = {
  logo: {
    url: clinicLogo, 
    fallbackIcon: "Eye"
  },
  
  // Doctor Profile Photo
  doctor: {
    url: doctorPhoto, 
    fallback: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=800&q=80"
  },

  // Services Photos
  services: {
    diagnostics: serviceDiagnostics,
    cataract: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&q=70",
    lasik: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=70",
    retina: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600&q=70",
    glaucoma: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=600&q=70",
    paediatric: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=70"
  },

  // Clinic & Gallery Photos
  clinic: {
    hero: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&q=80",
    reception: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=900&q=80",
    consultation: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&q=70",
    equipment: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=500&q=70",
    gallery1: gallery1,
    gallery2: gallery2,
    gallery3: gallery3,
    gallery4: gallery4,
    gallery5: gallery5
  }
};
