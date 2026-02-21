from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database.db import engine
from database import models
from routers import auth, land, aggregator, ai, google_auth
import uvicorn
import time
import traceback

# Initialize database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="EcoTech - Ecosystem Valuation Engine")

# CORS Configuration - Using Regex for broader local coverage
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|0\.0\.0\.0):3000",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging Middleware to track request lifecycle
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    path = request.url.path
    method = request.method
    
    # Skip logging for OPTIONS preflight
    if method == "OPTIONS":
        return await call_next(request)
        
    print(f"--> [REQ] {method} {path}")
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        print(f"<-- [RES] {method} {path} | STATUS: {response.status_code} | TIME: {process_time:.2f}s")
        return response
    except Exception as e:
        process_time = time.time() - start_time
        print(f"!!! [ERR] {method} {path} | ERROR: {str(e)} | TIME: {process_time:.2f}s")
        traceback.print_exc()
        # Ensure we return a response instead of crashing the middleware
        return JSONResponse(
            status_code=500,
            content={"detail": "Middleware Error", "message": str(e)},
            headers={"Access-Control-Allow-Origin": request.headers.get("origin", "*"), "Access-Control-Allow-Credentials": "true"}
        )

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"CRITICAL ERROR caught by handler: {exc}")
    traceback.print_exc()
    
    # Fallback CORS headers for error responses
    origin = request.headers.get("origin", "http://localhost:3000")
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "message": str(exc),
            "type": type(exc).__name__
        },
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true"
        }
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
