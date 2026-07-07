const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sinopia_2026';
const AUTH_COOKIE_NAME = 'sinopia_session';
const AUTH_TOKEN_VAL = 'sinopia_auth_token_secure_val';

// Determine price database path (Railway Volume or local fallback)
let pricesFilePath = path.join(__dirname, 'prices.json');
if (fs.existsSync('/data') && fs.lstatSync('/data').isDirectory()) {
  pricesFilePath = '/data/prices.json';
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Helper: load prices
function loadPrices() {
  try {
    if (fs.existsSync(pricesFilePath)) {
      const raw = fs.readFileSync(pricesFilePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading prices file:', err);
  }
  
  // Fallback / Initial Prices
  const defaultPrices = {
    // Çorbalar
    "corba-mercimek-full": "230",
    "corba-mercimek-half": "190",
    "corba-tarhana-full": "310",
    "corba-tarhana-half": "275",
    
    // Başlangıçlar
    "starter-iclikofte": "165",
    "starter-kofteler-full": "640",
    "starter-kofteler-1-5": "950",
    "starter-patates": "230",
    
    // Soğuklar
    "soguk-sarma": "290",
    "soguk-enginar": "400",
    
    // Sıcaklar
    "sicak-ciborek-kiymali-full": "400",
    "sicak-ciborek-kiymali-half": "220",
    "sicak-ciborek-peynirli-full": "400",
    "sicak-ciborek-peynirli-half": "220",
    "sicak-gozleme-kiymali": "470",
    "sicak-gozleme-peynirli": "470",
    
    // Kıymalı Mantılar
    "kiymali-yogurtlu-full": "560",
    "kiymali-yogurtlu-half": "380",
    "kiymali-yogurtlu-1-5": "835",
    "kiymali-cevizli-full": "650",
    "kiymali-cevizli-half": "460",
    "kiymali-cevizli-1-5": "960",
    "kiymali-yogurtlucevizli-full": "595",
    "kiymali-yogurtlucevizli-half": "435",
    "kiymali-yogurtlucevizli-1-5": "910",
    "kiymali-citir-full": "650",
    "kiymali-citir-half": "460",
    "kiymali-citir-1-5": "960",
    "kiymali-karisik-yogurtlu-full": "625",
    "kiymali-karisik-yogurtlu-1-5": "920",
    "kiymali-karisik-cevizli-full": "660",
    "kiymali-karisik-cevizli-1-5": "975",
    
    // Patatesli Mantılar
    "patatesli-yogurtlu-full": "560",
    "patatesli-yogurtlu-half": "380",
    "patatesli-yogurtlu-1-5": "835",
    "patatesli-cevizli-full": "650",
    "patatesli-cevizli-half": "460",
    "patatesli-cevizli-1-5": "960",
    "patatesli-yogurtlucevizli-full": "595",
    "patatesli-yogurtlucevizli-half": "435",
    "patatesli-yogurtlucevizli-1-5": "910",
    "patatesli-citir-full": "650",
    "patatesli-citir-half": "460",
    "patatesli-citir-1-5": "960",
    "patatesli-karisik-yogurtlu-full": "625",
    "patatesli-karisik-yogurtlu-1-5": "920",
    "patatesli-karisik-cevizli-full": "660",
    "patatesli-karisik-cevizli-1-5": "975",
    
    // Tatlılar
    "tatli-pepecura": "350",
    "tatli-cikolata": "350",
    "tatli-alba": "375",
    
    // İçecekler
    "drink-limonata": "165",
    "drink-portakal": "150",
    "drink-ayran": "100",
    "drink-cola": "130",
    "drink-colazero": "130",
    "drink-fanta": "130",
    "drink-sprite": "130",
    "drink-fusetea": "130",
    "drink-cherry": "150",
    "drink-soda": "75",
    "drink-su": "70",
    "drink-kahve": "130",
    "drink-cay": "60"
  };
  
  // Write default prices to database file
  try {
    fs.writeFileSync(pricesFilePath, JSON.stringify(defaultPrices, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing default prices:', err);
  }
  return defaultPrices;
}

// Auth Middleware
function authenticateAdmin(req, res, next) {
  if (req.cookies && req.cookies[AUTH_COOKIE_NAME] === AUTH_TOKEN_VAL) {
    return next();
  }
  res.status(401).json({ success: false, message: 'Unauthorized' });
}

// API Routes
app.get('/api/prices', (req, res) => {
  res.json(loadPrices());
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    // Set cookie valid for 30 days
    res.cookie(AUTH_COOKIE_NAME, AUTH_TOKEN_VAL, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });
    return res.json({ success: true });
  }
  res.status(400).json({ success: false, message: 'Hatalı şifre' });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.json({ success: true });
});

app.post('/api/prices', authenticateAdmin, (req, res) => {
  const newPrices = req.body;
  if (!newPrices || typeof newPrices !== 'object') {
    return res.status(400).json({ success: false, message: 'Geçersiz veri' });
  }
  
  // Basic validation: ensure all values are clean strings
  const cleaned = {};
  for (const [k, v] of Object.entries(newPrices)) {
    cleaned[k] = String(v).replace(/[^\d]/g, ''); // digit-only string representation
  }
  
  try {
    fs.writeFileSync(pricesFilePath, JSON.stringify(cleaned, null, 2), 'utf8');
    return res.json({ success: true });
  } catch (err) {
    console.error('Error saving updated prices:', err);
    return res.status(500).json({ success: false, message: 'Dosya kaydetme hatası' });
  }
});

// Admin redirect helper
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve static files
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📦 Prices DB path: ${pricesFilePath}`);
});
