from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Initialize FastAPI app first
app = FastAPI(title="Wallet Engine (Build Phase)")

# Try to initialize database (optional for serverless deployment)
try:
    from app.database import models, db
    from app.api import users, wallets, transfer
    
    # Create tables only if database is available
    models.Base.metadata.create_all(bind=db.engine)
    
    # Include API routers only if database is available
    app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
    app.include_router(wallets.router, prefix="/api/v1/wallets", tags=["wallets"])
    app.include_router(transfer.router, prefix="/api/v1/transfer", tags=["transfer"])
    
    DB_AVAILABLE = True
except Exception as e:
    # Database not available - running in demo mode
    DB_AVAILABLE = False
    print(f"Warning: Database not available - running in demo mode. Error: {e}")

# Health check endpoint (works without database)
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "database": "connected" if DB_AVAILABLE else "unavailable",
        "mode": "production" if DB_AVAILABLE else "demo"
    }

# Serve UI
app.mount("/static", StaticFiles(directory="ui"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('ui/index.html')

@app.get("/users")
async def read_users():
    return FileResponse('ui/users.html')

@app.get("/wallets")
async def read_wallets():
    return FileResponse('ui/wallets.html')

@app.get("/deposit")
async def read_deposit():
    return FileResponse('ui/deposit.html')

@app.get("/transfer")
async def read_transfer():
    return FileResponse('ui/transfer.html')

@app.get("/balance")
async def read_balance():
    return FileResponse('ui/balance.html')

@app.get("/transactions")
async def read_transactions_ui():
    return FileResponse('ui/transactions.html')

@app.get("/voice-assistance")
async def read_voice_assistance():
    return FileResponse('ui/voice-assistance.html')
