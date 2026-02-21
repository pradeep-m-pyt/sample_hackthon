from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db import engine
from database import models
from routers import auth, land, aggregator, ai, google_auth
import uvicorn

# Initialize database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="EcoTech - Ecosystem Valuation Engine")

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
# ... (rest of imports)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Global Exception: {exc}")
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": traceback.format_exc()},
    )

# Include Routers
app.include_router(auth.router)
app.include_router(land.router)
app.include_router(aggregator.router)
app.include_router(ai.router)
app.include_router(google_auth.router)





@app.get("/")
def root():
    return {"message": "Welcome to EcoTech API", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
