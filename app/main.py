from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.database import models, db
from app.api import users, wallets, transfer
from fastapi.responses import FileResponse

# Create tables
models.Base.metadata.create_all(bind=db.engine)

app = FastAPI(title="Wallet Engine (Build Phase)")

app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(wallets.router, prefix="/api/v1/wallets", tags=["wallets"])
app.include_router(transfer.router, prefix="/api/v1/transfer", tags=["transfer"])

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
