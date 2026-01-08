import threading
import requests
import time
import sys

BASE_URL = "http://localhost:8000/api/v1"

def create_user(username, email):
    res = requests.post(f"{BASE_URL}/users/", json={"username": username, "email": email})
    # Ignore error if user already exists
    return res.json()

def create_wallet(user_id):
    res = requests.post(f"{BASE_URL}/wallets/", json={"user_id": user_id})
    return res.json()

def deposit(wallet_id, amount):
    res = requests.post(f"{BASE_URL}/wallets/{wallet_id}/deposit", json={"amount": amount})
    return res.json()

def get_balance(wallet_id):
    res = requests.get(f"{BASE_URL}/wallets/{wallet_id}")
    return res.json()["balance"]

def transfer(from_id, to_id, amount):
    res = requests.post(f"{BASE_URL}/transfer/", json={
        "from_wallet_id": from_id,
        "to_wallet_id": to_id,
        "amount": amount
    })
    return res.status_code

def run_concurrent_test():
    print("--- Starting Concurrency Test (Verifying Safety) ---")
    
    suffix = str(int(time.time()))
    u1 = create_user(f"safe_{suffix}", f"safe_{suffix}@example.com")
    u2 = create_user(f"receiver_{suffix}", f"receiver_{suffix}@example.com")
    
    if 'id' not in u1: 
        print("Setup error: could not create users") 
        return

    w1 = create_wallet(u1['id'])
    w2 = create_wallet(u2['id'])
    
    # 1. Fund Wallet 1 with 100.00
    deposit(w1['id'], 100.0)
    print(f"Initial Balance W1: {get_balance(w1['id'])}")
    
    # 2. Launch 5 concurrent threads, each trying to transfer 50.00
    # Expected: Only 2 should succeed (Total 100).
    # The others should fail with 400 Insufficient Funds.
    
    threads = []
    results = []
    
    def attempt_transfer():
        code = transfer(w1['id'], w2['id'], 50.0)
        results.append(code)

    for _ in range(5):
        t = threading.Thread(target=attempt_transfer)
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    final_balance = get_balance(w1['id'])
    print(f"Results codes: {results}")
    print(f"Final Balance W1: {final_balance}")
    
    # 3. Assert Safety
    # Balance must NOT be negative.
    if final_balance < 0:
        print("FAILURE: System is VULNERABLE! Balance went negative.")
        sys.exit(1)
        
    # Count successes (200 OK)
    success_count = results.count(200)
    print(f"Successful transfers: {success_count}")

    if success_count > 2:
         print("FAILURE: Double Spend Detected! More transfers succeeded than funds allowed.")
         sys.exit(1)
    
    if success_count == 2 and final_balance == 0.0:
        print("SUCCESS: System is SAFE. Funds exhausted correctly without overspending.")
        sys.exit(0)
    elif success_count < 2:
        print("WARNING: Less than expected transfers succeeded (locking overhead?). System is safe but maybe too strict.")
        sys.exit(0)
    else:
        # Should be covered by > 2 check, but just in case
        print("Unknown State.")
        sys.exit(1)

if __name__ == "__main__":
    # Wait for server
    for _ in range(5):
        try:
            requests.get(BASE_URL)
            break
        except:
            time.sleep(1)
            
    run_concurrent_test()
