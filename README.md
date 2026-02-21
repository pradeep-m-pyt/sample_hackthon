# EcoTech: Environmental ROI & Strategic Land Intelligence

EcoTech is a premium SaaS platform designed for institutional investors, policy makers, and conservationists. It provides multi-criteria land valuation by simulating 30-year economic flows from ecosystem services (Natural Capital) versus traditional development paths (Market Capital).

![EcoTech Banner](https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000)

## 🎨 Theme: Lavender & Beige
The platform features a custom-crafted **Lavender & Beige** aesthetic, designed for a premium, calm, and professional research environment. The theme utilizes glassmorphism, high-contrast typography, and a refined color palette:
- **Primary:** Violet-600 / Indigo-950
- **Background:** Beige (#FAF7F2)
- **Accents:** Amber (Solar), Emerald (Carbon), Blue (Hydrology)

---

## 🚀 Core Features

### 1. Land Analyzer (Map Canvas)
A high-fidelity spatial editor for identifying and delineating land parcels.
- **Location Discovery:** Search via Nominatim API or manual coordinates.
- **Polygon Editor:** Precision drawing tools for defining parcel boundaries.
- **Real-time Stats:** Instant hectares/perimeter calculation.

### 2. Multi-Engine Analysis
EcoTech runs complex simulations across three primary ecological engines:
- **Hydrology Engine:** Models flood risk and annual runoff reduction using USDA-SCS factors.
- **Solar Flux Engine:** Calculates peak irradiance and 30-year energy yield using NASA POWER spectral data.
- **Carbon Sequestration Engine:** Valuates organic carbon stocks based on dominant land cover and SCC (Social Cost of Carbon) rates.

### 3. AI Strategic Intelligence
Integrated with **LLM Analysis (Groq Cloud)** to provide:
- **Automated Recommendations:** Context-aware strategies for land optimization.
- **Scenario Modeling:** Projecting "Conservation-First" vs. "Hybrid-Restore" vs. "Intensive-Market" paths.

### 4. Interactive Reporting
Full-featured reporting suite with:
- **Dynamic Charts:** 30-year NPV (Net Present Value) projections using Recharts.
- **PDF Export:** High-fidelity dossier generation for institutional stakeholders.
- **Comparison Matrix:** Side-by-side analysis of different land-use scenarios.

---

## 🛠 Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + Framer Motion
- **Maps:** Leaflet.js
- **Charts:** Recharts
- **Icons:** Lucide-React
- **Export:** Html2Canvas + JSPDF

### Backend
- **Framework:** FastAPI (Python)
- **Database:** SQLite (SQLAlchemy)
- **AI Intelligence:** Groq Cloud API
- **Maps Data:** Overpass API (OpenStreetMap)
- **Climate Data:** NASA POWER / Nominatim

---

## 📦 Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- Groq API Key

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/Scripts/activate # Windows
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file:
   ```env
   GROQ_API_KEY=your_key_here
   ```
5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend/ecotech
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## 📄 License
This project is proprietary and built for strategic environmental analysis.

---
*Built with ❤️ for a greener future.*
