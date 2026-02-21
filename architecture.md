# EcoTech System Architecture

This document describes the high-level architecture and data flow of the EcoTech Ecosystem Valuation Engine.

## High-Level Flowchart

```mermaid
graph TD
    subgraph Frontend ["Frontend (Next.js)"]
        UI["UI Elements (ShadCN/Framer)"]
        Map["Interactive Map (Leaflet)"]
        State["React Context/Hooks"]
        Axios["API Client (Axios)"]
    end

    subgraph Backend ["Backend (FastAPI)"]
        Routers["API Routers (Auth, AI, Land)"]
        Middle["CORS & Logging Middleware"]
        Auth["JWT & Security (Passlib)"]
        Store["SQLAlchemy ORM"]
    end

    subgraph Engines ["Intelligence Layer"]
        Land["Land Classifier (OSM)"]
        Terrain["Elevation Engine (OpenTopo)"]
        Models["Flood, Solar, Carbon Logic"]
        AI_Eng["AI Insights (Groq LLM)"]
    end

    subgraph Data ["Data Layer"]
        DB[("SQLite (ecotech.db)")]
    end

    subgraph External ["External APIs"]
        Google["Google OAuth 2.0"]
        OSM_API["OpenStreetMap (Overpass)"]
        Topo_API["OpenTopography"]
        Groq_API["Groq (Llama 3.1 70B)"]
    end

    %% Connections
    UI <--> State
    State <--> Axios
    Axios <== "REST/JSON" ==> Routers
    Routers --> Middle
    Routers --> Auth
    Routers <--> Engines
    Engines <--> DB
    Auth <--> Google
    Land <--> OSM_API
    Terrain <--> Topo_API
    AI_Eng <--> Groq_API
```

## System Components

### 1. Presentation Layer (Next.js)
- **Role**: Handles all user interactions, land selection (polygon drawing), and report visualization.
- **Key Tech**: Next.js, Tailwind CSS, Framer Motion, Leaflet.

### 2. Service Layer (FastAPI)
- **Role**: Secure API gateway that orchestrates calculations and handles user authentication.
- **Key Tech**: FastAPI, Pydantic, python-jose (JWT).

### 3. Intelligence Layer (Engines)
- **Land Engine**: Uses Overpass API to fetch real land-use data (forest, residential, etc).
- **Terrain Engine**: Fetches elevation and calculates slope via OpenTopography.
- **Valuation Engines**: Mathematical models for Solar ROI, Flood Risk, and Carbon Sequestration.
- **AI Engine**: Connects to Groq Llama 3 to generate strategic land-use recommendations.

### 4. Data Layer (SQLite)
- **Role**: Stores user credentials, project geometry, and cached analysis results.

---

## Architecture Image Generation Prompt

If you want to generate a high-quality visual representation using an AI image generator (like Midjourney, DALL-E, or Leonardo), use the following prompt:

> **Prompt:** 
> "A professional, highly detailed isometric system architecture flowchart for a modern tech platform called 'EcoTech'. The design features a futuristic, clean 3D aesthetic with tiered translucent glass platforms. Connectivity lines are neon green glowing circuits. Key modules: 1. Top platform 'Next.js Frontend' with a glowing map interface. 2. Middle platform 'FastAPI Microservices' with server rack icons. 3. 'Intelligence Layer' with icons for AI Brain, Leaf, and Solar Panels. 4. Bottom platform 'SQLite Storage' with a sleek cylinder icon. Floating satellites representing 'Google Auth', 'OpenStreetMap', and 'Groq AI' connect to the tiers. Cinematic lighting, 8k resolution, minimalist tech visualization style, depth of field."
