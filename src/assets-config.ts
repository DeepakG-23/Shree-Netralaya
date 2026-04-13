/**
 * ASSETS CONFIGURATION
 * 
 * To use your own images:
 * 1. Upload your images to the /public/images/ folder using the file explorer.
 * 2. Update the paths below to point to your uploaded files (e.g., "/images/logo.png").
 * 3. The app will automatically update to use your new images.
 */

export const ASSETS = {
  logo: {
    // Replace with your uploaded logo path, e.g., "/images/logo.png"
    url: "/images/logo.png", 
    fallbackIcon: "Eye"
  },
  
  // Doctor Profile Photo
  doctor: {
    url: "/images/doctor.png", // User to upload doctor.png
    fallback: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&q=80"
  },

  // Services Photos
  services: {
    diagnostics: "/images/vision-testing.jpg",
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
    gallery1: "/images/2026-02-06.webp",
    gallery2: "/images/2026-02-07.webp",
    gallery3: "/images/2026-02-06-1.webp",
    gallery4: "/images/2026-02-07-1.webp",
    gallery5: "/images/5109.jpg"
  }
};
