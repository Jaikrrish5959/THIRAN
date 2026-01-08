# Wallet Engine - Complete Technical Documentation
## Transaction Ordering & Execution System

**Problem Statement**: Modern transaction systems process multiple requests concurrently, where incorrect ordering and lack of atomic execution can lead to inconsistent system state and financial discrepancies.

**Solution**: A transaction ordering and execution engine that enforces atomic and consistent state transitions under concurrent access, enabling systematic validation and iterative hardening of transaction logic.

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Component Architecture](#component-architecture)
3. [File Structure](#file-structure)
4. [Transaction Flow Diagrams](#transaction-flow-diagrams)
5. [Concurrency Control](#concurrency-control)
6. [Database Schema](#database-schema)
---

## System Architecture

### High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Web UI<br/>HTML/CSS/JS]
        Voice[Voice Assistant<br/>Web Speech API]
        API_Client[External API Clients<br/>cURL/Postman]
    end
    
    subgraph "Application Layer"
        FastAPI[FastAPI Server<br/>Port 8000]
        Auth[Authentication<br/>PIN Verification]
        RateLimit[Rate Limiter<br/>5 attempts/min]
    end
    
    subgraph "Business Logic Layer"
        UserAPI[User API<br/>users.py]
        WalletAPI[Wallet API<br/>wallets.py]
        TransferAPI[Transfer API<br/>transfer.py]
        
        UserCRUD[User CRUD<br/>Create/Read]
        WalletCRUD[Wallet CRUD<br/>Create/Read/Deposit]
        TransactionCRUD[Transaction CRUD<br/>Transfer/Batch]
        
        Crypto[Crypto Utils<br/>Bcrypt Hashing]
    end
    
    subgraph "Data Layer"
        ORM[SQLAlchemy ORM<br/>Row-Level Locking]
        DB[(PostgreSQL 15<br/>ACID Transactions)]
    end
    
    UI --> FastAPI
    Voice --> FastAPI
    API_Client --> FastAPI
    
    FastAPI --> Auth
    FastAPI --> RateLimit
    
    FastAPI --> UserAPI
    FastAPI --> WalletAPI
    FastAPI --> TransferAPI
    
    UserAPI --> UserCRUD
    WalletAPI --> WalletCRUD
    TransferAPI --> TransactionCRUD
    
    WalletCRUD --> Crypto
    TransactionCRUD --> Crypto
    
    UserCRUD --> ORM
    WalletCRUD --> ORM
    TransactionCRUD --> ORM
    
    ORM --> DB
    
    style FastAPI fill:#6366f1,stroke:#4f46e5,color:#fff
    style DB fill:#22c55e,stroke:#16a34a,color:#fff
    style Crypto fill:#ef4444,stroke:#dc2626,color:#fff
```

**Key Components**:
- **Client Layer**: Multiple interfaces (Web, Voice, API)
- **Application Layer**: FastAPI with security middleware
- **Business Logic**: Separated API routes and CRUD operations
- **Data Layer**: PostgreSQL with ORM for ACID compliance

---

## Component Architecture

### Detailed Component Interaction

```mermaid
graph LR
    subgraph "Frontend Components"
        HTML[HTML Pages<br/>7 pages]
        CSS[Stylesheets<br/>style.css]
        JS[JavaScript<br/>script.js]
        VoiceJS[Voice AI<br/>voice-assistant.js]
    end
    
    subgraph "Backend API"
        Main[main.py<br/>FastAPI App]
        Routes[API Routes<br/>3 modules]
        Schemas[Pydantic Schemas<br/>Validation]
    end
    
    subgraph "Business Logic"
        CRUD[CRUD Operations<br/>3 modules]
        Models[DB Models<br/>SQLAlchemy]
        Security[Security Layer<br/>Crypto + Rate Limit]
    end
    
    subgraph "Database"
        Users[Users Table<br/>id, username, email]
        Wallets[Wallets Table<br/>id, user_id, balance, pin_hash]
        Transactions[Transactions Table<br/>id, from, to, amount, timestamp]
    end
    
    HTML --> Main
    VoiceJS --> Main
    Main --> Routes
    Routes --> Schemas
    Schemas --> CRUD
    CRUD --> Security
    CRUD --> Models
    Models --> Users
    Models --> Wallets
    Models --> Transactions
    
    style Main fill:#6366f1,stroke:#4f46e5,color:#fff
    style Security fill:#ef4444,stroke:#dc2626,color:#fff
    style Models fill:#22c55e,stroke:#16a34a,color:#fff
```

---

## File Structure

### Complete Project Structure

```
builttobreak-master/
│
├── 📂 app/                                    # Backend Application
│   │
│   ├── 📂 api/                                # API Route Handlers
│   │   ├── __init__.py
│   │   ├── users.py                           # User Management Endpoints
│   │   │   └── POST /api/v1/users/           # Create user
│   │   │   └── GET  /api/v1/users/           # List users
│   │   │   └── GET  /api/v1/users/{id}       # Get user
│   │   │
│   │   ├── wallets.py                         # Wallet Operations Endpoints
│   │   │   └── POST /api/v1/wallets/         # Create wallet (with PIN)
│   │   │   └── GET  /api/v1/wallets/         # List wallets
│   │   │   └── GET  /api/v1/wallets/{id}     # Get wallet
│   │   │   └── POST /api/v1/wallets/deposit  # Deposit funds (PIN required)
│   │   │
│   │   └── transfer.py                        # Transfer Endpoints
│   │       └── POST /api/v1/transfer/        # Single transfer (PIN required)
│   │       └── POST /api/v1/transfer/batch   # Batch transfer (PIN required)
│   │       └── GET  /api/v1/transfer/transactions  # Transaction history
│   │
│   ├── 📂 core/                               # Core Utilities & Security
│   │   ├── __init__.py
│   │   ├── crypto.py                          # Cryptographic Functions
│   │   │   └── hash_pin()                    # Bcrypt PIN hashing
│   │   │   └── verify_pin()                  # Secure PIN verification
│   │   │   └── generate_secure_token()       # Token generation
│   │   │
│   │   ├── rate_limiter.py                    # Rate Limiting
│   │   │   └── limiter                       # SlowAPI limiter instance
│   │   │   └── PIN_VERIFY_LIMIT = 5/min      # Brute force protection
│   │   │
│   │   └── config.py                          # Configuration Settings
│   │
│   ├── 📂 crud/                               # Database CRUD Operations
│   │   ├── __init__.py
│   │   ├── user.py                            # User Database Operations
│   │   │   └── create_user()                 # Create new user
│   │   │   └── get_user()                    # Fetch user by ID
│   │   │   └── get_users()                   # List all users
│   │   │
│   │   ├── wallet.py                          # Wallet Database Operations
│   │   │   └── create_wallet()               # Create wallet (hash PIN)
│   │   │   └── get_wallet()                  # Fetch wallet by ID
│   │   │   └── verify_wallet_pin()           # Verify PIN (bcrypt)
│   │   │   └── deposit_wallet()              # Deposit with PIN check
│   │   │
│   │   └── transaction.py                     # Transaction Processing Logic
│   │       └── create_transfer_vulnerable()  # Single transfer with locking
│   │       └── create_batch_transfer()       # Atomic batch transfer
│   │       └── get_transactions()            # Fetch transaction history
│   │
│   ├── 📂 database/                           # Database Configuration
│   │   ├── __init__.py
│   │   ├── db.py                              # Database Connection & Session
│   │   │   └── engine                        # SQLAlchemy engine
│   │   │   └── SessionLocal                  # Session factory
│   │   │   └── get_db()                      # Dependency injection
│   │   │
│   │   └── models.py                          # SQLAlchemy Models
│   │       └── User                          # User model
│   │       └── Wallet                        # Wallet model (with pin_hash)
│   │       └── Transaction                   # Transaction model
│   │
│   ├── 📂 schemas/                            # Pydantic Schemas (Validation)
│   │   ├── __init__.py
│   │   ├── user.py                            # User Request/Response Schemas
│   │   │   └── UserCreate                    # Create user schema
│   │   │   └── User                          # User response schema
│   │   │
│   │   ├── wallet.py                          # Wallet Request/Response Schemas
│   │   │   └── WalletCreate                  # Create wallet schema
│   │   │   └── WalletDeposit                 # Deposit schema
│   │   │   └── Wallet                        # Wallet response schema
│   │   │
│   │   └── transaction.py                     # Transaction Schemas
│   │       └── TransactionCreate             # Single transfer schema
│   │       └── BatchTransferCreate           # Batch transfer schema
│   │       └── Transaction                   # Transaction response schema
│   │
│   └── main.py                                # FastAPI Application Entry Point
│       └── app = FastAPI()                   # FastAPI instance
│       └── API route includes                # Include all routers
│       └── Static file serving               # Serve UI files
│       └── HTML page routes                  # Serve HTML pages
│
├── 📂 ui/                                     # Frontend Files
│   ├── index.html                             # Dashboard Homepage
│   ├── users.html                             # User Management Page
│   ├── wallets.html                           # Wallet Management Page
│   ├── deposit.html                           # Deposit Funds Page
│   ├── transfer.html                          # Transfer Money Page
│   ├── balance.html                           # Balance Checking Page
│   ├── transactions.html                      # Transaction History Page
│   ├── voice-assistance.html                  # AI Voice Assistant Interface
│   ├── voice-assistant.js                     # Voice AI Logic & API Integration
│   │   └── VoiceAssistant class              # Main voice assistant class
│   │   └── Speech recognition                # Web Speech API integration
│   │   └── NLP command parsing               # Extract intent & parameters
│   │   └── API integration                   # Call backend endpoints
│   │   └── Text-to-speech                    # Voice responses
│   ├── script.js                              # General UI Interactions
│   └── style.css                              # Application Styling
│
├── 📂 tests/                                  # Test Suite
│   ├── __init__.py
│   └── test_failures.py                       # Concurrency & Race Condition Tests
│       └── Test double-spending              # Concurrent transfer tests
│       └── Test batch atomicity              # All-or-nothing validation
│
├── 📄 docker-compose.yml                      # Docker Orchestration
│   └── web service (FastAPI)                 # Application container
│   └── db service (PostgreSQL 15)            # Database container
│   └── volumes (postgres_data)               # Persistent storage
│
├── 📄 Dockerfile                              # Container Definition
│   └── Python 3.11 base image                # Base image
│   └── Install dependencies                  # pip install requirements
│   └── Copy application code                 # COPY app/ and ui/
│   └── Expose port 8000                      # API port
│
├── 📄 requirements.txt                        # Python Dependencies
│   └── fastapi==0.109.0                      # Web framework
│   └── sqlalchemy==2.0.25                    # ORM
│   └── psycopg2-binary==2.9.9                # PostgreSQL driver
│   └── bcrypt==4.1.2                         # PIN hashing
│   └── passlib[bcrypt]==1.7.4                # Password utilities
│   └── slowapi==0.1.9                        # Rate limiting
│
├── 📄 migrate_pins.py                         # Security Migration Script
│   └── Add pin_hash column                   # Schema update
│   └── Hash existing PINs                    # Data migration
│   └── Drop old pin column                   # Cleanup
│
├── 📄 README.md                               # Main Documentation
└── 📄 HACKATHON_SUBMISSION.md                 # Submission Document
```

---

## Transaction Flow Diagrams

### Single Transfer Flow (with Concurrency Control)

```mermaid
sequenceDiagram
    participant Client
    participant API as FastAPI API
    participant CRUD as Transaction CRUD
    participant Crypto as Crypto Utils
    participant DB as PostgreSQL
    
    Client->>API: POST /api/v1/transfer/
    Note over Client,API: Request Body:<br/>{from_wallet_id: 1,<br/>to_wallet_id: 2,<br/>amount: 100,<br/>pin: "1234"}
    
    API->>CRUD: create_transfer_vulnerable(transaction)
    
    CRUD->>DB: BEGIN TRANSACTION
    Note over DB: Start atomic operation
    
    CRUD->>DB: SELECT * FROM wallets<br/>WHERE id = 1<br/>FOR UPDATE
    Note over DB: 🔒 Lock sender's row<br/>Prevents concurrent access
    
    DB-->>CRUD: Sender wallet data
    
    CRUD->>Crypto: verify_pin("1234", sender.pin_hash)
    Crypto->>Crypto: bcrypt.checkpw()
    Note over Crypto: Constant-time comparison<br/>Prevents timing attacks
    
    alt PIN Invalid
        Crypto-->>CRUD: False
        CRUD->>DB: ROLLBACK
        CRUD-->>API: HTTPException(401)
        API-->>Client: 401 Unauthorized<br/>"Incorrect PIN"
    end
    
    Crypto-->>CRUD: True (PIN valid)
    
    CRUD->>DB: SELECT * FROM wallets<br/>WHERE id = 2
    DB-->>CRUD: Receiver wallet data
    
    CRUD->>CRUD: Validate: sender.balance >= 100
    
    alt Insufficient Funds
        CRUD->>DB: ROLLBACK
        CRUD-->>API: HTTPException(400)
        API-->>Client: 400 Bad Request<br/>"Insufficient funds"
    end
    
    CRUD->>DB: UPDATE wallets<br/>SET balance = balance - 100<br/>WHERE id = 1
    
    CRUD->>DB: UPDATE wallets<br/>SET balance = balance + 100<br/>WHERE id = 2
    
    CRUD->>DB: INSERT INTO transactions<br/>(from_wallet_id, to_wallet_id, amount)<br/>VALUES (1, 2, 100)
    
    CRUD->>DB: COMMIT TRANSACTION
    Note over DB: ✅ Release lock<br/>All changes permanent
    
    DB-->>CRUD: Transaction committed
    
    CRUD-->>API: Transaction object
    API-->>Client: 200 OK<br/>Transaction details
```

### Batch Transfer Flow (Atomic All-or-Nothing)

```mermaid
sequenceDiagram
    participant Client
    participant API as FastAPI API
    participant CRUD as Transaction CRUD
    participant DB as PostgreSQL
    
    Client->>API: POST /api/v1/transfer/batch
    Note over Client,API: Request Body:<br/>{from_wallet_id: 1,<br/>pin: "1234",<br/>transfers: [<br/>  {to_wallet_id: 2, amount: 50},<br/>  {to_wallet_id: 3, amount: 30}<br/>]}
    
    API->>CRUD: create_batch_transfer(batch)
    
    CRUD->>DB: BEGIN TRANSACTION
    
    CRUD->>DB: SELECT * FROM wallets<br/>WHERE id = 1<br/>FOR UPDATE
    Note over DB: 🔒 Lock sender wallet
    
    DB-->>CRUD: Sender wallet
    
    CRUD->>CRUD: Verify PIN
    
    CRUD->>CRUD: Calculate total_needed<br/>= 50 + 30 = 80
    
    CRUD->>CRUD: Check: sender.balance >= 80
    
    alt Insufficient Funds for Batch
        CRUD->>DB: ROLLBACK
        Note over DB: ❌ No partial execution<br/>All-or-nothing guarantee
        CRUD-->>API: HTTPException(400)
        API-->>Client: 400 Bad Request<br/>"Insufficient funds for batch"
    end
    
    CRUD->>DB: UPDATE wallets<br/>SET balance = balance - 80<br/>WHERE id = 1
    Note over CRUD,DB: Deduct total upfront
    
    loop For each recipient
        CRUD->>DB: SELECT * FROM wallets<br/>WHERE id = recipient_id
        DB-->>CRUD: Receiver wallet
        
        CRUD->>DB: UPDATE wallets<br/>SET balance = balance + amount<br/>WHERE id = recipient_id
        
        CRUD->>DB: INSERT INTO transactions<br/>(from_wallet_id, to_wallet_id, amount)
    end
    
    CRUD->>DB: COMMIT TRANSACTION
    Note over DB: ✅ All transfers succeed together<br/>Atomic execution
    
    DB-->>CRUD: All transactions committed
    
    CRUD-->>API: List of transaction objects
    API-->>Client: 200 OK<br/>All transaction details
```

---

## Concurrency Control

### Locking Mechanism

```mermaid
graph TD
    A[Transfer Request Received] --> B{Acquire Lock}
    B -->|SELECT FOR UPDATE| C[🔒 Lock Sender Wallet Row]
    
    C --> D[Verify PIN with Bcrypt]
    D --> E{PIN Valid?}
    
    E -->|No| F[Release Lock<br/>ROLLBACK Transaction]
    F --> G[Return 401 Unauthorized]
    
    E -->|Yes| H[Check Balance]
    H --> I{Sufficient Funds?}
    
    I -->|No| J[Release Lock<br/>ROLLBACK Transaction]
    J --> K[Return 400 Bad Request]
    
    I -->|Yes| L[Update Sender Balance<br/>balance -= amount]
    L --> M[Update Receiver Balance<br/>balance += amount]
    M --> N[Create Transaction Record<br/>INSERT INTO transactions]
    
    N --> O[COMMIT Transaction]
    O --> P[🔓 Release Lock]
    P --> Q[Return 200 OK]
    
    style C fill:#ef4444,stroke:#dc2626,color:#fff
    style O fill:#22c55e,stroke:#16a34a,color:#fff
    style F fill:#f59e0b,stroke:#d97706,color:#fff
    style J fill:#f59e0b,stroke:#d97706,color:#fff
```

### Race Condition Prevention

```mermaid
graph LR
    subgraph "Without Locking ❌"
        T1A[Thread 1:<br/>Read balance = 100]
        T2A[Thread 2:<br/>Read balance = 100]
        T1B[Thread 1:<br/>Deduct 80<br/>New balance = 20]
        T2B[Thread 2:<br/>Deduct 60<br/>New balance = 40]
        T1C[Thread 1:<br/>Write balance = 20]
        T2C[Thread 2:<br/>Write balance = 40]
        Result1[❌ Final balance = 40<br/>Lost update!<br/>Should be -40]
        
        T1A --> T1B
        T2A --> T2B
        T1B --> T1C
        T2B --> T2C
        T1C --> Result1
        T2C --> Result1
    end
    
    subgraph "With Locking ✅"
        T1D[Thread 1:<br/>Lock + Read = 100]
        T1E[Thread 1:<br/>Deduct 80<br/>New balance = 20]
        T1F[Thread 1:<br/>Write + Unlock]
        T2D[Thread 2:<br/>Wait for lock...]
        T2E[Thread 2:<br/>Lock + Read = 20]
        T2F[Thread 2:<br/>Deduct 60<br/>Insufficient funds!]
        T2G[Thread 2:<br/>ROLLBACK + Unlock]
        Result2[✅ Final balance = 20<br/>Correct!<br/>Thread 2 rejected]
        
        T1D --> T1E
        T1E --> T1F
        T1F --> T2D
        T2D --> T2E
        T2E --> T2F
        T2F --> T2G
        T1F --> Result2
        T2G --> Result2
    end
    
    style Result1 fill:#ef4444,stroke:#dc2626,color:#fff
    style Result2 fill:#22c55e,stroke:#16a34a,color:#fff
```

---

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ WALLETS : "owns (1:1)"
    WALLETS ||--o{ TRANSACTIONS : "sends from"
    WALLETS ||--o{ TRANSACTIONS : "receives to"
    
    USERS {
        int id PK "Primary Key"
        string username UK "Unique, indexed"
        string email UK "Unique, indexed"
    }
    
    WALLETS {
        int id PK "Primary Key"
        int user_id FK "Foreign Key → users.id"
        float balance "Current balance"
        string pin_hash "Bcrypt hashed PIN (255 chars)"
        enum status "ACTIVE | INACTIVE"
    }
    
    TRANSACTIONS {
        int id PK "Primary Key"
        int from_wallet_id FK "Foreign Key → wallets.id"
        int to_wallet_id FK "Foreign Key → wallets.id"
        float amount "Transfer amount"
        timestamp timestamp "Transaction time (UTC)"
    }
```

### Table Details

**USERS Table**:
- `id`: Auto-incrementing primary key
- `username`: Unique username, indexed for fast lookup
- `email`: Unique email address, indexed

**WALLETS Table**:
- `id`: Auto-incrementing primary key
- `user_id`: Foreign key to users table (one-to-one relationship)
- `balance`: Current wallet balance (float)
- `pin_hash`: Bcrypt hashed PIN (255 characters to store hash)
- `status`: Enum (ACTIVE/INACTIVE) for wallet state

**TRANSACTIONS Table**:
- `id`: Auto-incrementing primary key
- `from_wallet_id`: Foreign key to sender's wallet
- `to_wallet_id`: Foreign key to receiver's wallet
- `amount`: Transfer amount (float)
- `timestamp`: Transaction timestamp (auto-generated, UTC)

---


### Security Features

1. **Rate Limiting**
   - 5 PIN attempts per minute per IP
   - Prevents brute force attacks
   - Configurable limits

2. **PIN Hashing**
   - Bcrypt with automatic salting
   - Work factor: 12 (industry standard)
   - Never store plaintext PINs

3. **Secure Verification**
   - Constant-time comparison
   - Prevents timing attacks
   - Returns boolean only

4. **Transaction Locking**
   - Row-level database locks
   - Prevents race conditions
   - ACID compliance

---

## AI Voice Assistant

---


## Summary

This documentation provides a complete technical overview of the Wallet Engine transaction ordering and execution system, addressing the hackathon problem statement through:

✅ **Atomic Execution**: All-or-nothing batch transfers  
✅ **Concurrency Control**: Database-level row locking  
✅ **Consistent State**: ACID-compliant transactions  
✅ **Security**: Bcrypt PIN hashing and rate limiting  
✅ **Innovation**: AI-powered voice interface  
✅ **Production Ready**: Docker deployment and comprehensive testing  
